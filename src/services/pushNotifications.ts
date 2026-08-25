import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "./api";
import i18n from "@/src/i18n";

let isConfigured = false;
let tokenRegistered = false;

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
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.warn("Push notification permission not granted");
      return;
    }

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
    // every user received Turkish push notifications.
    await api.registerPushToken({ token, platform, locale: i18n.language });
    tokenRegistered = true;
    console.log("Push token registered");
  } catch (error) {
    // Expected until google-services.json ships in the build — stay silent-ish.
    console.warn("Push token registration skipped:", error instanceof Error ? error.message : error);
  }
}

/**
 * Wire the tap-on-notification handler. Returns an unsubscribe function.
 * The backend sends data payloads like { type: "message", conversationId } /
 * { type: "match" } (see backend lib/notify.ts).
 */
export function addNotificationResponseListener(
  onNavigate: (path: string) => void
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    try {
      const data = response.notification.request.content.data as any;
      if (data?.conversationId) {
        onNavigate(`/conversation/${data.conversationId}`);
      } else if (data?.type === "match" || data?.type === "request") {
        onNavigate("/(tabs)/likes");
      } else {
        onNavigate("/(tabs)/chat");
      }
    } catch {
      onNavigate("/(tabs)/chat");
    }
  });
  return () => sub.remove();
}
