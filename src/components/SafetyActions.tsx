import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { api } from "@/src/services/api";
import { ReportReasonSheet, type ReportReason } from "@/src/components/ReportReasonSheet";

type Props = {
  userId: string;
  /** Called after a successful block or report (close the sheet, refresh lists). */
  onDone?: (action: "block" | "report") => void;
};

/**
 * Block / Report row, same flow and API calls as the discovery card
 * (home.tsx handleBlock / handleReport): confirm, call /safety/block or
 * /safety/report, then confirm with a toast.
 */
export function SafetyActions({ userId, onDone }: Props) {
  const { t } = useTranslation();

  const block = () => {
    Alert.alert(t("safety.block_confirm_title"), t("safety.block_confirm_msg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("safety.block"),
        style: "destructive",
        onPress: async () => {
          try {
            await api.blockUser(userId);
            onDone?.("block");
            Alert.alert(t("safety.blocked_toast"));
          } catch (e) {
            console.error("block failed", e);
            Alert.alert(t("common.error"), t("safety_actions.failed"));
          }
        },
      },
    ]);
  };

  const [reportOpen, setReportOpen] = useState(false);

  const report = () => setReportOpen(true);

  const submitReport = async (reason: ReportReason) => {
    try {
      await api.reportUser(userId, reason);
      setReportOpen(false);
      onDone?.("report");
      Alert.alert(t("safety.reported_toast"));
    } catch (e) {
      console.error("report failed", e);
      Alert.alert(t("common.error"), t("safety_actions.failed"));
    }
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.button}
        onPress={block}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={t("safety.block")}
        testID="profile-block"
      >
        <Text style={styles.blockText}>{t("safety.block")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={report}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={t("safety.report")}
        testID="profile-report"
      >
        <Text style={styles.reportText}>{t("safety.report")}</Text>
      </TouchableOpacity>
      <ReportReasonSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        onSelect={submitReport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  button: { paddingVertical: spacing.sm },
  blockText: { fontSize: 16, fontWeight: "600", color: colors.textSecondaryDark },
  reportText: { fontSize: 16, fontWeight: "600", color: colors.passRed },
});
