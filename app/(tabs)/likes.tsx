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
  Dimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function RequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <View style={styles.requestCardWrapper}>
        <LinearGradient
          colors={["rgba(30, 30, 50, 0.9)", "rgba(20, 20, 30, 0.95)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.requestCard}
        >
          <TouchableOpacity
            style={styles.requestContent}
            onPress={() => handleProfilePress(item)}
            activeOpacity={0.8}
          >
            <View style={styles.userInfo}>
              <View style={styles.avatarContainer}>
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
                {item.kind === "FAVORITE" && (
                  <View style={styles.favoriteBadge}>
                    <Ionicons name="star" size={12} color="#FFFFFF" />
                  </View>
                )}
              </View>

              <View style={styles.userDetails}>
                <View style={styles.nameContainer}>
                  <Text style={styles.userName}>
                    {user.displayName}
                    {age && `, ${age}`}
                  </Text>
                  {item.kind === "FAVORITE" && (
                    <LinearGradient
                      colors={[colors.accent, colors.primary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.superLikeTag}
                    >
                      <Text style={styles.superLikeText}>Super Like</Text>
                    </LinearGradient>
                  )}
                </View>

                {user.city && (
                  <View style={styles.locationContainer}>
                    <Ionicons name="location-sharp" size={12} color={colors.primary} />
                    <Text style={styles.userCity}>{user.city}</Text>
                  </View>
                )}

                {/* Languages Preview */}
                {(user.languagesNative.length > 0 || user.languagesPractice.length > 0) && (
                  <View style={styles.cardLanguageContainer}>
                    {user.languagesNative.length > 0 && (
                      <View style={styles.cardLangRow}>
                        <Ionicons name="chatbubbles-outline" size={12} color={colors.textSecondaryDark} />
                        <Text style={styles.cardLangText} numberOfLines={1}>
                          {user.languagesNative.join(", ")}
                        </Text>
                      </View>
                    )}
                    {user.languagesPractice.length > 0 && (
                      <View style={styles.cardLangRow}>
                        <Ionicons name="school-outline" size={12} color={colors.textSecondaryDark} />
                        <Text style={styles.cardLangText} numberOfLines={1}>
                          {user.languagesPractice.join(", ")}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Bio Preview */}
                {user.bio && (
                  <Text style={styles.cardBio} numberOfLines={2}>
                    {user.bio}
                  </Text>
                )}

                {item.firstMessage && (
                  <View style={styles.messagePreviewContainer}>
                    <Text style={styles.messagePreview} numberOfLines={2}>
                      "{item.firstMessage.text}"
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButtonContainer}
              onPress={() => handleDecline(item.fromUserId!)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionButton, styles.declineButton]}>
                <Ionicons name="close" size={24} color="#FF4D6D" />
                <Text style={styles.declineButtonText}>Reddet</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButtonContainer}
              onPress={() => handleAccept(
                item.fromUserId!,
                user.displayName,
                user.photos && user.photos.length > 0 ? user.photos[0] : undefined,
                item.kind
              )}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.actionButton, styles.acceptButton]}
              >
                <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>Kabul Et</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
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

        {/* Profile Modal - FULL SCREEN PREMIUM */}
        <Modal
          visible={showProfileModal}
          transparent={false} // Full screen
          animationType="slide"
          onRequestClose={() => {
            setShowProfileModal(false);
            setProfileData(null);
            setSelectedRequest(null);
          }}
          statusBarTranslucent
        >
          {loadingProfile ? (
            <View style={styles.profileLoadingContainer}>
              <View style={styles.loadingSpinner}>
                <Ionicons name="reload" size={40} color={colors.primary} />
              </View>
              <Text style={styles.profileLoadingText}>Profil Yükleniyor...</Text>
            </View>
          ) : profileData ? (
            <View style={styles.profileModalContainer}>
              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
              >

                {/* Photo Carousel */}
                <View style={styles.carouselContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    decelerationRate="fast"
                  >
                    {profileData.photos && profileData.photos.length > 0 ? (
                      profileData.photos.map((photo, index) => (
                        <Image
                          key={index}
                          source={{ uri: photo }}
                          style={styles.carouselPhoto}
                          resizeMode="cover"
                        />
                      ))
                    ) : (
                      <View style={[styles.carouselPhoto, styles.carouselPlaceholder]}>
                        <Text style={styles.carouselPlaceholderText}>
                          {profileData.displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </ScrollView>

                  {/* Gradient Overlay for Text Readability */}
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.9)"]}
                    style={styles.carouselGradient}
                  />

                  {/* Close Button - Floating */}
                  <TouchableOpacity
                    style={styles.floatingCloseButton}
                    onPress={() => {
                      setShowProfileModal(false);
                      setProfileData(null);
                      setSelectedRequest(null);
                    }}
                  >
                    <Ionicons name="close" size={28} color="#FFFFFF" />
                  </TouchableOpacity>

                  {/* Pagination Dots */}
                  {profileData.photos && profileData.photos.length > 1 && (
                    <View style={styles.paginationContainer}>
                      {profileData.photos.map((_, index) => (
                        <View key={index} style={[styles.paginationDot, { opacity: 0.8 }]} />
                      ))}
                    </View>
                  )}

                  {/* Name & Basic Info Overlay */}
                  <View style={styles.headerInfoOverlay}>
                    <Text style={styles.headerName}>
                      {profileData.displayName}, {profileData.birthYear ? new Date().getFullYear() - profileData.birthYear : ""}
                    </Text>
                    <View style={styles.headerLocation}>
                      <Ionicons name="location" size={16} color={colors.primary} />
                      <Text style={styles.headerLocationText}>{profileData.city || "Konum belirtilmemiş"}</Text>
                    </View>
                  </View>
                </View>

                {/* Profile Details Content */}
                <View style={styles.profileDetailsContent}>

                  {/* Bio Section */}
                  {profileData.bio && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailTitle}>Hakkımda</Text>
                      <Text style={styles.bioText}>{profileData.bio}</Text>
                    </View>
                  )}

                  {/* FAVORITE Message */}
                  {selectedRequest?.kind === "FAVORITE" && selectedRequest.firstMessage && (
                    <View style={styles.favoriteMessageHighlight}>
                      <LinearGradient
                        colors={[colors.accent + "20", colors.primary + "10"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.favoriteMessageContent}
                      >
                        <View style={styles.favoriteHeader}>
                          <Ionicons name="star" size={16} color={colors.accent} />
                          <Text style={styles.favoriteLabel}>Özel Mesaj</Text>
                        </View>
                        <Text style={styles.favoriteText}>"{selectedRequest.firstMessage.text}"</Text>
                      </LinearGradient>
                    </View>
                  )}

                  {/* Purpose Chip */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>Aradığım</Text>
                    <View style={styles.chipContainer}>
                      <View style={styles.purposeChip}>
                        <Text style={styles.purposeText}>
                          {profileData.purpose === "CONVERSATION" ? "Sohbet" :
                            profileData.purpose === "PRACTICE" ? "Dil Pratiği" : "Kahve"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Languages */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>Konuştuğum Diller</Text>
                    <View style={styles.languageTags}>
                      {profileData.languagesNative.map((lang, index) => (
                        <View key={`native-${index}`} style={[styles.langTag, styles.nativeTag]}>
                          <Text style={styles.langText}>{lang}</Text>
                        </View>
                      ))}
                      {profileData.languagesPractice.map((lang, index) => (
                        <View key={`practice-${index}`} style={[styles.langTag, styles.practiceTag]}>
                          <Text style={styles.langText}>{lang}</Text>
                          <Ionicons name="school-outline" size={12} color={colors.textSecondaryDark} style={{ marginLeft: 4 }} />
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Floating Action Buttons Area */}
              <LinearGradient
                colors={["transparent", "rgba(10, 10, 20, 0.95)", "rgba(10, 10, 20, 1)"]}
                style={[
                  styles.floatingActionsOverlay,
                  {
                    paddingBottom: 20 + insets.bottom,
                    height: 120 + insets.bottom
                  }
                ]}
              >
                <TouchableOpacity
                  style={[styles.floatingActionBtn, styles.declineFab]}
                  onPress={() => {
                    setShowProfileModal(false);
                    handleDecline(selectedRequest?.fromUserId!);
                  }}
                >
                  <Ionicons name="close" size={32} color="#FF4D6D" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.floatingActionBtn, styles.acceptFab]}
                  onPress={() => {
                    setShowProfileModal(false);
                    if (selectedRequest) {
                      handleAccept(
                        selectedRequest.fromUserId!,
                        profileData.displayName,
                        profileData.photos && profileData.photos.length > 0 ? profileData.photos[0] : undefined,
                        selectedRequest.kind
                      );
                    }
                  }}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryLight]}
                    style={styles.acceptFabGradient}
                  >
                    <Ionicons name="heart" size={32} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>

            </View>
          ) : (
            <View style={styles.profileErrorContainer}>
              <Text style={styles.profileErrorText}>Profil yüklenemedi</Text>
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
  requestCardWrapper: {
    marginBottom: spacing.md,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  requestCard: {
    padding: spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  requestContent: {
    marginBottom: spacing.md,
  },
  userInfo: {
    flexDirection: "row",
    gap: spacing.md,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primaryDark,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  favoriteBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.accent,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.backgroundSecondaryDark,
  },
  userDetails: {
    flex: 1,
    justifyContent: "center",
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  superLikeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  superLikeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  userCity: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500",
  },
  cardLanguageContainer: {
    gap: 4,
    marginBottom: 8,
  },
  cardLangRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardLangText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  cardBio: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 18,
    marginBottom: 8,
  },
  messagePreviewContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  messagePreview: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    fontStyle: "italic",
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionButtonContainer: {
    flex: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
  },
  declineButton: {
    backgroundColor: "rgba(255, 77, 109, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 77, 109, 0.3)",
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FF4D6D",
  },
  acceptButton: {
    // Gradient handled in component
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  /* Profile Modal Styles */
  profileLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundDark,
  },
  loadingSpinner: {
    marginBottom: spacing.md,
  },
  profileLoadingText: {
    color: colors.textSecondaryDark,
    fontSize: 16,
  },
  profileModalContainer: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  carouselContainer: {
    height: SCREEN_HEIGHT * 0.65,
    position: "relative",
  },
  carouselPhoto: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
  carouselPlaceholder: {
    backgroundColor: colors.primaryDark,
    justifyContent: "center",
    alignItems: "center",
  },
  carouselPlaceholderText: {
    fontSize: 80,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.3)",
  },
  carouselGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  floatingCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  paginationContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    flexDirection: "row",
    gap: 6,
  },
  paginationDot: {
    width: 30,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 2,
  },
  activeDot: {
    backgroundColor: "#FFFFFF",
  },
  headerInfoOverlay: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
  },
  headerName: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 4,
  },
  headerLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerLocationText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  profileDetailsContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  detailSection: {
    marginBottom: spacing.xl,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondaryDark,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  bioText: {
    fontSize: 16,
    color: colors.textDark,
    lineHeight: 24,
    fontWeight: "400",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  purposeChip: {
    backgroundColor: colors.backgroundSecondaryDark,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },
  purposeText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  languageTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  langTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  nativeTag: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  practiceTag: {
    backgroundColor: "transparent",
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
  },
  langText: {
    color: colors.textDark,
    fontSize: 14,
  },
  favoriteMessageHighlight: {
    marginBottom: spacing.xl,
  },
  favoriteMessageContent: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accent + "50",
  },
  favoriteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  favoriteLabel: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
  },
  favoriteText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontStyle: "italic",
    lineHeight: 22,
  },
  floatingActionsOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
    paddingBottom: 20,
  },
  floatingActionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  declineFab: {
    backgroundColor: "#2A2A35",
    borderWidth: 1,
    borderColor: "rgba(255, 77, 109, 0.3)",
  },
  acceptFab: {
    // Gradient handled inside
  },
  acceptFabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  profileErrorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundDark,
  },
  profileErrorText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    marginBottom: spacing.md,
  },
  profileCloseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: colors.backgroundSecondaryDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  profileCloseText: {
    color: colors.textDark,
    fontWeight: "600",
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
