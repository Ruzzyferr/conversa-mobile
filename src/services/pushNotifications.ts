import * as Notifications from "expo-notifications";
import { Alert, Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "./api";
import { getItem, setItem } from "./kv";
import i18n from "@/src/i18n";
import { onTokenChange } from "./tokenEvents";

let isConfigured = false;
let tokenRegistered = false;
/** Push token registered with the backend for the current session. */
let registeredToken: string | null = null;
const REGISTERED_TOKEN_KEY = "conversa_push_token";

/**
 * The push token this device registered for the signed-in account, so logout
 * can ask the server to delete it (otherwise the next person using the phone
 * keeps receiving the previous account's notifications).
 */
export async function getRegisteredPushToken(): Promise<string | null> {
  if (registeredToken) return registeredToken;
  const stored = await getItem(REGISTERED_TOKEN_KEY);
  return stored ? stored : null;
}

/** Forget the registration so the next account on this device registers its own. */
export function resetPushTokenState(): void {
  tokenRegistered = false;
  registeredToken = null;
  setItem(REGISTERED_TOKEN_KEY, "").catch(() => undefined);
}

/**
 * Conversation currently on screen, if any.
 *
 * A push still arrives for a chat the user is already reading — the server has
 * no idea which screen is open — so the banner fired over the very thread the
 * message had just been inserted into. Tracking the open conversation lets the
 * foreground handler drop those quietly; every other notification is unchanged.
 */
let activeConversationId: string | null = null;

export function setActiveConversation(conversationId: string | null): void {
  activeConversationId = conversationId;
}

/**
 * Configure foreground notification behavior + Android channel.
 * Safe to call multiple times. Never throws.
 */
export async function configureNotifications(): Promise<void> {
  if (isConfigured) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data as
          | { conversationId?: string }
          | undefined;
        const isOpenThread =
          !!activeConversationId && data?.conversationId === activeConversationId;

        return {
          // Silent for the thread being read; the message is already on screen
          // via the socket. It still lands in the tray for later reference.
          shouldShowBanner: !isOpenThread,
          shouldShowList: true,
          shouldPlaySound: !isOpenThread,
          shouldSetBadge: !isOpenThread,
        };
      },
    });

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Genel",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6C5DD3",
      });
    }
    isConfigured = true;
  } catch (error) {
    console.warn("configureNotifications failed:", error);
  }
}

/**
 * When the primer was last shown, so it is not a dialog on every cold start.
 *
 * Once the OS prompt has been answered with "don't allow", asking again is a
 * silent no-op on both platforms — so without this the primer would appear on
 * every launch and lead nowhere, which is worse than the cold prompt it
 * replaced. Ask again after a week; by then the user has usually seen what
 * they are missing.
 */
const PRIMER_KEY = "conversa_push_primer_shown_at";
const PRIMER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

async function primerIsDue(): Promise<boolean> {
  try {
    const raw = await getItem(PRIMER_KEY);
    if (!raw) return true;
    const shownAt = Number(raw);
    if (!Number.isFinite(shownAt)) return true;
    return Date.now() - shownAt > PRIMER_COOLDOWN_MS;
  } catch {
    return true;
  }
}

