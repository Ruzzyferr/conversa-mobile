import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  Image,
  ScrollView,
  ActionSheetIOS,
} from "react-native";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { colors } from "@/src/theme/colors";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Card } from "@/src/components/Card";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { getToken } from "@/src/services/authStore";
import { api } from "@/src/services/api";
import { AxiosError } from "axios";

type Message = {
  id: string;
  conversationId: string;
  senderUserId: string;
  text: string;
  createdAt: string;
};

type Tone = "neutral" | "friendly" | "playful";

export default function ConversationScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id: string }>();
  const conversationId = params.id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [tone, setTone] = useState<Tone>("neutral");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<{
    userId: string;
    displayName: string;
    photos: string[];
    city: string | null;
  } | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<
    "SPAM" | "HARASSMENT" | "NUDITY" | "SCAM" | "OTHER" | null
  >(null);
  const [reportDetails, setReportDetails] = useState("");
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
  const [usageInfo, setUsageInfo] = useState<{
    aiCount: number;
    aiLimit: number;
    isPremium: boolean;
  } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    checkAuthAndLoadMessages();
  }, [conversationId]);

  const handleAvatarPress = async () => {
    if (!otherUser) {
      console.log("handleAvatarPress: otherUser is null");
      return;
    }
    
    console.log("handleAvatarPress: Opening profile modal for userId:", otherUser.userId);
    setShowProfileModal(true);
    setLoadingProfile(true);
    setProfileData(null);
    
    try {
      console.log("handleAvatarPress: Calling api.getUserProfile");
      const profile = await api.getUserProfile(otherUser.userId);
      console.log("handleAvatarPress: Profile loaded:", profile);
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

  // Update header when otherUser is loaded
  useLayoutEffect(() => {
    if (otherUser) {
      navigation.setOptions({
        title: otherUser.displayName,
        headerStyle: {
          backgroundColor: colors.backgroundSecondary,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: typography.fontWeight.semibold,
          fontSize: typography.fontSize.lg,
        },
        headerRight: () => (
          <View style={styles.headerRightContainer}>
            <TouchableOpacity
              onPress={() => setShowSafetyModal(true)}
              style={styles.headerMenuButton}
              activeOpacity={0.7}
            >
              <Text style={styles.headerMenuText}>⋯</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAvatarPress}
              style={styles.headerRight}
              activeOpacity={0.7}
            >
              {otherUser.photos && otherUser.photos.length > 0 ? (
                <Image
                  source={{ uri: otherUser.photos[0] }}
                  style={styles.headerAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                  <Text style={styles.headerAvatarText}>
                    {otherUser.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [otherUser, navigation]);

  const checkAuthAndLoadMessages = async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/(auth)/welcome");
        return;
      }

      const me = await api.getMe();
      setCurrentUserId(me.user.id);
      
      // Load conversation details to get other user info
      const conversationDetails = await api.getConversationDetails(conversationId);
      setOtherUser(conversationDetails.otherUser);
      
      await loadMessages();
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await api.getMessages(conversationId, 50);
      setMessages(data);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePolish = async () => {
    if (!messageText.trim() || polishing) return;

    setPolishing(true);
    try {
      const result = await api.polishMessage(messageText, tone);
      setMessageText(result.polishedText);
    } catch (error) {
      if (error instanceof AxiosError && (error.response?.status === 429 || error.response?.status === 402)) {
        const errorData = error.response.data?.error;
        if (errorData?.code === "AI_LIMIT_REACHED") {
          setUsageInfo(errorData.details?.usage || null);
          setShowPremiumModal(true);
        } else {
          Alert.alert("Limit Aşıldı", "Günlük AI kullanım limitine ulaştın.");
        }
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "AI polish failed";
        Alert.alert("Hata", errorMessage);
      }
    } finally {
      setPolishing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return;

    const text = messageText.trim();
    setMessageText("");
    setSending(true);

    try {
      const newMessage = await api.sendMessage(conversationId, text);
      setMessages((prev) => [...prev, newMessage]);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      if (error instanceof AxiosError) {
        const errorData = error.response?.data?.error;
        const code = errorData?.code;
        const message = errorData?.message || "Failed to send message";

        if (code === "MSG_LIMIT_REACHED") {
          Alert.alert(
            "Limit Aşıldı",
            "Günlük mesaj limitine ulaştın. Premium'a geçerek sınırsız mesaj gönderebilirsin.",
            [
              { text: "Tamam", style: "cancel" },
              {
                text: "Premium'a Geç",
                onPress: () => router.push("/premium"),
              },
            ]
          );
        } else if (code === "FIRST_MESSAGE_TOO_SHORT") {
          Alert.alert(
            "İlk Mesaj Çok Kısa",
            "İlk mesajın en az 20 karakter olmalı. Daha anlamlı bir mesaj yaz veya AI ile düzeltmeyi dene!",
            [
              { text: "Tamam" },
              {
                text: "AI ile Düzelt",
                onPress: () => {
                  setMessageText(text);
                  handlePolish();
                },
              },
            ]
          );
          setMessageText(text); // Restore text
        } else if (code === "FIRST_MESSAGE_RESTRICTED" || code === "MALE_CANNOT_SEND_FIRST_MESSAGE" || message.toLowerCase().includes("kadın") || message.toLowerCase().includes("first message")) {
          Alert.alert(
            "İlk Mesaj Kuralı",
            "Bu eşleşmede ilk mesajı kadın tarafı göndermelidir. Lütfen karşı tarafın ilk mesajı göndermesini bekleyin.",
            [{ text: "Tamam" }]
          );
          setMessageText(text); // Restore text
        } else {
          Alert.alert("Hata", message);
          setMessageText(text); // Restore text on error
        }
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to send message";
        Alert.alert("Hata", errorMessage);
        setMessageText(text);
      }
    } finally {
      setSending(false);
    }
  };

  const handleBlock = async () => {
    if (!otherUser) return;
    
    Alert.alert(
      "Engelle",
      `${otherUser.displayName} kişisini engellemek istediğine emin misin? Bu işlem geri alınamaz.`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Engelle",
          style: "destructive",
          onPress: async () => {
            try {
              await api.blockUser(otherUser.userId);
              Alert.alert("Başarılı", `${otherUser.displayName} engellendi.`);
              router.replace("/(tabs)/chat"); // Navigate back to chat list
            } catch (error) {
              const errorMessage =
                error instanceof AxiosError && error.response?.data?.error?.message
                  ? error.response.data.error.message
                  : "Engelleme başarısız oldu";
              Alert.alert("Hata", errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleReport = async () => {
    if (!otherUser || !reportReason) return;
    
    try {
      await api.reportUser(
        otherUser.userId,
        reportReason,
        reportDetails || undefined
      );
      Alert.alert("Başarılı", `${otherUser.displayName} rapor edildi.`);
      setShowReportModal(false);
      setReportReason(null);
      setReportDetails("");
    } catch (error) {
      const errorMessage =
        error instanceof AxiosError && error.response?.data?.error?.message
          ? error.response.data.error.message
          : "Raporlama başarısız oldu";
      Alert.alert("Hata", errorMessage);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderUserId === currentUserId;

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}
      >
        <Card
          style={[
            styles.messageCard,
            isMyMessage ? styles.myMessageCard : styles.otherMessageCard,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}
          >
            {item.text}
          </Text>
        </Card>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  const isFirstMessage = messages.length === 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.messagesContent,
          { paddingBottom: spacing.lg + 200 },
        ]}
        inverted={false}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
      />

      {isFirstMessage && messageText.length > 0 && messageText.length < 20 && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            💡 İlk mesaj en az 20 karakter olmalı. Daha anlamlı bir mesaj yaz!
          </Text>
        </View>
      )}

      {/* Tone Selector - Always visible */}
      <View style={styles.toneContainer}>
        <Text style={styles.toneLabel}>Ton:</Text>
        <View style={styles.toneChips}>
          {(["neutral", "friendly", "playful"] as Tone[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.toneChip, tone === t && styles.toneChipActive]}
              onPress={() => setTone(t)}
              disabled={polishing}
            >
              <Text
                style={[
                  styles.toneChipText,
                  tone === t && styles.toneChipTextActive,
                ]}
              >
                {t === "neutral"
                  ? "Nötr"
                  : t === "friendly"
                  ? "Sıcak"
                  : "Eğlenceli"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Mesaj yaz..."
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={2000}
          editable={!sending && !polishing}
        />
        <TouchableOpacity
          style={[
            styles.aiButton,
            (!messageText.trim() || polishing) && styles.aiButtonDisabled,
          ]}
          onPress={handlePolish}
          disabled={!messageText.trim() || polishing}
        >
          <Text style={styles.aiButtonText}>
            {polishing ? "..." : "✨"}
          </Text>
        </TouchableOpacity>
        <PrimaryButton
          title="Gönder"
          onPress={handleSendMessage}
          disabled={!messageText.trim() || sending}
          loading={sending}
          style={styles.sendButton}
        />
      </View>

      {/* Premium Modal */}
      <Modal
        visible={showPremiumModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPremiumModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>AI Limit Aşıldı</Text>
            {usageInfo && (
              <View style={styles.usageInfo}>
                <Text style={styles.usageText}>
                  Bugün kullandın: {usageInfo.aiCount} / {usageInfo.aiLimit}
                </Text>
              </View>
            )}
            <Text style={styles.modalText}>
              Premium'a geçerek sınırsız AI polish kullanabilirsin!
            </Text>
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Premium'a Geç"
                onPress={() => {
                  setShowPremiumModal(false);
                  router.push("/premium");
                }}
                style={styles.modalButton}
              />
              <TouchableOpacity
                onPress={() => setShowPremiumModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </Card>
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
                  </Text>
                  {profileData.city && (
                    <Text style={styles.profileCity}>{profileData.city}</Text>
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
                            Native:
                          </Text>
                          <Text style={styles.profileLanguages}>
                            {profileData.languagesNative.join(", ")}
                          </Text>
                        </View>
                      )}
                      {profileData.languagesPractice.length > 0 && (
                        <View style={styles.profileLanguageSection}>
                          <Text style={styles.profileLanguageLabel}>
                            Practice:
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

      {/* Safety Modal (Android) */}
      <Modal
        visible={showSafetyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSafetyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Safety Options</Text>
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Block User"
                onPress={() => {
                  setShowSafetyModal(false);
                  handleBlock();
                }}
                style={[styles.modalButton, styles.blockButton]}
              />
              <PrimaryButton
                title="Report User"
                onPress={() => {
                  setShowSafetyModal(false);
                  setShowReportModal(true);
                }}
                style={styles.modalButton}
              />
              <TouchableOpacity
                onPress={() => setShowSafetyModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowReportModal(false);
          setReportReason(null);
          setReportDetails("");
        }}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Report User</Text>
            <Text style={styles.modalText}>
              Why are you reporting this user?
            </Text>
            <View style={styles.reportReasons}>
              {(["SPAM", "HARASSMENT", "NUDITY", "SCAM", "OTHER"] as const).map(
                (reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reportReasonChip,
                      reportReason === reason && styles.reportReasonChipActive,
                    ]}
                    onPress={() => setReportReason(reason)}
                  >
                    <Text
                      style={[
                        styles.reportReasonText,
                        reportReason === reason &&
                          styles.reportReasonTextActive,
                      ]}
                    >
                      {reason.charAt(0) + reason.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
            {reportReason && (
              <TextInput
                style={styles.reportDetailsInput}
                value={reportDetails}
                onChangeText={setReportDetails}
                placeholder="Additional details (optional)"
                placeholderTextColor={colors.textTertiary}
                multiline
                maxLength={500}
              />
            )}
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Submit Report"
                onPress={handleReport}
                disabled={!reportReason}
                style={styles.modalButton}
              />
              <TouchableOpacity
                onPress={() => {
                  setShowReportModal(false);
                  setReportReason(null);
                  setReportDetails("");
                }}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageContainer: {
    marginBottom: spacing.sm,
  },
  myMessageContainer: {
    alignItems: "flex-end",
  },
  otherMessageContainer: {
    alignItems: "flex-start",
  },
  messageCard: {
    maxWidth: "75%",
    padding: spacing.sm,
  },
  myMessageCard: {
    backgroundColor: colors.primary,
  },
  otherMessageCard: {
    backgroundColor: colors.backgroundSecondaryDark,
  },
  messageText: {
    fontSize: typography.fontSize.base,
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  otherMessageText: {
    color: colors.textDark,
  },
  hintContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.warning + "20",
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
  },
  hintText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning,
    textAlign: "center",
  },
  toneContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondaryDark,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
    gap: spacing.sm,
  },
  toneLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    fontWeight: typography.fontWeight.medium,
  },
  toneChips: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  toneChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  toneChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toneChipText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondaryDark,
    fontWeight: typography.fontWeight.medium,
  },
  toneChipTextActive: {
    color: "#FFFFFF",
  },
  inputContainer: {
    flexDirection: "row",
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
    backgroundColor: colors.backgroundSecondaryDark,
    gap: spacing.sm,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.textDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    maxHeight: 100,
    minHeight: 40,
  },
  aiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  aiButtonDisabled: {
    opacity: 0.5,
  },
  aiButtonText: {
    fontSize: typography.fontSize.lg,
  },
  sendButton: {
    minWidth: 80,
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
  modalTitle: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  usageInfo: {
    backgroundColor: colors.backgroundSecondaryDark,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  usageText: {
    fontSize: typography.fontSize.base,
    color: colors.textDark,
    textAlign: "center",
    fontWeight: typography.fontWeight.medium,
  },
  modalText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 24,
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
    color: colors.textSecondaryDark,
    fontSize: typography.fontSize.sm,
  },
  headerRightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginRight: spacing.md,
  },
  headerMenuButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  headerMenuText: {
    fontSize: typography.fontSize["2xl"],
    color: colors.textDark,
    fontWeight: typography.fontWeight.bold,
  },
  headerRight: {
    marginRight: 0,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatarText: {
    color: "#FFFFFF",
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
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
    backgroundColor: colors.backgroundDark,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  profilePhotoPlaceholderText: {
    color: colors.textSecondaryDark,
    fontSize: typography.fontSize["4xl"],
    fontWeight: typography.fontWeight.bold,
  },
  profileInfo: {
    marginBottom: spacing.md,
  },
  profileDisplayName: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  profileCity: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    marginBottom: spacing.xs,
  },
  profilePurpose: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.sm,
  },
  profileBio: {
    fontSize: typography.fontSize.base,
    color: colors.textDark,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  profileLanguagesContainer: {
    marginTop: spacing.sm,
  },
  profileLanguageSection: {
    marginBottom: spacing.sm,
  },
  profileLanguageLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondaryDark,
    marginBottom: spacing.xs,
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
    textAlign: "center",
  },
  blockButton: {
    backgroundColor: colors.warning || "#FF6B6B",
  },
  reportReasons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reportReasonChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  reportReasonChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reportReasonText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    fontWeight: typography.fontWeight.medium,
  },
  reportReasonTextActive: {
    color: "#FFFFFF",
  },
  reportDetailsInput: {
    backgroundColor: colors.backgroundDark,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    minHeight: 100,
    maxHeight: 150,
    marginBottom: spacing.md,
    textAlignVertical: "top",
  },
});
