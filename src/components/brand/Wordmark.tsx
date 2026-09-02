import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "@/src/theme";
import { Mark } from "./Mark";

/**
 * İşaret + kelime kilidi.
 *
 * Kelime marka pirinciyle DEĞİL kağıt beyazıyla yazılıyor: iki öğe de aksan
 * rengindeyken işaret kayboluyor ve toplam bir renk lekesine dönüyor.
 * Renk taşıyan tek şey işaret olsun.
 */

interface WordmarkProps {
  size?: "sm" | "md" | "lg";
  /** Fotoğraf ya da açık zemin üstünde kullanım. */
  onLight?: boolean;
}

const SIZES = {
  sm: { mark: 20, text: typography.fontSize.lg, gap: spacing.sm },
  md: { mark: 28, text: typography.fontSize["2xl"], gap: spacing.sm },
  lg: { mark: 44, text: typography.fontSize["4xl"], gap: spacing.md },
} as const;

export function Wordmark({ size = "md", onLight = false }: WordmarkProps) {
  const s = SIZES[size];
  return (
    <View style={[styles.row, { gap: s.gap }]} accessible accessibilityLabel="Conversa">
      <Mark size={s.mark} color={onLight ? colors.accentDark : colors.primary} />
      <Text
        style={[
          styles.word,
          { fontSize: s.text, color: onLight ? colors.textInverse : colors.text },
        ]}
      >
        Conversa
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  word: {
    fontFamily: typography.fontFamily.extrabold,
    letterSpacing: -0.6,
  },
});
