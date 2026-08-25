import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Card } from "@/src/components/Card";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

type LikeLimitModalProps = {
  visible: boolean;
  onClose: () => void;
  onWatchAd: () => void;
  likesUsed: number;
  likesLimit: number;
  isPremium: boolean;
  watchingAd: boolean;
};

export function LikeLimitModal({
  visible,
  onClose,
  onWatchAd,
  likesUsed,
  likesLimit,
  isPremium,
  watchingAd,
}: LikeLimitModalProps) {
  const router = useRouter();
  const { t } = useTranslation();

  if (isPremium) {
    return null; // Premium users shouldn't see this
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Card style={styles.modalCard}>
          <Text style={styles.title}>{t("home.like_limit.title")}</Text>
          <Text style={styles.description}>
            {t("home.like_limit.body", { used: likesUsed, limit: likesLimit })}
          </Text>

          <View style={styles.options}>
            <PrimaryButton
              title={t("home.like_limit.go_premium")}
              onPress={() => {
                onClose();
                router.push("/premium");
              }}
              style={styles.premiumButton}
            />

            <TouchableOpacity
              style={styles.adButton}
              onPress={onWatchAd}
              disabled={watchingAd}
            >
              {watchingAd ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={styles.adButtonText}>{t("home.like_limit.watch_ad")}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>{t("home.like_limit.later")}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>
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
  modalCard: {
    width: "100%",
    maxWidth: 400,
    padding: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  options: {
    gap: spacing.md,
  },
  premiumButton: {
    width: "100%",
  },
  adButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  adButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  cancelText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
});

