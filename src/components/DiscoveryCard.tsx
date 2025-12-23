import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, FlatList, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Chip } from "./ui/Chip";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_PADDING = spacing.md;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;
const MAX_CARD_HEIGHT = 650; // Card height
const IMAGE_HEIGHT_PERCENT = 0.6; // 60% of card height

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

export function DiscoveryCard({ card, onSwipeLeft, onSwipeRight, onFavorite, favoritesRemaining, isPremium }: DiscoveryCardProps) {
  const { profile, distanceKm } = card;
  const [bioExpanded, setBioExpanded] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const favoriteScale = useRef(new Animated.Value(1)).current;
  
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

  const handleFavoritePress = () => {
    if (onFavorite) {
      // Scale animation
      Animated.sequence([
        Animated.timing(favoriteScale, {
          toValue: 0.85,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(favoriteScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      onFavorite();
    }
  };

  return (
    <View style={styles.container}>
      {/* Hero Image Section - 60% height with Carousel */}
      <View style={styles.imageContainer}>
        {photos.length > 0 ? (
          <>
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `photo-${index}`}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
                setCurrentPhotoIndex(index);
              }}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={styles.image}
                  resizeMode="cover"
                />
              )}
            />
            {/* Photo Indicators */}
            {photos.length > 1 && (
              <View style={styles.photoIndicators}>
                {photos.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.photoIndicator,
                      index === currentPhotoIndex && styles.photoIndicatorActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>
              {profile.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        
        {/* Gradient Overlay */}
        <LinearGradient
          colors={["transparent", "rgba(0, 0, 0, 0.1)", "rgba(0, 0, 0, 0.4)"]}
          locations={[0, 0.6, 1]}
          style={styles.gradientOverlay}
        />

        {/* Name, Age, Location Overlay */}
        <LinearGradient
          colors={[colors.backgroundSecondaryDark, colors.backgroundSecondaryDark + "00"]}
          style={styles.nameGradient}
        >
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.displayName}</Text>
              {age && <Text style={styles.age}>{age}</Text>}
            </View>
            {(profile.city || distanceKm) && (
              <View style={styles.locationRow}>
                <MaterialIcons name="location-on" size={14} color={colors.textSecondaryDark} />
                <Text style={styles.locationText}>
                  {profile.city || ""}
                  {profile.city && distanceKm && ", "}
                  {distanceKm && formatDistance(distanceKm)}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* Scrollable Content Section */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Bio */}
        {profile.bio && (
          <View style={styles.bioContainer}>
            <Text 
              style={styles.bio}
              numberOfLines={bioExpanded ? undefined : 2}
            >
              {profile.bio}
            </Text>
            {profile.bio.length > 100 && (
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
        )}

        {/* Languages Section */}
        {(profile.languagesNative.length > 0 || profile.languagesPractice.length > 0) && (
          <View style={styles.section}>
            {profile.languagesNative.length > 0 && (
              <View style={styles.languageGroup}>
                <Text style={styles.sectionTitle}>SPEAKS</Text>
                <View style={styles.chipsContainer}>
                  {profile.languagesNative.map((lang, index) => (
                    <Chip
                      key={index}
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
                <Text style={styles.sectionTitle}>LEARNING</Text>
                <View style={styles.chipsContainer}>
                  {profile.languagesPractice.map((lang, index) => (
                    <Chip
                      key={index}
                      label={lang}
                      icon={getLanguageFlag(lang)}
                      variant="default"
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Favorite Button - Bottom Right */}
      {onFavorite && (
        <TouchableOpacity
          style={styles.favoriteButtonWrapper}
          onPress={handleFavoritePress}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.favoriteButton,
              { transform: [{ scale: favoriteScale }] },
            ]}
          >
            <MaterialIcons name="star" size={24} color="#60A5FA" />
          </Animated.View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: MAX_CARD_HEIGHT,
    borderRadius: 24, // 3xl
    backgroundColor: colors.backgroundSecondaryDark,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginTop: 0, // Remove top margin to start photo from top
  },
  imageContainer: {
    width: "100%",
    height: MAX_CARD_HEIGHT * IMAGE_HEIGHT_PERCENT,
    position: "relative",
    overflow: "hidden",
    flexShrink: 0, // Prevent shrinking
  },
  image: {
    width: CARD_WIDTH,
    height: MAX_CARD_HEIGHT * IMAGE_HEIGHT_PERCENT,
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
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "100%",
  },
  nameGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg + 4,
  },
  nameContainer: {
    paddingBottom: spacing.xs,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  name: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    lineHeight: typography.fontSize["3xl"] * 1.2,
  },
  age: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondaryDark,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs / 2,
  },
  locationText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
  },
  content: {
    flex: 1, // Take remaining space after image
    minHeight: 200, // Minimum height for content
  },
  contentContainer: {
    padding: spacing.lg + 4,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 3, // Extra padding for action buttons
  },
  bioContainer: {
    marginBottom: spacing.lg,
  },
  bio: {
    fontSize: typography.fontSize.base,
    color: colors.textDark,
    lineHeight: 24,
  },
  readMoreButton: {
    marginTop: spacing.xs,
  },
  readMoreText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
  section: {
    marginBottom: spacing.lg,
  },
  languageGroup: {
    marginBottom: spacing.md + 4,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondaryDark,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs + 2,
  },
  photoIndicators: {
    position: "absolute",
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
  },
  photoIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  photoIndicatorActive: {
    backgroundColor: "#FFFFFF",
    width: 20,
  },
  favoriteButtonWrapper: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
  },
  favoriteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundSecondaryDark,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
});
