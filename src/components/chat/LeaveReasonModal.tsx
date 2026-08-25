import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

// Maps backend safety reason codes to their i18n label keys.
// Includes legacy report reasons so moderation warnings referencing
// older reports still resolve to a readable label.
export const SAFETY_REASON_LABEL_KEYS: Record<string, string> = {
  HARASSMENT: "safety.reason_harassment",
  INAPPROPRIATE_MESSAGES: "safety.reason_inappropriate",
  FAKE_PROFILE: "safety.reason_fake",
  RUDE: "safety.reason_rude",
  NOT_INTERESTED: "safety.reason_not_interested",
  OTHER: "safety.reason_other",
  SPAM: "safety.reason_spam",
  NUDITY: "safety.reason_nudity",
  SCAM: "safety.reason_scam",
};

const REPORT_REASONS = [
  "HARASSMENT",
  "INAPPROPRIATE_MESSAGES",
  "FAKE_PROFILE",
  "RUDE",
  "OTHER",
] as const;

const REMOVE_REASONS = [
  "HARASSMENT",
  "INAPPROPRIATE_MESSAGES",
  "FAKE_PROFILE",
  "RUDE",
  "NOT_INTERESTED",
  "OTHER",
] as const;

type LeaveReasonModalProps = {
  visible: boolean;
  mode: "report" | "remove";
  onClose: () => void;
  onSubmit: (reason: string, details?: string) => Promise<void> | void;
  displayName?: string;
};

export function LeaveReasonModal({
  visible,
  mode,
  onClose,
  onSubmit,
  displayName,
}: LeaveReasonModalProps) {
  const { t } = useTranslation();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset selection every time the modal is (re)opened
  useEffect(() => {
    if (visible) {
      setSelectedReason(null);
      setDetails("");
      setSubmitting(false);
    }
  }, [visible]);

  const reasons = mode === "remove" ? REMOVE_REASONS : REPORT_REASONS;
  const title =
    mode === "report" ? t("safety.report_title") : t("safety.remove_title");
  const subtitle =
    mode === "report"
      ? t("safety.report_subtitle")
      : t("safety.remove_subtitle");

  const handleConfirm = async () => {
    if (!selectedReason || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(selectedReason, details.trim() || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.card}>
          <Text style={styles.title}>
            {displayName ? `${title} · ${displayName}` : title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.reasonList}>
            {reasons.map((reason) => {
              const selected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonRow, selected && styles.reasonRowSelected]}
                  onPress={() => setSelectedReason(reason)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                  <Text
                    style={[styles.reasonText, selected && styles.reasonTextSelected]}
                  >
                    {t(SAFETY_REASON_LABEL_KEYS[reason])}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedReason === "OTHER" && (
            <TextInput
              style={styles.detailsInput}
              value={details}
              onChangeText={setDetails}
              placeholder={t("safety.details_placeholder")}
              placeholderTextColor={colors.textSecondaryDark}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                mode === "remove"
                  ? styles.confirmButtonRemove
                  : styles.confirmButtonReport,
                (!selectedReason || submitting) && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!selectedReason || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.onMedia} />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {mode === "report"
                    ? t("safety.confirm_report")
                    : t("safety.confirm_remove")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 20,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  reasonList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
    backgroundColor: colors.backgroundDark,
  },
  reasonRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  reasonText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textDark,
  },
  reasonTextSelected: {
    color: colors.primaryTintText,
    fontWeight: typography.fontWeight.semibold,
  },
  detailsInput: {
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.textDark,
    minHeight: 80,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderDark,
    backgroundColor: "transparent",
  },
  cancelButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondaryDark,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonReport: {
    backgroundColor: colors.primary,
  },
  confirmButtonRemove: {
    backgroundColor: colors.error,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.onMedia,
  },
});
