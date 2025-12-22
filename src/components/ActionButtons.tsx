import React, { useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type ActionButtonsProps = {
  onLike: () => void;
  onPass: () => void;
  disabled?: boolean;
};

export function ActionButtons({ onLike, onPass, disabled = false }: ActionButtonsProps) {
  const likeScale = useRef(new Animated.Value(1)).current;
  const passScale = useRef(new Animated.Value(1)).current;

  const animatePress = (scale: Animated.Value, callback: () => void) => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    callback();
  };

  const handleLike = () => {
    animatePress(likeScale, onLike);
  };

  const handlePass = () => {
    animatePress(passScale, onPass);
  };

  return (
    <View style={styles.container}>
      {/* Pass Button */}
      <TouchableOpacity
        onPress={handlePass}
        disabled={disabled}
        activeOpacity={0.8}
        style={styles.buttonWrapper}
      >
        <Animated.View
          style={[
            styles.button,
            styles.passButton,
            { transform: [{ scale: passScale }] },
          ]}
        >
          <Text style={styles.passIcon}>✕</Text>
        </Animated.View>
      </TouchableOpacity>

      {/* Like Button */}
      <TouchableOpacity
        onPress={handleLike}
        disabled={disabled}
        activeOpacity={0.8}
        style={styles.buttonWrapper}
      >
        <Animated.View
          style={[
            styles.button,
            styles.likeButton,
            { transform: [{ scale: likeScale }] },
          ]}
        >
          <LinearGradient
            colors={[colors.accentGradientStart, colors.accentGradientEnd]}
            style={styles.likeButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.likeIcon}>♥</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const BUTTON_SIZE = 64;
const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xxl,
    paddingVertical: spacing.md,
  },
  buttonWrapper: {
    // Wrapper for proper touch handling
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  passButton: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: colors.border,
  },
  likeButton: {
    overflow: "hidden",
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
  },
  likeButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  passIcon: {
    fontSize: typography.fontSize["3xl"],
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.bold,
  },
  likeIcon: {
    fontSize: typography.fontSize["3xl"],
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
  },
});

