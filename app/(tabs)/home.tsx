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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/theme/colors";
import { Wordmark } from "@/src/components/brand/Wordmark";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Card } from "@/src/components/Card";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { DiscoveryCard } from "@/src/components/DiscoveryCard";
import { SwipeDeck, SwipeDeckHandle } from "@/src/components/SwipeDeck";
import { DeckActionBar } from "@/src/components/DeckActionBar";
import { tabBarClearance } from "@/src/config/layout";
import { FilterSheet, FilterParams } from "@/src/components/FilterSheet";
import { LikeLimitModal } from "@/src/components/LikeLimitModal";
import { UpsellModal } from "@/src/components/UpsellModal";
import { api } from "@/src/services/api";
import { getToken } from "@/src/services/authStore";
import { showRewardedAd } from "@/src/services/rewardedAds";
import { showInterstitialAd, initializeInterstitialAds, preloadInterstitialAd } from "@/src/services/interstitialAds";
import { usePremium } from "@/src/state/premium";
import { getOfferings, purchasePremium, PurchasesPackage } from "@/src/services/purchases";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { MatchPopup } from "@/src/components/MatchPopup";
import { useSocket, NewMatchEvent } from "@/src/state/socket";

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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [favoritePackage, setFavoritePackage] = useState<PurchasesPackage | null>(null);
  const [feed, setFeed] = useState<DiscoveryCard[]>([]);
  const swipeDeckRef = useRef<SwipeDeckHandle>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [upsellVariant, setUpsellVariant] = useState<null | "boost" | "favorite">(null);
  const [boostStatus, setBoostStatus] = useState<{
    active: boolean;
    endsAt?: string;
  } | null>(null);
  // Shaped as the socket's NewMatchEvent so the same rich MatchPopup renders
  // whichever way the match arrives.
  const [matchData, setMatchData] = useState<NewMatchEvent | null>(null);
  // The server emits "new match" to BOTH sides, so liking someone back also
  // wakes the global MatchPopup in _layout. Clearing it here keeps a single
  // celebration on screen instead of two stacked ones (likes.tsx does the same).
  const { clearNewMatches } = useSocket();
  const [showFilterModal, setShowFilterModal] = useState(false);
  const defaultFilters: FilterParams = {
    ageRange: [18, 60],
    gender: "ALL",
    distanceRange: [0, 100],
    nativeLanguages: [],
    targetLanguages: [],
    countries: [],
    purpose: undefined,
    verifiedOnly: false,
    recentlyActive: false,
    minPhotos: 0,
  };
  const [filters, setFilters] = useState<FilterParams>(defaultFilters);
  const hasNonDefaultFilters = useMemo(
    () =>
      filters.ageRange[0] !== 18 ||
      filters.ageRange[1] !== 60 ||
      filters.gender !== "ALL" ||
      filters.distanceRange[0] !== 0 ||
      filters.distanceRange[1] !== 100 ||
      filters.nativeLanguages.length > 0 ||
      filters.targetLanguages.length > 0 ||
      filters.countries.length > 0 ||
      filters.purpose !== undefined ||
      filters.verifiedOnly ||
      filters.recentlyActive ||
      filters.minPhotos > 0,
    [filters],
  );
  const handleResetFilters = () => {
    setFilters(defaultFilters);
    loadFeed(false, defaultFilters);
  };
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
  const [favoriteCard, setFavoriteCard] = useState<DiscoveryCard | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showDirectLimitModal, setShowDirectLimitModal] = useState(false);

  // Swipe counter for interstitial ads (show every 10 swipes for non-premium)
  const swipeCountRef = useRef(0);
  const SWIPES_BEFORE_AD = 10;

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
    // Initialize interstitial ads
    initializeInterstitialAds();
    loadOfferings();
    loadLikeStatus();
  }, []);

  // Transparent daily-like counter: fetch on mount so the user always sees
  // how many likes remain instead of discovering the limit by surprise.
  const loadLikeStatus = async () => {
    try {
      const status = await api.getLikeStatus();
      if (!status.isPremium && status.likesRemaining !== null && status.likesLimit !== null) {
        setLikeLimitInfo({
          likesUsed: status.likesUsed,
          likesLimit: status.likesLimit,
        });
      }
    } catch {
      // Non-critical
    }
  };

  const loadOfferings = async () => {
    try {
      const offerings = await getOfferings();
      if (offerings?.availablePackages) {
        // Look for favorite pack - match RevenueCat identifier
        const foundPackage = offerings.availablePackages.find(
          pkg => 
            pkg.identifier === "Favorite Pack" ||
            pkg.identifier === "conversa_favorite_5pack" ||
            pkg.product.identifier === "conversa_favorite_5pack"
        );
        if (foundPackage) {
          setFavoritePackage(foundPackage);
        }
      }
    } catch (error) {
      console.log("Failed to load offerings:", error);
    }
  };

  const maybeShowInterstitialAd = useCallback(async () => {
    if (isUserPremium) return; // Premium users don't see ads
    // Never cover a match: the like response opens the match modal a moment
    // after the swipe, and an ad on top of it buries the best moment in the app.
    if (showMatchModal) return;

    swipeCountRef.current += 1;

    if (swipeCountRef.current >= SWIPES_BEFORE_AD) {
      swipeCountRef.current = 0; // Reset counter
      const result = await showInterstitialAd();
      if (!result.success) {
        // Ad not ready, preload for next time
        preloadInterstitialAd();
      }
    }
  }, [isUserPremium, showMatchModal]);

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
        error instanceof Error ? error.message : t('common.load_error'); // Assuming 'load_error' or generic 'error'
      if (errorMessage.includes("Profile required")) {
        router.replace("/(auth)/profile-setup");
      } else {
        Alert.alert(t('common.error'), errorMessage);
      }
    }
  };

  const loadFeed = async (forceReshuffle: boolean = false, filtersOverride?: typeof filters) => {
    try {
      setLoading(true);
      // Use override filters if provided, otherwise use state
      const activeFilters = filtersOverride || filters;

      // Build filter params - only include explicitly set filters
      const filterParams: any = {};
      // Distance filter (use max of range if not default)
      if (activeFilters.distanceRange[1] < 100) {
        filterParams.maxDistanceKm = activeFilters.distanceRange[1];
      }
      // Language filters
      if (activeFilters.nativeLanguages.length > 0) {
        filterParams.nativeLanguages = activeFilters.nativeLanguages;
      }
      if (activeFilters.targetLanguages.length > 0) {
        filterParams.targetLanguages = activeFilters.targetLanguages;
      }
      // Purpose
      if (activeFilters.purpose) {
        filterParams.purpose = activeFilters.purpose;
      }
      // Country filter
      if (activeFilters.countries.length > 0) {
        filterParams.countries = activeFilters.countries;
      }
      // Gender filter
      if (activeFilters.gender !== "ALL") {
        filterParams.gender = activeFilters.gender;
      }
      // Age range
      if (activeFilters.ageRange[0] > 18 || activeFilters.ageRange[1] < 60) {
        filterParams.ageRange = activeFilters.ageRange;
      }
      // Premium filters
      if (isPremium) {
        if (activeFilters.verifiedOnly) {
          filterParams.verifiedOnly = activeFilters.verifiedOnly;
        }
        if (activeFilters.recentlyActive) {
          filterParams.recentlyActive = activeFilters.recentlyActive;
        }
        if (activeFilters.minPhotos > 0) {
          filterParams.minPhotos = activeFilters.minPhotos;
        }
      }
      // Force reshuffle when filters are applied
      if (forceReshuffle) {
        filterParams.forceReshuffle = true;
      }

      const cards = await api.getFeed(20, Object.keys(filterParams).length > 0 ? filterParams : undefined);
      setFeed(cards);
      setCurrentIndex(0);

    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('home.load_feed_error');
      Alert.alert(t('common.error'), errorMessage);
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

  const handleBlock = useCallback((card: DiscoveryCard) => {
    if (!card?.userId) return;
    Alert.alert(
      t('safety.block_confirm_title'),
      t('safety.block_confirm_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('safety.block'),
          style: 'destructive',
          onPress: async () => {
            removeTopCard(card);
            try {
              await api.blockUser(card.userId);
              Alert.alert(t('safety.blocked_toast'));
            } catch (e) {
              console.error('block failed', e);
            }
          },
        },
      ]
    );
  }, [removeTopCard, t]);

  const handleReport = useCallback((card: DiscoveryCard) => {
    if (!card?.userId) return;
    const reasons: Array<{ label: string; value: "SPAM" | "HARASSMENT" | "NUDITY" | "SCAM" | "OTHER" }> = [
      { label: t('safety.reason_spam'), value: 'SPAM' },
      { label: t('safety.reason_harassment'), value: 'HARASSMENT' },
      { label: t('safety.reason_nudity'), value: 'NUDITY' },
      { label: t('safety.reason_scam'), value: 'SCAM' },
      { label: t('safety.reason_other'), value: 'OTHER' },
    ];
    Alert.alert(
      t('safety.report_title'),
      t('safety.report_msg'),
      [
        ...reasons.map((r) => ({
          text: r.label,
          onPress: async () => {
            removeTopCard(card);
            try {
              await api.reportUser(card.userId, r.value);
              Alert.alert(t('safety.reported_toast'));
            } catch (e) {
              console.error('report failed', e);
            }
          },
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ]
    );
  }, [removeTopCard, t]);

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

    // Show interstitial ad every 5 swipes for non-premium users
    maybeShowInterstitialAd();

    // Make API call in background (fire-and-forget)
    api.like(likedUserId).then((result) => {
      // Check if we matched
      if (result.matched && result.matchId && result.conversationId) {
        // It's a match! Show match modal
        setMatchData({
          matchId: result.matchId,
          conversationId: result.conversationId,
          otherUser: {
            userId: likedUserId,
            displayName: currentCard.profile.displayName,
            photos: currentCard.profile.photos ?? [],
          },
        });
        setShowMatchModal(true);
        clearNewMatches();
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
        }).catch(() => { });
      }
    }).catch((error) => {
      if (error instanceof AxiosError && error.response?.status === 429) {
        const errorData = error.response.data?.error;
        const details = errorData?.details;

        if (details && errorData.code === "LIKE_LIMIT_REACHED") {
          // Restore the card to the front of the feed
          setFeed(prevFeed => [currentCard, ...prevFeed.filter(c => c.userId !== currentCard.userId)]);

          // Trigger swipeBack animation to bring card back visually
          setTimeout(() => {
            swipeDeckRef.current?.swipeBack();
          }, 100);

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

      // Ask the backend for a one-time proof token first; AdMob echoes it
      // back through its signed verification callback, which is what lets the
      // server grant the reward on evidence rather than on trust. Failing to
      // get one is not fatal while SSV enforcement is still rolling out.
      let ssv: { nonce: string; userId: string } | undefined;
      try {
        ssv = await api.requestAdRewardToken("LIKE");
      } catch {
        ssv = undefined;
      }

      const adResult = await showRewardedAd(ssv);

      if (!adResult.success) {
        if (adResult.error?.includes('closed without earning')) {
          Alert.alert(t('home.ad.not_completed_title'), t('home.ad.not_completed_msg'));
        } else {
          Alert.alert(t('common.error'), adResult.error || t('home.ad.error'));
        }
        setWatchingAd(false);
        return;
      }

      // Call backend to grant reward
      const rewardResult = await api.rewardAdLike(ssv?.nonce);

      // Update like limit info
      setLikeLimitInfo({
        likesUsed: rewardResult.likesInfo.likesUsed,
        likesLimit: rewardResult.likesInfo.likesLimit,
      });

      Alert.alert(t('home.ad.success'), t('home.ad.reward_msg', { amount: rewardResult.rewardAmount }));
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
      Alert.alert(t('common.error'), errorMessage);
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

    // Show interstitial ad every 5 swipes for non-premium users
    maybeShowInterstitialAd();

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
            // Show limit modal with purchase option
            const price = favoritePackage?.product.priceString || t('home.favorite.default_pack_name');
            Alert.alert(
              t('home.favorite.limit_title'),
              t('home.favorite.limit_msg'),
              [
                {
                  text: t('common.cancel'),
                  style: "cancel",
                },
                {
                  text: t('home.favorite.purchase_btn'),
                  onPress: async () => {
                    await handlePurchaseFavorites();
                  },
                },
              ]
            );
            return;
          }
        }
      } catch (error) {
        // If we can't check, still allow trying (will show error on send)
        console.error("Failed to check direct message limit:", error);
      }
    }

    // Store the card we're favoriting
    setFavoriteCard(currentCard);
    setShowFavoriteModal(true);
  };

  const handleSendFavorite = async () => {
    if (!favoriteCard) return;
    if (favoriteMessage.trim().length < 10) {
      Alert.alert(t('common.error'), t('home.favorite.modal_subtitle'));
      return;
    }

    const currentCard = favoriteCard;
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
      setSuccessMessage(t('home.favorite.success_msg'));
      setShowSuccessModal(true);

      // Clear message and card, remove from feed
      setFavoriteMessage("");
      setFavoriteCard(null);
      // Don't call moveToNext - just remove card from feed
      removeTopCard(currentCard);

      // Auto-close success modal after 2 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 429) {
        // Direct message limit reached — show the upsell modal
        setUpsellVariant("favorite");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : t('chat.send_error');
        Alert.alert(t('common.error'), errorMessage);
      }
      // Reset favorite card on error
      setFavoriteCard(null);
    }
  };

  const moveToNext = () => {
    // Deck her zaman index 0'dan gösteriyor; feed bittiğinde yenisini yükle
    if (feed.length <= 1) {
      loadFeed();
    }
    setCurrentIndex(0);
  };

  const handlePurchaseFavorites = async () => {
    try {
      setLoading(true);

      if (favoritePackage) {
        // Real purchase
        await purchasePremium(favoritePackage);

        // Only if purchase succeeds (doesn't throw), sync with backend
        await api.syncBilling();

        Alert.alert(t('home.favorite.success_title'), t('home.favorite.purchase_success'));

        // Refresh limits
        const usage = await api.getUsage();
        if (usage.usage) {
          setFavoriteInfo({
            favoritesUsed: usage.usage.favoritesUsed || 0,
            favoritesRemaining: usage.usage.favoritesRemaining || 0,
            favoritesLimit: usage.usage.favoritesLimit || 5,
          });
        }
      } else {
        // Configuration Error - Do NOT give for free
        console.warn("No favorite package (conversa_favorite_5pack) found in RevenueCat offerings.");
        Alert.alert("Configuration Error", "Favorite package not found. Please check App configuration.");
      }

    } catch (error: any) {
      if (error.message === "Purchase cancelled") {
        return;
      }
      console.error("Favorite purchase error:", error);
      Alert.alert(t('common.error'), t('home.favorite.purchase_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleMatchModalClose = () => {
    setShowMatchModal(false);
    // Card was already removed in handleLike, but remove it again if somehow still there
    if (matchData?.otherUser.userId) {
      setFeed((prevFeed) => prevFeed.filter((card) => card.userId !== matchData.otherUser.userId));
    }
    setMatchData(null);
    moveToNext();
  };

  const handleBoost = async () => {
    try {
      // Boost duration is fixed server-side (30 minutes); there is no per-duration
      // option, so we activate a single boost.
      await api.activateBoost();
      await loadBoostStatus();
      setShowBoostModal(false);
      Alert.alert(t('home.ad.success'), t('home.boost.activated'));
    } catch (error) {
      if (error instanceof AxiosError && (error.response?.status === 403 || error.response?.status === 402)) {
        setShowBoostModal(false);
        setUpsellVariant("boost");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : t('home.boost.activation_error');
        Alert.alert(t('common.error'), errorMessage);
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
        <View style={[styles.content, styles.loadingContent]}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
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
              <Wordmark size="sm" />
              {isUserPremium && (
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.premiumBadge}
                >
                  <MaterialIcons name="workspace-premium" size={13} color={colors.textInverse} />
                  <Text style={styles.premiumBadgeText}>{t('home.premium_badge')}</Text>
                </LinearGradient>
              )}
            </View>
            <View style={styles.headerRight}>
              {boostStatus?.active && (
                <TouchableOpacity
                  style={styles.boostPill}
                  onPress={() => setShowBoostModal(true)}
                >
                  <MaterialIcons name="bolt" size={14} color={colors.boostGold} />
                  <Text style={styles.boostPillText}>{getTimeRemaining()}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.filterButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => setShowFilterModal(true)}
              >
                <MaterialIcons name="tune" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.emptyWrap}>
            <Card style={styles.emptyCard} elevated>
              <View style={styles.emptyEmojiBadge}>
                <MaterialIcons name="explore" size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {hasNonDefaultFilters
                  ? t('home.empty.filtered_title')
                  : t('home.empty.title')}
              </Text>
              <Text style={styles.emptyText}>
                {hasNonDefaultFilters
                  ? t('home.empty.filtered_text')
                  : t('home.empty.text')}
              </Text>
              <PrimaryButton
                title={t('home.empty.refresh')}
                onPress={() => loadFeed()}
                style={styles.refreshButton}
              />
              {hasNonDefaultFilters && (
                <TouchableOpacity
                  onPress={handleResetFilters}
                  style={styles.resetFiltersLink}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.empty.reset_filters')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.resetFiltersText}>
                    {t('home.empty.reset_filters')}
                  </Text>
                </TouchableOpacity>
              )}
            </Card>
          </View>
          <FilterSheet
            visible={showFilterModal}
            onClose={() => setShowFilterModal(false)}
            onApply={(newFilters) => {
              setFilters(newFilters);
              loadFeed(true, newFilters);
            }}
            initialFilters={filters}
            isPremium={isUserPremium}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Safety check: ensure feed has cards


  // SwipeDeck always uses items[0] as the top card
  const currentCard = feed[0];

  return (
    <SafeAreaView>
      <View style={styles.content}>
        {/* Compact Premium Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Wordmark size="sm" />
            {isUserPremium && (
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.premiumBadge}
              >
                <MaterialIcons name="workspace-premium" size={13} color={colors.textInverse} />
                <Text style={styles.premiumBadgeText}>{t('home.premium_badge')}</Text>
              </LinearGradient>
            )}
          </View>
          <View style={styles.headerRight}>
            {boostStatus?.active && (
              <TouchableOpacity
                style={styles.boostPill}
                onPress={() => setShowBoostModal(true)}
              >
                {/* Emoji simsek platform fontuyla ciziliyordu; vektor ikon. */}
                <MaterialIcons name="bolt" size={14} color={colors.boostGold} />
                <Text style={styles.boostPillText}>{getTimeRemaining()}</Text>
              </TouchableOpacity>
            )}
            {!isUserPremium && likeLimitInfo && (
              <TouchableOpacity
                style={styles.likeCounterPill}
                hitSlop={{ top: 10, bottom: 10 }}
                onPress={() =>
                  Alert.alert(
                    t('home.likes_left_title'),
                    t('home.likes_left_msg', {
                      remaining: Math.max(0, likeLimitInfo.likesLimit - likeLimitInfo.likesUsed),
                      limit: likeLimitInfo.likesLimit,
                    })
                  )
                }
              >
                <Ionicons name="heart" size={14} color={colors.primaryTintText} />
                <Text style={styles.likeCounterText}>
                  {Math.max(0, likeLimitInfo.likesLimit - likeLimitInfo.likesUsed)}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.filterButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => {
                console.log("Filter button pressed, opening modal");
                setShowFilterModal(true);
              }}
            >
              <MaterialIcons name="tune" size={24} color={colors.textDark} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Card Container - Swipe Deck (smooth animated style) */}
        <View style={styles.scrollView}>
          <SwipeDeck
            ref={swipeDeckRef}
            items={feed}
            onSwipeLeft={handlePass}
            onSwipeRight={handleLike}
            OverlayLabelRight={() => (
              <View style={styles.overlayContainer}>
                <View style={[styles.overlayLabel, styles.overlayLabelRight]}>
                  <Text style={styles.overlayLabelText}>{t('home.overlay.like')}</Text>
                </View>
              </View>
            )}
            OverlayLabelLeft={() => (
              <View style={styles.overlayContainer}>
                <View style={[styles.overlayLabel, styles.overlayLabelLeft]}>
                  <Text style={styles.overlayLabelText}>{t('home.overlay.pass')}</Text>
                </View>
              </View>
            )}
            renderCard={(card, isFirst) => (
              <DiscoveryCard
                card={card}
                isActive={isFirst}
                onSwipeLeft={() => swipeDeckRef.current?.swipeLeft()}
                onSwipeRight={() => swipeDeckRef.current?.swipeRight()}
                onFavorite={() => handleFavorite(card)}
                onBlock={() => handleBlock(card)}
                onReport={() => handleReport(card)}
                favoritesRemaining={favoriteInfo?.favoritesRemaining}
                isPremium={isUserPremium}
              />
            )}
          />
        </View>

        {/* Primary actions, always on screen (see DeckActionBar). The tab bar
            floats, so the row has to reserve its own clearance. */}
        {feed.length > 0 && (
          <View style={{ paddingBottom: tabBarClearance(insets.bottom) }}>
            <DeckActionBar
              onPass={() => swipeDeckRef.current?.swipeLeft()}
              onLike={() => swipeDeckRef.current?.swipeRight()}
              onFavorite={() => handleFavorite(feed[0])}
              favoritesRemaining={favoriteInfo?.favoritesRemaining}
              isPremium={isUserPremium}
            />
          </View>
        )}

        {/* Filter Modal */}
        <FilterSheet
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onApply={(newFilters) => {
            setFilters(newFilters);
            loadFeed(true, newFilters); // Pass newFilters directly to avoid stale state
          }}
          initialFilters={filters}
          isPremium={isUserPremium}
        />

        {/*
          The same celebration the socket path shows. This screen used to render
          its own stripped-down dialog, so one match could produce two different
          popups back to back — a plain card here and the rich one from _layout.
        */}
        <MatchPopup
          visible={showMatchModal}
          match={matchData}
          onClose={handleMatchModalClose}
        />

        {/* Boost Modal */}
        <Modal
          visible={showBoostModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowBoostModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Text style={styles.boostModalTitle}>{t('home.boost.title')}</Text>
              <Text style={styles.boostModalText}>
                {t('home.boost.subtitle')}
              </Text>
              {boostStatus?.active && (
                <View style={styles.activeBoostInfo}>
                  <Text style={styles.activeBoostText}>
                    {t('home.boost.active', { time: getTimeRemaining() })}
                  </Text>
                </View>
              )}
              <View style={styles.boostOptions}>
                <TouchableOpacity
                  style={styles.boostOption}
                  onPress={() => handleBoost()}
                >
                  <Text style={styles.boostOptionTitle}>{t('home.boost.activate')}</Text>
                  <Text style={styles.boostOptionSubtitle}>{t('home.boost.duration_note')}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setShowBoostModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </Card>
          </View>
        </Modal>

        {/* Upsell modal: boost / favorite limits */}
        <UpsellModal
          visible={upsellVariant !== null}
          variant={upsellVariant || "boost"}
          onClose={() => setUpsellVariant(null)}
          onPurchased={() => {
            loadBoostStatus();
          }}
        />

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
          <KeyboardAvoidingView
            style={styles.favoriteModalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.favoriteModalContent}>
              <Text style={styles.favoriteModalTitle}>{t('home.favorite.modal_title')}</Text>
              <Text style={styles.favoriteModalSubtitle}>
                {t('home.favorite.modal_subtitle')}
              </Text>
              <TextInput
                style={styles.favoriteMessageInput}
                value={favoriteMessage}
                onChangeText={setFavoriteMessage}
                placeholder={t('home.favorite.placeholder')}
                placeholderTextColor={colors.textSecondaryDark}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={styles.favoriteCharCount}>
                {t('home.favorite.char_count', { length: favoriteMessage.length })}
              </Text>
              <View style={styles.favoriteModalButtons}>
                <TouchableOpacity
                  style={[styles.favoriteModalButton, styles.favoriteModalButtonCancel]}
                  onPress={() => {
                    setShowFavoriteModal(false);
                    setFavoriteMessage("");
                  }}
                >
                  <Text style={styles.favoriteModalButtonCancelText}>{t('common.cancel')}</Text>
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
                  <Text style={styles.favoriteModalButtonConfirmText}>{t('home.favorite.send_btn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
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
                <MaterialIcons name="check" size={28} color={colors.textInverse} />
              </View>
              <Text style={styles.successModalTitle}>{t('home.favorite.success_title')}</Text>
              <Text style={styles.successModalMessage}>{successMessage}</Text>
              <TouchableOpacity
                style={styles.successModalButton}
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={styles.successModalButtonText}>{t('common.close')}</Text>
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
                <MaterialIcons name="hourglass-top" size={28} color={colors.warning} />
              </View>
              <Text style={styles.directLimitModalTitle}>{t('home.dm_limit.title')}</Text>
              <Text style={styles.directLimitModalMessage}>
                {t('home.dm_limit.msg')}
              </Text>
              <View style={styles.directLimitModalButtons}>
                <TouchableOpacity
                  style={[styles.directLimitModalButton, styles.directLimitModalButtonCancel]}
                  onPress={() => setShowDirectLimitModal(false)}
                >
                  <Text style={styles.directLimitModalButtonCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.directLimitModalButton, styles.directLimitModalButtonConfirm]}
                  onPress={() => {
                    setShowDirectLimitModal(false);
                    router.push("/premium");
                  }}
                >
                  <Text style={styles.directLimitModalButtonConfirmText}>{t('home.dm_limit.premium_btn')}</Text>
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
    // Pirinc gradyanin uzerinde kagit beyazi dusuk kontrastliydi.
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.textInverse,
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
  likeCounterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2 + 2,
    borderRadius: 16,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  likeCounterText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryTintText,
  },
  boostPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
    position: "relative",
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
  loadingContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: "center",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    // optically centered: leave a bit more room at the bottom for the tab bar
    paddingBottom: spacing.xxl + spacing.lg,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: 24,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  emptyEmojiBadge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  refreshButton: {
    marginTop: spacing.sm,
    alignSelf: "stretch",
  },
  resetFiltersLink: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  resetFiltersText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
    textDecorationLine: "underline",
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
    color: colors.textSecondaryDark,
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
    color: colors.onMedia,
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
    color: colors.onMedia,
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
    color: colors.onMedia,
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
    borderColor: colors.error,
  },
  overlayLabelText: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.onMedia,
    letterSpacing: 2,
  },
  favoriteButtonOverlayInner: {
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
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
});
