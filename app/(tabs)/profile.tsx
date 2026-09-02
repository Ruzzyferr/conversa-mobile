import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Image, TouchableOpacity, Share, Modal, Dimensions } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { languageLabel } from "@/src/data/languages";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography, textStyles } from "@/src/theme/typography";
import { radius } from "@/src/theme/radius";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { getToken, clearToken } from "@/src/services/authStore";
import { signOutSocial } from "@/src/services/socialAuth";
import { api } from "@/src/services/api";
import { usePremium } from "@/src/state/premium";
import {
  getOfferings,
  purchasePremium,
  PurchasesPackage
} from "@/src/services/purchases";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tabBarClearance } from "@/src/config/layout";
import { BannerAdComponent } from "@/src/components/BannerAdComponent";
import { UpsellModal } from "@/src/components/UpsellModal";
import { Overline } from "@/src/components/ui/Overline";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{
    user: { id: string; email: string | null; phone: string | null; createdAt: string };
    profileExists: boolean;
  } | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showBoostUpsell, setShowBoostUpsell] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  // Premium State
  const [premiumStatus, setPremiumStatus] = useState<{
    isPremium: boolean;
    premiumExpiresAt: string | null;
  } | null>(null);
  const { premiumEnabled } = usePremium();

  // Boost State
  const [boostStatus, setBoostStatus] = useState<{
    active: boolean;
    endsAt?: string;
    boostsRemaining: number;
    weeklyLimit: number;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [boostPackage, setBoostPackage] = useState<PurchasesPackage | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      loadPremiumStatus();
      loadBoostStatus();
      loadOfferings();
    }, [])
  );

  const loadOfferings = async () => {
    try {
      const offerings = await getOfferings();
      if (offerings?.availablePackages) {
        // Look for boost package - match RevenueCat identifier
        const foundPackage = offerings.availablePackages.find(
          pkg => 
            pkg.identifier === "Boost Pack" ||
            pkg.identifier === "conversa_boost_2pack" ||
            pkg.product.identifier === "conversa_boost_2pack"
        );
        if (foundPackage) {
          setBoostPackage(foundPackage);
        }
      }
    } catch (error) {
      console.log("Failed to load offerings:", error);
    }
  };

  const loadBoostStatus = async () => {
    try {
      const status = await api.getBoostStatus();
      setBoostStatus(status);
    } catch (error) {
      console.error("Failed to load boost status:", error);
    }
  };

  const loadUserData = async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/(auth)/welcome");
        return;
      }

      const me = await api.getMe();
      setUserInfo(me);

      if (me.profileExists) {
        try {
          const profileData = await api.getMyProfile();
          setProfile(profileData);
        } catch (error) {
          // Profile might not exist
        }
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
      router.replace("/(auth)/welcome");
    } finally {
      setLoading(false);
    }
  };

  const loadPremiumStatus = async () => {
    try {
      const billing = await api.getBillingStatus();
      setPremiumStatus({
        isPremium: billing.isPremium,
        premiumExpiresAt: billing.premiumExpiresAt,
      });
    } catch (error) {
      console.error("Failed to load premium status:", error);
    }
  };

  const onRefresh = async () => { // Added as per instruction
    setRefreshing(true);
    await Promise.all([loadUserData(), loadPremiumStatus(), loadBoostStatus(), loadOfferings()]);
    setRefreshing(false);
  };

  const handleBoost = async () => {
    if (boostStatus?.active) {
      Alert.alert(t('profile.boost_active_alert'), t('profile.boost_active_msg', { time: getTimeRemaining(boostStatus.endsAt!) }));
      return;
    }

    const hasBoosts = (boostStatus?.boostsRemaining || 0) > 0;

    if (hasBoosts) {
      Alert.alert(
        t('profile.boost_confirm_title'),
        t('profile.boost_confirm_msg', { count: boostStatus?.boostsRemaining || 0 }),
        [
          { text: t('common.cancel'), style: "cancel" },
          {
            text: t('profile.boost_action'),
            onPress: async () => {
              try {
                const result = await api.activateBoost();
                setBoostStatus({
                  ...result,
                  weeklyLimit: boostStatus?.weeklyLimit || 2,
                });
                Alert.alert(t('profile.boost_success_title'), t('profile.boost_success_msg'));
              } catch (error: any) {
                // Map by code. The API answers in English like every other
                // endpoint, so echoing `message` straight into the alert put
                // English copy in a Turkish app whenever this raced the local
                // check above.
                const code = error.response?.data?.error?.code;
                const message =
                  code === 'BOOST_ALREADY_ACTIVE'
                    ? t('profile.boost_error_active')
                    : code === 'NO_BOOSTS_REMAINING'
                      ? t('profile.boost_error_none')
                      : error.response?.data?.error?.message || t('common.error_occurred');
                Alert.alert(t('common.error'), message);
              }
            }
          }
        ]
      );
    } else {
      // No boosts remaining — show the upsell modal (premium or boost pack)
      setShowBoostUpsell(true);
    }
  };

  const handlePurchaseBoost = async () => {
    try {
      setLoading(true);

      // If we found a real RevenueCat package, use it
      if (boostPackage) {
        await purchasePremium(boostPackage);
      } else {
        // Fallback for development/simulators if no package found
        console.warn("No Boost package (conversa_boost_2pack) found in RevenueCat offerings. Check your RevenueCat configuration.");
        Alert.alert(t('common.error'), t('profile.boost_package_missing'));
        setLoading(false);
        return;
      }

      // After successful purchase, sync with backend
      // Note: RevenueCat webhook should ideally handle this, but we call API for immediate UI update if needed
      const result = await api.purchaseBoost();
      if (result.success) {
        await loadBoostStatus();
        Alert.alert(t('profile.purchase_success_title'), t('profile.purchase_success_msg'));
      }
    } catch (error: any) {
      if (error.message === "Purchase cancelled") {
        return;
      }
      console.error("Boost purchase error:", error);
      Alert.alert(t('profile.purchase_error_title'), error.message || t('profile.purchase_error_msg'));
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (expiresAt: string): string => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return t('profile.time_expired');

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} ${t('profile.days')} ${hours} ${t('profile.hours')}`;
    } else if (hours > 0) {
      return `${hours} ${t('profile.hours')} ${minutes} ${t('profile.minutes')}`;
    } else {
      return `${minutes} ${t('profile.minutes')}`;
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await api.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      await clearToken();
      router.replace("/(auth)/welcome");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[colors.primary + '20', colors.backgroundDark]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.loadingText}>{t('profile.loading')}</Text>
      </View>
    );
  }

  const age = profile?.birthYear ? new Date().getFullYear() - profile.birthYear : null;

  return (
    <View style={styles.container}>
      {/*
        The screen is edge-to-edge and has no header, so scrolled content used
        to run straight into the clock and status icons. An opaque strip the
        height of the status bar keeps it legible without giving up the
        full-bleed hero.
      */}
      <View
        style={[styles.statusBarScrim, { height: insets.top }]}
        pointerEvents="none"
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarClearance(insets.bottom) + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={[styles.heroSection, { paddingTop: insets.top + spacing.lg }]}>

          {/* Profile Photo with Glow */}
          <View style={styles.avatarContainer}>
            {profile?.photos && profile.photos.length > 0 ? (
              <TouchableOpacity activeOpacity={0.85} onPress={() => setShowPhotoViewer(true)}>
                <Image
                  source={{ uri: profile.photos[0] }}
                  style={[styles.avatar, boostStatus?.active && { borderColor: colors.boostGold, borderWidth: 2 }]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {profile?.displayName?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>
            )}
            {/* Boost Badge Logic */}
            {boostStatus?.active ? (
              <View style={[styles.premiumBadgeSmall, { backgroundColor: colors.boostGold }]}>
                <Ionicons name="flash" size={16} color="#000" />
              </View>
            ) : premiumStatus?.isPremium ? (
              <View style={styles.premiumBadgeSmall}>
                <Text style={styles.premiumBadgeSmallText}>✨</Text>
              </View>
            ) : null}
          </View>

          {/* Name and Location */}
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>
              {profile?.displayName || "Profil"}
              {age && <Text style={styles.age}>, {age}</Text>}
            </Text>
            {(userInfo?.user as any)?.isVerified && (
              <Ionicons name="checkmark-circle" size={22} color={colors.info} style={styles.verifiedIcon} />
            )}
          </View>
          {profile?.city && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.location}>{profile.city}</Text>
            </View>
          )}

          {/* Edit Button */}
          {userInfo?.profileExists && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push("/profile-edit")}
            >
              <Ionicons name="pencil" size={16} color="#FFF" />
              <Text style={styles.editButtonText}>{t('profile.edit')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Verification nudge (Bumble-style): shown until the account is verified */}
        {userInfo && !(userInfo.user as any)?.isVerified && (
          <TouchableOpacity
            style={styles.verifyCard}
            activeOpacity={0.85}
            onPress={() => router.push("/verify-profile" as any)}
          >
            <View style={styles.verifyIconWrap}>
              <Ionicons
                name={(userInfo.user as any)?.verificationStatus === "PENDING" ? "hourglass" : "shield-checkmark"}
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyTitle}>
                {(userInfo.user as any)?.verificationStatus === "PENDING"
                  ? t("verify.bubble_pending_title")
                  : t("verify.bubble_title")}
              </Text>
              <Text style={styles.verifyDesc}>
                {(userInfo.user as any)?.verificationStatus === "PENDING"
                  ? t("verify.bubble_pending_desc")
                  : t("verify.bubble_desc")}
              </Text>
            </View>
            {(userInfo.user as any)?.verificationStatus !== "PENDING" && (
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        )}

        {/* Hat ve dogrulanmis seviyeler.
            Burada eskiden uc "istatistik" vardi: ana dil sayisi, ogrenilen
            dil sayisi ve AMAC YERINE BIR EMOJI. Ilk ikisi neredeyse her
            kullanicida "1" yaziyordu, yani buyuk rakam gostermenin bir
            anlami yoktu; ucuncusu ise emojiyi veri yerine koyuyordu.
            Yerine gercekten bilgi tasiyan iki sey: hangi hattasin ve
            hangi dilin dogrulandi. */}
        {profile && (
          <View style={[styles.identityRow, userInfo && !(userInfo.user as any)?.isVerified && { marginTop: spacing.md }]}>
            <View style={styles.identityBlock}>
              <Overline style={styles.identityLabel}>{t('profile.track_label')}</Overline>
              <View style={styles.trackChip}>
                <MaterialIcons
                  name={profile.track === "LANGUAGE" ? "translate" : "favorite"}
                  size={14}
                  color={colors.primaryTintText}
                />
                <Text style={styles.trackChipText}>
                  {profile.track === "LANGUAGE" ? t('profile.track_language') : t('profile.track_date')}
                </Text>
              </View>
            </View>

            <View style={styles.identityDivider} />

            <View style={[styles.identityBlock, { flex: 1 }]}>
              <Overline style={styles.identityLabel}>{t('profile.verified_levels')}</Overline>
              {profile.languageProofs && profile.languageProofs.length > 0 ? (
                <View style={styles.proofRow}>
                  {profile.languageProofs.map((pr: { language: string; role: string; cefr: string | null }) => (
                    <View key={pr.language + pr.role} style={styles.proofChip}>
                      <MaterialIcons name="verified" size={13} color={colors.success} />
                      <Text style={styles.proofChipText}>
                        {pr.language.toUpperCase()}
                        {pr.cefr ? ` ${pr.cefr}` : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.identityEmpty}>{t('profile.no_verified_levels')}</Text>
              )}
            </View>
          </View>
        )}

        {/*
          Diller ve Hakkinda artik KART DEGIL.

          Ekranda dort kart alt alta duruyordu -- dogrulama, kimlik,
          diller, hakkinda, premium -- hepsi ayni kenarlik, ayni dolgu,
          ayni yaricapla. Hepsi ayni agirlikta olunca hicbiri one
          cikmiyor ve goz nereye bakacagini bilemiyor. Kart cercevesi
          artik yalnizca EYLEM isteyen bloklarda: profilini dogrula ve
          premium.
        */}
        {profile && (profile.languagesNative?.length > 0 || profile.languagesPractice?.length > 0) && (
          <View style={styles.plainSection}>
            <View style={styles.cardHeader}>
              <Ionicons name="globe-outline" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>{t('profile.languages')}</Text>
            </View>

            {profile.languagesNative?.length > 0 && (
              <View style={styles.languageSection}>
                <Overline style={styles.languageSectionTitle}>{t('profile.native_languages')}</Overline>
                <View style={styles.languageTags}>
                  {profile.languagesNative.map((lang: string, index: number) => (
                    <LinearGradient
                      key={index}
                      colors={[colors.primary + '30', colors.primary + '10']}
                      style={styles.languageTag}
                    >
                      <Text style={styles.languageTagText}>{languageLabel(lang, i18n.language)}</Text>
                    </LinearGradient>
                  ))}
                </View>
              </View>
            )}

            {profile.languagesPractice?.length > 0 && (
              <View style={styles.languageSection}>
                <Overline style={styles.languageSectionTitle}>{t('profile.learning')}</Overline>
                <View style={styles.languageTags}>
                  {profile.languagesPractice.map((lang: string, index: number) => (
                    <LinearGradient
                      key={index}
                      // Distinct from the purple "speaks" chips, but not the
                      // pink accent: at 30% over the dark card that renders as
                      // a dark red pill with red text, which reads as an error
                      // state rather than "learning".
                      colors={[colors.favoriteBlue + '30', colors.favoriteBlue + '10']}
                      style={styles.languageTag}
                    >
                      <Text style={[styles.languageTagText, { color: colors.favoriteBlue }]}>{languageLabel(lang, i18n.language)}</Text>
                    </LinearGradient>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Hakkinda -- kart degil, bolum. */}
        {profile?.bio && (
          <View style={styles.plainSection}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>{t('profile.about')}</Text>
            </View>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {/* Premium Card */}
        {premiumStatus && (
          <View style={styles.card}>
            {premiumStatus.isPremium ? (
              <>
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.premiumActiveBadge}
                >
                  <Text style={styles.premiumActiveIcon}>✨</Text>
                  <Text style={styles.premiumActiveText}>{t('profile.premium_active')}</Text>
                </LinearGradient>

                {premiumStatus.premiumExpiresAt && (
                  <View style={styles.premiumExpiryRow}>
                    <Ionicons name="time-outline" size={18} color={colors.textSecondaryDark} />
                    <Text style={styles.premiumExpiryText}>
                      {t('profile.remaining', { time: getTimeRemaining(premiumStatus.premiumExpiresAt) })}
                    </Text>
                  </View>
                )}

                <View style={styles.premiumBenefits}>
                  {[
                    { icon: "infinite", text: t('profile.unlimited_messages') },
                    { icon: "eye", text: t('profile.who_liked') },
                    { icon: "rocket", text: t('profile.boost') },
                    { icon: "diamond", text: t('profile.direct_message') },
                  ].map((benefit, index) => (
                    <View key={index} style={styles.premiumBenefitItem}>
                      <Ionicons name={benefit.icon as any} size={16} color={colors.primary} />
                      <Text style={styles.premiumBenefitText}>{benefit.text}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={styles.premiumUpgradeHeader}>
                  <Text style={styles.premiumUpgradeTitle}>{t('profile.upgrade_premium')}</Text>
                  <Text style={styles.premiumUpgradeSubtitle}>
                    {t('profile.unlock_features')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.premiumUpgradeButton}
                  onPress={() => router.push("/premium")}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.premiumUpgradeButtonGradient}
                  >
                    <Text style={styles.premiumUpgradeButtonText}>{t('profile.upgrade_button')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          {/* Boost Button - Prominent placement */}
          <TouchableOpacity
            style={[styles.settingsItem, styles.boostItem, boostStatus?.active && { backgroundColor: colors.boostGoldSoft, borderBottomColor: colors.boostGoldBorder }]}
            onPress={handleBoost}
          >
            <View style={styles.settingsItemLeft}>
              <LinearGradient
                colors={boostStatus?.active ? [colors.boostGold, colors.boostGoldDeep] : [colors.primary, colors.primaryLight]}
                style={[styles.settingsIcon, { borderRadius: 10 }]}
              >
                <Ionicons name={boostStatus?.active ? "flash" : "rocket"} size={20} color={boostStatus?.active ? "#000" : "#FFF"} />
              </LinearGradient>
              <View>
                <Text style={[styles.settingsItemText, { fontWeight: 'bold' }, boostStatus?.active && { color: colors.boostGold }]}>
                  {boostStatus?.active ? t('profile.boost_active') : t('profile.boost_button')}
                </Text>
                <Text style={[styles.boostSubtext, boostStatus?.active && { color: 'rgba(255, 215, 0, 0.7)' }]}>
                  {boostStatus?.active
                    ? t('profile.boost_active_desc', { time: getTimeRemaining(boostStatus.endsAt!) })
                    : premiumStatus?.isPremium
                      ? t('profile.boost_remaining', { count: boostStatus?.boostsRemaining || 0 })
                      : t('profile.boost_promo')}
                </Text>
              </View>
            </View>
            <Ionicons
              name={boostStatus?.active ? "checkmark-circle" : "chevron-forward"}
              size={20}
              color={boostStatus?.active ? colors.boostGold : colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem} onPress={() => router.push("/profile-edit")}>
            <View style={styles.settingsItemLeft}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="person-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.settingsItemText}>{t('profile.edit_profile')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondaryDark} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
            <View style={styles.settingsItemLeft}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.textSecondaryDark + '20' }]}>
                <Ionicons name="log-out-outline" size={20} color={colors.textSecondaryDark} />
              </View>
              <Text style={[styles.settingsItemText, { color: colors.textSecondaryDark }]}>{t('profile.logout')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondaryDark} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem} onPress={() => {
            Alert.alert(
              t('profile.delete_account'),
              t('profile.delete_account_confirm'),
              [
                { text: t('common.cancel'), style: "cancel" },
                {
                  text: t('profile.delete_account_cta'),
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await api.deleteAccount();
                      await signOutSocial();
                      await clearToken();
                      router.replace("/(auth)/welcome");
                    } catch (e) {
                      Alert.alert(t('common.error'), t('profile.delete_account_failed'));
                    }
                  }
                }
              ]
            );
          }}>
            <View style={styles.settingsItemLeft}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.error + '20' }]}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </View>
              <Text style={[styles.settingsItemText, { color: colors.error }]}>{t('profile.delete_account')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondaryDark} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Banner Ad for non-premium users */}
      <BannerAdComponent style={{ marginBottom: 8 }} />

      {/* Boost upsell modal */}
      <UpsellModal
        visible={showBoostUpsell}
        variant="boost"
        onClose={() => setShowBoostUpsell(false)}
        onPurchased={() => {
          loadBoostStatus();
        }}
      />

      {/* Fullscreen photo viewer */}
      <Modal
        visible={showPhotoViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoViewer(false)}
      >
        <View style={styles.photoViewerOverlay}>
          <TouchableOpacity
            style={[styles.photoViewerClose, { top: insets.top + spacing.md }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => setShowPhotoViewer(false)}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.photoViewerPager}
          >
            {(profile?.photos || []).map((photo: string, index: number) => (
              <View key={index} style={styles.photoViewerPage}>
                <Image
                  source={{ uri: photo }}
                  style={styles.photoViewerImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
          {(profile?.photos?.length || 0) > 1 && (
            <Text style={styles.photoViewerHint}>
              {profile.photos.length} {t('profile.photos_swipe_hint', { defaultValue: 'fotoğraf • kaydır' })}
            </Text>
          )}
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="log-out-outline" size={32} color={colors.error} />
            </View>
            <Text style={styles.modalTitle}>{t('profile.logout_confirm_title')}</Text>
            <Text style={styles.modalMessage}>
              {t('profile.logout_confirm_desc')}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmLogout}
              >
                <Text style={styles.modalButtonConfirmText}>{t('profile.logout')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  identityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
  },
  identityBlock: { gap: spacing.sm },
  identityLabel: {
    ...textStyles.labelSmall,
    color: colors.textTertiary,
  },
  identityDivider: { width: 1, alignSelf: "stretch", backgroundColor: colors.borderMuted },
  identityEmpty: { ...textStyles.bodySmall, color: colors.textTertiary },
  trackChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  trackChipText: { ...textStyles.labelSmall, color: colors.primaryTintText },
  proofRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  proofChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  proofChipText: { ...textStyles.labelSmall, color: colors.text },
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundDark,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
  },
  scrollView: {
    flex: 1,
  },
  statusBarScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.backgroundDark,
    zIndex: 10,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Hero Section
  heroSection: {
    alignItems: "center",
    paddingBottom: 30,
    position: "relative",
  },
  heroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: colors.backgroundDark,
    opacity: 0.5,
  },

  // Avatar
  avatarContainer: {
    position: "relative",
    marginBottom: spacing.md,
  },
  // "avatarGlow" kaldirildi.
  //
  // Isima degil, avatarin 10 piksel disina cizilmis %30 opakliginda DUZ
  // bir pirinc diskti. Koyu zeminde yumusak bir hale gibi degil kalin
  // kahverengi bir halka gibi okunuyor ve profil fotografinin CERCEVESINI
  // ekranin en dikkat ceken lekesi yapiyordu. React Native bir View'i
  // bulaniklastiramaz; "hale" bu yolla zaten yapilamiyor.
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    // Kalin beyaz halka eski paletten kalmaydi; pirinc kimlikte ekranin
    // en parlak lekesi profil fotografinin CERCEVESI oluyordu.
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    // Kalin beyaz halka eski paletten kalmaydi; pirinc kimlikte ekranin
    // en parlak lekesi profil fotografinin CERCEVESI oluyordu.
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  avatarPlaceholderText: {
    fontSize: 48,
    fontWeight: "bold",
    color: colors.textInverse,
  },
  premiumBadgeSmall: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: colors.backgroundDark,
  },
  premiumBadgeSmallText: {
    fontSize: 14,
  },

  // Name & Location
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifiedIcon: {
    marginBottom: 2,
  },
  verifyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder ?? colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  verifyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  verifyDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  displayName: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.textDark,
    marginBottom: 4,
  },
  age: {
    fontWeight: "400",
    color: colors.textSecondaryDark,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing.md,
  },
  location: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },

  // Edit Button
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  editButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },

  // Stats
  statsContainer: {
    flexDirection: "row",
    backgroundColor: colors.backgroundSecondaryDark,
    marginHorizontal: spacing.lg,
    marginTop: -15,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textDark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondaryDark,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderDark,
  },

  // Cards
  // Kart cercevesi olmayan bolum: sayfanin kendi yuzeyinde duran icerik.
  plainSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.backgroundSecondaryDark,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textDark,
  },

  // Languages
  languageSection: {
    marginTop: spacing.sm,
  },
  languageSectionTitle: {
    fontSize: 12,
    color: colors.textSecondaryDark,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  languageTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  languageTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  languageTagText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.primary,
  },

  // Bio
  bioText: {
    fontSize: 15,
    color: colors.textDark,
    lineHeight: 24,
  },

  // Premium Active
  premiumActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: spacing.md,
  },
  premiumActiveIcon: {
    fontSize: 14,
  },
  premiumActiveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  premiumExpiryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.md,
  },
  premiumExpiryText: {
    fontSize: 14,
    color: colors.textSecondaryDark,
  },
  premiumBenefits: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  premiumBenefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  premiumBenefitText: {
    fontSize: 12,
    color: colors.textDark,
  },

  // Premium Upgrade
  premiumUpgradeHeader: {
    marginBottom: spacing.md,
  },
  premiumUpgradeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textDark,
    marginBottom: 4,
  },
  premiumUpgradeSubtitle: {
    fontSize: 14,
    color: colors.textSecondaryDark,
  },
  premiumUpgradeButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  premiumUpgradeButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  premiumUpgradeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },

  // Settings Section
  settingsSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderDark,
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsItemText: {
    fontSize: 15,
    color: colors.textDark,
  },
  boostItem: {
    backgroundColor: colors.primary + '08',
    borderBottomColor: colors.primary + '20',
  },
  boostSubtext: {
    fontSize: 12,
    color: colors.textSecondaryDark,
    marginTop: 2,
  },

  // Fullscreen photo viewer
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
  },
  photoViewerClose: {
    position: "absolute",
    right: spacing.md,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoViewerPager: {
    flexGrow: 0,
    height: "80%",
  },
  photoViewerPage: {
    width: SCREEN_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  photoViewerImage: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
  photoViewerHint: {
    textAlign: "center",
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    marginTop: spacing.md,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 24,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.error + '15',
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
  modalMessage: {
    fontSize: 15,
    color: colors.textSecondaryDark,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  modalButtonConfirm: {
    backgroundColor: colors.error,
  },
  modalButtonCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textDark,
  },
  modalButtonConfirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
});
