import React from "react";
import { View, ViewStyle, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/theme/colors";

interface SafeAreaViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ("top" | "bottom" | "left" | "right")[];
}

/**
 * SafeAreaView wrapper that automatically handles safe area insets
 * Use this instead of regular View for screens that need to avoid system UI
 */
export function SafeAreaView({
  children,
  style,
  edges = ["top", "bottom"],
}: SafeAreaViewProps) {
  const insets = useSafeAreaInsets();

  const paddingStyle: ViewStyle = {};
  if (edges.includes("top")) {
    paddingStyle.paddingTop = insets.top;
  }
  if (edges.includes("bottom")) {
    paddingStyle.paddingBottom = insets.bottom;
  }
  if (edges.includes("left")) {
    paddingStyle.paddingLeft = insets.left;
  }
  if (edges.includes("right")) {
    paddingStyle.paddingRight = insets.right;
  }

  return (
    <View style={[styles.container, paddingStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

