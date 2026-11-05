import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, textStyles } from "@/src/theme";
import { api } from "@/src/services/api";
import { getApiErrorCode, friendlyApiErrorMessage } from "@/src/services/apiErrors";

export type Track = "DATE" | "LANGUAGE";
type Purpose = "CONVERSATION" | "PRACTICE" | "COFFEE";

type Props = {
  track: Track;
  /** Called with the new track (and the purpose the server now stores). */
  onChanged: (track: Track, purpose: Purpose) => void;
};

function cooldownDate(error: unknown, locale: string): string | null {
  const iso = (error as any)?.response?.data?.error?.details?.availableAt
    ?? (error as any)?.response?.data?.details?.availableAt;
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString(locale);
}

/**
 * Switch between the dating and the language side.
 *
 * The server owns the rules (TRACK_COOLDOWN, PROOF_REQUIRED). The profile
 * update replaces every field, so this re-sends the stored profile unchanged
 * with only `track` (and a matching purpose) changed — unsaved edits on the
 * surrounding screen are not submitted by accident.
 */
export function TrackSwitch({ track, onChanged }: Props) {
  const { t, i18n } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const target: Track = track === "DATE" ? "LANGUAGE" : "DATE";

  const doSwitch = async () => {
    setBusy(true);
    try {
      const p = await api.getMyProfile();
      const purpose: Purpose =
        target === "LANGUAGE" ? "PRACTICE" : p.purpose === "PRACTICE" ? "CONVERSATION" : p.purpose;
      await api.upsertMyProfile({
        displayName: p.displayName,
        birthYear: p.birthYear ?? undefined,
        city: p.city ?? undefined,
        country: p.country ?? undefined,
        lat: p.lat ?? undefined,
        lng: p.lng ?? undefined,
        gender: p.gender ?? undefined,
        languagesNative: p.languagesNative,
        languagesPractice: p.languagesPractice,
        purpose,
        track: target,
        bio: p.bio ?? undefined,
        photos: p.photos,
        interests: p.interests,
      });
      setConfirming(false);
      onChanged(target, purpose);
      Alert.alert(t("track_switch.done_title"), t(`track_switch.done_${target.toLowerCase()}`));
    } catch (error) {
      setConfirming(false);
      const code = getApiErrorCode(error);
      let message: string;
      if (code === "TRACK_COOLDOWN") {
        const date = cooldownDate(error, i18n.language);
        message = date
          ? t("track_switch.error_cooldown_until", { date })
          : t("track_switch.error_cooldown");
      } else if (code === "PROOF_REQUIRED") {
        message = t("track_switch.error_proof");
      } else {
        message = friendlyApiErrorMessage(error) ?? t("track_switch.error_generic");
      }
      Alert.alert(t("common.error"), message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <View style={styles.current}>
        <MaterialIcons
          name={track === "LANGUAGE" ? "translate" : "favorite"}
          size={20}
          color={colors.primary}
        />
        <Text style={styles.currentText}>
          {t(`track_switch.current_${track.toLowerCase()}`)}
        </Text>
      </View>
      <Pressable
        style={styles.button}
        onPress={() => setConfirming(true)}
        accessibilityRole="button"
        testID="track-switch"
      >
        <Text style={styles.buttonText}>{t(`track_switch.switch_to_${target.toLowerCase()}`)}</Text>
      </Pressable>

      <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Text style={styles.title}>{t(`track_switch.confirm_title_${target.toLowerCase()}`)}</Text>
            <Text style={styles.item}>• {t("track_switch.consequence_wall")}</Text>
            <Text style={styles.item}>• {t("track_switch.consequence_cooldown")}</Text>
            {target === "LANGUAGE" ? (
              <Text style={styles.item}>• {t("track_switch.consequence_exam")}</Text>
            ) : null}
            <Pressable
              style={[styles.confirm, busy && { opacity: 0.6 }]}
              onPress={doSwitch}
              disabled={busy}
              accessibilityRole="button"
              testID="track-switch-confirm"
            >
              {busy ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.confirmText}>{t("track_switch.confirm")}</Text>
              )}
            </Pressable>
            <Pressable style={styles.cancel} onPress={() => setConfirming(false)} disabled={busy}>
              <Text style={styles.cancelText}>{t("common.cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  current: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  currentText: { ...textStyles.body, color: colors.textDark ?? colors.text },
  button: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { ...textStyles.label, color: colors.primary },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    padding: spacing.lg,
  },
  dialog: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { ...textStyles.heading, color: colors.text, marginBottom: spacing.xs },
  item: { ...textStyles.bodySmall, color: colors.textSecondary },
  confirm: {
    marginTop: spacing.md,
    minHeight: 50,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: { ...textStyles.label, color: colors.textInverse },
  cancel: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  cancelText: { ...textStyles.label, color: colors.textSecondary },
});
