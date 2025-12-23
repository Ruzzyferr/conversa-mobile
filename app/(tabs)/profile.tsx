import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Image, TouchableOpacity, Share, Modal } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Card } from "@/src/components/Card";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { getToken, clearToken } from "@/src/services/authStore";
import { api } from "@/src/services/api";
import { usePremium } from "@/src/state/premium";
import { LinearGradient } from "expo-linear-gradient";
// Lazy import Clipboard to avoid errors
let Clipboard: any = null;
async function getClipboard() {
  if (!Clipboard) {
    try {
      Clipboard = await import("expo-clipboard");
    } catch (error) {
      console.warn("Clipboard not available:", error);
      // Fallback: return a mock that does nothing
      Clipboard = {
        setStringAsync: async () => {},
        getStringAsync: async () => "",
      };
    }
  }
  return Clipboard;
}
import { TextInput } from "react-native";

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{
    user: { id: string; email: string | null; phone: string | null; createdAt: string };
    profileExists: boolean;
  } | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [applyingCode, setApplyingCode] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState<{
    isPremium: boolean;
    premiumExpiresAt: string | null;
  } | null>(null);
  const { premiumEnabled } = usePremium();

  useEffect(() => {
    loadUserData();
    loadPremiumStatus();
  }, []);

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

  const handleCopyCode = async () => {
    if (referralCode) {
      const clipboard = await getClipboard();
      await clipboard.setStringAsync(referralCode);
      Alert.alert("Copied!", "Referral code copied to clipboard");
    }
  };

  const handleShare = async () => {
    if (referralCode) {
      try {
        await Share.share({
          message: `Join me on Swiip! Use my referral code: ${referralCode}\n\nShared conversations and language practice await!`,
          title: "Invite to Swiip",
        });
      } catch (error) {
        console.error("Failed to share:", error);
      }
    }
  };

  const getTimeRemaining = (expiresAt: string): string => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return "Süresi dolmuş";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} gün ${hours} saat`;
    } else if (hours > 0) {
      return `${hours} saat ${minutes} dakika`;
    } else {
      return `${minutes} dakika`;
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      // Try to logout from server
      await api.logout();
    } catch (error) {
      // Even if server logout fails, clear local token
      console.error("Logout error:", error);
    } finally {
      // Always clear local token
      await clearToken();
      router.replace("/(auth)/welcome");
    }
  };

  if (loading) {
    return (
      <SafeAreaView>
        <View style={styles.content}>
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          {profile?.photos && profile.photos.length > 0 ? (
            <Image
              source={{ uri: profile.photos[0] }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImageText}>
                {profile?.displayName?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
          )}
          <Text style={styles.title}>
            {profile?.displayName || "Profil"}
          </Text>
          {profile?.city && (
            <Text style={styles.subtitle}>📍 {profile.city}</Text>
          )}
        </View>

      {profile && (
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>👤 Profil Bilgileri</Text>
          </View>
          
          {profile.birthYear && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Doğum Yılı</Text>
              <Text style={styles.infoValue}>{profile.birthYear}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Amaç</Text>
            <View style={styles.purposeBadge}>
              <Text style={styles.purposeText}>
                {profile.purpose === "CONVERSATION"
                  ? "💬 Sohbet"
                  : profile.purpose === "PRACTICE"
                  ? "📚 Pratik"
                  : "☕ Kahve"}
              </Text>
            </View>
          </View>

          {profile.languagesNative.length > 0 && (
            <View style={styles.languageSection}>
              <Text style={styles.languageLabel}>🌍 Ana Diller</Text>
              <View style={styles.languageTags}>
                {profile.languagesNative.map((lang: string, index: number) => (
                  <View key={index} style={styles.languageTag}>
                    <Text style={styles.languageTagText}>{lang}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {profile.languagesPractice.length > 0 && (
            <View style={styles.languageSection}>
              <Text style={styles.languageLabel}>📖 Pratik Diller</Text>
              <View style={styles.languageTags}>
                {profile.languagesPractice.map((lang: string, index: number) => (
                  <View key={index} style={[styles.languageTag, styles.languageTagPractice]}>
                    <Text style={styles.languageTagText}>{lang}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {profile.bio && (
            <View style={styles.bioSection}>
              <Text style={styles.bioLabel}>✍️ Hakkında</Text>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          )}
        </Card>
      )}

      {userInfo?.profileExists && (
        <Card style={styles.card}>
          <PrimaryButton
            title="Profili Düzenle"
            onPress={() => router.push("/profile-edit")}
            style={styles.editButton}
          />
        </Card>
      )}

      {!userInfo?.profileExists && (
        <Card style={[styles.card, styles.incompleteCard]}>
          <Text style={styles.cardTitle}>⚠️ Profilini Tamamla</Text>
          <Text style={styles.cardDescription}>
            Profilini tamamlamak için ayarlar sayfasına git
          </Text>
          <PrimaryButton
            title="Profili Düzenle"
            onPress={() => router.push("/(auth)/profile-setup")}
            style={styles.editButton}
          />
        </Card>
      )}

      {/* Premium Status Section */}
      {premiumStatus && (
        <Card style={styles.card}>
          {premiumStatus.isPremium ? (
            <>
              <View style={styles.premiumHeader}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.premiumBadge}
                >
                  <Text style={styles.premiumBadgeIcon}>✨</Text>
                  <Text style={styles.premiumBadgeText}>Premium Aktif</Text>
                </LinearGradient>
              </View>
              
              {premiumStatus.premiumExpiresAt && (
                <View style={styles.premiumExpiryContainer}>
                  <Text style={styles.premiumExpiryLabel}>Kalan Süre</Text>
                  <Text style={styles.premiumExpiryValue}>
                    {getTimeRemaining(premiumStatus.premiumExpiresAt)}
                  </Text>
                </View>
              )}

              <View style={styles.premiumBenefitsContainer}>
                <Text style={styles.premiumBenefitsTitle}>Avantajlarınız</Text>
                <View style={styles.premiumBenefitItem}>
                  <Text style={styles.premiumBenefitIcon}>🤖</Text>
                  <Text style={styles.premiumBenefitText}>Sınırsız AI Polish</Text>
                </View>
                <View style={styles.premiumBenefitItem}>
                  <Text style={styles.premiumBenefitIcon}>💬</Text>
                  <Text style={styles.premiumBenefitText}>Sınırsız Mesaj</Text>
                </View>
                <View style={styles.premiumBenefitItem}>
                  <Text style={styles.premiumBenefitIcon}>👀</Text>
                  <Text style={styles.premiumBenefitText}>Kim Beğendi</Text>
                </View>
                <View style={styles.premiumBenefitItem}>
                  <Text style={styles.premiumBenefitIcon}>🚀</Text>
                  <Text style={styles.premiumBenefitText}>Boost</Text>
                </View>
                <View style={styles.premiumBenefitItem}>
                  <Text style={styles.premiumBenefitIcon}>⚙️</Text>
                  <Text style={styles.premiumBenefitText}>Gelişmiş Filtreler</Text>
                </View>
                <View style={styles.premiumBenefitItem}>
                  <Text style={styles.premiumBenefitIcon}>💎</Text>
                  <Text style={styles.premiumBenefitText}>Haftada 5 Direkt Mesaj</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.premiumUpgradeHeader}>
                <Text style={styles.premiumUpgradeTitle}>✨ Premium'a Geç</Text>
                <Text style={styles.premiumUpgradeSubtitle}>
                  Sınırsız özellikler ve daha iyi deneyim
                </Text>
              </View>

              <View style={styles.premiumUpgradeBenefits}>
                <View style={styles.premiumUpgradeBenefitItem}>
                  <Text style={styles.premiumUpgradeBenefitIcon}>🤖</Text>
                  <Text style={styles.premiumUpgradeBenefitText}>Sınırsız AI Polish</Text>
                </View>
                <View style={styles.premiumUpgradeBenefitItem}>
                  <Text style={styles.premiumUpgradeBenefitIcon}>💬</Text>
                  <Text style={styles.premiumUpgradeBenefitText}>Sınırsız Mesaj</Text>
                </View>
                <View style={styles.premiumUpgradeBenefitItem}>
                  <Text style={styles.premiumUpgradeBenefitIcon}>🚀</Text>
                  <Text style={styles.premiumUpgradeBenefitText}>Boost</Text>
                </View>
                <View style={styles.premiumUpgradeBenefitItem}>
                  <Text style={styles.premiumUpgradeBenefitIcon}>💎</Text>
                  <Text style={styles.premiumUpgradeBenefitText}>Haftada 5 Direkt Mesaj</Text>
                </View>
              </View>

              <PrimaryButton
                title="Premium'a Geç"
                onPress={() => router.push("/premium")}
                style={styles.premiumUpgradeButton}
              />
            </>
          )}
        </Card>
      )}

      <View style={styles.logoutSection}>
        <PrimaryButton
          title="Çıkış Yap"
          onPress={handleLogout}
          style={styles.logoutButton}
          textStyle={styles.logoutButtonText}
        />
      </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Çıkış Yap</Text>
            <Text style={styles.modalMessage}>
              Hesabından çıkış yapmak istediğine emin misin?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmLogout}
              >
                <Text style={styles.modalButtonConfirmText}>Çıkış Yap</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.primaryLight,
  },
  profileImageText: {
    fontSize: typography.fontSize["4xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
  },
  title: {
    fontSize: typography.fontSize["4xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    textAlign: "center",
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  card: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  incompleteCard: {
    borderColor: colors.warning,
    borderWidth: 1,
  },
  cardHeader: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  cardTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
  },
  cardDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  lastInfoRow: {
    marginBottom: 0,
  },
  infoLabel: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    color: colors.textDark,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
    textAlign: "right",
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusBadgeSuccess: {
    backgroundColor: colors.success + "20",
  },
  statusBadgeWarning: {
    backgroundColor: colors.warning + "20",
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
  },
  purposeBadge: {
    backgroundColor: colors.primary + "20",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  purposeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primaryLight,
  },
  languageSection: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  languageLabel: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.sm,
  },
  languageTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  languageTag: {
    backgroundColor: colors.primary + "20",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  languageTagPractice: {
    backgroundColor: colors.accent + "20",
    borderColor: colors.accent,
  },
  languageTagText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textDark,
  },
  bioSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
  },
  bioLabel: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.sm,
  },
  bioText: {
    fontSize: typography.fontSize.base,
    color: colors.textDark,
    lineHeight: 24,
  },
  editButton: {
    marginTop: spacing.md,
  },
  logoutSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  logoutButton: {
    backgroundColor: colors.error,
  },
  logoutButtonText: {
    color: colors.textDark,
    fontWeight: typography.fontWeight.semibold,
  },
  referralCodeContainer: {
    marginTop: spacing.md,
  },
  referralCodeLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    marginBottom: spacing.sm,
  },
  referralCodeBox: {
    backgroundColor: colors.backgroundDark,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginBottom: spacing.md,
  },
  referralCodeText: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    textAlign: "center",
    letterSpacing: 4,
  },
  referralActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  referralButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: "center",
  },
  copyButton: {
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  shareButton: {
    backgroundColor: colors.primary,
  },
  referralButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
  },
  applyCodeButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
    paddingTop: spacing.md,
  },
  applyCodeText: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
    textDecorationLine: "underline",
  },
  codeInputContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
  },
  codeInput: {
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textDark,
    marginBottom: spacing.md,
    textAlign: "center",
    letterSpacing: 2,
  },
  codeInputActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  codeInputButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  codeInputButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 20,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    marginBottom: spacing.xl,
    textAlign: "center",
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
  },
  modalButtonConfirmText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: "#FFFFFF",
  },
  premiumHeader: {
    marginBottom: spacing.md,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    gap: spacing.xs,
    alignSelf: "flex-start",
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
    fontSize: typography.fontSize.base,
  },
  premiumBadgeText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  premiumExpiryContainer: {
    backgroundColor: colors.backgroundDark,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  premiumExpiryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    marginBottom: spacing.xs,
  },
  premiumExpiryValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryLight,
  },
  premiumBenefitsContainer: {
    marginTop: spacing.sm,
  },
  premiumBenefitsTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  premiumBenefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  premiumBenefitIcon: {
    fontSize: typography.fontSize.base,
  },
  premiumBenefitText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
  },
  premiumUpgradeHeader: {
    marginBottom: spacing.md,
  },
  premiumUpgradeTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  premiumUpgradeSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
  },
  premiumUpgradeBenefits: {
    marginBottom: spacing.md,
  },
  premiumUpgradeBenefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  premiumUpgradeBenefitIcon: {
    fontSize: typography.fontSize.base,
  },
  premiumUpgradeBenefitText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
  },
  premiumUpgradeButton: {
    marginTop: spacing.sm,
  },
});
