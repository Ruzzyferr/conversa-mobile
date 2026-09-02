import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  SectionList,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import {
  INTEREST_CATEGORIES,
  MAX_INTERESTS,
} from "@/src/data/interests";

type InterestPickerProps = {
  visible: boolean;
  selected: string[];
  onClose: () => void;
  onSave: (interests: string[]) => void;
};

/**
 * Bumble-style interest picker: full-screen dark sheet with live search across
 * every category, chip grid per category, capped at MAX_INTERESTS selections.
 */
export function InterestPicker({ visible, selected, onClose, onSave }: InterestPickerProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState<string[]>(selected);

  // Re-sync local state each time the sheet opens
  React.useEffect(() => {
    if (visible) {
      setCurrent(selected);
      setQuery("");
    }
  }, [visible]);

  const sections = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return INTEREST_CATEGORIES.map((cat) => {
      const items = q
        ? cat.items.filter((slug) =>
            t(`interests.${slug}`, { defaultValue: slug })
              .toLocaleLowerCase()
              .includes(q)
          )
        : cat.items;
      return {
        key: cat.key,
        emoji: cat.emoji,
        title: t(`interest_categories.${cat.key}`),
        // SectionList wants row data; we render the whole chip grid as ONE row
        // per category so chips wrap naturally.
        data: items.length > 0 ? [items] : [],
      };
    }).filter((s) => s.data.length > 0);
  }, [query, t]);

  const toggle = (slug: string) => {
    setCurrent((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= MAX_INTERESTS) return prev; // cap reached
      return [...prev, slug];
    });
  };

  const atCap = current.length >= MAX_INTERESTS;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("interest_picker.title")}</Text>
          <Text style={styles.counter}>
            {current.length}/{MAX_INTERESTS}
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={20} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t("interest_picker.search_placeholder")}
            placeholderTextColor={colors.textTertiary}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <MaterialIcons name="cancel" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Selected preview */}
        {current.length > 0 && (
          <View style={styles.selectedRow}>
            {current.map((slug) => (
              <TouchableOpacity
                key={`sel-${slug}`}
                style={styles.selectedChip}
                onPress={() => toggle(slug)}
              >
                <Text style={styles.selectedChipText}>
                  {t(`interests.${slug}`, { defaultValue: slug })}
                </Text>
                <MaterialIcons name="close" size={14} color={colors.primaryTintText} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Category sections */}
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `row-${index}`}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          // Kategori emojisi kaldirildi (🧘 ⚽ 🎨): platform emoji fontuyla
          // ciziliyor ve clip art gibi okunuyordu -- reddedilen gorunum.
          // Baslik tek basina yeterince acik.
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{(section as any).title}</Text>
          )}
          renderItem={({ item }) => (
            <View style={styles.chipGrid}>
              {(item as string[]).map((slug) => {
                const isSelected = current.includes(slug);
                const disabled = !isSelected && atCap;
                return (
                  <TouchableOpacity
                    key={slug}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                      disabled && styles.chipDisabled,
                    ]}
                    onPress={() => toggle(slug)}
                    disabled={disabled}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                        disabled && styles.chipTextDisabled,
                      ]}
                    >
                      {t(`interests.${slug}`, { defaultValue: slug })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{t("interest_picker.no_results")}</Text>
          }
        />

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => {
              onSave(current);
              onClose();
            }}
          >
            <Text style={styles.saveButtonText}>
              {t("interest_picker.save", { count: current.length })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl + spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  counter: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primaryTintText,
    minWidth: 36,
    textAlign: "right",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.fontSize.base,
    paddingVertical: 0,
  },
  selectedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryTintBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  selectedChipText: {
    color: colors.primaryTintText,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryTintBorder,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  chipTextSelected: {
    color: colors.primaryTintText,
    fontWeight: typography.fontWeight.semibold,
  },
  chipTextDisabled: {
    color: colors.textTertiary,
  },
  emptyText: {
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: typography.fontSize.base,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: colors.textInverse,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
});
