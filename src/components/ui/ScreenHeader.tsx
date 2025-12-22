import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  rightActions?: Array<{
    icon: string;
    onPress: () => void;
    testID?: string;
  }>;
  style?: ViewStyle;
};

export function ScreenHeader({ title, subtitle, rightActions, style }: ScreenHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftSection}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {rightActions && rightActions.length > 0 && (
        <View style={styles.rightSection}>
          {rightActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={action.onPress}
              style={styles.actionButton}
              testID={action.testID}
            >
              <MaterialIcons name={action.icon as any} size={24} color={colors.text} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  leftSection: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.xs,
    borderRadius: 8,
  },
});

