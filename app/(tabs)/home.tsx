import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
  TouchableOpacity,
  Animated,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Card } from "@/src/components/Card";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { DiscoveryCard } from "@/src/components/DiscoveryCard";
import { ActionButtons } from "@/src/components/ActionButtons";
import { FilterSheet, FilterParams } from "@/src/components/FilterSheet";
import { LikeLimitModal } from "@/src/components/LikeLimitModal";
import { api } from "@/src/services/api";
import { getToken } from "@/src/services/authStore";
import { showRewardedAd } from "@/src/services/rewardedAds";
import { usePremium } from "@/src/state/premium";
import { AxiosError } from "axios";

type DiscoveryCard = {
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

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<DiscoveryCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [boostStatus, setBoostStatus] = useState<{
    active: boolean;
    endsAt?: string;
  } | null>(null);
  const [matchData, setMatchData] = useState<{
    conversationId?: string;
  } | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterParams>({
    maxDistanceKm: null,
    languages: [],
    purpose: undefined,
    culturalPreference: undefined,
    excludeCountries: [],
    verifiedOnly: false,
    recentlyActive: false,
    minPhotos: 0,
  });
  const [userLanguages, setUserLanguages] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [showLikeLimitModal, setShowLikeLimitModal] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);
  const [likeLimitInfo, setLikeLimitInfo] = useState<{
    likesUsed: number;
    likesLimit: number;
  } | null>(null);
  const [favoriteInfo, setFavoriteInfo] = useState<{
    favoritesUsed: number;
    favoritesRemaining: number;
    favoritesLimit: number;
  } | null>(null);
  
  const { premiumEnabled, refreshPremiumStatus } = usePremium();
  
  // Use both premiumEnabled from context and local isPremium state
  const isUserPremium = premiumEnabled || isPremium;
  
  // Debug: Log premium status
  useEffect(() => {
    console.log("Premium status - Context:", premiumEnabled, "Local:", isPremium, "Combined:", isUserPremium);
  }, [premiumEnabled, isPremium, isUserPremium]);
  
  // Animation refs
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkAuthAndLoadFeed();
    loadBoostStatus();
  }, []);

  const loadBoostStatus = async () => {
    try {
      const status = await api.getBoostStatus();
      setBoostStatus(status);
    } catch (error) {
      console.error("Failed to load boost status:", error);
    }
  };

  const checkAuthAndLoadFeed = async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/(auth)/welcome");
        return;
      }

      const me = await api.getMe();
      const userPremiumStatus = me.user.isPremium || false;
      setIsPremium(userPremiumStatus);
      
      console.log("Premium status from API:", userPremiumStatus);
      
      // Also refresh premium status from context to ensure consistency
      await refreshPremiumStatus();
      
      if (!me.profileExists) {
        router.replace("/(auth)/profile-setup");
        return;
      }

      // Load user profile to get languages
      try {
        const profile = await api.getMyProfile();
        const allLanguages = [
          ...(profile.languagesNative || []),
          ...(profile.languagesPractice || []),
        ];
        setUserLanguages([...new Set(allLanguages)]);
      } catch (error) {
        console.error("Failed to load profile:", error);
      }

      // Load usage limits (only for non-premium users)
      if (!me.user.isPremium) {
        try {
          const usage = await api.getUsage();
          if (usage.usage) {
            setLikeLimitInfo({
              likesUsed: usage.usage.likesUsed || 0,
              likesLimit: usage.usage.likesLimit || 15,
            });
            if (usage.usage.favoritesLimit !== undefined) {
              setFavoriteInfo({
                favoritesUsed: usage.usage.favoritesUsed || 0,
                favoritesRemaining: usage.usage.favoritesRemaining || 0,
                favoritesLimit: usage.usage.favoritesLimit || 5,
              });
            }
          }
        } catch (error) {
          // Ignore errors, will be set when limit is reached
        }
      }

      await loadFeed();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load";
      if (errorMessage.includes("Profile required")) {
        router.replace("/(auth)/profile-setup");
      } else {
        Alert.alert("Error", errorMessage);
      }
    }
  };

  const loadFeed = async () => {
    try {
      setLoading(true);
      // Build filter params - only include explicitly set filters
      const filterParams: any = {};
      if (filters.maxDistanceKm !== null) {
        filterParams.maxDistanceKm = filters.maxDistanceKm;
      }
      if (filters.languages.length > 0) {
        filterParams.languages = filters.languages;
      }
      if (filters.purpose) {
        filterParams.purpose = filters.purpose;
      }
      if (filters.culturalPreference) {
        filterParams.culturalPreference = filters.culturalPreference;
      }
      if (isPremium) {
        if (filters.excludeCountries.length > 0) {
          filterParams.excludeCountries = filters.excludeCountries;
        }
        if (filters.verifiedOnly) {
          filterParams.verifiedOnly = filters.verifiedOnly;
        }
        if (filters.recentlyActive) {
          filterParams.recentlyActive = filters.recentlyActive;
        }
        if (filters.minPhotos > 0) {
          filterParams.minPhotos = filters.minPhotos;
        }
      }

      const cards = await api.getFeed(20, Object.keys(filterParams).length > 0 ? filterParams : undefined);
      setFeed(cards);
      setCurrentIndex(0);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load feed";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (feed.length === 0 || currentIndex >= feed.length) return;

    const currentCard = feed[currentIndex];
    
    // Move to next card immediately for better UX
    const hasMoreCards = currentIndex < feed.length - 1;
    if (hasMoreCards) {
      moveToNext();
    }
    
    // Make API call in background
    try {
      const result = await api.like(currentCard.userId);

      if (result.matched) {
        setMatchData({ conversationId: result.conversationId });
        setShowMatchModal(true);
      }
      
      // Refresh like limit info after successful like
      if (!premiumEnabled) {
        try {
          const usage = await api.getUsage();
          if (usage.usage) {
            setLikeLimitInfo({
              likesUsed: usage.usage.likesUsed || 0,
              likesLimit: usage.usage.likesLimit || 15,
            });
          }
        } catch (error) {
          // Ignore errors
        }
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 429) {
        // Like limit reached - rollback if needed
        if (hasMoreCards) {
          setCurrentIndex(currentIndex);
        }
        const errorData = error.response.data?.error;
        const details = errorData?.details;
        
        if (details && errorData.code === "LIKE_LIMIT_REACHED") {
          setLikeLimitInfo({
            likesUsed: details.likesUsed || 0,
            likesLimit: details.likesLimit || 15,
          });
          setShowLikeLimitModal(true);
        } else {
          Alert.alert("Like Limit", "Daily like limit reached. Watch an ad for more likes or upgrade to Premium.");
        }
      } else {
        // On error, rollback if we moved forward
        if (hasMoreCards) {
          setCurrentIndex(currentIndex);
        }
        const errorMessage =
          error instanceof Error ? error.message : "Failed to like";
        Alert.alert("Error", errorMessage);
      }
    }
  };

  const handleWatchAd = async () => {
    try {
      setWatchingAd(true);
      
      // Show rewarded ad
      const adResult = await showRewardedAd();
      
      if (!adResult.success) {
        if (adResult.error?.includes('closed without earning')) {
          Alert.alert("Ad Not Completed", "Please watch the ad completely to earn your reward.");
        } else {
          Alert.alert("Error", adResult.error || "Failed to watch ad. Please try again.");
        }
        setWatchingAd(false);
        return;
      }

      // Call backend to grant reward
      const rewardResult = await api.rewardAdLike();
      
      // Update like limit info
      setLikeLimitInfo({
        likesUsed: rewardResult.likesInfo.likesUsed,
        likesLimit: rewardResult.likesInfo.likesLimit,
      });
      
      Alert.alert("Success", `You got +${rewardResult.rewardAmount} likes!`);
      setShowLikeLimitModal(false);
      
      // Refresh usage to get updated limits
      try {
        const usage = await api.getUsage();
        if (usage.usage) {
          setLikeLimitInfo({
            likesUsed: usage.usage.likesUsed || 0,
            likesLimit: usage.usage.likesLimit || 15,
          });
        }
      } catch (error) {
        // Ignore errors
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get reward";
      Alert.alert("Error", errorMessage);
    } finally {
      setWatchingAd(false);
    }
  };

  const handlePass = async () => {
    if (feed.length === 0 || currentIndex >= feed.length) return;

    const currentCard = feed[currentIndex];
    
    // Move to next card immediately for better UX
    const hasMoreCards = currentIndex < feed.length - 1;
    const previousIndex = currentIndex;
    
    if (hasMoreCards) {
      moveToNext();
    }
    
    // Make API call in background
    try {
      await api.pass(currentCard.userId);
    } catch (error) {
      // On error, rollback if we moved forward
      if (hasMoreCards) {
        setCurrentIndex(previousIndex);
      }
      const errorMessage =
        error instanceof Error ? error.message : "Failed to pass";
      Alert.alert("Error", errorMessage);
    }
  };

  const handleFavorite = async () => {
    if (feed.length === 0 || currentIndex >= feed.length) return;

    const currentCard = feed[currentIndex];
    
    // Check if user has favorites remaining
    if (!isUserPremium && favoriteInfo && favoriteInfo.favoritesRemaining <= 0) {
      // Show premium paywall
      Alert.alert(
        "Favorites Limit Reached",
        "Get 5 favorites per day with Premium! Upgrade now to favorite unlimited profiles.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Go Premium",
            onPress: () => router.push("/premium"),
          },
        ]
      );
      return;
    }

    try {
      const result = await api.favorite(currentCard.userId);
      
      // Update favorite info
      if (result.favoritesRemaining !== undefined) {
        setFavoriteInfo({
          favoritesUsed: (favoriteInfo?.favoritesUsed || 0) + 1,
          favoritesRemaining: result.favoritesRemaining,
          favoritesLimit: result.favoritesLimit || favoriteInfo?.favoritesLimit || 5,
        });
      }
      
      // Show success (simple alert for now)
      // TODO: Use toast library in production
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 429) {
        // Favorite limit reached
        Alert.alert(
          "Favorites Limit Reached",
          "Get 5 favorites per day with Premium! Upgrade now to favorite unlimited profiles.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Go Premium",
              onPress: () => router.push("/premium"),
            },
          ]
        );
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to favorite";
        Alert.alert("Error", errorMessage);
      }
    }
  };

  const moveToNext = () => {
    setCurrentIndex((prevIndex) => {
      if (prevIndex < feed.length - 1) {
        // Quick fade in animation
        cardOpacity.setValue(0);
        cardTranslateY.setValue(10);
        Animated.parallel([
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(cardTranslateY, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
        
        return prevIndex + 1;
      } else {
        // Load more or show empty state
        loadFeed();
        return prevIndex;
      }
    });
  };

  const handleMatchModalClose = () => {
    setShowMatchModal(false);
    setMatchData(null);
    moveToNext();
  };

  const handleGoToChat = () => {
    setShowMatchModal(false);
    if (matchData?.conversationId) {
      router.push(`/conversation/${matchData.conversationId}`);
    }
    setMatchData(null);
    moveToNext();
  };

  const handleBoost = async (minutes: 60 | 180 | 720) => {
    try {
      await api.activateBoost(minutes);
      await loadBoostStatus();
      setShowBoostModal(false);
      Alert.alert("Success", `Boost activated for ${minutes} minutes!`);
    } catch (error) {
      if (error instanceof AxiosError && (error.response?.status === 403 || error.response?.status === 402)) {
        Alert.alert(
          "Premium Required",
          "Boost is a premium feature. Upgrade to Premium to use it.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Go Premium",
              onPress: () => router.push("/premium"),
            },
          ]
        );
        setShowBoostModal(false);
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to activate boost";
        Alert.alert("Error", errorMessage);
      }
    }
  };

  const getTimeRemaining = () => {
    if (!boostStatus?.active || !boostStatus.endsAt) return null;
    const endsAt = new Date(boostStatus.endsAt);
    const now = new Date();
    const diff = endsAt.getTime() - now.getTime();
    if (diff <= 0) return null;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (loading && feed.length === 0) {
    return (
      <SafeAreaView>
        <View style={styles.content}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (feed.length === 0) {
    return (
      <SafeAreaView>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Swiip</Text>
              {isUserPremium && (
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.premiumBadge}
                >
                  <Text style={styles.premiumBadgeIcon}>✨</Text>
                  <Text style={styles.premiumBadgeText}>Premium</Text>
                </LinearGradient>
              )}
            </View>
            {boostStatus?.active && (
              <TouchableOpacity
                style={styles.boostPill}
                onPress={() => setShowBoostModal(true)}
              >
                <Text style={styles.boostPillText}>
                  ⚡ {getTimeRemaining()}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>Bugünlük herkesi gördün!</Text>
            <Text style={styles.emptyText}>
              Yeni insanlar yakında burada olacak.{"\n"}
              Biraz sonra tekrar kontrol et 😊
            </Text>
            <PrimaryButton
              title="Yenile"
              onPress={loadFeed}
              style={styles.refreshButton}
            />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const currentCard = feed[currentIndex];

  return (
    <SafeAreaView>
      <View style={styles.content}>
        {/* Compact Premium Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Swiip</Text>
            {isUserPremium && (
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.premiumBadge}
              >
                <Text style={styles.premiumBadgeIcon}>✨</Text>
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </LinearGradient>
            )}
            {!isUserPremium && favoriteInfo && (
              <View style={styles.favoriteCounter}>
                <Text style={styles.favoriteCounterText}>
                  Favorites: {favoriteInfo.favoritesRemaining}/{favoriteInfo.favoritesLimit}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            {boostStatus?.active && (
              <TouchableOpacity
                style={styles.boostPill}
                onPress={() => setShowBoostModal(true)}
              >
                <Text style={styles.boostPillText}>
                  ⚡ {getTimeRemaining()}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => {
                console.log("Filter button pressed, opening modal");
                setShowFilterModal(true);
              }}
            >
              <Text style={styles.filterButtonText}>☰</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card Container */}
        <View style={styles.scrollView}>
          <View style={styles.cardContainer}>
            <Animated.View
              style={[
                styles.animatedCard,
                {
                  opacity: cardOpacity,
                  transform: [{ translateY: cardTranslateY }],
                },
              ]}
            >
              <DiscoveryCard 
                card={currentCard} 
                onSwipeLeft={handlePass}
                onSwipeRight={handleLike}
                onFavorite={handleFavorite}
              />
            </Animated.View>
          </View>
        </View>


      {/* Filter Modal */}
      <FilterSheet
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          loadFeed();
        }}
        initialFilters={filters}
        userLanguages={userLanguages}
        isPremium={isPremium}
      />

      {/* Match Modal */}
      <Modal
        visible={showMatchModal}
        transparent
        animationType="fade"
        onRequestClose={handleMatchModalClose}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.matchTitle}>It's a match!</Text>
            <Text style={styles.matchSubtitle}>
              You and {currentCard?.profile.displayName} liked each other
            </Text>
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Say hi"
                onPress={handleGoToChat}
                style={styles.modalButton}
              />
              <TouchableOpacity
                onPress={handleMatchModalClose}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>Continue swiping</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </Modal>

      {/* Boost Modal */}
      <Modal
        visible={showBoostModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBoostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Boost Your Profile</Text>
            <Text style={styles.modalText}>
              Get more visibility and appear at the top of discovery feed
            </Text>
            {boostStatus?.active && (
              <View style={styles.activeBoostInfo}>
                <Text style={styles.activeBoostText}>
                  Active boost ends in: {getTimeRemaining()}
                </Text>
              </View>
            )}
            <View style={styles.boostOptions}>
              <TouchableOpacity
                style={styles.boostOption}
                onPress={() => handleBoost(60)}
              >
                <Text style={styles.boostOptionTitle}>1 Hour</Text>
                <Text style={styles.boostOptionSubtitle}>Quick boost</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.boostOption}
                onPress={() => handleBoost(180)}
              >
                <Text style={styles.boostOptionTitle}>3 Hours</Text>
                <Text style={styles.boostOptionSubtitle}>Popular choice</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.boostOption}
                onPress={() => handleBoost(720)}
              >
                <Text style={styles.boostOptionTitle}>12 Hours</Text>
                <Text style={styles.boostOptionSubtitle}>Maximum visibility</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => setShowBoostModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </Modal>

      {/* Like Limit Modal */}
      {likeLimitInfo && (
        <LikeLimitModal
          visible={showLikeLimitModal}
          onClose={() => setShowLikeLimitModal(false)}
          onWatchAd={handleWatchAd}
          likesUsed={likeLimitInfo.likesUsed}
          likesLimit={likeLimitInfo.likesLimit}
          isPremium={premiumEnabled}
          watchingAd={watchingAd}
        />
      )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    minHeight: 40,
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
    gap: spacing.xs / 2,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  premiumBadgeIcon: {
    fontSize: typography.fontSize.sm,
  },
  premiumBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    letterSpacing: 0.5,
  },
  favoriteCounter: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  favoriteCounterText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  filterButton: {
    padding: spacing.xs,
    borderRadius: 8,
  },
  filterButtonText: {
    fontSize: typography.fontSize.lg,
    color: colors.textDark,
  },
  boostPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 16,
    backgroundColor: colors.accent + "25",
    borderWidth: 1,
    borderColor: colors.accent + "50",
  },
  boostPillText: {
    color: colors.textDark,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  scrollView: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  cardContainer: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: spacing.xs,
  },
  animatedCard: {
    width: "100%",
    maxWidth: 400,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  emptyCard: {
    marginTop: spacing.xl,
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  refreshButton: {
    marginTop: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
  },
  matchTitle: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  matchSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  modalActions: {
    gap: spacing.md,
  },
  modalButton: {
    width: "100%",
  },
  modalCloseButton: {
    padding: spacing.md,
    alignItems: "center",
  },
  modalCloseText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  activeBoostInfo: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  activeBoostText: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
    textAlign: "center",
  },
  boostOptions: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  boostOption: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boostOptionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  boostOptionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});
