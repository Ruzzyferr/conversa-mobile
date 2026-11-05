import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Switch, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, textStyles } from "@/src/theme";
import {
  AiConsent,
  getCachedAiConsent,
  loadAiConsent,
  saveAiConsent,
  subscribeAiConsent,
} from "@/src/services/aiConsent";
import { AiConsentSheet } from "@/src/components/AiConsentSheet";

/**
 * Settings row to change the AI data-sharing answer later.
 * Turning it on shows the full consent sheet first (informed consent);
 * turning it off asks for confirmation and records "declined".
 * Self-contained: mount it anywhere in a settings list.
 */
export function AiConsentToggle() {
  const { t } = useTranslation();
  const [consent, setConsent] = useState<AiConsent | undefined>(getCachedAiConsent());
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeAiConsent(setConsent);
    void loadAiConsent(true).then(setConsent);
    return unsub;
  }, []);

  const granted = consent === "granted";

  const revoke = () => {
    Alert.alert(t("ai_consent.revoke_title"), t("ai_consent.revoke_msg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("ai_consent.revoke_confirm"),
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await saveAiConsent(false);
          } catch {
            Alert.alert(t("common.error"), t("ai_consent.save_error"));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.row} testID="ai-consent-toggle">
      <MaterialIcons name="privacy-tip" size={22} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t("ai_consent.setting_title")}</Text>
        <Text style={styles.body}>
          {granted ? t("ai_consent.setting_on") : t("ai_consent.setting_off")}
        </Text>
      </View>
      <Switch
        value={granted}
        disabled={busy || consent === undefined}
        onValueChange={(next) => {
          if (next) {
            setError(null);
            setSheet(true);
          } else {
            revoke();
          }
        }}
        trackColor={{ true: colors.primary, false: colors.border }}
        accessibilityLabel={t("ai_consent.setting_title")}
      />
      <AiConsentSheet
        visible={sheet}
        feature="ai"
        busy={busy}
        error={error}
        onAllow={async () => {
          setBusy(true);
          setError(null);
          try {
            await saveAiConsent(true);
            setSheet(false);
          } catch {
            setError(t("ai_consent.save_error"));
          } finally {
            setBusy(false);
          }
        }}
        onDecline={() => setSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { ...textStyles.label, color: colors.text },
  body: { ...textStyles.bodySmall, color: colors.textSecondary, marginTop: 2 },
});
