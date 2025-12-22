import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type EmptyStateProps = {
  icon: string;
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
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
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
  icon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  ctaContainer: {
    width: "100%",
    maxWidth: 300,
  },
});

