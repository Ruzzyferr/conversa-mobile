import React from "react";
import { Text, View, StyleSheet, TextStyle } from "react-native";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";
import { resolveLanguageCode } from "@/src/data/languages";

/**
 * Dilin tipografik ISO kod rozeti.
 *
 * Eskiden bayrak emojisi de cizebiliyordu. Liste butun dunyaya cikinca o
 * yol yalnizca eksik degil YANLIS oldu: bir dil bir ulke degildir
 * (Arapca'ya Suudi bayragi koymak Misirliyi, Ispanyolca'ya Ispanya
 * bayragi koymak Meksikaliyi disarida birakir) ve Kurtce ya da Suahili
 * gibi diller icin dogru bir bayrak zaten yok.
 *
 * Ustelik emoji yolu dili tanimadiginda `null` donuyordu; listeye eklenen
 * doksan dilde rozet hic gorunmeyecekti.
 *
 * Her zaman ozgun dil dizesini gecirin: erisilebilirlik etiketi odur.
 */
type LanguageFlagProps = {
  language: string;
  size?: number;
  style?: TextStyle;
};

export function LanguageFlag({ language, size = 16, style }: LanguageFlagProps) {
  // `language` bir ISO kodu (guncel) ya da eski surumlerin yazdigi
  // yerellestirilmis etiket ("Türkçe" / "Turkish") olabilir.
  const isoCode = resolveLanguageCode(language).toUpperCase();
  if (!isoCode) return null;

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

const styles = StyleSheet.create({
  codeBadge: {
    // Notr: bu rozet cogunlukla renkli bir cipin ICINDE duruyor. Kendi
    // aksan tonunu tasirsa iki tonlu yuzey ust uste biniyor ve cip
    // "iki renkli bir leke"ye donusuyordu. Renk kodlamasini cip yapsin.
    paddingHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surfaceTintStrong,
    borderWidth: 0,
  },
  codeText: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: 0.6,
  },
});
