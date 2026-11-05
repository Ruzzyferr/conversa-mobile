import React from "react";
import { View, Text, StyleSheet, TextInput, Pressable, Image, ScrollView, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, textStyles } from "@/src/theme";
import { FieldError } from "@/src/components/ui/FieldError";

/**
 * Kayit akisinin tek-soruluk adimlari.
 *
 * Onceki duzen adi, dogum yilini ve cinsiyeti TEK ekrana yigiyordu; ekran
 * bir form doldurma isine benziyordu, bir tanisma uygulamasina degil.
 * Bumble ve Hinge bunu neden boyle yapmiyor belli: her ekranda tek soru
 * olunca kullanici duraksamiyor, ve her soruya ekranin tamami veriliyor.
 *
 * Buradaki bilesenler yalnizca ICERIGI verir; baslik, ilerleme, geri ve
 * ileri OnboardingShell'in isi.
 */

// ---------------------------------------------------------------- Ad

export function NameStep({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={t("setup.step1.name_placeholder")}
        placeholderTextColor={colors.textTertiary}
        style={[styles.bigInput, error && styles.bigInputError]}
        maxLength={40}
        autoFocus
        autoCorrect={false}
      />
      <FieldError message={error} />
    </View>
  );
}

// -------------------------------------------------------- Dogum yili

