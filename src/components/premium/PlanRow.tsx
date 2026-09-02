import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing, radius, textStyles, elevation } from "@/src/theme";

/**
 * Secilebilir plan satiri.
 *
 * Onceki hali 224 piksel sabit genislikte, yatay kaydirilan bir kart
 * destesiydi ve karta DOKUNMAK dogrudan satin almayi baslatiyordu. Bir odeme
 * ekraninda yanlislikla dokunmanin bedeli yuksek; ustelik yatay deste
 * ikinci plani ekranin disinda birakip karsilastirmayi imkansiz kiliyordu.
 *
 * Dikey liste iki plani yan yana gorunur kiliyor, dokunma yalnizca SECIYOR
 * ve satin alma tek bir birincil dugmeye tasiniyor.
 */

interface Props {
  title: string;
  price: string;
  period: string;
  /** "En avantajli" gibi tek bir rozet; birden fazlasi hiyerarsiyi duzler. */
  badge?: string;
  note?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function PlanRow({
  title,
  price,
  period,
  badge,
  note,
  selected,
  disabled,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      accessibilityLabel={`${title}, ${price} ${period}`}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        pressed && !disabled && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected && <MaterialIcons name="check" size={14} color={colors.textInverse} />}
      </View>

      <View style={styles.body}>
        <View style={styles.titleLine}>
          <Text style={styles.title}>{title}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>

      <View style={styles.priceBlock}>
        <Text style={styles.price}>{price}</Text>
        <Text style={styles.period}>{period}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
    ...elevation.sm,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    ...textStyles.label,
    color: colors.text,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.boostGoldSoft,
    borderWidth: 1,
    borderColor: colors.boostGoldBorder,
  },
  badgeText: {
    ...textStyles.labelSmall,
    color: colors.boostGold,
  },
  note: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  priceBlock: {
    alignItems: "flex-end",
  },
  price: {
    ...textStyles.label,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  period: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
});
