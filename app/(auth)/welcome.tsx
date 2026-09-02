import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { BrandTexture } from "@/src/components/brand/BrandTexture";
import { Wordmark } from "@/src/components/brand/Wordmark";
import { MaterialIcons } from "@expo/vector-icons";
import { LEGAL_URLS } from "@/src/config/legal";
import {
  isGoogleAvailable,
  isAppleAvailable,
  signInWithGoogle,
  signInWithApple,
  SocialCancelled,
} from "@/src/services/socialAuth";

const dc = {
  ...colors,
  background: colors.backgroundDark,
  surface: colors.surfaceDark,
  text: colors.textDark,
  textSecondary: colors.textSecondaryDark,
  border: colors.borderDark,
};

type Busy = null | "google" | "apple";

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleReady, setAppleReady] = useState(false);

  const googleReady = isGoogleAvailable();

  useEffect(() => {
    let alive = true;
    isAppleAvailable().then((ok) => alive && setAppleReady(ok));
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Social sign-in returns a session straight away, so route by whether the
   * account already has a profile instead of sending everyone to setup.
   */
  const handleSocial = async (provider: "google" | "apple") => {
    setError(null);
    setBusy(provider);
    try {
      const result =
        provider === "google" ? await signInWithGoogle() : await signInWithApple();

      if (result.profileExists) {
        router.replace("/(tabs)/home");
      } else {
        router.replace({
          pathname: "/(auth)/profile-setup",
          params: result.suggestedName ? { suggestedName: result.suggestedName } : {},
        });
      }
    } catch (e) {
      // A user backing out of the provider sheet is not an error worth showing.
      if (!(e instanceof SocialCancelled)) {
        setError(t("welcome.social_failed"));
      }
    } finally {
      setBusy(null);
    }
  };

  const showDivider = googleReady || appleReady;

  return (
    <SafeAreaView style={styles.container}>
      <BrandTexture intensity="soft" />
      <View style={styles.content}>
        <View style={styles.header}>
          <Wordmark size="lg" />
          <Text style={styles.subtitle}>{t("welcome.subtitle")}</Text>

          {/* Uc kanit satiri. Eskiden burasi bostu ve ekranin %40'i
              bir boslukla geciyordu; bir karsilama ekraninin isi
              uygulamanin NE OLDUGUNU soylemek. Uc satir da gercekten
              yaptigimiz seyler. */}
          <View style={styles.proof}>
            {(["proof_1", "proof_2", "proof_3"] as const).map((k) => (
              <View key={k} style={styles.proofRow}>
                <MaterialIcons name="check" size={15} color={colors.primary} />
                <Text style={styles.proofText}>{t(`welcome.${k}`)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            title={t("welcome.continue_email")}
            onPress={() => router.push("/(auth)/auth?mode=email")}
            style={styles.button}
            disabled={busy !== null}
          />

          {showDivider && (
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t("welcome.or")}</Text>
              <View style={styles.dividerLine} />
            </View>
          )}

          {googleReady && (
            <TouchableOpacity
              style={[styles.socialButton, styles.googleButton]}
              onPress={() => handleSocial("google")}
              disabled={busy !== null}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t("welcome.continue_google")}
            >
              {busy === "google" ? (
                <ActivityIndicator size="small" color="#1F1F1F" />
              ) : (
                <>
                  <GoogleMark />
                  <Text style={styles.googleText}>{t("welcome.continue_google")}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {appleReady && (
            <TouchableOpacity
              style={[styles.socialButton, styles.appleButton]}
              onPress={() => handleSocial("apple")}
              disabled={busy !== null}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t("welcome.continue_apple")}
            >
              {busy === "apple" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                  <Text style={styles.appleText}>{t("welcome.continue_apple")}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>

        <Text style={styles.legal}>
          {t("welcome.legal")}{" "}
          <Text
            style={styles.legalLink}
            onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}
          >
            {t("welcome.terms")}
          </Text>
          {"  ·  "}
          <Text
            style={styles.legalLink}
            onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)}
          >
            {t("welcome.privacy")}
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

/**
 * Google's mark, drawn from its four brand colours. Google's branding rules
 * require the real logo on the button — a letter "G" in a blue circle (what
 * this screen used to draw) is not compliant.
 */
function GoogleMark() {
  return (
    <View style={styles.googleMark}>
      <View style={[styles.googleQuad, { backgroundColor: "#EA4335", top: 0, left: 0 }]} />
      <View style={[styles.googleQuad, { backgroundColor: "#4285F4", top: 0, right: 0 }]} />
      <View style={[styles.googleQuad, { backgroundColor: "#34A853", bottom: 0, right: 0 }]} />
      <View style={[styles.googleQuad, { backgroundColor: "#FBBC05", bottom: 0, left: 0 }]} />
      <View style={styles.googleHole} />
      <Text style={styles.googleG}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dc.background },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.lg,
  },
  header: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.lg,
    lineHeight: typography.fontSize.lg * 1.4,
    color: dc.textSecondary,
    textAlign: "center",
    maxWidth: 300,
  },
  proof: { gap: spacing.sm, marginTop: spacing.sm },
  proofRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  proofText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
  actions: { gap: spacing.md },
  button: { width: "100%" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: spacing.xs },
  dividerLine: { flex: 1, height: 1, backgroundColor: dc.border },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: typography.fontSize.sm,
    color: dc.textSecondary,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    height: 52,
    gap: spacing.sm,
  },
  googleButton: { backgroundColor: "#FFFFFF" },
  googleText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: "#1F1F1F",
  },
  appleButton: { backgroundColor: "#000000" },
  appleText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: "#FFFFFF",
  },
  googleMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  googleQuad: { position: "absolute", width: 10, height: 10 },
  googleHole: {
    position: "absolute",
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
  },
  googleG: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: typography.fontWeight.bold,
    color: "#4285F4",
  },
  error: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  legal: {
    fontSize: typography.fontSize.xs,
    lineHeight: 18,
    color: dc.textSecondary,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  legalLink: { color: colors.primary, textDecorationLine: "underline" },
});
