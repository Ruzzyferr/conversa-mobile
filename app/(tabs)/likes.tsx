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
  Animated,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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

export default function RequestsScreen() {
  const router = useRouter();
  const [incomingRequests, setIncomingRequests] = useState<Request[]>([]);
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
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [matchData, setMatchData] = useState<{
    conversationId?: string;
    matchedUserId?: string;
    matchedUserName?: string;
    matchedUserPhoto?: string;
    isFemale?: boolean;
  } | null>(null);
  const matchModalAnim = React.useRef(new Animated.Value(0)).current;
  const sparkleAnim = React.useRef(new Animated.Value(0)).current;
  
  // Reset animations when modal closes
  React.useEffect(() => {
    if (!showMatchModal) {
      matchModalAnim.setValue(0);
      sparkleAnim.stopAnimation();
      sparkleAnim.setValue(0);
    }
  }, [showMatchModal, matchModalAnim, sparkleAnim]);

  const loadRequests = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/(auth)/welcome");
        return;
      }

      setLoading(true);

      const incoming = await api.getIncomingRequests();
      setIncomingRequests(incoming);
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

  const handleAccept = async (fromUserId: string, matchedUserName?: string, matchedUserPhoto?: string, requestKind?: "LIKE" | "FAVORITE") => {
    try {
      const result = await api.acceptRequest(fromUserId);
      
      console.log("Accept result:", JSON.stringify(result, null, 2)); // Debug log
      console.log("Request kind:", requestKind); // Debug log
      
      // FAVORITE requests always create a conversation
      // LIKE requests only create conversation if both users liked each other
      if (result.conversationId) {
        console.log("ConversationId exists, showing match modal"); // Debug log
        
        // Get user profile to check gender
        let isFemale = false;
        try {
          const profile = await api.getUserProfile(fromUserId);
          isFemale = profile.gender === "FEMALE";
          console.log("User gender:", profile.gender, "isFemale:", isFemale); // Debug log
        } catch (error) {
          console.error("Failed to load profile:", error);
        }

        // It's a match or FAVORITE! Show match modal
        setMatchData({
          conversationId: result.conversationId,
          matchedUserId: fromUserId,
          matchedUserName: matchedUserName,
          matchedUserPhoto: matchedUserPhoto,
          isFemale,
        });
        
        console.log("Setting showMatchModal to true, matchData:", {
          conversationId: result.conversationId,
          matchedUserId: fromUserId,
          matchedUserName: matchedUserName,
        }); // Debug log
        
        // Set modal visible first
        setShowMatchModal(true);
        
        // Start with visible state (opacity 1) then animate
        matchModalAnim.setValue(1);
        sparkleAnim.setValue(0);
        
        // Immediately start sparkle animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(sparkleAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(sparkleAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
        
        console.log("Match modal should be visible now"); // Debug log
      } else {
        console.log("No conversationId - LIKE request but not a match yet"); // Debug log
        // No conversationId means it's a LIKE request but not a match yet
        // Show a different message
        Alert.alert(
          "İstek Kabul Edildi",
          `${matchedUserName || "Kullanıcı"} ile eşleşmek için siz de onları beğenmelisiniz.`,
          [{ text: "Tamam" }]
        );
      }
      
      // Reload requests
      await loadRequests();
      // Update badge
      badgeUpdater.update();
    } catch (error: any) {
      console.error("Accept error:", error); // Debug log
      const message = error instanceof Error ? error.message : "İstek kabul edilemedi";
      Alert.alert("Hata", message);
    }
  };

  const handleMatchModalClose = () => {
    Animated.timing(matchModalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowMatchModal(false);
      setMatchData(null);
      matchModalAnim.setValue(0);
      sparkleAnim.stopAnimation();
      sparkleAnim.setValue(0);
    });
  };

  const handleGoToChat = () => {
    Animated.timing(matchModalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowMatchModal(false);
      if (matchData?.conversationId) {
        // Navigate to chat tab first, then to conversation
        router.push("/(tabs)/chat");
        // Small delay to ensure chat tab is loaded
        setTimeout(() => {
          router.push(`/conversation/${matchData.conversationId}`);
        }, 100);
      }
      setMatchData(null);
      matchModalAnim.setValue(0);
      sparkleAnim.stopAnimation();
      sparkleAnim.setValue(0);
    });
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

  const handleProfilePress = async (request: Request) => {
    setSelectedRequest(request);
    setShowProfileModal(true);
    setLoadingProfile(true);
    setProfileData(null);
    
    try {
      const profile = await api.getUserProfile(request.fromUserId!);
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
            setSelectedRequest(null);
          },
        },
      ]);
    } finally {
      setLoadingProfile(false);
    }
  };

  const renderRequestItem = ({ item }: { item: Request }) => {
    const user = item.fromUser;
    const userId = item.fromUserId;

    if (!user || !userId) return null;

    const age = user.birthYear
      ? new Date().getFullYear() - user.birthYear
      : null;

    return (
      <Card style={styles.requestCard}>
        <TouchableOpacity
          style={styles.requestContent}
          onPress={() => handleProfilePress(item)}
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

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={() => handleDecline(item.fromUserId!)}
          >
            <Text style={styles.declineButtonText}>Reddet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAccept(
              item.fromUserId!, 
              user.displayName,
              user.photos && user.photos.length > 0 ? user.photos[0] : undefined,
              item.kind
            )}
          >
            <Text style={styles.acceptButtonText}>Kabul Et</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView>
      <View style={styles.container}>
        <ScreenHeader title="İstekler" />

        {loading && incomingRequests.length === 0 ? (
          <View style={styles.loadingContainer}>
            <EmptyState
              icon="💔"
              title="Yükleniyor..."
              description=""
            />
          </View>
        ) : incomingRequests.length === 0 ? (
          <EmptyState
            icon="💔"
            title="Gelen istek yok"
            description="Henüz size istek gönderen kimse yok. Profilinizi geliştirin ve daha fazla kişiyle tanışın!"
          />
        ) : (
          <FlatList
            data={incomingRequests}
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

      {/* Match Modal - Modern & Beautiful */}
      <Modal
        visible={showMatchModal}
        transparent
        animationType="fade"
        onRequestClose={handleMatchModalClose}
        statusBarTranslucent
      >
        <View style={styles.matchModalOverlay}>
          <Animated.View
            style={[
              styles.matchModalContainer,
              {
                opacity: 1, // Always visible when modal is shown
                transform: [
                  {
                    scale: matchModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryLight, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.matchModalGradient}
            >
              {/* Sparkle Animation */}
              <Animated.View
                style={[
                  styles.sparkleContainer,
                  {
                    opacity: sparkleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                  },
                ]}
              >
                <Text style={styles.sparkleText}>✨</Text>
              </Animated.View>

              <View style={styles.matchModalContent}>
                <Text style={styles.matchTitle}>Eşleştiniz! 🎉</Text>
                
                {/* Profile Photo */}
                {matchData?.matchedUserPhoto ? (
                  <View style={styles.matchPhotoContainer}>
                    <Image
                      source={{ uri: matchData.matchedUserPhoto }}
                      style={styles.matchPhoto}
                      resizeMode="cover"
                    />
                    <View style={styles.matchPhotoRing} />
                  </View>
                ) : (
                  <View style={[styles.matchPhotoContainer, styles.matchPhotoPlaceholder]}>
                    <Text style={styles.matchPhotoPlaceholderText}>
                      {matchData?.matchedUserName?.charAt(0).toUpperCase() || "?"}
                    </Text>
                    <View style={styles.matchPhotoRing} />
                  </View>
                )}

                <Text style={styles.matchName}>
                  {matchData?.matchedUserName || "Birisi"}
                </Text>
                <Text style={styles.matchSubtitle}>
                  İkiniz de birbirinizi beğendiniz!
                </Text>

                {/* First Message Info */}
                {matchData?.isFemale === false && (
                  <View style={styles.firstMessageInfo}>
                    <Text style={styles.firstMessageText}>
                      💬 İlk mesajı {matchData?.matchedUserName || "karşı taraf"} gönderecek
                    </Text>
                  </View>
                )}

                <View style={styles.matchModalActions}>
                  <PrimaryButton
                    title="Sohbete Git"
                    onPress={handleGoToChat}
                    style={styles.matchModalButton}
                  />
                  <TouchableOpacity
                    onPress={handleMatchModalClose}
                    style={styles.matchModalCloseButton}
                  >
                    <Text style={styles.matchModalCloseText}>Devam Et</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowProfileModal(false);
          setProfileData(null);
          setSelectedRequest(null);
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
                    setSelectedRequest(null);
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

                  {/* FAVORITE Request Message */}
                  {selectedRequest?.kind === "FAVORITE" && selectedRequest.firstMessage && (
                    <View style={styles.favoriteMessageContainer}>
                      <Text style={styles.favoriteMessageLabel}>Gelen Mesaj:</Text>
                      <View style={styles.favoriteMessageBox}>
                        <Text style={styles.favoriteMessageText}>
                          {selectedRequest.firstMessage.text}
                        </Text>
                      </View>
                    </View>
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
  matchModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  matchModalContainer: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  matchModalGradient: {
    padding: spacing.xl,
    alignItems: "center",
    position: "relative",
  },
  sparkleContainer: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  sparkleText: {
    fontSize: 32,
  },
  matchModalContent: {
    alignItems: "center",
    width: "100%",
  },
  matchTitle: {
    fontSize: typography.fontSize["4xl"],
    fontWeight: typography.fontWeight.bold,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: spacing.lg,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  matchPhotoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: spacing.md,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  matchPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  matchPhotoPlaceholder: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  matchPhotoPlaceholderText: {
    fontSize: typography.fontSize["4xl"],
    fontWeight: typography.fontWeight.bold,
    color: "#FFFFFF",
  },
  matchPhotoRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.5)",
    top: -10,
    left: -10,
  },
  matchName: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: spacing.xs,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  matchSubtitle: {
    fontSize: typography.fontSize.base,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  firstMessageInfo: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  firstMessageText: {
    fontSize: typography.fontSize.sm,
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: typography.fontWeight.medium,
  },
  matchModalActions: {
    gap: spacing.md,
    width: "100%",
  },
  matchModalButton: {
    width: "100%",
  },
  matchModalCloseButton: {
    padding: spacing.md,
    alignItems: "center",
  },
  matchModalCloseText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  favoriteMessageContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  favoriteMessageLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  favoriteMessageBox: {
    backgroundColor: colors.cardBackground,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent + "40",
  },
  favoriteMessageText: {
    fontSize: typography.fontSize.base,
    color: colors.text,
    lineHeight: 22,
  },
});
