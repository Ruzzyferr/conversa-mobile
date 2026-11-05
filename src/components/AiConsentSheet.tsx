import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, textStyles } from "@/src/theme";
import { LEGAL_URLS } from "@/src/config/legal";
import {
  AiConsent,
  getCachedAiConsent,
  isAiConsentRequiredError,
  loadAiConsent,
  saveAiConsent,
  subscribeAiConsent,
} from "@/src/services/aiConsent";

export type AiFeature = "voice" | "ai";

const PRIVACY_URL = LEGAL_URLS.privacy;

type SheetProps = {
  visible: boolean;
  /** Which feature asked; voice notes get the "unavailable without it" line. */
  feature: AiFeature;
  busy?: boolean;
  error?: string | null;
  onAllow: () => void;
  onDecline: () => void;
};

/**
 * One-time AI data-sharing consent (App Store 5.1.2(i)).
 *
 * Names exactly what leaves the device and who receives it. Shown before the
 * first AI feature or voice note, never at cold start.
 */
export function AiConsentSheet({ visible, feature, busy, error, onAllow, onDecline }: SheetProps) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID="ai-consent-sheet">
          <ScrollView contentContainerStyle={{ gap: spacing.md }} bounces={false}>
            <View style={styles.iconWrap}>
              <MaterialIcons name="privacy-tip" size={28} color={colors.primary} />
            </View>
            <Text style={styles.title}>{t("ai_consent.title")}</Text>
            <Text style={styles.body}>{t("ai_consent.intro")}</Text>

            <View style={styles.row}>
              <MaterialIcons name="mic" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{t("ai_consent.voice_title")}</Text>
                <Text style={styles.rowBody}>{t("ai_consent.voice_body")}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <MaterialIcons name="auto-fix-high" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{t("ai_consent.ai_title")}</Text>
                <Text style={styles.rowBody}>{t("ai_consent.ai_body")}</Text>
              </View>
            </View>

            <Text style={styles.note}>{t("ai_consent.not_used")}</Text>
            {feature === "voice" ? (
              <Text style={styles.warn}>{t("ai_consent.voice_required")}</Text>
            ) : null}
            <Text style={styles.note}>{t("ai_consent.change_later")}</Text>
            <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link">
              <Text style={styles.link}>{t("ai_consent.privacy_link")}</Text>
            </Pressable>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <Pressable
            style={[styles.allow, busy && { opacity: 0.6 }]}
            onPress={onAllow}
            disabled={busy}
            accessibilityRole="button"
            testID="ai-consent-allow"
          >
            {busy ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.allowText}>{t("ai_consent.allow")}</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.decline}
            onPress={onDecline}
            disabled={busy}
            accessibilityRole="button"
            testID="ai-consent-decline"
          >
            <Text style={styles.declineText}>{t("ai_consent.not_now")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Gate for AI call sites.
 *
 *   const { requireAiConsent, handleAiError, consentSheet } = useAiConsentGate();
 *   if (!(await requireAiConsent("ai"))) return;
 *   try { await api.polishMessage(...) } catch (e) { if (handleAiError(e)) return; ... }
 *   ...render {consentSheet}
 *
 * If the user declined earlier, tapping the feature shows the sheet again so
 * they can change their mind. Resolves true only when consent is granted.
 */
export function useAiConsentGate() {
  const { t } = useTranslation();
  const [consent, setConsent] = useState<AiConsent | undefined>(getCachedAiConsent());
  const [visible, setVisible] = useState(false);
  const [feature, setFeature] = useState<AiFeature>("ai");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  useEffect(() => {
    const unsub = subscribeAiConsent(setConsent);
    // Warm the cache so the first tap does not wait on the network.
    void loadAiConsent().then(setConsent);
    return () => {
      unsub();
      resolver.current?.(false);
      resolver.current = null;
    };
  }, []);

  const finish = useCallback((ok: boolean) => {
    setVisible(false);
    setBusy(false);
    setError(null);
    const r = resolver.current;
    resolver.current = null;
    r?.(ok);
  }, []);

  const openSheet = useCallback((kind: AiFeature) => {
    resolver.current?.(false);
    setFeature(kind);
    setError(null);
    setVisible(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  /**
   * `proceedAfterSheet: false` -> when the sheet had to be shown, resolve
   * false even after Allow, so the caller waits for a fresh tap (used by the
   * voice recorder: recording must never start on its own after a dialog).
   */
  const requireAiConsent = useCallback(
    async (
      kind: AiFeature = "ai",
      options: { proceedAfterSheet?: boolean } = {}
    ): Promise<boolean> => {
      const current = await loadAiConsent();
      if (current === "granted") return true;
      const granted = await openSheet(kind);
      return options.proceedAfterSheet === false ? false : granted;
    },
    [openSheet]
  );

  /** Call from a catch block. True when the error was a consent refusal (sheet shown). */
  const handleAiError = useCallback(
    (err: unknown, kind: AiFeature = "ai"): boolean => {
      if (!isAiConsentRequiredError(err)) return false;
      void openSheet(kind);
      return true;
    },
    [openSheet]
  );

  const onAllow = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await saveAiConsent(true);
      finish(true);
    } catch {
      setBusy(false);
      setError(t("ai_consent.save_error"));
    }
  }, [finish, t]);

  const onDecline = useCallback(async () => {
    // Record the "no" (best effort) so the server and other devices agree;
    // the sheet comes back the next time the user taps an AI feature.
    finish(false);
    if (getCachedAiConsent() !== "declined") {
      saveAiConsent(false).catch(() => {});
    }
  }, [finish]);

  const consentSheet = (
    <AiConsentSheet
      visible={visible}
      feature={feature}
      busy={busy}
      error={error}
      onAllow={onAllow}
      onDecline={onDecline}
    />
  );

  return { consent, requireAiConsent, handleAiError, consentSheet };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: "90%",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...textStyles.title, color: colors.text },
  body: { ...textStyles.body, color: colors.textSecondary },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rowTitle: { ...textStyles.label, color: colors.text, marginBottom: 2 },
  rowBody: { ...textStyles.bodySmall, color: colors.textSecondary },
  note: { ...textStyles.bodySmall, color: colors.textSecondary },
  warn: { ...textStyles.bodySmall, color: colors.warning },
  link: { ...textStyles.bodySmall, color: colors.primary, textDecorationLine: "underline" },
  error: { ...textStyles.bodySmall, color: colors.error },
  allow: {
    marginTop: spacing.sm,
    minHeight: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  allowText: { ...textStyles.label, color: colors.textInverse },
  decline: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  declineText: { ...textStyles.label, color: colors.textSecondary },
});
