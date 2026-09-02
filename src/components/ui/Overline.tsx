import React from "react";
import { Text, StyleSheet, StyleProp, TextStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, textStyles } from "@/src/theme";
import { upperLocale } from "@/src/utils/locale";

/**
 * Kucuk buyuk-harf bolum etiketi ("DILLER", "KONUSUYOR", "SU AN").
 *
 * Ondort ayri yerde ayni stil elle yaziliyordu ve hepsi
 * `textTransform: "uppercase"` kullaniyordu -- Turkce'de yanlis harf
 * ureten yol (bkz. utils/locale). Tek bilesen hem o hatayi kapatiyor hem
 * de bu etiketlerin boyutu, rengi ve harf araliginin ekrandan ekrana
 * degismesini bitiriyor.
 */

interface Props {
  children: string;
  /** Marka renginde vurgulu varyant -- ekran basina en fazla bir tane. */
  tone?: "muted" | "accent";
  style?: StyleProp<TextStyle>;
}

export function Overline({ children, tone = "muted", style }: Props) {
  const { i18n } = useTranslation();
  return (
    <Text style={[styles.base, tone === "accent" && styles.accent, style]}>
      {upperLocale(children, i18n.language)}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    ...textStyles.labelSmall,
    color: colors.textTertiary,
  },
  accent: {
    color: colors.primaryTintText,
  },
});
