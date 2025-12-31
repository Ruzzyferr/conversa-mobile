import React, { useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from "react-native";
import { ScrollView, RectButton } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Chip } from "./ui/Chip";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_PADDING = spacing.md;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;
// MAX_CARD_HEIGHT is no longer strictly enforced for the scroll content,
// but the container size is determined by the parent SwipeableCard.

type DiscoveryCardProps = {
  card: {
    userId: string;
    distanceKm?: number;
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
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onFavorite?: () => void;
  favoritesRemaining?: number;
  isPremium?: boolean;
};

export function DiscoveryCard({ card, onFavorite, favoritesRemaining, isPremium }: DiscoveryCardProps) {
  const { profile, distanceKm } = card;
  const [bioExpanded, setBioExpanded] = useState(false);

  const age = profile.birthYear
    ? new Date().getFullYear() - profile.birthYear
    : null;

  const formatDistance = (km?: number) => {
    if (!km) return null;
    if (km < 1) return `${Math.round(km * 1000)}m away`;
    return `${Math.round(km)} km away`;
  };

  const getLanguageFlag = (lang: string) => {
    const flags: Record<string, string> = {
      English: "🇺🇸",
      Turkish: "🇹🇷",
      German: "🇩🇪",
      Spanish: "🇪🇸",
      French: "🇫🇷",
      Italian: "🇮🇹",
      Portuguese: "🇵🇹",
      Russian: "🇷🇺",
      Chinese: "🇨🇳",
      Japanese: "🇯🇵",
      Korean: "🇰🇷",
    };
    return flags[lang] || "";
  };

  const photos = profile.photos && profile.photos.length > 0 ? profile.photos : [];

  // Helper to render basic info overlay
  const renderBasicInfo = () => (
    <LinearGradient
      colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.9)"]}
      style={styles.nameGradient}
    >
      <View style={styles.nameContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{profile.displayName}</Text>
          {age && <Text style={styles.age}>{age}</Text>}
        </View>
        {(profile.city || distanceKm) && (
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={16} color={colors.textSecondaryDark} />
            <Text style={styles.locationText}>
              {profile.city || ""}
              {profile.city && distanceKm && ", "}
              {distanceKm && formatDistance(distanceKm)}
            </Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );

  // Helper to render languages
  const renderLanguages = () => (
    (profile.languagesNative.length > 0 || profile.languagesPractice.length > 0) && (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>My Languages</Text>
        <View style={styles.sectionContent}>
          {profile.languagesNative.length > 0 && (
            <View style={styles.languageGroup}>
              <Text style={styles.subSectionTitle}>SPEAKS</Text>
              <View style={styles.chipsContainer}>
                {profile.languagesNative.map((lang, index) => (
                  <Chip
                    key={`native-${index}`}
                    label={lang}
                    icon={getLanguageFlag(lang)}
                    variant="primary"
                  />
                ))}
              </View>
            </View>
          )}
          {profile.languagesPractice.length > 0 && (
            <View style={styles.languageGroup}>
              <Text style={styles.subSectionTitle}>LEARNING</Text>
              <View style={styles.chipsContainer}>
                {profile.languagesPractice.map((lang, index) => (
                  <Chip
                    key={`practice-${index}`}
                    label={lang}
                    icon={getLanguageFlag(lang)}
                    variant="default"
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    )
  );

  // Helper to render Bio
  const renderBio = () => (
    profile.bio && (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>About Me</Text>
        <View style={styles.sectionContent}>
          <Text
            style={styles.bio}
            numberOfLines={bioExpanded ? undefined : 4}
          >
            {profile.bio}
          </Text>
          {profile.bio.length > 150 && (
            <TouchableOpacity
              onPress={() => setBioExpanded(!bioExpanded)}
              style={styles.readMoreButton}
            >
              <Text style={styles.readMoreText}>
                {bioExpanded ? "Read less" : "Read more"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  );

  // Dynamic Content rendering strategy:
  // 1. Photo 1 (Main) + Basic Info Overlay
  // 2. Bio
  // 3. Languages
  // 4. Photo 2
  // 5. Photo 3+

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* First Photo with Info Overlay */}
        <View style={styles.mainImageContainer}>
          {photos.length > 0 ? (
            <Image
              source={{ uri: photos[0] }}
              style={styles.mainImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>
                {profile.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {renderBasicInfo()}

          {/* Favorite Button - Inside photo area */}
          {onFavorite && (
            <RectButton
              style={styles.favoriteButtonOnPhoto}
              onPress={onFavorite}
            >
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.favoriteButtonGradient}
              >
                <MaterialIcons name="star" size={24} color="#FFFFFF" />
              </LinearGradient>
              {!isPremium && favoritesRemaining !== undefined && (
                <View style={styles.favoriteBadge}>
                  <Text style={styles.favoriteBadgeText}>{favoritesRemaining}</Text>
                </View>
              )}
            </RectButton>
          )}

          {/* Scroll Indicator */}
          <View style={styles.scrollIndicator}>
            <MaterialIcons name="keyboard-arrow-up" size={20} color="rgba(255,255,255,0.7)" />
            <Text style={styles.scrollIndicatorText}>Kaydır</Text>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.bodyContainer}>

          {/* About Me Section */}
          {renderBio()}

          {/* Languages Section */}
          {renderLanguages()}

          {/* Remaining Photos */}
          {photos.slice(1).map((photoUri, index) => (
            <View key={`photo-extra-${index}`} style={styles.extraPhotoContainer}>
              <Image
                source={{ uri: photoUri }}
                style={styles.extraImage}
                resizeMode="cover"
              />
            </View>
          ))}

          {/* Bottom padding for safe scrolling */}
          <View style={{ height: spacing.xl * 3 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // Fill the parent SwipeableCard
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainImageContainer: {
    width: "100%",
    height: 500, // Large main photo
    position: "relative",
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    fontSize: typography.fontSize["5xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  nameGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 80,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  nameContainer: {
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  age: {
    fontSize: 26,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.9)",
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 16,
    color: colors.textSecondaryDark, // Might need to be lighter if on gradient
    fontWeight: "500",
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bodyContainer: {
    padding: spacing.md,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondaryDark,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionContent: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: spacing.md,
    borderRadius: 20,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  bio: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 24,
  },
  readMoreButton: {
    alignSelf: "flex-start",
  },
  readMoreText: {
    color: colors.primary,
    fontWeight: "bold",
  },
  languageGroup: {
    gap: 8,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.textSecondaryDark,
    textTransform: "uppercase",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  extraPhotoContainer: {
    width: "100%",
    height: 400,
    borderRadius: 16,
    overflow: "hidden",
  },
  extraImage: {
    width: "100%",
    height: "100%",
  },
  favoriteButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    zIndex: 10,
  },
  favoriteButtonFloating: {
    position: "absolute",
    bottom: 24,
    right: 24,
    zIndex: 100,
  },
  favoriteButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(108, 93, 211, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.primaryLight,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  favoriteButtonGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    // Modern shadow
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  favoriteButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  favoriteButtonOnPhoto: {
    position: "absolute",
    bottom: 20,
    right: 16,
    zIndex: 20,
  },
  scrollIndicator: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scrollIndicatorText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 11,
    fontWeight: "500",
  },
  favoriteBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  favoriteBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
});
