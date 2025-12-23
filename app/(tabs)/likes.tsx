import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Card } from "@/src/components/Card";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { getToken } from "@/src/services/authStore";
import { api } from "@/src/services/api";
import { badgeUpdater } from "@/src/utils/badgeUpdater";
import { AxiosError } from "axios";

type Request = {
  requestId: string;
  fromUserId?: string;
  toUserId?: string;
  kind: "LIKE" | "FAVORITE";
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  fromUser?: {
    userId: string;
    displayName: string;
    photos: string[];
    city: string | null;
    languagesNative: string[];
    languagesPractice: string[];
    birthYear: number | null;
    bio: string | null;
  };
  toUser?: {
    userId: string;
    displayName: string;
    photos: string[];
    city: string | null;
    languagesNative: string[];
    languagesPractice: string[];
    birthYear: number | null;
    bio: string | null;
  };
  firstMessage: {
    id: string;
    text: string;
    createdAt: string;
  } | null;
};

type TabType = "incoming" | "outgoing";

export default function RequestsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("incoming");
  const [incomingRequests, setIncomingRequests] = useState<Request[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState<{
    id: string;
    userId: string;
    displayName: string;
    birthYear: number | null;
    city: string | null;
    languagesNative: string[];
    languagesPractice: string[];
    purpose: "CONVERSATION" | "PRACTICE" | "COFFEE";
    bio: string | null;
    photos: string[];
    createdAt: string;
    updatedAt: string;
  } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/(auth)/welcome");
        return;
      }

      setLoading(true);

      const [incoming, outgoing] = await Promise.all([
        api.getIncomingRequests(),
        api.getOutgoingRequests(),
      ]);

      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (error) {
      console.error("Failed to load requests:", error);
      Alert.alert("Hata", "İstekler yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  const handleAccept = async (fromUserId: string) => {
    try {
      const result = await api.acceptRequest(fromUserId);
      
      if (result.conversationId) {
        // Navigate to conversation
        router.push(`/conversation/${result.conversationId}`);
      }
      
      // Reload requests
      await loadRequests();
      // Update badge
      badgeUpdater.update();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "İstek kabul edilemedi";
      Alert.alert("Hata", message);
    }
  };

  const handleDecline = async (fromUserId: string) => {
    try {
      await api.declineRequest(fromUserId);
      // Reload requests
      await loadRequests();
      // Update badge
      badgeUpdater.update();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "İstek reddedilemedi";
      Alert.alert("Hata", message);
    }
  };

  const handleProfilePress = async (userId: string) => {
    setShowProfileModal(true);
    setLoadingProfile(true);
    setProfileData(null);
    
    try {
      const profile = await api.getUserProfile(userId);
      setProfileData(profile);
    } catch (error) {
      console.error("Failed to load profile:", error);
      if (error instanceof AxiosError) {
        console.error("Axios error:", error.response?.data);
      }
      const errorMessage =
        error instanceof Error ? error.message : "Profil yüklenemedi";
      Alert.alert("Hata", errorMessage, [
        {
          text: "Tamam",
          onPress: () => {
            setShowProfileModal(false);
            setProfileData(null);
          },
        },
      ]);
    } finally {
      setLoadingProfile(false);
    }
  };

  const currentRequests = activeTab === "incoming" ? incomingRequests : outgoingRequests;

  const renderRequestItem = ({ item }: { item: Request }) => {
    const user = activeTab === "incoming" ? item.fromUser : item.toUser;
    const userId = activeTab === "incoming" ? item.fromUserId : item.toUserId;

    if (!user || !userId) return null;

    const age = user.birthYear
      ? new Date().getFullYear() - user.birthYear
      : null;

    return (
      <Card style={styles.requestCard}>
        <TouchableOpacity
          style={styles.requestContent}
          onPress={() => handleProfilePress(userId)}
        >
          <View style={styles.userInfo}>
            {user.photos && user.photos.length > 0 ? (
              <Image
                source={{ uri: user.photos[0] }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {user.displayName}
                {age && `, ${age}`}
              </Text>
              {user.city && (
                <Text style={styles.userCity}>📍 {user.city}</Text>
              )}
              {item.kind === "FAVORITE" && item.firstMessage && (
                <Text style={styles.messagePreview} numberOfLines={2}>
                  {item.firstMessage.text}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {activeTab === "incoming" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleDecline(item.fromUserId!)}
            >
              <Text style={styles.declineButtonText}>Reddet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAccept(item.fromUserId!)}
            >
              <Text style={styles.acceptButtonText}>Kabul Et</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "outgoing" && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              {item.status === "PENDING" ? "⏳ Beklemede" : item.status === "ACCEPTED" ? "✅ Kabul Edildi" : "❌ Reddedildi"}
            </Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView>
      <View style={styles.container}>
        <ScreenHeader title="İstekler" />
        
        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "incoming" && styles.tabActive]}
            onPress={() => setActiveTab("incoming")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "incoming" && styles.tabTextActive,
              ]}
            >
              Gelen ({incomingRequests.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "outgoing" && styles.tabActive]}
            onPress={() => setActiveTab("outgoing")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "outgoing" && styles.tabTextActive,
              ]}
            >
              Giden ({outgoingRequests.length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading && currentRequests.length === 0 ? (
          <View style={styles.loadingContainer}>
            <EmptyState
              icon="💔"
              title="Yükleniyor..."
              description=""
            />
          </View>
        ) : currentRequests.length === 0 ? (
          <EmptyState
            icon="💔"
            title={
              activeTab === "incoming"
                ? "Gelen istek yok"
                : "Giden istek yok"
            }
            description={
              activeTab === "incoming"
                ? "Henüz size istek gönderen kimse yok. Profilinizi geliştirin ve daha fazla kişiyle tanışın!"
                : "Henüz kimseye istek göndermediniz."
            }
          />
        ) : (
          <FlatList
            data={currentRequests}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item.requestId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={loadRequests}
                tintColor={colors.primary}
              />
            }
          />
        )}

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowProfileModal(false);
          setProfileData(null);
        }}
      >
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModalCard}>
            {loadingProfile ? (
              <View style={styles.profileLoadingContainer}>
                <Text style={styles.profileLoadingText}>Yükleniyor...</Text>
              </View>
            ) : profileData ? (
              <ScrollView
                style={styles.profileScrollView}
                contentContainerStyle={styles.profileContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                <TouchableOpacity
                  style={styles.profileCloseButton}
                  onPress={() => {
                    setShowProfileModal(false);
                    setProfileData(null);
                  }}
                >
                  <Text style={styles.profileCloseText}>✕</Text>
                </TouchableOpacity>

                {/* Photo */}
                {profileData.photos && profileData.photos.length > 0 ? (
                  <Image
                    source={{ uri: profileData.photos[0] }}
                    style={styles.profilePhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.profilePhotoPlaceholder}>
                    <Text style={styles.profilePhotoPlaceholderText}>
                      {profileData.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                {/* Profile Info */}
                <View style={styles.profileInfo}>
                  <Text style={styles.profileDisplayName}>
                    {profileData.displayName}
                    {profileData.birthYear && `, ${new Date().getFullYear() - profileData.birthYear}`}
                  </Text>
                  {profileData.city && (
                    <Text style={styles.profileCity}>📍 {profileData.city}</Text>
                  )}
                  <Text style={styles.profilePurpose}>
                    {profileData.purpose.charAt(0) +
                      profileData.purpose.slice(1).toLowerCase()}
                  </Text>

                  {profileData.bio && (
                    <Text style={styles.profileBio}>{profileData.bio}</Text>
                  )}

                  {/* Languages */}
                  {(profileData.languagesNative.length > 0 ||
                    profileData.languagesPractice.length > 0) && (
                    <View style={styles.profileLanguagesContainer}>
                      {profileData.languagesNative.length > 0 && (
                        <View style={styles.profileLanguageSection}>
                          <Text style={styles.profileLanguageLabel}>
                            SPEAKS:
                          </Text>
                          <Text style={styles.profileLanguages}>
                            {profileData.languagesNative.join(", ")}
                          </Text>
                        </View>
                      )}
                      {profileData.languagesPractice.length > 0 && (
                        <View style={styles.profileLanguageSection}>
                          <Text style={styles.profileLanguageLabel}>
                            LEARNING:
                          </Text>
                          <Text style={styles.profileLanguages}>
                            {profileData.languagesPractice.join(", ")}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </ScrollView>
            ) : (
              <View style={styles.profileErrorContainer}>
                <Text style={styles.profileErrorText}>
                  Profil yüklenemedi
                </Text>
                <TouchableOpacity
                  style={styles.profileCloseButton}
                  onPress={() => {
                    setShowProfileModal(false);
                    setProfileData(null);
                  }}
                >
                  <Text style={styles.profileCloseText}>Kapat</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondaryDark,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondaryDark,
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: typography.fontWeight.semibold,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
  },
  requestCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  requestContent: {
    marginBottom: spacing.sm,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: "#FFFFFF",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
    marginBottom: spacing.xs / 2,
  },
  userCity: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    marginBottom: spacing.xs,
  },
  messagePreview: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    alignItems: "center",
  },
  declineButton: {
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  declineButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  acceptButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: "#FFFFFF",
  },
  statusContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    textAlign: "center",
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  profileModalCard: {
    width: "100%",
    maxWidth: 500,
    height: "90%",
    maxHeight: 600,
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderDark,
    overflow: "hidden",
  },
  profileLoadingContainer: {
    padding: spacing.xl,
    alignItems: "center",
  },
  profileLoadingText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
  },
  profileScrollView: {
    flex: 1,
  },
  profileContent: {
    padding: spacing.lg,
  },
  profileCloseButton: {
    alignSelf: "flex-end",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundDark,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  profileCloseText: {
    fontSize: typography.fontSize.lg,
    color: colors.textDark,
    fontWeight: typography.fontWeight.bold,
  },
  profilePhoto: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  profilePhotoPlaceholder: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  profilePhotoPlaceholderText: {
    fontSize: typography.fontSize["5xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  profileInfo: {
    gap: spacing.sm,
  },
  profileDisplayName: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
  },
  profileCity: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
  },
  profilePurpose: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
    textTransform: "capitalize",
  },
  profileBio: {
    fontSize: typography.fontSize.base,
    color: colors.textDark,
    lineHeight: 24,
    marginTop: spacing.xs,
  },
  profileLanguagesContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  profileLanguageSection: {
    gap: spacing.xs / 2,
  },
  profileLanguageLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondaryDark,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  profileLanguages: {
    fontSize: typography.fontSize.base,
    color: colors.textDark,
  },
  profileErrorContainer: {
    padding: spacing.xl,
    alignItems: "center",
  },
  profileErrorText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    marginBottom: spacing.md,
  },
});
