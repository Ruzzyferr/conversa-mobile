import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
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
import { SwipeDeck } from "@/src/components/SwipeDeck";
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
    matchedUserId?: string;
    matchedUserName?: string;
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
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showDirectLimitModal, setShowDirectLimitModal] = useState(false);
  
  const { premiumEnabled, refreshPremiumStatus } = usePremium();
  
  // Use both premiumEnabled from context and local isPremium state
  const isUserPremium = premiumEnabled || isPremium;
  
  // Debug: Log premium status
  useEffect(() => {
    console.log("Premium status - Context:", premiumEnabled, "Local:", isPremium, "Combined:", isUserPremium);
  }, [premiumEnabled, isPremium, isUserPremium]);
  

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

  // Track which cards are being removed to prevent double-removal
  const removingCardsRef = useRef<Set<string>>(new Set());

  // Remove top card from feed (called after swipe animation completes)
  const removeTopCard = useCallback((cardToRemove: DiscoveryCard) => {
    if (!cardToRemove?.userId) return;
    
    const removedUserId = cardToRemove.userId;
    
    // Check if we're already removing this card
    if (removingCardsRef.current.has(removedUserId)) {
      console.warn(`removeTopCard: Card ${removedUserId} is already being removed, skipping`);
      return;
    }
    
    // Mark this card as being removed
    removingCardsRef.current.add(removedUserId);
    
    // Remove card from feed using functional update to avoid stale closure issues
    setFeed((prevFeed) => {
      // Verify the card is actually in the feed before removing
      const cardIndex = prevFeed.findIndex((card) => card.userId === removedUserId);
      if (cardIndex === -1) {
        // Card wasn't found, might have been already removed
        console.warn(`removeTopCard: Card ${removedUserId} not found in feed`);
        removingCardsRef.current.delete(removedUserId);
        return prevFeed;
      }
      
      // Filter out the card with the matching userId
      const newFeed = prevFeed.filter((card) => card.userId !== removedUserId);
      
      // Clear the removal flag after a short delay
      setTimeout(() => {
        removingCardsRef.current.delete(removedUserId);
      }, 100);
      
      return newFeed;
    });
    // Always keep index at 0 for deck rendering
    setCurrentIndex(0);
  }, []);

  const handleLike = async (cardOverride?: DiscoveryCard) => {
    // SwipeDeck always passes the card being swiped (items[0])
    // We MUST use cardOverride if provided, as feed[0] might be stale
    if (!cardOverride) {
      console.warn("handleLike: No cardOverride provided, cannot proceed");
      return;
    }
    
    const currentCard = cardOverride;
    const likedUserId = currentCard.userId;
    
    // Remove card from feed immediately (swipe animation already completed)
    removeTopCard(currentCard);
    
    // Make API call in background (fire-and-forget)
    api.like(likedUserId).then((result) => {
      // Check if we matched
      if (result.matched && result.matchId && result.conversationId) {
        // It's a match! Show match modal
        setMatchData({
          conversationId: result.conversationId,
          matchedUserId: likedUserId,
          matchedUserName: currentCard.profile.displayName,
        });
        setShowMatchModal(true);
      }
      
      // Refresh like limit info
      if (!premiumEnabled) {
        api.getUsage().then((usage) => {
          if (usage.usage) {
            setLikeLimitInfo({
              likesUsed: usage.usage.likesUsed || 0,
              likesLimit: usage.usage.likesLimit || 15,
            });
          }
        }).catch(() => {});
      }
    }).catch((error) => {
      if (error instanceof AxiosError && error.response?.status === 429) {
        const errorData = error.response.data?.error;
        const details = errorData?.details;
        
        if (details && errorData.code === "LIKE_LIMIT_REACHED") {
          setLikeLimitInfo({
            likesUsed: details.likesUsed || 0,
            likesLimit: details.likesLimit || 15,
          });
          setShowLikeLimitModal(true);
        }
      }
      // Silently handle other errors - card already removed
    });
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

  const handlePass = async (cardOverride?: DiscoveryCard) => {
    // SwipeDeck always passes the card being swiped (items[0])
    // We MUST use cardOverride if provided, as feed[0] might be stale
    if (!cardOverride) {
      console.warn("handlePass: No cardOverride provided, cannot proceed");
      return;
    }
    
    const currentCard = cardOverride;
    const passedUserId = currentCard.userId;
    
    // Remove card from feed immediately (swipe animation already completed)
    removeTopCard(currentCard);
    
    // Make API call in background (fire-and-forget)
    api.pass(passedUserId).catch((error) => {
      // Silently handle errors - card already removed
      console.error("Failed to pass:", error);
    });
  };

  const handleFavorite = async (cardOverride?: DiscoveryCard) => {
    // SwipeDeck always passes the card being swiped (items[0])
    // We MUST use cardOverride if provided, as feed[0] might be stale
    if (!cardOverride) {
      console.warn("handleFavorite: No cardOverride provided, cannot proceed");
      return;
    }
    
    const currentCard = cardOverride;
    
    // Check limit before opening modal
    if (!isUserPremium) {
      try {
        const usage = await api.getUsage();
        if (usage.usage && usage.usage.favoritesRemaining !== undefined) {
          if (usage.usage.favoritesRemaining <= 0) {
            // Show limit modal instead of message modal
            setShowDirectLimitModal(true);
            return;
          }
        }
      } catch (error) {
        // If we can't check, still allow trying (will show error on send)
        console.error("Failed to check direct message limit:", error);
      }
    }
    
    setShowFavoriteModal(true);
  };

  const handleSendFavorite = async () => {
    if (feed.length === 0) return;
    if (favoriteMessage.trim().length < 10) {
      Alert.alert("Uyarı", "Mesaj en az 10 karakter olmalıdır");
      return;
    }

    // Use first card since SwipeDeck always shows items[0] as top card
    const currentCard = feed[0];
    if (!currentCard) return;
    setShowFavoriteModal(false);

    try {
      const result = await api.favorite(currentCard.userId, favoriteMessage.trim());
      
      // Update favorite info
      if (!isUserPremium && favoriteInfo) {
        setFavoriteInfo({
          ...favoriteInfo,
          favoritesRemaining: Math.max(0, favoriteInfo.favoritesRemaining - 1),
          favoritesUsed: favoriteInfo.favoritesUsed + 1,
        });
      }
      
      // Show success modal
      setSuccessMessage("Mesaj isteği gönderildi");
      setShowSuccessModal(true);
      
      // Clear message and move to next
      setFavoriteMessage("");
      // Don't call moveToNext - just remove card from feed
      setFeed((prevFeed) => {
        const newFeed = prevFeed.filter((card) => card.userId !== currentCard.userId);
        
        // Only load more if feed is completely empty
        if (newFeed.length === 0) {
          setTimeout(() => loadFeed(), 100);
        }
        
        return newFeed;
      });
      
      // Auto-close success modal after 2 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 429) {
        // Direct message limit reached - show modal
        setShowDirectLimitModal(true);
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Mesaj gönderilemedi";
        Alert.alert("Hata", errorMessage);
      }
    }
  };

  const moveToNext = () => {
    // Deck her zaman index 0'dan gösteriyor; feed bittiğinde yenisini yükle
    if (feed.length <= 1) {
      loadFeed();
    }
    setCurrentIndex(0);
  };

  const handleMatchModalClose = () => {
    setShowMatchModal(false);
    // Card was already removed in handleLike, but remove it again if somehow still there
    if (matchData?.matchedUserId) {
      setFeed((prevFeed) => prevFeed.filter((card) => card.userId !== matchData.matchedUserId));
    }
    setMatchData(null);
    moveToNext();
  };

  const handleGoToChat = () => {
    setShowMatchModal(false);
    // Card was already removed in handleLike, but remove it again if somehow still there
    if (matchData?.matchedUserId) {
      setFeed((prevFeed) => prevFeed.filter((card) => card.userId !== matchData.matchedUserId));
    }
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

  // Safety check: ensure feed has cards
  if (feed.length === 0) {
    return (
      <SafeAreaView>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Swiip</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowFilterModal(true)}
              >
                <Text style={styles.filterButtonText}>☰</Text>
              </TouchableOpacity>
            </View>
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

  // SwipeDeck always uses items[0] as the top card
  const currentCard = feed[0];

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

        {/* Card Container - Swipe Deck (smooth animated style) */}
        <View style={styles.scrollView}>
          <SwipeDeck
            items={feed}
            onSwipeLeft={handlePass}
            onSwipeRight={handleLike}
            OverlayLabelRight={() => (
              <View style={styles.overlayContainer}>
                <View style={[styles.overlayLabel, styles.overlayLabelRight]}>
                  <Text style={styles.overlayLabelText}>LIKE</Text>
                </View>
              </View>
            )}
            OverlayLabelLeft={() => (
              <View style={styles.overlayContainer}>
                <View style={[styles.overlayLabel, styles.overlayLabelLeft]}>
                  <Text style={styles.overlayLabelText}>PASS</Text>
                </View>
              </View>
            )}
            renderCard={(card) => (
              <DiscoveryCard
                card={card}
                onFavorite={() => handleFavorite(card)}
                favoritesRemaining={favoriteInfo?.favoritesRemaining}
                isPremium={isUserPremium}
                disablePan={true}
              />
            )}
          />
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
              You and {matchData?.matchedUserName || "someone"} liked each other
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
            <Text style={styles.boostModalTitle}>Boost Your Profile</Text>
            <Text style={styles.boostModalText}>
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

      {/* Favorite Modal */}
      <Modal
        visible={showFavoriteModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowFavoriteModal(false);
          setFavoriteMessage("");
        }}
      >
        <View style={styles.favoriteModalOverlay}>
          <View style={styles.favoriteModalContent}>
            <Text style={styles.favoriteModalTitle}>Direkt Mesaj Gönder</Text>
            <Text style={styles.favoriteModalSubtitle}>
              Bu kişiye bir mesaj gönder. Mesaj en az 10 karakter olmalıdır.
            </Text>
            <TextInput
              style={styles.favoriteMessageInput}
              value={favoriteMessage}
              onChangeText={setFavoriteMessage}
              placeholder="Mesajınızı yazın..."
              placeholderTextColor={colors.textSecondaryDark}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={styles.favoriteCharCount}>
              {favoriteMessage.length}/2000
            </Text>
            <View style={styles.favoriteModalButtons}>
              <TouchableOpacity
                style={[styles.favoriteModalButton, styles.favoriteModalButtonCancel]}
                onPress={() => {
                  setShowFavoriteModal(false);
                  setFavoriteMessage("");
                }}
              >
                <Text style={styles.favoriteModalButtonCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.favoriteModalButton,
                  styles.favoriteModalButtonConfirm,
                  favoriteMessage.trim().length < 10 && styles.favoriteModalButtonDisabled,
                ]}
                onPress={handleSendFavorite}
                disabled={favoriteMessage.trim().length < 10}
              >
                <Text style={styles.favoriteModalButtonConfirmText}>Gönder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.successModalTitle}>Başarılı</Text>
            <Text style={styles.successModalMessage}>{successMessage}</Text>
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successModalButtonText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Direct Message Limit Modal */}
      <Modal
        visible={showDirectLimitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDirectLimitModal(false)}
      >
        <View style={styles.directLimitModalOverlay}>
          <View style={styles.directLimitModalContent}>
            <View style={styles.directLimitIconContainer}>
              <Text style={styles.directLimitIcon}>⚠️</Text>
            </View>
            <Text style={styles.directLimitModalTitle}>Limit Doldu</Text>
            <Text style={styles.directLimitModalMessage}>
              Haftalık direkt mesaj hakkın bitti.{"\n"}
              Premium ile haftada 5 direkt mesaj gönderebilirsin.
            </Text>
            <View style={styles.directLimitModalButtons}>
              <TouchableOpacity
                style={[styles.directLimitModalButton, styles.directLimitModalButtonCancel]}
                onPress={() => setShowDirectLimitModal(false)}
              >
                <Text style={styles.directLimitModalButtonCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.directLimitModalButton, styles.directLimitModalButtonConfirm]}
                onPress={() => {
                  setShowDirectLimitModal(false);
                  router.push("/premium");
                }}
              >
                <Text style={styles.directLimitModalButtonConfirmText}>Premium'a Geç</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    position: "relative",
    minHeight: 650, // Ensure enough space for stacked cards
    width: "100%",
  },
  stackCard: {
    position: "absolute",
    width: "100%",
    maxWidth: 400,
    top: 0,
    left: 0,
    right: 0,
    alignSelf: "center",
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
  favoriteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  favoriteModalContent: {
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 20,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  favoriteModalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  favoriteModalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    marginBottom: spacing.md,
    textAlign: "center",
    lineHeight: 20,
  },
  favoriteMessageInput: {
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textDark,
    minHeight: 100,
    marginBottom: spacing.xs,
  },
  favoriteCharCount: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondaryDark,
    textAlign: "right",
    marginBottom: spacing.md,
  },
  favoriteModalButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  favoriteModalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteModalButtonCancel: {
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  favoriteModalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  favoriteModalButtonDisabled: {
    opacity: 0.5,
  },
  favoriteModalButtonCancelText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
  },
  favoriteModalButtonConfirmText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: "#FFFFFF",
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  successModalContent: {
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 20,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 350,
    borderWidth: 1,
    borderColor: colors.borderDark,
    alignItems: "center",
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  successIcon: {
    fontSize: 36,
    color: colors.primary,
    fontWeight: "bold",
  },
  successModalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  successModalMessage: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    marginBottom: spacing.lg,
    textAlign: "center",
    lineHeight: 22,
  },
  successModalButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  successModalButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: "#FFFFFF",
  },
  directLimitModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  directLimitModalContent: {
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 20,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 350,
    borderWidth: 1,
    borderColor: colors.borderDark,
    alignItems: "center",
  },
  directLimitIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.warning + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  directLimitIcon: {
    fontSize: 36,
  },
  directLimitModalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  directLimitModalMessage: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    marginBottom: spacing.lg,
    textAlign: "center",
    lineHeight: 22,
  },
  directLimitModalButtons: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  directLimitModalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  directLimitModalButtonCancel: {
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  directLimitModalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  directLimitModalButtonCancelText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
  },
  directLimitModalButtonConfirmText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: "#FFFFFF",
  },
  boostModalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  boostModalText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  overlayContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayLabel: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 4,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  overlayLabelRight: {
    borderColor: colors.primary,
  },
  overlayLabelLeft: {
    borderColor: colors.error || "#EF4444",
  },
  overlayLabelText: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: "#FFFFFF",
    letterSpacing: 2,
  },
});
