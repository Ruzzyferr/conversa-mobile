import React from "react";
import { View, ViewStyle, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/theme/colors";
import { useDeviceType } from "@/src/hooks/useDeviceType";

interface SafeAreaViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ("top" | "bottom" | "left" | "right")[];
  /** Maximum content width on tablets. Default: 550 */
  maxContentWidth?: number;
  /** Disable tablet centering for this view */
  disableTabletCentering?: boolean;
}

/**
 * SafeAreaView wrapper that automatically handles safe area insets
 * Use this instead of regular View for screens that need to avoid system UI
 * On tablets, content is centered with a max width for better readability
 */
export function SafeAreaView({
  children,
  style,
  edges = ["top", "bottom"],
  maxContentWidth = 550,
  disableTabletCentering = false,
}: SafeAreaViewProps) {
  const insets = useSafeAreaInsets();
  const { isTablet } = useDeviceType();

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

  const shouldCenterContent = isTablet && !disableTabletCentering;

  return (
    <View style={[styles.container, paddingStyle, style]}>
      {shouldCenterContent ? (
        <View style={[styles.tabletContentWrapper, { maxWidth: maxContentWidth }]}>
          {children}
        </View>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  tabletContentWrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
});