export function BirthStep({
  value,
  onChange,
  error,
  askMonth = false,
  month = null,
  onMonth,
  adultConfirmed = false,
  onAdultConfirmed,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  /** True when the year alone cannot prove 18+ (youngest allowed year). */
  askMonth?: boolean;
  month?: number | null;
  onMonth?: (m: number) => void;
  adultConfirmed?: boolean;
  onAdultConfirmed?: (v: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const monthNames = React.useMemo(() => {
    const fmt = (m: number) => {
      try {
        return new Date(2000, m - 1, 1).toLocaleString(i18n.language, { month: "short" });
      } catch {
        return String(m);
      }
    };
    return Array.from({ length: 12 }, (_, i) => fmt(i + 1));
  }, [i18n.language]);
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={(v) => onChange(v.replace(/[^0-9]/g, ""))}
        placeholder={t("setup.step1.birth_placeholder")}
        placeholderTextColor={colors.textTertiary}
        style={[styles.bigInput, styles.yearInput, error && styles.bigInputError]}
        keyboardType="number-pad"
        maxLength={4}
        autoFocus
      />
      {askMonth ? (
        <View style={styles.monthBlock}>
          <Text style={styles.monthLabel}>{t("age_gate.month_label")}</Text>
          <View style={styles.monthGrid}>
            {monthNames.map((name, i) => {
              const m = i + 1;
              const on = month === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => onMonth?.(m)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={[styles.monthChip, on && styles.choiceOn]}
                >
                  <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <FieldError message={error} />
      <Pressable
        onPress={() => onAdultConfirmed?.(!adultConfirmed)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: adultConfirmed }}
        style={styles.confirmRow}
        testID="adult-confirm"
      >
        <View style={[styles.checkbox, adultConfirmed && styles.radioOn]}>
          {adultConfirmed && <MaterialIcons name="check" size={14} color={colors.textInverse} />}
        </View>
        <Text style={styles.confirmText}>{t("age_gate.confirm_18")}</Text>
      </Pressable>
      <Text style={styles.note}>{t("setup.birth_note")}</Text>
    </View>
  );
}

// ----------------------------------------------------------- Cinsiyet

type Gender = "MALE" | "FEMALE" | "OTHER";

export function GenderStep({
  value,
  onChange,
  error,
}: {
  value: Gender | null;
  onChange: (g: Gender) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  return (
    <View>
      <View style={styles.stack}>
        {(["FEMALE", "MALE", "OTHER"] as Gender[]).map((g) => (
          <ChoiceRow
            key={g}
            label={t(`setup.step1.gender_${g.toLowerCase()}`)}
            selected={value === g}
            onPress={() => onChange(g)}
          />
        ))}
      </View>
      <FieldError message={error} />
    </View>
  );
}

// -------------------------------------------------------------- Amac

export function PurposeStep({
  value,
  onChange,
}: {
  value: "CONVERSATION" | "COFFEE";
  onChange: (p: "CONVERSATION" | "COFFEE") => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.stack}>
      {(["CONVERSATION", "COFFEE"] as const).map((p) => (
        <ChoiceRow
          key={p}
          label={t(`setup.step1.purpose_${p.toLowerCase()}`)}
          selected={value === p}
          onPress={() => onChange(p)}
        />
      ))}
    </View>
  );
}

// ------------------------------------------------------------ Hakkinda

export function AboutStep({
  bio,
  onBio,
  interests,
  onOpenInterests,
}: {
  bio: string;
  onBio: (v: string) => void;
  interests: string[];
  onOpenInterests: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.stack}>
      <TextInput
        value={bio}
        onChangeText={onBio}
        placeholder={t("setup.step3.bio_placeholder")}
        placeholderTextColor={colors.textTertiary}
        style={styles.bioInput}
        multiline
        maxLength={300}
        textAlignVertical="top"
      />
      <Text style={styles.counter}>{bio.length}/300</Text>

      <Pressable onPress={onOpenInterests} style={styles.interestOpener}>
        <MaterialIcons name="add" size={20} color={colors.primary} />
        <Text style={styles.interestOpenerText}>
          {interests.length > 0
            ? t("setup.interests_count", { count: interests.length })
            : t("setup.step3.interests_label")}
        </Text>
        <MaterialIcons name="chevron-right" size={20} color={colors.textTertiary} />
      </Pressable>

      {interests.length > 0 && (
        <View style={styles.chips}>
          {interests.map((i) => (
            <View key={i} style={styles.chip}>
              <Text style={styles.chipText}>{t(`interests.${i}`, { defaultValue: i })}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ----------------------------------------------------------- Fotograflar

export function PhotosStep({
  photos,
  onPick,
  onRemove,
  error,
}: {
  photos: string[];
  onPick: (index: number) => void;
  onRemove: (index: number) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  return (
    <View>
      {/*
        Onceki izgara ilk kareyi digerlerinin iki kati buyuklukte
        cizeyordu ama hangi karenin kapak oldugunu yalnizca kose
        rozetiyle soyluyordu. Kapak artik tam genislikte ve ustunde
        yaziyor; digerleri onun altinda esit iki kare.
      */}
      <Pressable
        onPress={() => onPick(0)}
        style={[styles.cover, !photos[0] && styles.slotEmpty]}
      >
        {photos[0] ? (
          <>
            <Image source={{ uri: photos[0] }} style={styles.slotImage} />
            <View style={styles.coverTag}>
              <Text style={styles.coverTagText}>{t("setup.step4.cover_photo")}</Text>
            </View>
            <Pressable onPress={() => onRemove(0)} style={styles.remove} hitSlop={8}>
              <MaterialIcons name="close" size={18} color={colors.onMedia} />
            </Pressable>
          </>
        ) : (
          <View style={styles.slotInner}>
            <MaterialIcons name="add-a-photo" size={26} color={colors.textTertiary} />
            <Text style={styles.slotText}>{t("setup.step4.photo_placeholder_cover")}</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.slotRow}>
        {[1, 2].map((i) => (
          <Pressable
            key={i}
            onPress={() => onPick(i)}
            style={[styles.slot, !photos[i] && styles.slotEmpty]}
          >
            {photos[i] ? (
              <>
                <Image source={{ uri: photos[i] }} style={styles.slotImage} />
                <Pressable onPress={() => onRemove(i)} style={styles.remove} hitSlop={8}>
                  <MaterialIcons name="close" size={16} color={colors.onMedia} />
                </Pressable>
              </>
            ) : (
              <View style={styles.slotInner}>
                <MaterialIcons name="add" size={22} color={colors.textTertiary} />
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <FieldError message={error} />
      <Text style={styles.note}>{t("setup.step4.tip")}</Text>
    </View>
  );
}

// ------------------------------------------------------------- Ortak

function ChoiceRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.choiceOn,
        pressed && styles.choicePressed,
      ]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextOn]}>{label}</Text>
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected && <MaterialIcons name="check" size={14} color={colors.textInverse} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },

  // Tek soru ekranda tek basinaysa girdi de o olcekte olmali; 16 piksellik
  // bir kutu, ustundeki 32 piksellik soruyla ayni ekranda cilizi kaliyor.
  bigInput: {
    ...textStyles.display,
    color: colors.text,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    // Tarayici anahati yalnizca web'de var; native'de bu prop
    // "Invalid prop" uyarisi uretir.
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : null),
  },
  bigInputError: { borderBottomColor: colors.error },
  yearInput: { letterSpacing: 6 },
  monthBlock: { marginTop: spacing.lg, gap: spacing.sm },
  monthLabel: { ...textStyles.label, color: colors.text },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  monthChip: {
    minWidth: 64,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: { ...textStyles.body, color: colors.text, flex: 1 },
  note: {
    ...textStyles.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },

  choice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  choicePressed: { opacity: 0.85 },
  choiceText: { ...textStyles.label, color: colors.textSecondary },
  choiceTextOn: { color: colors.text },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },

  bioInput: {
    ...textStyles.body,
    color: colors.text,
    minHeight: 140,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    // Tarayici anahati yalnizca web'de var; native'de bu prop
    // "Invalid prop" uyarisi uretir.
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : null),
  },
  counter: {
    ...textStyles.caption,
    color: colors.textTertiary,
    alignSelf: "flex-end",
  },
  interestOpener: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  interestOpenerText: { ...textStyles.label, color: colors.text, flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  chipText: { ...textStyles.bodySmall, color: colors.primaryTintText },

  cover: {
    height: 220,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  slotRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  slot: {
    flex: 1,
    height: 110,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  slotEmpty: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  slotInner: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xs },
  slotText: { ...textStyles.bodySmall, color: colors.textTertiary },
  slotImage: { width: "100%", height: "100%" },
  coverTag: {
    position: "absolute",
    left: spacing.sm,
    bottom: spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.overlayStrong,
  },
  coverTagText: { ...textStyles.labelSmall, color: colors.onMedia },
  remove: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.overlayStrong,
    alignItems: "center",
    justifyContent: "center",
  },
});
