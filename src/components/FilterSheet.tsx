import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Card } from "@/src/components/Card";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { useRouter } from "expo-router";

export type FilterParams = {
  maxDistanceKm: number | null;
  languages: string[];
  purpose?: "CONVERSATION" | "PRACTICE" | "COFFEE";
  culturalPreference?: "LOCAL" | "EUROPE" | "INTERNATIONAL";
  excludeCountries: string[];
  verifiedOnly: boolean;
  recentlyActive: boolean;
  minPhotos: number;
};

type FilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterParams) => void;
  initialFilters: FilterParams;
  userLanguages: string[];
  isPremium: boolean;
};

const DISTANCE_OPTIONS = [
  { label: "No limit", value: null },
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "20 km", value: 20 },
  { label: "50 km", value: 50 },
  { label: "100 km", value: 100 },
];

export function FilterSheet({
  visible,
  onClose,
  onApply,
  initialFilters,
  userLanguages,
  isPremium,
}: FilterSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filters, setFilters] = useState<FilterParams>(initialFilters);

  // Update filters when initialFilters change (e.g., when modal opens)
  useEffect(() => {
    if (visible) {
      setFilters(initialFilters);
    }
  }, [visible, initialFilters]);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterParams = {
      maxDistanceKm: null,
      languages: [],
      purpose: undefined,
      culturalPreference: "INTERNATIONAL",
      excludeCountries: [],
      verifiedOnly: false,
      recentlyActive: false,
      minPhotos: 0,
    };
    setFilters(resetFilters);
    onApply(resetFilters);
    onClose();
  };

  const toggleLanguage = (lang: string) => {
    setFilters((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  const handlePremiumFilterPress = () => {
    onClose();
    router.push("/premium");
  };

  // Debug log
  useEffect(() => {
    if (visible) {
      console.log("FilterSheet visible:", visible);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Distance */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Distance</Text>
              <Text style={styles.sectionDescription}>
                Limit conversations to people nearby (optional)
              </Text>
              <View style={styles.chipContainer}>
                {DISTANCE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.chip,
                      filters.maxDistanceKm === option.value && styles.chipActive,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        maxDistanceKm: option.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.maxDistanceKm === option.value && styles.chipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Purpose */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Purpose</Text>
              <View style={styles.chipContainer}>
                {[
                  { label: "Conversation", value: "CONVERSATION" as const },
                  { label: "Language practice", value: "PRACTICE" as const },
                  { label: "Coffee", value: "COFFEE" as const },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.chip,
                      filters.purpose === option.value && styles.chipActive,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        purpose:
                          prev.purpose === option.value ? undefined : option.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.purpose === option.value && styles.chipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Languages */}
            {userLanguages.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Languages</Text>
                <Text style={styles.sectionDescription}>
                  Show people who speak or practice these languages
                </Text>
                <View style={styles.chipContainer}>
                  {userLanguages.map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      style={[
                        styles.chip,
                        filters.languages.includes(lang) && styles.chipActive,
                      ]}
                      onPress={() => toggleLanguage(lang)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          filters.languages.includes(lang) && styles.chipTextActive,
                        ]}
                      >
                        {lang}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Cultural Preference */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cultural Preference</Text>
              <Text style={styles.sectionDescription}>
                A soft preference — we'll still show others if needed
              </Text>
              <View style={styles.radioContainer}>
                {[
                  { label: "Local", value: "LOCAL" as const },
                  { label: "Europe", value: "EUROPE" as const },
                  { label: "International", value: "INTERNATIONAL" as const },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.radioOption}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        culturalPreference:
                          prev.culturalPreference === option.value
                            ? undefined
                            : option.value,
                      }))
                    }
                  >
                    <View style={styles.radioCircle}>
                      {filters.culturalPreference === option.value && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <Text style={styles.radioLabel}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Premium Filters */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Premium Filters</Text>
              {!isPremium && (
                <Text style={styles.premiumHint}>
                  Upgrade to Premium to unlock these filters.
                </Text>
              )}

              {/* Exclude Countries */}
              <TouchableOpacity
                onPress={!isPremium ? handlePremiumFilterPress : undefined}
                disabled={isPremium}
                style={[styles.premiumFilter, !isPremium && styles.premiumFilterLocked]}
              >
                <View style={styles.premiumFilterContent}>
                  <Text style={styles.premiumFilterTitle}>Exclude countries</Text>
                  <Text style={styles.premiumFilterDescription}>
                    Hide profiles from specific countries
                  </Text>
                </View>
                {!isPremium && (
                  <View style={styles.premiumLock}>
                    <Text style={styles.premiumLockText}>🔒</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Verified Profiles Only */}
              <TouchableOpacity
                onPress={!isPremium ? handlePremiumFilterPress : undefined}
                disabled={isPremium}
                style={[styles.premiumFilter, !isPremium && styles.premiumFilterLocked]}
              >
                <View style={styles.premiumFilterContent}>
                  <Text style={styles.premiumFilterTitle}>Verified profiles only</Text>
                  <Text style={styles.premiumFilterDescription}>
                    Show only users with verified profiles
                  </Text>
                </View>
                {!isPremium && (
                  <View style={styles.premiumLock}>
                    <Text style={styles.premiumLockText}>🔒</Text>
                  </View>
                )}
                {isPremium && (
                  <Switch
                    value={filters.verifiedOnly}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, verifiedOnly: value }))
                    }
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.text}
                  />
                )}
              </TouchableOpacity>

              {/* Recently Active */}
              <TouchableOpacity
                onPress={!isPremium ? handlePremiumFilterPress : undefined}
                disabled={isPremium}
                style={[styles.premiumFilter, !isPremium && styles.premiumFilterLocked]}
              >
                <View style={styles.premiumFilterContent}>
                  <Text style={styles.premiumFilterTitle}>Recently active</Text>
                  <Text style={styles.premiumFilterDescription}>
                    Show only active users
                  </Text>
                </View>
                {!isPremium && (
                  <View style={styles.premiumLock}>
                    <Text style={styles.premiumLockText}>🔒</Text>
                  </View>
                )}
                {isPremium && (
                  <Switch
                    value={filters.recentlyActive}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, recentlyActive: value }))
                    }
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.text}
                  />
                )}
              </TouchableOpacity>

              {/* Minimum Photos */}
              <TouchableOpacity
                onPress={!isPremium ? handlePremiumFilterPress : undefined}
                disabled={isPremium}
                style={[styles.premiumFilter, !isPremium && styles.premiumFilterLocked]}
              >
                <View style={styles.premiumFilterContent}>
                  <Text style={styles.premiumFilterTitle}>Minimum photos</Text>
                  <Text style={styles.premiumFilterDescription}>
                    Require minimum photo count
                  </Text>
                </View>
                {!isPremium && (
                  <View style={styles.premiumLock}>
                    <Text style={styles.premiumLockText}>🔒</Text>
                  </View>
                )}
                {isPremium && (
                  <Switch
                    value={filters.minPhotos > 0}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, minPhotos: value ? 1 : 0 }))
                    }
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.text}
                  />
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: spacing.md }]}>
            <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <PrimaryButton
              title="Apply"
              onPress={handleApply}
              style={styles.applyButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeText: {
    fontSize: typography.fontSize.xl,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary + "30",
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  chipTextActive: {
    color: colors.primary,
  },
  radioContainer: {
    gap: spacing.md,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text,
  },
  premiumFilter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  premiumFilterLocked: {
    opacity: 0.6,
  },
  premiumHint: {
    fontSize: typography.fontSize.sm,
    color: colors.warning,
    marginBottom: spacing.md,
  },
  premiumFilterContent: {
    flex: 1,
  },
  premiumFilterTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  premiumFilterDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  premiumLock: {
    padding: spacing.sm,
  },
  premiumLockText: {
    fontSize: typography.fontSize.lg,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resetButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
  },
  resetText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  applyButton: {
    flex: 1,
  },
});

