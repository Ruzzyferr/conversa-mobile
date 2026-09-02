import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, elevation, textStyles } from "@/src/theme";

export type Track = "DATE" | "LANGUAGE";

interface Props {
  value: Track | null;
  onChange: (track: Track) => void;
}

interface OptionSpec {
  track: Track;
  icon: keyof typeof MaterialIcons.glyphMap;
  titleKey: string;
  bodyKey: string;
  /** Yalnizca LANGUAGE'de: girisin bedeli. */
  costKey?: string;
}

const OPTIONS: OptionSpec[] = [
  {
    track: "DATE",
    icon: "favorite",
    titleKey: "setup.track.date_title",
    bodyKey: "setup.track.date_body",
  },
  {
    track: "LANGUAGE",
    icon: "translate",
    titleKey: "setup.track.language_title",
    bodyKey: "setup.track.language_body",
    costKey: "setup.track.language_cost",
  },
];

/**
 * Kayit akisinin ilk ve belirleyici adimi.
 *
 * Bedel BASTAN ve acikca yazilir. Kullaniciyi sinava surpriz olarak
 * sokmak, kaybedecegimiz en pahali yerdir: adam uc adim doldurmus, sonra
 * bir sinav gormus ve uygulamayi silmis olur. Duraksamasini burada
 * istiyoruz -- tasarimin amaci zaten o duraksama.
 */
export function TrackStep({ value, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("setup.track.title")}</Text>
      <Text style={styles.subtitle}>{t("setup.track.subtitle")}</Text>

      <View style={styles.options}>
        {OPTIONS.map((opt) => {
          const selected = value === opt.track;
          return (
            <TouchableOpacity
              key={opt.track}
              testID={`track-option-${opt.track}`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t(opt.titleKey)}
              style={[styles.card, selected && styles.cardSelected]}
              onPress={() => onChange(opt.track)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
                  <MaterialIcons
                    name={opt.icon}
                    size={26}
                    color={selected ? colors.textInverse : colors.primaryTintText}
                  />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>{t(opt.titleKey)}</Text>
                  <Text style={styles.cardBody}>{t(opt.bodyKey)}</Text>
                </View>
                <MaterialIcons
                  name={selected ? "radio-button-checked" : "radio-button-unchecked"}
                  size={24}
                  color={selected ? colors.primary : colors.textTertiary}
                />
              </View>

              {opt.costKey ? (
                <View style={styles.costRow}>
                  <MaterialIcons name="schedule" size={16} color={colors.textSecondary} />
                  <Text style={styles.costText}>{t(opt.costKey)}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.footnote}>{t("setup.track.footnote")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: {
    ...textStyles.display,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  options: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.borderMuted,
    padding: spacing.lg,
    ...elevation.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
    ...elevation.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  cardHeaderText: {
    flex: 1,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  iconWrapSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cardTitle: {
    ...textStyles.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardBody: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
  costRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  costText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  footnote: {
    ...textStyles.caption,
    color: colors.textTertiary,
    marginTop: spacing.xl,
    textAlign: "center",
  },
});
