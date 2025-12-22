import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import { colors } from "@/src/theme/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const RainBackground = () => {
  const rainDrops = useRef(
    Array.from({ length: 30 }, () => {
      const height = 50 + Math.random() * 50;
      return {
        x: Math.random() * SCREEN_WIDTH,
        y: new Animated.Value(0),
        opacity: new Animated.Value(0.1 + Math.random() * 0.2),
        size: 1.5 + Math.random() * 2.5,
        height,
        speed: 2000 + Math.random() * 3000,
      };
    })
  ).current;

  useEffect(() => {
    const animations = rainDrops.map((drop) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(drop.y, {
            toValue: SCREEN_HEIGHT + 100,
            duration: drop.speed,
            useNativeDriver: true,
          }),
          Animated.timing(drop.y, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    });

    animations.forEach((anim) => anim.start());

    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {rainDrops.map((drop, index) => {
        // Use purple/indigo tones with varying opacity
        const purpleColors = [
          colors.primary, // #6C5DD3
          colors.primaryLight, // #818CF8
          "#7B68EE", // Medium slate blue
          "#9370DB", // Medium purple
        ];
        const colorIndex = index % purpleColors.length;
        
        return (
          <Animated.View
            key={index}
            style={{
              position: "absolute",
              left: drop.x,
              top: -100, // Start position (fixed)
              width: drop.size,
              height: drop.height,
              backgroundColor: purpleColors[colorIndex],
              opacity: drop.opacity,
              borderRadius: drop.size / 2,
              transform: [{ translateY: drop.y }], // Use transform instead of top
            }}
          />
        );
      })}
    </View>
  );
};

