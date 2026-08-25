import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

/**
 * Empty states used to render a 64px emoji (💬, 💔). Emoji are drawn by the
 * platform's colour font, so they never match the app's palette and shift
 * appearance between Android versions — and greeting someone who has no
 * likes yet with a broken heart reads as rejection rather than an invitation.
 * They are vector icons in a tinted circle now.
 */
type EmptyStateProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
  ctaText?: string;
  onCtaPress?: () => void;
  style?: ViewStyle;
};

export function EmptyState({
  icon,
  title,
  description,
  ctaText,
  onCtaPress,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!description && <Text style={styles.description}>{description}</Text>}
      {ctaText && onCtaPress && (
        <View style={styles.ctaContainer}>
          <PrimaryButton title={ctaText} onPress={onCtaPress} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  ctaContainer: {
    width: "100%",
    maxWidth: 300,
  },
});
