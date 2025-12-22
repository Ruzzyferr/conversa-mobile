import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type ChipProps = {
  label: string;
  variant?: "default" | "primary" | "outlined";
  onPress?: () => void;
  icon?: string; // Emoji or icon
};

export function Chip({ label, variant = "default", onPress, icon }: ChipProps) {
  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      onPress={onPress}
      style={[
        styles.chip,
        variant === "primary" && styles.chipPrimary,
        variant === "outlined" && styles.chipOutlined,
      ]}
    >
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text
        style={[
          styles.text,
          variant === "primary" && styles.textPrimary,
          variant === "outlined" && styles.textOutlined,
        ]}
      >
        {label}
      </Text>
    </Component>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipPrimary: {
    backgroundColor: "#F3E8FF", // Purple tint for native languages
    borderColor: "#E9D5FF",
  },
  chipOutlined: {
    backgroundColor: "transparent",
    borderColor: colors.border,
  },
  text: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
  },
  textPrimary: {
    color: "#7C3AED", // Purple text for primary chips
  },
  textOutlined: {
    color: colors.textSecondary,
  },
  icon: {
    fontSize: typography.fontSize.sm,
    marginRight: spacing.xs / 2,
  },
});

