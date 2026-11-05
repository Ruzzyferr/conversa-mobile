import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { SAFETY_REASON_LABEL_KEYS } from "@/src/components/chat/LeaveReasonModal";

/** Reasons accepted by POST /safety/report. */
export type ReportReason = "SPAM" | "HARASSMENT" | "NUDITY" | "SCAM" | "OTHER";

const REASONS: readonly ReportReason[] = ["SPAM", "HARASSMENT", "NUDITY", "SCAM", "OTHER"];

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called with the tapped reason; the sheet shows a spinner until it settles. */
  onSelect: (reason: ReportReason) => Promise<void> | void;
};

/**
 * Report-reason picker. Replaces an Alert.alert with five reason buttons:
 * Android's Alert keeps only three buttons (Scam, Other and Cancel were lost)
 * and is not cancelable. This sheet lists every reason plus Cancel and closes
 * on the back button and on a backdrop tap. Same look as LeaveReasonModal.
 */
export function ReportReasonSheet({ visible, onClose, onSelect }: Props) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState<ReportReason | null>(null);

  useEffect(() => {
    if (visible) setSubmitting(null);
  }, [visible]);

  const close = () => {
    if (!submitting) onClose();
  };

  const select = async (reason: ReportReason) => {
    if (submitting) return;
    setSubmitting(reason);
    try {
      await onSelect(reason);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        style={styles.overlay}
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel={t("common.cancel")}
      >
        {/* Inner Pressable swallows taps so they do not reach the backdrop. */}
        <Pressable style={styles.card} onPress={() => undefined} accessible={false}>
          <Text style={styles.title}>{t("safety.report_title")}</Text>
          <Text style={styles.subtitle}>{t("safety.report_msg")}</Text>

          <View style={styles.reasonList}>
            {REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.reasonRow}
                onPress={() => select(reason)}
                disabled={submitting !== null}
                accessibilityRole="button"
                testID={`report-reason-${reason.toLowerCase()}`}
              >
                <Text style={styles.reasonText}>{t(SAFETY_REASON_LABEL_KEYS[reason])}</Text>
                {submitting === reason && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={close}
            disabled={submitting !== null}
            accessibilityRole="button"
            testID="report-reason-cancel"
          >
            <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
    backgroundColor: colors.backgroundDark,
  },
  reasonText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.textDark,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondaryDark,
  },
});
