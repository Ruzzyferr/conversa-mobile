import React from "react";
import { Text, View, StyleSheet, TextStyle } from "react-native";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";
import { languageFlag, resolveLanguageCode } from "@/src/data/languages";

/**
 * Visual representation of a language using a flag emoji (default) or
 * a typographic ISO code badge fallback (variant="code").
 *
 * Future upgrade path: swap the emoji renderer with a vector flag library
 * (e.g. react-native-country-flag / local SVGs in assets/flags/) without
 * touching call sites. src/data/languages.ts is the single source of truth.
 *
 * Always pass the original language string — it is exposed to assistive
 * technologies via accessibilityLabel.
 */
type LanguageFlagProps = {
  language: string;
  size?: number;
  variant?: "emoji" | "code";
  style?: TextStyle;
};

export function LanguageFlag({
  language,
  size = 16,
  variant = "emoji",
  style,
}: LanguageFlagProps) {
  // `language` may be an ISO code (current) or a legacy localized label
  // ("Türkçe" / "Turkish") written by older app versions.
  const emoji = languageFlag(language);
  if (!emoji) return null;
  const isoCode = resolveLanguageCode(language).toUpperCase();

  if (variant === "code") {
    return (
      <View
        style={[
          styles.codeBadge,
          { minWidth: size + 8, height: size + 6, borderRadius: (size + 6) / 2 },
        ]}
        accessibilityLabel={language}
        accessibilityRole="text"
      >
        <Text style={[styles.codeText, { fontSize: size * 0.7 }, style]}>{isoCode}</Text>
      </View>
    );
  }

  return (
    <Text
      style={[{ fontSize: size }, style]}
      accessibilityLabel={language}
      accessibilityRole="text"
      allowFontScaling={false}
    >
      {emoji}
    </Text>
  );
}

const styles = StyleSheet.create({
  codeBadge: {
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  codeText: {
    color: colors.primaryTintText,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
});
