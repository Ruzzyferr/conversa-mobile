import React from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_PADDING = spacing.md;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;
const PHOTO_HEIGHT = CARD_WIDTH * 0.95; // 0.95 aspect ratio for better text breathing room

type DiscoveryCardProps = {
  card: {
    userId: string;
    profile: {
      displayName: string;
      birthYear: number | null;
      city: string | null;
      purpose: "CONVERSATION" | "PRACTICE" | "COFFEE";
      bio: string | null;
      photos: string[];
      languagesNative: string[];
      languagesPractice: string[];
    };
  };
};

export function DiscoveryCard({ card }: DiscoveryCardProps) {
  const { profile } = card;
  const age = profile.birthYear
    ? new Date().getFullYear() - profile.birthYear
    : null;

  const purposeLabels = {
    CONVERSATION: "💬 Sohbet",
    PRACTICE: "📚 Pratik",
    COFFEE: "☕ Kahve",
  };

  return (
    <View style={styles.container}>
      {/* Hero Image with Gradient Overlay */}
      <View style={styles.photoContainer}>
        {profile.photos && profile.photos.length > 0 ? (
          <Image
            source={{ uri: profile.photos[0] }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>
              {profile.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {/* Stronger bottom gradient overlay for depth */}
        <LinearGradient
          colors={["transparent", "rgba(0, 0, 0, 0.4)", "rgba(0, 0, 0, 0.9)"]}
          locations={[0, 0.5, 1]}
          style={styles.gradientOverlay}
        />
        {/* Purpose badge on image */}
        <View style={styles.purposeBadge}>
          <Text style={styles.purposeBadgeText}>
            {purposeLabels[profile.purpose]}
          </Text>
        </View>
      </View>

      {/* Profile Info with Premium Footer */}
      <LinearGradient
        colors={[colors.surface, colors.surfaceElevated]}
        style={styles.profileInfo}
      >
        {/* Single line: Name · Age • City */}
        <View style={styles.nameRow}>
          <Text style={styles.displayName}>{profile.displayName}</Text>
          {age && (
            <>
              <Text style={styles.separator}>·</Text>
              <Text style={styles.age}>{age}</Text>
            </>
          )}
          {profile.city && (
            <>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.city}>{profile.city}</Text>
            </>
          )}
        </View>

        {/* Bio */}
        {profile.bio && (
          <Text style={styles.bio} numberOfLines={3}>
            {profile.bio}
          </Text>
        )}

        {/* Languages - Glass chips with minimal captions */}
        {(profile.languagesNative.length > 0 ||
          profile.languagesPractice.length > 0) && (
          <View style={styles.languagesContainer}>
            {profile.languagesNative.length > 0 && (
              <View style={styles.languageSection}>
                <Text style={styles.languageCaption}>Native</Text>
                <View style={styles.languageChips}>
                  {profile.languagesNative.map((lang, index) => (
                    <View key={index} style={styles.languageChip}>
                      <Text style={styles.languageChipText}>{lang}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {profile.languagesPractice.length > 0 && (
              <View style={styles.languageSection}>
                <Text style={styles.languageCaption}>Practice</Text>
                <View style={styles.languageChips}>
                  {profile.languagesPractice.map((lang, index) => (
                    <View
                      key={index}
                      style={[styles.languageChip, styles.languageChipPractice]}
                    >
                      <Text style={styles.languageChipText}>{lang}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
  photoContainer: {
    width: "100%",
    height: PHOTO_HEIGHT,
    position: "relative",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  photoPlaceholderText: {
    fontSize: typography.fontSize["5xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 150, // Stronger gradient for more depth
  },
  purposeBadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    backgroundColor: "rgba(10, 10, 15, 0.75)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border + "80",
  },
  purposeBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    opacity: 0.9,
  },
  profileInfo: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: spacing.md,
    marginBottom: spacing.md,
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  displayName: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  separator: {
    fontSize: typography.fontSize.base,
    color: colors.textTertiary,
    opacity: 0.5,
    marginHorizontal: spacing.xs / 2,
  },
  age: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    opacity: 0.6,
    fontWeight: typography.fontWeight.medium,
  },
  city: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    opacity: 0.6,
    fontWeight: typography.fontWeight.medium,
  },
  bio: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: 26,
    marginBottom: spacing.lg,
    opacity: 0.85,
  },
  languagesContainer: {
    marginTop: spacing.md,
  },
  languageSection: {
    marginBottom: spacing.md,
  },
  languageCaption: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    opacity: 0.5,
    marginBottom: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  languageChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  languageChip: {
    backgroundColor: "transparent",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  languageChipPractice: {
    borderColor: colors.border,
  },
  languageChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    opacity: 0.9,
  },
});

