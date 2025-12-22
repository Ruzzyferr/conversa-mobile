import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, FlatList, PanResponder, Animated } from "react-native";
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
};

export function DiscoveryCard({ card, onSwipeLeft, onSwipeRight, onFavorite }: DiscoveryCardProps) {
  const { profile, distanceKm } = card;
  const [bioExpanded, setBioExpanded] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Swipe gesture handlers with rotation and opacity
  const position = useRef(new Animated.ValueXY()).current;
  const SWIPE_THRESHOLD = CARD_WIDTH * 0.3; // 30% of card width
  const ROTATION_DEG = 10; // Max rotation in degrees
  
  // Calculate rotation based on x position
  const getRotate = (x: Animated.AnimatedAddition) => {
    return x.interpolate({
      inputRange: [-CARD_WIDTH, 0, CARD_WIDTH],
      outputRange: [`-${ROTATION_DEG}deg`, "0deg", `${ROTATION_DEG}deg`],
      extrapolate: "clamp",
    });
  };
  
  // Calculate opacity based on x position (fade out slightly as you swipe)
  const getOpacity = (x: Animated.AnimatedAddition) => {
    return x.interpolate({
      inputRange: [-SCREEN_WIDTH, -SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD, SCREEN_WIDTH],
      outputRange: [0.3, 0.7, 1, 0.7, 0.3],
      extrapolate: "clamp",
    });
  };
  
  // Calculate opacity for Like/Pass labels
  // Like shows on LEFT when swiping RIGHT (positive dx)
  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  
  // Pass shows on RIGHT when swiping LEFT (negative dx)
  const passOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow horizontal movement
        position.setValue({ x: gestureState.dx, y: 0 });
      },
      onPanResponderRelease: (evt, gestureState) => {
        
        // Calculate if swipe was fast enough (velocity) or far enough (distance)
        const swipeVelocity = Math.abs(gestureState.vx);
        const swipeDistance = Math.abs(gestureState.dx);
        const isFastSwipe = swipeVelocity > 0.5;
        const isLongSwipe = swipeDistance > SWIPE_THRESHOLD;
        
        if (gestureState.dx > 0 && (isFastSwipe || isLongSwipe)) {
          // Swipe right - Like
          Animated.timing(position, {
            toValue: { x: SCREEN_WIDTH + 100, y: 0 },
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            onSwipeRight?.();
          });
        } else if (gestureState.dx < 0 && (isFastSwipe || isLongSwipe)) {
          // Swipe left - Pass
          Animated.timing(position, {
            toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            onSwipeLeft?.();
          });
        } else {
          // Return to center with spring animation
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;
  
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
  
  const rotate = getRotate(position.x);
  const opacity = getOpacity(position.x);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: position.x },
            { rotate: rotate },
          ],
          opacity: opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Like Label - Shows on LEFT when swiping RIGHT */}
      <Animated.View
        style={[
          styles.swipeLabel,
          styles.likeLabel,
          { opacity: likeOpacity },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.swipeLabelText}>LIKE</Text>
      </Animated.View>
      
      {/* Pass Label - Shows on RIGHT when swiping LEFT */}
      <Animated.View
        style={[
          styles.swipeLabel,
          styles.passLabel,
          { opacity: passOpacity },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.swipeLabelText}>PASS</Text>
      </Animated.View>
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

        {/* Top-right "Sohbet" Button */}
        <TouchableOpacity style={styles.chatButton}>
          <MaterialIcons name="chat-bubble-outline" size={16} color="#FFFFFF" />
          <Text style={styles.chatButtonText}>Sohbet</Text>
        </TouchableOpacity>

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
          style={styles.favoriteButton}
          onPress={onFavorite}
          activeOpacity={0.7}
        >
          <MaterialIcons name="star" size={24} color="#3B82F6" />
        </TouchableOpacity>
      )}
    </Animated.View>
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
  chatButton: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs / 2,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  chatButtonText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: "#FFFFFF",
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
  swipeLabel: {
    position: "absolute",
    top: 80,
    zIndex: 1000,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  likeLabel: {
    left: 20, // Like shows on LEFT when swiping RIGHT
    borderColor: "#00FF00",
    backgroundColor: "rgba(0, 255, 0, 0.15)",
  },
  passLabel: {
    right: 20, // Pass shows on RIGHT when swiping LEFT
    borderColor: "#FF4444",
    backgroundColor: "rgba(255, 68, 68, 0.15)",
  },
  swipeLabelText: {
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 3,
    color: "#FFFFFF",
  },
  favoriteButton: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
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
