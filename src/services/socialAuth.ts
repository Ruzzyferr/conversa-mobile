import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { api } from "./api";
import { setToken } from "./authStore";

/**
 * Google / Apple sign-in.
 *
 * Both providers hand back a signed identity token which the backend verifies
 * against the provider's public keys (`POST /auth/social`). Nothing the client
 * says about who the user is is trusted, so there is no e-mail OTP step on top
 * — the previous Google flow made people do both, which was friction without
 * added proof.
 */

export class SocialCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "SocialCancelled";
  }
}

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

let googleConfigured = false;

/** Google sign-in is only offered when a web client id is compiled in. */
export function isGoogleAvailable(): boolean {
  return !!GOOGLE_WEB_CLIENT_ID;
}

/** Apple requires iOS 13+; the button must be hidden everywhere else. */
export async function isAppleAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

function configureGoogle() {
  if (googleConfigured) return;
  GoogleSignin.configure({
    // The ID token is minted for the web client, which is why the backend
    // accepts that id as an audience alongside the native ones.
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
  googleConfigured = true;
}

export interface SocialResult {
  token: string;
  userId: string;
  profileExists: boolean;
  suggestedName: string | null;
}

async function exchange(
  provider: "google" | "apple",
  idToken: string,
  fullName?: string
): Promise<SocialResult> {
  const result = await api.socialLogin({ provider, idToken, fullName });
  await setToken(result.token);
  return result;
}

export async function signInWithGoogle(): Promise<SocialResult> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error("Google sign-in is not configured in this build");
  }
  configureGoogle();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Drop any cached native account before starting an interactive sign-in.
    //
    // Google's SDK hands back the previously signed-in account with no UI at
    // all, so tapping "Continue with Google" silently reused whichever account
    // had signed in on this device before — the person never got to choose,
    // and on a shared or multi-account phone that is the wrong account. That
    // path does not reliably mint a fresh ID token either, so the attempt then
    // died at "Google did not return an identity token" without ever reaching
    // our server.
    //
    // Someone tapping a sign-in button is asking to pick an account, so the
    // picker should always appear. This only clears the local session — it
    // does not revoke the grant, so no repeated consent screen — and it is
    // unconditional because hasPreviousSignIn() reads this app's own record,
    // which "clear data" or a reinstall wipes even when the Play services
    // session it would have reused survives.
    try {
      await GoogleSignin.signOut();
    } catch {
      // Best effort — a stale cache must not block a fresh sign-in attempt.
    }

    const response = await GoogleSignin.signIn();

    // v13+ returns { type: 'success' | 'cancelled', data }; older builds
    // returned the user object directly.
    const anyResponse = response as any;
    if (anyResponse?.type === "cancelled") throw new SocialCancelled();
    const idToken: string | undefined =
      anyResponse?.data?.idToken ?? anyResponse?.idToken;

    if (!idToken) throw new Error("Google did not return an identity token");
    return await exchange("google", idToken);
  } catch (error: any) {
    if (error instanceof SocialCancelled) throw error;
    if (
      error?.code === statusCodes.SIGN_IN_CANCELLED ||
      error?.code === statusCodes.IN_PROGRESS
    ) {
      throw new SocialCancelled();
    }
    throw error;
  }
}

export async function signInWithApple(): Promise<SocialResult> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error("Apple did not return an identity token");
    }

    // Apple sends the name ONLY on the very first authorization for this
    // Apple ID / app pair. Forward it now or it is unrecoverable.
    const name = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return await exchange("apple", credential.identityToken, name || undefined);
  } catch (error: any) {
    if (error?.code === "ERR_REQUEST_CANCELED" || error?.code === "ERR_CANCELED") {
      throw new SocialCancelled();
    }
    throw error;
  }
}

/** Clear the native Google session so the next sign-in shows the picker. */
export async function signOutSocial(): Promise<void> {
  try {
    if (googleConfigured) await GoogleSignin.signOut();
  } catch {
    // Signing out of a provider must never block signing out of the app.
  }
}
