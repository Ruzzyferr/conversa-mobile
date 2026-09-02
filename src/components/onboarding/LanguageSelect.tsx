import React from "react";
import { View, Text, StyleSheet, Pressable, TextInput, FlatList, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, textStyles } from "@/src/theme";
import { LANGUAGES, languageLabel } from "@/src/data/languages";

/**
 * Dil secici.
 *
 * Onceki hali otuz cipin sarilmis duvariydi ve kayit akisinda AYNI duvar
 * iki kez alt alta duruyordu: ana diller icin bir kez, ogrenilecek diller
 * icin bir kez. Sectigini gormek icin geri kaydirmak, aradigini bulmak
 * icin gozle taramak gerekiyordu.
 *
 * Yeni hali uc parca:
 *   1. Secilenler en ustte, kaldirilabilir cipler olarak -- durum her
 *      zaman gorunur ve listeyi kaydirmak onu goz onunden kacirmiyor.
 *   2. Arama alani -- "isv" yazan biri Isvecce'yi taramadan buluyor.
 *   3. Tek sutunlu satir listesi -- bayrak, ad, secim isareti. Sarilmis
 *      cip izgarasinda goz nereye bakacagini bilemiyordu.
 */

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  /** Bos birakilamayan bir secimde kac tane secilebilecegi. */
  max?: number;
  placeholder: string;
  emptyHint: string;
}

/** Turkce arama: "isvec" yazani Isvecce'ye goturebilmek icin. */
function fold(s: string) {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/[ıi̇]/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

export function LanguageSelect({ value, onChange, max, placeholder, emptyHint }: Props) {
  const { i18n } = useTranslation();
  const [query, setQuery] = React.useState("");

  const toggle = (code: string) => {
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code));
    } else if (!max || value.length < max) {
      onChange([...value, code]);
    }
  };

  const results = React.useMemo(() => {
    const q = fold(query.trim());
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        fold(l.tr).includes(q) ||
        fold(l.en).includes(q) ||
        fold(l.native).includes(q) ||
        l.code.startsWith(q)
    );
  }, [query]);

  return (
    <View style={styles.root}>
      {value.length > 0 ? (
        <View style={styles.chips}>
          {value.map((code) => (
            <Pressable
              key={code}
              onPress={() => toggle(code)}
              style={styles.chip}
              accessibilityRole="button"
              accessibilityLabel={languageLabel(code, i18n.language)}
            >
              <Text style={styles.chipText}>{languageLabel(code, i18n.language)}</Text>
              <MaterialIcons name="close" size={15} color={colors.primaryTintText} />
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyHint}>{emptyHint}</Text>
      )}

      <View style={styles.search}>
        <MaterialIcons name="search" size={20} color={colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={10}>
            <MaterialIcons name="close" size={18} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(l) => l.code}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const on = value.includes(item.code);
          const blocked = !on && !!max && value.length >= max;
          return (
            <Pressable
              onPress={() => toggle(item.code)}
              disabled={blocked}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled: blocked }}
              style={({ pressed }) => [
                styles.row,
                on && styles.rowOn,
                blocked && styles.rowOff,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={styles.names}>
                <Text style={[styles.name, on && styles.nameOn]}>{item.native}</Text>
                {/*
                  Ikinci satir yalnizca ozgun ad ile arayuz dilindeki ad
                  farkliysa: "Türkçe / Türkçe" yazmanin bir anlami yok.
                */}
                {languageLabel(item.code, i18n.language) !== item.native && (
                  <Text style={styles.sub}>{languageLabel(item.code, i18n.language)}</Text>
                )}
              </View>
              <View style={[styles.box, on && styles.boxOn]}>
                {on && <MaterialIcons name="check" size={15} color={colors.textInverse} />}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: spacing.md },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 6,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  chipText: { ...textStyles.bodySmall, color: colors.primaryTintText },
  emptyHint: { ...textStyles.bodySmall, color: colors.textTertiary },

  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    ...textStyles.body,
    color: colors.text,
    // RN Web tarayici anahatlarini buraya tasiyor; kendi odagimiz var.
    // Tarayici anahati yalnizca web'de var; native'de bu prop
    // "Invalid prop" uyarisi uretir.
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : null),
  },

  list: { flex: 1 },
  listContent: { paddingBottom: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  rowOn: { backgroundColor: colors.primaryTint },
  rowOff: { opacity: 0.35 },
  rowPressed: { opacity: 0.7 },
  names: { flex: 1, gap: 1 },
  // Sagdan sola yazilan diller (العربية, עברית, اردو) satirin sagina
  // kayiyor ve sutun hizasi bozuluyordu: yan yana duran otuz satirin
  // sadece uc tanesi baska yerden basliyordu. Hizayi yazi yonune degil
  // listeye birakiyoruz.
  name: {
    ...textStyles.body,
    color: colors.textSecondary,
    textAlign: "left",
    writingDirection: "ltr",
  },
  sub: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textAlign: "left",
  },
  nameOn: { color: colors.text },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
