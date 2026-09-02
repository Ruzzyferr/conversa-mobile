import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius, textStyles } from "@/src/theme";
import { Overline } from "@/src/components/ui/Overline";

/**
 * "Su an -> Premium" karsilastirmasi.
 *
 * Eski odeme ekrani bes maddelik bir avantaj listesiydi ve maddelerden biri
 * ("Sinirsiz Mesaj") dogru degildi: gunluk yeni sohbet hakki premiumda da
 * degismiyor. Liste bicimi bu yalani kolaylastiriyordu -- tek sutunda her
 * madde ayni agirlikta bir vaat gibi duruyor ve hicbiri bir sayi vermek
 * zorunda kalmiyor.
 *
 * Iki sutun bunu imkansiz kiliyor: her satirin iki tarafi da bir deger
 * yazmak zorunda, dolayisiyla "ayni kalan" seyler de gorunur oluyor.
 * Sayilar sunucudan geliyor (bkz. entitlements.premiumPreview).
 */

export interface CompareRow {
  label: string;
  now: string;
  premium: string;
  /** Iki taraf esitse satir vurgulanmaz -- vaadin olmadigi yer bellidir. */
  unchanged?: boolean;
}

interface Props {
  rows: CompareRow[];
  nowLabel: string;
  premiumLabel: string;
}

export function CompareTable({ rows, nowLabel, premiumLabel }: Props) {
  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.headRow]}>
        <Text style={[styles.cellLabel, styles.headText]} />
        <Overline style={[styles.cellValue, styles.headText]}>{nowLabel}</Overline>
        <Overline style={[styles.cellValue, styles.headText, styles.headPremium]}>
          {premiumLabel}
        </Overline>
      </View>

      {rows.map((r, i) => (
        <View
          key={r.label}
          style={[styles.row, i === rows.length - 1 && styles.rowLast]}
        >
          <Text style={styles.cellLabel} numberOfLines={2}>
            {r.label}
          </Text>
          <Text style={[styles.cellValue, styles.now]}>{r.now}</Text>
          <Text
            style={[
              styles.cellValue,
              r.unchanged ? styles.premiumSame : styles.premiumBetter,
            ]}
          >
            {r.premium}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
    gap: spacing.sm,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  headRow: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing.sm,
  },
  headText: {
    ...textStyles.labelSmall,
    color: colors.textTertiary,
  },
  headPremium: {
    color: colors.primaryTintText,
  },
  cellLabel: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  cellValue: {
    ...textStyles.label,
    width: 84,
    textAlign: "right",
    // Iki sutundaki rakamlar alt alta hizalansin diye.
    fontVariant: ["tabular-nums"],
  },
  now: {
    color: colors.textTertiary,
  },
  premiumBetter: {
    color: colors.primaryTintText,
  },
  premiumSame: {
    color: colors.textTertiary,
  },
});
