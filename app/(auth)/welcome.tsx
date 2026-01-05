import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { RainBackground } from "@/src/components/RainBackground";
import { api } from "@/src/services/api";
import { setToken } from "@/src/services/authStore";
import { useTranslation } from "react-i18next";

WebBrowser.maybeCompleteAuthSession();

export default function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Check if Google Client IDs are configured
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  const hasGoogleConfig = Platform.select({
    ios: !!iosClientId,
    android: !!androidClientId,
    web: !!webClientId,
    default: false,
  });

  // Only initialize Google auth if Client IDs are configured
  const googleAuthConfig = hasGoogleConfig
    ? {
      iosClientId: iosClientId || undefined,
      androidClientId: androidClientId || undefined,
      webClientId: webClientId || undefined,
    }
    : undefined;

  const [request, response, promptAsync] = Google.useAuthRequest(
    googleAuthConfig || {
      // Minimal config to prevent hook errors when not configured
      // This won't be used since hasGoogleConfig will be false
      iosClientId: "",
      androidClientId: "",
      webClientId: "",
    }
  );

  React.useEffect(() => {
    if (response?.type === "success") {
      handleGoogleSignIn(response.authentication);
    }
  }, [response]);

  const handleGoogleSignIn = async (authentication: any) => {
    if (!authentication?.idToken) {
      Alert.alert("Error", "Failed to get Google authentication token");
      return;
    }

    setLoading(true);
    try {
      // Verify token with Google and get user info
      const userInfoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${authentication.accessToken}`
      );
      const userInfo = await userInfoResponse.json();

      if (!userInfo.email) {
        Alert.alert("Error", "Failed to get email from Google account");
        return;
      }

      // Login with email from Google
      const result = await api.loginEmail(userInfo.email);

      if (result.requiresCode) {
        setLoading(false);
        router.push({
          pathname: "/(auth)/verify-code",
          params: {
            mode: "email",
            identifier: userInfo.email,
            userId: result.userId,
          },
        });
        return;
      }

      if (result.token) {
        await setToken(result.token);
        setLoading(false);
        router.replace("/(auth)/profile-setup");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to sign in with Google";
      Alert.alert("Error", errorMessage);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <RainBackground />
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Swiip</Text>
        <Text style={styles.subtitle}>Your premium dating experience</Text>

        <PrimaryButton
          title="Continue with Email"
          onPress={() => router.push("/(auth)/auth?mode=email")}
          style={styles.button}
          disabled={loading}
        />

        {hasGoogleConfig && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => {
                if (hasGoogleConfig && request) {
                  promptAsync();
                } else {
                  Alert.alert(
                    "Google Sign-In Not Available",
                    "Google authentication is not configured. Please contact support."
                  );
                }
              }}
              disabled={!request || loading || !hasGoogleConfig}
              activeOpacity={0.7}
            >
              <View style={styles.googleIcon}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize["4xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  button: {
    width: "100%",
  },
  buttonSecondary: {
    backgroundColor: colors.primaryDark,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    justifyContent: "center",
    alignItems: "center",
  },
  googleIconText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  googleButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
  },
});