/** In-app explainer shown before the one-shot OS permission prompt. */
function askPrimer(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      i18n.t("push.primer_title"),
      i18n.t("push.primer_body"),
      [
        { text: i18n.t("push.primer_later"), style: "cancel", onPress: () => resolve(false) },
        { text: i18n.t("push.primer_allow"), onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

/**
 * Request permission, fetch the Expo push token and register it with the
 * backend. No-ops gracefully when Firebase isn't wired into the build yet
 * (getExpoPushTokenAsync throws in that case) or when permission is denied.
 */
export async function registerPushToken(): Promise<void> {
  if (tokenRegistered) return;
  try {
    await configureNotifications();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      // Explain before asking.
      //
      // The OS prompt was fired the instant the tab bar mounted — the first
      // second of the app, before the user had seen a single profile, with no
      // reason given. On both platforms a denial is effectively permanent
      // (the prompt never shows again; the user has to find it in Settings),
      // and this app's entire re-engagement loop is push: matches, messages,
      // accepted requests. A primer costs one extra tap and keeps the real
      // prompt for people who have said yes to the idea first; anyone who
      // declines the primer is simply asked again next launch.
      if (!(await primerIsDue())) return;
      await setItem(PRIMER_KEY, String(Date.now()));

      const wantsThem = await askPrimer();
      if (!wantsThem) return;

      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.warn("Push notification permission not granted");
      return;
    }

    await sendPushTokenToBackend();
  } catch (error) {
    // Expected until google-services.json ships in the build — stay silent-ish.
    console.warn("Push token registration skipped:", error instanceof Error ? error.message : error);
  }
}

/** Fetch the Expo push token and register it for the signed-in account. Throws. */
async function sendPushTokenToBackend(): Promise<void> {
  const projectId =
    (Constants.expoConfig?.extra as any)?.eas?.projectId ||
    process.env.EXPO_PUBLIC_PROJECT_ID;

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const token = tokenData.data;
  if (!token) return;

  const platform = Platform.OS === "ios" ? "IOS" : "ANDROID";
  // The backend renders notification copy per device from this; without it
  // every user received Turkish push notifications. The server upserts by
  // token, so registering moves this device to the account now signed in.
  await api.registerPushToken({ token, platform, locale: i18n.language });
  tokenRegistered = true;
  registeredToken = token;
  await setItem(REGISTERED_TOKEN_KEY, token);
  console.log("Push token registered");
}

let silentRegistration: Promise<void> | null = null;

/**
 * Register this device's push token for the signed-in account WITHOUT any
 * prompt, when notification permission is already granted.
 *
 * The automatic logout on a 401 cannot call /auth/logout (the session is
 * already dead), so the server still maps this device's token to the old
 * account. Re-registering after every login moves it to the new one, even
 * when the post-login permission sequence has nothing left to ask.
 * Never throws.
 */
export function registerPushTokenIfPermitted(): Promise<void> {
  if (Platform.OS === "web") return Promise.resolve();
  if (tokenRegistered) return Promise.resolve();
  if (silentRegistration) return silentRegistration;
  silentRegistration = (async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") return;
      await configureNotifications();
      await sendPushTokenToBackend();
    } catch (error) {
      console.warn(
        "Push token re-registration skipped:",
        error instanceof Error ? error.message : error
      );
    } finally {
      silentRegistration = null;
    }
  })();
  return silentRegistration;
}

// Every successful login (setToken emits the new token).
onTokenChange((token) => {
  if (!token) return;
  tokenRegistered = false;
  registeredToken = null;
  void registerPushTokenIfPermitted();
});

/**
 * Wire the tap-on-notification handler. Returns an unsubscribe function.
 * The backend sends data payloads like { type: "message", conversationId } /
 * { type: "match" } (see backend lib/notify.ts).
 */
export function addNotificationResponseListener(
  onNavigate: (path: string) => void
): () => void {
  let active = true;

  const handle = (response: Notifications.NotificationResponse) => {
    // One navigation per tap: the cold-start lookup below and the live
    // listener can both see the same response.
    const id = responseId(response);
    if (id && handledResponseIds.has(id)) return;
    if (id) {
      handledResponseIds.add(id);
      setItem(LAST_HANDLED_RESPONSE_KEY, id).catch(() => undefined);
    }
    onNavigate(pathForResponse(response));
  };

  const sub = Notifications.addNotificationResponseReceivedListener(handle);

  // Cold start: a tap that launched the killed app (or arrived while the user
  // was still on the splash / sign-in screens) fired before this listener
  // existed. The listener is installed once the signed-in tabs mount, i.e.
  // after auth completes, so replaying the last response here opens the right
  // conversation at the right moment.
  (async () => {
    try {
      const last = await Notifications.getLastNotificationResponseAsync();
      if (!active || !last) return;
      const id = responseId(last);
      // Android can keep returning the same response on later launches.
      if (id && id === (await getItem(LAST_HANDLED_RESPONSE_KEY))) return;
      if (!active) return;
      handle(last);
    } catch (error) {
      console.warn("Cold-start notification lookup failed:", error);
    }
  })();

  return () => {
    active = false;
    sub.remove();
  };
}

const LAST_HANDLED_RESPONSE_KEY = "conversa_last_notification_response";
const handledResponseIds = new Set<string>();

function responseId(response: Notifications.NotificationResponse): string | null {
  const id = response?.notification?.request?.identifier;
  if (!id) return null;
  return `${id}:${response.notification.date ?? ""}`;
}

function pathForResponse(response: Notifications.NotificationResponse): string {
  try {
    const data = response.notification.request.content.data as any;
    if (data?.conversationId) return `/conversation/${data.conversationId}`;
    if (data?.type === "match" || data?.type === "request") return "/(tabs)/likes";
    return "/(tabs)/chat";
  } catch {
    return "/(tabs)/chat";
  }
}
