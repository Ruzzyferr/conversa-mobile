import React, { useEffect, useState, useRef, useLayoutEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  Modal,
  Alert,
  Image,
  ScrollView,
  ActionSheetIOS,
  Animated,
  Pressable,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import Reanimated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { useRouter, useLocalSearchParams, useNavigation, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/theme/colors";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Card } from "@/src/components/Card";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { getToken } from "@/src/services/authStore";
import { api } from "@/src/services/api";
import { setActiveConversation } from "@/src/services/pushNotifications";
import { badgeUpdater } from "@/src/utils/badgeUpdater";
import { AxiosError } from "axios";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { OptimizedImage } from "@/src/components/ui/OptimizedImage";
import { VoiceRecorder } from "@/src/components/chat/VoiceRecorder";
import { AudioPlayer } from "@/src/components/chat/AudioPlayer";
import { ProfileModal } from "@/src/components/ProfileModal";
import { LeaveReasonModal } from "@/src/components/chat/LeaveReasonModal";
import {
  connectSocket,
  joinConversation,
  leaveConversation,
  onNewMessage,
  onTyping,
  onTypingStop,
  sendTypingStart,
  sendTypingStop,
} from "@/src/services/socket";

type Message = {
  id: string;
  conversationId: string;
  senderUserId: string;
  text: string;
  audioUrl?: string;
  imageUrl?: string;
  createdAt: string;
};

type Tone = "neutral" | "friendly" | "playful";

// Custom hook for smooth keyboard animation using react-native-keyboard-controller
const useKeyboardAnimation = () => {
  const height = useSharedValue(0);

  useKeyboardHandler({
    onMove: (event) => {
      'worklet';
      height.value = Math.max(event.height, 0);
    },
  }, []);

  return { height };
};

export default function ConversationScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id: string; prefill?: string }>();
  const conversationId = params.id;
  const prefillFromRoute = typeof params.prefill === "string" ? params.prefill : undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [messageText, setMessageText] = useState(prefillFromRoute ?? "");
  // Track which prefill values have been applied so navigating to the same
  // conversation later (without a prefill) doesn't clobber the user's draft.
  const appliedPrefillRef = useRef<string | null>(prefillFromRoute ?? null);
  useEffect(() => {
    if (prefillFromRoute && appliedPrefillRef.current !== prefillFromRoute) {
      setMessageText(prefillFromRoute);
      appliedPrefillRef.current = prefillFromRoute;
    }
  }, [prefillFromRoute]);
  const [tone, setTone] = useState<Tone>("neutral");
  const [showToneSelector, setShowToneSelector] = useState(false);
  const toneSelectorAnim = useRef(new Animated.Value(0)).current;
  const toneButtonAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserGender, setCurrentUserGender] = useState<"MALE" | "FEMALE" | "OTHER" | null>(null);
  const [otherUser, setOtherUser] = useState<{
    userId: string;
    displayName: string;
    photos: string[];
    city: string | null;
    gender?: "MALE" | "FEMALE" | "OTHER" | null;
  } | null>(null);
  const [firstMessage, setFirstMessage] = useState<{
    id: string;
    text: string;
    createdAt: string;
  } | null>(null);
  const [hasMessages, setHasMessages] = useState(false);
  const insets = useSafeAreaInsets();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLeaveConversationModal, setShowLeaveConversationModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  // Report / remove-chat reason picker ("report" | "remove" | null = hidden)
  const [safetyReasonMode, setSafetyReasonMode] = useState<"report" | "remove" | null>(null);
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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Outgoing typing state: emit typing_start once, then typing_stop after inactivity
  const isTypingRef = useRef(false);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keyboard animation hook - MUST be called before any conditional returns
  const { height: keyboardHeight } = useKeyboardAnimation();
  const keyboardSpacerStyle = useAnimatedStyle(() => ({
    height: keyboardHeight.value,
  }));

  // 4 random icebreakers, stable per screen mount.
  // MUST stay above the early returns below — a hook after a conditional
  // return crashes with "Rendered more hooks than during the previous render".
  const icebreakers = React.useMemo(() => {
    const all = ["idiom", "food", "series", "travel", "language_why", "weekend", "music", "funny_word", "city_tip", "coffee_tea", "dream_country", "teach_me"];
    return all.sort(() => Math.random() - 0.5).slice(0, 4);
  }, []);

  // Keyboard listener for better UX
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    checkAuthAndLoadMessages();
  }, [conversationId]);

  // While this thread is on screen its own pushes are silenced — the socket
  // has already put the message in the list, so a banner over it is noise.
  useFocusEffect(
    useCallback(() => {
      setActiveConversation(conversationId);
      return () => setActiveConversation(null);
    }, [conversationId])
  );

  // Socket.IO real-time connection
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    let unsubMessage: (() => void) | undefined;
    let unsubTyping: (() => void) | undefined;
    let unsubTypingStop: (() => void) | undefined;

    const setupSocket = async () => {
      await connectSocket();
      joinConversation(conversationId);

      // Handle real-time messages
      unsubMessage = onNewMessage(conversationId, (newMessage) => {
        // Don't add if it's our own message (already added optimistically)
        if (newMessage.senderUserId === currentUserId) return;

        setMessages((prev) => {
          // Check if message already exists
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, {
            ...newMessage,
            audioUrl: newMessage.audioUrl || undefined,
            imageUrl: newMessage.imageUrl || undefined,
          }];
        });
        setHasMessages(true);

        // Mark as read
        api.markConversationAsRead(conversationId).catch(() => { });
        badgeUpdater.update();

        // Scroll to new message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });

      // Handle typing indicators
      unsubTyping = onTyping(conversationId, (data) => {
        if (data.userId !== currentUserId) {
          setIsOtherUserTyping(true);
          // Clear previous timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          // Auto-clear after 3 seconds
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherUserTyping(false);
          }, 3000);
        }
      });

      unsubTypingStop = onTypingStop(conversationId, (data) => {
        if (data.userId !== currentUserId) {
          setIsOtherUserTyping(false);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
        }
      });
    };

    setupSocket();

    return () => {
      // Stop our own typing broadcast before leaving the room
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
      if (isTypingRef.current) {
        isTypingRef.current = false;
        sendTypingStop(conversationId);
      }
      leaveConversation(conversationId);
      unsubMessage?.();
      unsubTyping?.();
      unsubTypingStop?.();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, currentUserId]);

  // Fallback polling - only runs every 15 seconds as backup for missed WebSocket messages
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number>(0);

  useEffect(() => {
    // Start polling only after initial load is complete
    if (!loading && conversationId && currentUserId) {
      pollingRef.current = setInterval(async () => {
        // Skip if rate limited
        if (Date.now() < rateLimitedUntil) {
          return;
        }

        try {
          const newMessages = await api.getMessages(conversationId, 50);
          // Only update if there are new messages
          if (newMessages.length !== messages.length) {
            setMessages(newMessages);
            setHasMessages(newMessages.length > 0);
            // Mark new messages as read
            try {
              await api.markConversationAsRead(conversationId);
              badgeUpdater.update();
            } catch (e) {
              // Ignore read errors during polling
            }
          }
        } catch (error: any) {
          // If rate limited, pause polling for 60 seconds
          if (error?.response?.status === 429) {
            setRateLimitedUntil(Date.now() + 60000);
          }
        }
      }, 15000); // Poll every 15 seconds as fallback (WebSocket handles real-time)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [loading, conversationId, currentUserId, messages.length, rateLimitedUntil]);

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

  // Check if we should show waiting screen (male user in male-female match with no messages)
  const isMaleFemaleMatch =
    currentUserGender === "MALE" &&
    otherUser?.gender === "FEMALE";
  const shouldShowWaitingScreen =
    isMaleFemaleMatch &&
    !hasMessages &&
    messages.length === 0 &&
    !firstMessage; // Only for LIKE matches, not FAVORITE (which already has firstMessage)

  // Update header when otherUser is loaded
  useLayoutEffect(() => {
    if (otherUser) {
      // Hide header if showing waiting screen
      if (shouldShowWaitingScreen) {
        navigation.setOptions({
          headerShown: false,
        });
      } else {
        navigation.setOptions({
          title: otherUser.displayName,
          headerStyle: {
            backgroundColor: colors.backgroundSecondaryDark,
          },
          headerTintColor: colors.textDark,
          headerTitleStyle: {
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.lg,
            color: colors.textDark,
          },
          headerRight: () => (
            <View style={styles.headerRightContainer}>
              <TouchableOpacity
                onPress={() => setShowSafetyModal(true)}
                style={styles.headerMenuButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
    }
  }, [otherUser, navigation, shouldShowWaitingScreen, currentUserGender, hasMessages, messages.length, firstMessage]);

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
      setFirstMessage(conversationDetails.firstMessage || null);
      setCurrentUserGender(conversationDetails.currentUserGender || null);
      setHasMessages(conversationDetails.hasMessages || false);

      await loadMessages();

      // Mark messages as read when opening conversation
      try {
        await api.markConversationAsRead(conversationId);
        // Trigger badge update to refresh unread count in tab bar
        badgeUpdater.update();
      } catch (error) {
        console.error("Failed to mark messages as read:", error);
      }
    } catch (error: any) {
      console.error("Failed to load conversation:", error);
      // Handle rate limit - show error but don't break UI
      if (error?.response?.status === 429) {
        Alert.alert(
          "Çok Fazla İstek",
          "Lütfen birkaç saniye bekleyip tekrar deneyin.",
          [{ text: "Tamam", onPress: () => router.back() }]
        );
      }
      // Always set loading to false on error
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await api.getMessages(conversationId, 50);
      setMessages(data);
      setHasMessages(data.length > 0);
    } catch (error: any) {
      console.error("Failed to load messages:", error);
      // Handle rate limit gracefully - don't break the UI
      if (error?.response?.status === 429) {
        console.warn("Rate limited - will retry later");
        // Set messages to empty array to show the UI
        if (messages.length === 0) {
          setMessages([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAIPress = () => {
    if (showToneSelector) {
      // Close tone selector
      Animated.parallel([
        Animated.timing(toneSelectorAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        ...toneButtonAnims.map((anim) =>
          Animated.timing(anim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          })
        ),
      ]).start(() => {
        setShowToneSelector(false);
      });
    } else {
      // Open tone selector
      setShowToneSelector(true);
      Animated.parallel([
        Animated.timing(toneSelectorAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        ...toneButtonAnims.map((anim, index) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            delay: index * 50,
            useNativeDriver: true,
          })
        ),
      ]).start();
    }
  };

  const handleToneSelect = async (selectedTone: Tone) => {
    if (!messageText.trim() || polishing) return;

    // Close tone selector first
    Animated.parallel([
      Animated.timing(toneSelectorAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      ...toneButtonAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ),
    ]).start(() => {
      setShowToneSelector(false);
    });

    setTone(selectedTone);
    setPolishing(true);

    try {
      const result = await api.polishMessage(messageText, selectedTone);
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

  // Handler for VoiceRecorder - sends audio message
  const handlePickImage = async (source: "camera" | "gallery") => {
    setShowAttachSheet(false);
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(t('common.error'), t('chat.camera_permission'));
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.7,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.7,
        });
      }
      if (result.canceled || !result.assets?.[0]?.uri) return;
      await handleSendImage(result.assets[0].uri);
    } catch (error) {
      console.error("Image pick failed:", error);
      Alert.alert(t('common.error'), t('chat.image_send_error'));
    }
  };

  const handleSendImage = async (uri: string) => {
    try {
      setSending(true);
      const newMessage = await api.sendImageMessage(conversationId, uri);
      setMessages((prev) => [...prev, { ...newMessage, text: newMessage.text || "" }]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Failed to send image:", error);
      Alert.alert(t('common.error'), t('chat.image_send_error'));
    } finally {
      setSending(false);
    }
  };

  const handleSendAudio = async (uri: string) => {
    try {
      setSending(true);
      const newMessage = await api.sendAudioMessage(conversationId, uri);
      setMessages((prev) => [...prev, { ...newMessage, text: newMessage.text || "" }]);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Failed to send audio:", error);
      Alert.alert("Hata", "Ses gönderilemedi");
      throw error; // Re-throw so VoiceRecorder can handle it
    } finally {
      setSending(false);
    }
  };

  // Stop emitting typing status (on send, inactivity or leaving the screen)
  const stopTypingEmit = () => {
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTypingStop(conversationId);
    }
  };

  const handleMessageTextChange = (text: string) => {
    setMessageText(text);

    if (!text.trim()) {
      stopTypingEmit();
      return;
    }

    // Emit typing_start once, then typing_stop after ~2s of inactivity
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingStart(conversationId);
    }
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
    }
    typingStopTimeoutRef.current = setTimeout(() => {
      typingStopTimeoutRef.current = null;
      isTypingRef.current = false;
      sendTypingStop(conversationId);
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return;

    const text = messageText.trim();
    setMessageText("");
    stopTypingEmit();
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

  // Handles both report (user) and remove (leave chat) submissions
  // coming from the LeaveReasonModal reason picker.
  const handleSafetyReasonSubmit = async (reason: string, details?: string) => {
    if (!safetyReasonMode) return;

    try {
      if (safetyReasonMode === "report") {
        if (!otherUser) return;
        await api.reportUser(otherUser.userId, reason, details);
        setSafetyReasonMode(null);
        Alert.alert(t('safety.report_thanks'));
      } else {
        await api.leaveConversation(conversationId, reason, details);
        setSafetyReasonMode(null);
        router.replace("/(tabs)/chat");
      }
    } catch (error) {
      const errorMessage =
        error instanceof AxiosError && error.response?.data?.error?.message
          ? error.response.data.error.message
          : t('safety.action_error');
      Alert.alert(t('common.error'), errorMessage);
    }
  };

  const handleLeaveConversation = async () => {
    if (!otherUser) return;

    Alert.alert(
      "Konuşmadan Ayrıl",
      `Bu konuşmadan ayrılmak istediğine emin misin? Bu işlem konuşmayı hem sizden hem de ${otherUser.displayName}'den silecektir.`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Ayrıl",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteConversation(conversationId);
              Alert.alert("Başarılı", "Konuşmadan ayrıldınız.");
              router.replace("/(tabs)/chat");
            } catch (error) {
              const errorMessage =
                error instanceof AxiosError && error.response?.data?.error?.message
                  ? error.response.data.error.message
                  : "Konuşmadan ayrılma başarısız oldu";
              Alert.alert("Hata", errorMessage);
            }
          },
        },
      ]
    );
  };

  // Shared Leave-Conversation confirmation modal (used by both the waiting screen and the main chat view)
  const renderLeaveConversationModal = () => (
    <Modal
      visible={showLeaveConversationModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowLeaveConversationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <Card style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t('conversation.leave_title')}</Text>
          {otherUser && (
            <Text style={styles.modalText}>
              Bu konuşmadan ayrılmak istediğine emin misin? Bu işlem konuşmayı hem sizden hem de {otherUser.displayName}'den silecektir.
            </Text>
          )}
          <View style={styles.modalActions}>
            <PrimaryButton
              title="Konuşmadan Ayrıl"
              onPress={() => {
                setShowLeaveConversationModal(false);
                handleLeaveConversation();
              }}
              style={[styles.modalButton, { backgroundColor: colors.warning }]}
            />
            <TouchableOpacity
              onPress={() => setShowLeaveConversationModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    </Modal>
  );

  // Locale-aware HH:mm label for message bubbles
  const formatMessageTime = (createdAt: string) => {
    const date = new Date(createdAt);
    if (isNaN(date.getTime())) return "";
    try {
      return new Intl.DateTimeFormat(i18n.language, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderUserId === currentUserId;

    if (item.audioUrl) {
      return (
        <View
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
          ]}
        >
          <AudioPlayer audioUrl={item.audioUrl} isMyMessage={isMyMessage} />
          <Text style={styles.messageTime}>{formatMessageTime(item.createdAt)}</Text>
        </View>
      );
    }

    if (item.imageUrl) {
      return (
        <View
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setViewerImageUrl(item.imageUrl!)}
          >
            <OptimizedImage
              source={{ uri: item.imageUrl }}
              style={styles.imageMessage}
              containerStyle={[
                styles.imageMessageContainer,
                isMyMessage ? styles.myImageMessage : styles.otherImageMessage,
              ]}
              resizeMode="cover"
            />
          </TouchableOpacity>
          <Text style={styles.messageTime}>{formatMessageTime(item.createdAt)}</Text>
        </View>
      );
    }

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
        <Text style={styles.messageTime}>{formatMessageTime(item.createdAt)}</Text>
      </View>
    );
  };

  // Render first message from FAVORITE request if it exists and no messages yet
  const renderFirstMessage = () => {
    if (firstMessage && messages.length === 0) {
      return (
        <View style={styles.messageContainer}>
          <Card style={styles.otherMessageCard}>
            <Text style={styles.otherMessageText}>
              {firstMessage.text}
            </Text>
          </Card>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>{t('conversation.loading')}</Text>
      </View>
    );
  }

  const isFirstMessage = messages.length === 0;

  // Render waiting screen for male users in male-female matches
  if (shouldShowWaitingScreen && otherUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.waitingScreenContainer}>
          {/* Header */}
          <View style={styles.waitingScreenHeader}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.waitingScreenHeaderTitle}>Sohbet</Text>
            <TouchableOpacity
              onPress={() => setShowLeaveConversationModal(true)}
              style={styles.backButton}
            >
              <MaterialIcons name="more-vert" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.waitingScreenContent}>
            {/* Profile Photo */}
            <TouchableOpacity
              onPress={handleAvatarPress}
              activeOpacity={0.8}
              style={styles.waitingScreenPhotoContainer}
            >
              {otherUser.photos && otherUser.photos.length > 0 ? (
                <Image
                  source={{ uri: otherUser.photos[0] }}
                  style={styles.waitingScreenPhoto}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.waitingScreenPhotoPlaceholder}>
                  <Text style={styles.waitingScreenPhotoPlaceholderText}>
                    {otherUser.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.waitingScreenPhotoRing} />
            </TouchableOpacity>

            {/* Name */}
            <Text style={styles.waitingScreenName}>{otherUser.displayName}</Text>
            {otherUser.city && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <MaterialIcons name="place" size={14} color={colors.textTertiary} />
                <Text style={styles.waitingScreenCity}>{otherUser.city}</Text>
              </View>
            )}

            {/* Message */}
            <View style={styles.waitingScreenMessageBox}>
              {/* Sabit Turkce + emoji: Ingilizce telefonda da Turkce cikiyordu. */}
              <Text style={styles.waitingScreenMessageText}>{t("conversation.waiting_title")}</Text>
              <Text style={styles.waitingScreenMessageSubtext}>
                {t("conversation.waiting_body", { name: otherUser.displayName })}
              </Text>
            </View>
          </View>

          {/* Profile Modal for waiting screen - Using reusable component */}
          <ProfileModal
            visible={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            userId={otherUser?.userId || null}
          />

          {/* Leave Conversation Modal for waiting screen */}
          {renderLeaveConversationModal()}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View
      style={styles.container}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderFirstMessage}
        contentContainerStyle={[
          styles.messagesContent,
          { paddingBottom: spacing.lg + 100 },
          // Pin a short thread to the bottom, next to the input, the way every
          // messaging app does. Without this the first message of a brand-new
          // match sat alone at the very top with ~1300px of empty black under
          // it, which reads as a broken screen at exactly the moment a match
          // has to turn into a conversation.
          messages.length === 0 && !firstMessage
            ? { flexGrow: 1, justifyContent: "center" as const }
            : { flexGrow: 1, justifyContent: "flex-end" as const },
        ]}
        ListEmptyComponent={
          firstMessage ? null : (
            <View style={styles.emptyThread}>
              <Text style={styles.emptyThreadTitle}>
                {t("chat.new_thread_title", { name: otherUser?.displayName ?? "" })}
              </Text>
              <Text style={styles.emptyThreadBody}>{t("chat.new_thread_body")}</Text>
            </View>
          )
        }
        inverted={false}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      />

      {/* Typing indicator */}
      {isOtherUserTyping && (
        <View style={styles.typingIndicatorContainer}>
          <Text style={styles.typingIndicatorText}>
            {otherUser ? `${otherUser.displayName} ${t('chat.typing')}` : t('chat.typing')}
          </Text>
        </View>
      )}

      {isFirstMessage && messageText.length > 0 && messageText.length < 20 && (
        <View style={styles.hintContainer}>
          <MaterialIcons name="lightbulb-outline" size={16} color={colors.warning} />
          <Text style={styles.hintText}>{t("chat.first_message_hint")}</Text>
        </View>
      )}

      {/* Icebreaker chips: shown while the conversation is young to restart
          stalled/blank chats (top language-exchange churn cause). Tap fills
          the input so the user can edit before sending. */}
      {!isRecordingActive && messages.length < 6 && messageText.length === 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.icebreakerStrip}
          contentContainerStyle={styles.icebreakerStripContent}
          keyboardShouldPersistTaps="handled"
        >
          {icebreakers.map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.icebreakerChip}
              onPress={() => handleMessageTextChange(t(`chat.icebreakers.${key}`))}
            >
              <Text style={styles.icebreakerChipText} numberOfLines={1}>
                {t(`chat.icebreakers.${key}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input Container - iOS style */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + spacing.sm }]}>
        {/* Hide input and buttons when recording */}
        {!isRecordingActive && (
          <>
            <TouchableOpacity
              style={styles.attachButton}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              onPress={() => setShowAttachSheet(true)}
              disabled={sending}
            >
              <MaterialIcons name="add" size={24} color={colors.textSecondaryDark} />
            </TouchableOpacity>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={messageText}
                onChangeText={handleMessageTextChange}
                placeholder={t('chat.write_placeholder')}
                placeholderTextColor={colors.textTertiary}
                multiline
                maxLength={8000}
                editable={!sending && !polishing}
                scrollEnabled={true}
              />
            </View>

            {messageText.trim().length > 0 ? (
              <>
                <View style={styles.aiButtonContainer}>
                  <TouchableOpacity
                    style={[
                      styles.aiButton,
                      (polishing || showToneSelector) && styles.aiButtonActive,
                    ]}
                    onPress={handleAIPress}
                    disabled={polishing}
                  >
                    {polishing ? (
                      <ActivityIndicator size="small" color={colors.onMedia} />
                    ) : (
                      <MaterialCommunityIcons
                        name="auto-fix"
                        size={20}
                        color={colors.onMedia}
                      />
                    )}
                  </TouchableOpacity>

                  {showToneSelector && (
                    <Animated.View
                      style={[
                        styles.toneSelector,
                        {
                          opacity: toneSelectorAnim,
                          transform: [
                            {
                              scale: toneSelectorAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.8, 1],
                              }),
                            },
                            {
                              translateY: toneSelectorAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-10, 0],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      {(["neutral", "friendly", "playful"] as Tone[]).map((t, index) => (
                        <Animated.View
                          key={t}
                          style={{
                            opacity: toneButtonAnims[index],
                            transform: [
                              {
                                translateX: toneButtonAnims[index].interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [20, 0],
                                }),
                              },
                              {
                                scale: toneButtonAnims[index].interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.5, 1],
                                }),
                              },
                            ],
                          }}
                        >
                          <TouchableOpacity
                            style={[styles.toneButton, tone === t && styles.toneButtonActive]}
                            onPress={() => handleToneSelect(t)}
                            disabled={polishing}
                          >
                            <Text
                              style={[
                                styles.toneButtonText,
                                tone === t && styles.toneButtonTextActive,
                              ]}
                            >
                              {t === "neutral" ? "Nötr" : t === "friendly" ? "Samimi" : "Neşeli"}
                            </Text>
                          </TouchableOpacity>
                        </Animated.View>
                      ))}
                    </Animated.View>
                  )}
                </View>
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!messageText.trim() || sending) && styles.sendButtonDisabled,
                  ]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  onPress={handleSendMessage}
                  disabled={!messageText.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <MaterialIcons name="send" size={20} color={colors.textInverse} />
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.aiButton}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={handleAIPress}
                disabled={polishing}
              >
                <MaterialCommunityIcons name="auto-fix" size={20} color={colors.onMedia} />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* VoiceRecorder - always rendered, takes full width when active */}
        <VoiceRecorder
          onSend={handleSendAudio}
          onCancel={() => { }}
          onRecordingStateChange={setIsRecordingActive}
          disabled={sending}
        />
      </View>

      {/* Attachment sheet */}
      <Modal
        visible={showAttachSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachSheet(false)}
      >
        <Pressable
          style={styles.attachSheetOverlay}
          onPress={() => setShowAttachSheet(false)}
        >
          <View style={[styles.attachSheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <TouchableOpacity
              style={styles.attachOption}
              onPress={() => handlePickImage("camera")}
            >
              <View style={styles.attachOptionIcon}>
                <MaterialIcons name="photo-camera" size={24} color={colors.primaryLight} />
              </View>
              <Text style={styles.attachOptionText}>{t('chat.attach_camera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.attachOption}
              onPress={() => handlePickImage("gallery")}
            >
              <View style={styles.attachOptionIcon}>
                <MaterialIcons name="photo-library" size={24} color={colors.primaryLight} />
              </View>
              <Text style={styles.attachOptionText}>{t('chat.attach_gallery')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Fullscreen image viewer */}
      <Modal
        visible={viewerImageUrl !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerImageUrl(null)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity
            style={[styles.imageViewerClose, { top: insets.top + spacing.md }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => setViewerImageUrl(null)}
          >
            <MaterialIcons name="close" size={28} color={colors.onMedia} />
          </TouchableOpacity>
          {viewerImageUrl && (
            <Image
              source={{ uri: viewerImageUrl }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Premium Modal */}
      <Modal
        visible={showPremiumModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPremiumModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('conversation.ai_limit_title')}</Text>
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

      {/* Profile Modal - Using reusable component */}
      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userId={otherUser?.userId || null}
      />

      {/* Safety Modal (Android) */}
      {/* Safety Modal */}
      <Modal
        visible={showSafetyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSafetyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('conversation.safety_title')}</Text>
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Engelle"
                onPress={() => {
                  console.log("Block button pressed");
                  setShowSafetyModal(false);
                  setTimeout(() => {
                    handleBlock();
                  }, 100);
                }}
                style={[styles.modalButton, styles.blockButton]}
              />
              <PrimaryButton
                title={t('safety.report')}
                onPress={() => {
                  setShowSafetyModal(false);
                  setTimeout(() => {
                    setSafetyReasonMode("report");
                  }, 100);
                }}
                style={styles.modalButton}
              />
              <PrimaryButton
                title={t('safety.leave_chat')}
                onPress={() => {
                  setShowSafetyModal(false);
                  setTimeout(() => {
                    setSafetyReasonMode("remove");
                  }, 100);
                }}
                style={[styles.modalButton, styles.leaveChatButton]}
              />
              <TouchableOpacity
                onPress={() => setShowSafetyModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </Modal>

      {/* Report / Remove-chat reason picker */}
      <LeaveReasonModal
        visible={safetyReasonMode !== null}
        mode={safetyReasonMode ?? "report"}
        displayName={otherUser?.displayName}
        onClose={() => setSafetyReasonMode(null)}
        onSubmit={handleSafetyReasonSubmit}
      />

      {/* Leave Conversation Modal */}
      {renderLeaveConversationModal()}
      <Reanimated.View style={keyboardSpacerStyle} />
    </View>
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
  emptyThread: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyThreadTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    textAlign: "center",
  },
  emptyThreadBody: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
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
  // Tam pirinc DEGIL.
  //
  // Bu ekranda pirinc su anda dort ise birden kosuyor: giden baloncuklar,
  // gonder ve mikrofon dugmeleri, baslik ve buz kirici cipler. En cok
  // tekrar eden oge (baloncuk) en parlak renkte olunca gercek denetimler
  // one cikamiyor. Derin pirinc kimligi koruyor, hiyerarsiyi geri veriyor.
  myMessageCard: {
    backgroundColor: colors.accentDark,
  },
  otherMessageCard: {
    backgroundColor: colors.backgroundSecondaryDark,
  },
  messageText: {
    fontSize: typography.fontSize.base,
  },
  myMessageText: {
    color: colors.text,
  },
  otherMessageText: {
    color: colors.textDark,
  },
  messageTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondaryDark,
    marginTop: 2,
    paddingHorizontal: spacing.xs,
  },
  typingIndicatorContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  typingIndicatorText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    fontStyle: "italic",
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.warning + "20",
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
  },
  icebreakerStrip: {
    maxHeight: 44,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
  },
  icebreakerStripContent: {
    gap: spacing.xs,
    // Inset both ends so the strip reads as a scrollable row rather than
    // chips sliced off by the screen edge.
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    alignItems: "center",
  },
  icebreakerChip: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryTintBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    maxWidth: 280,
  },
  icebreakerChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.primaryTintText,
  },
  hintText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
    backgroundColor: colors.backgroundSecondaryDark,
    gap: spacing.xs,
    alignItems: "flex-end",
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderDark,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
    minHeight: 40,
    maxHeight: 120,
    justifyContent: "center",
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  attachSheetOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  attachSheet: {
    backgroundColor: colors.backgroundSecondaryDark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderDark,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  attachOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  attachOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  attachOptionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
  },
  imageMessageContainer: {
    width: 220,
    height: 280,
    borderRadius: 18,
    borderWidth: 1,
  },
  imageMessage: {
    width: "100%",
    height: "100%",
  },
  myImageMessage: {
    borderColor: colors.primaryFaint,
  },
  otherImageMessage: {
    borderColor: colors.borderDark,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: colors.overlayStrong,
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerClose: {
    position: "absolute",
    right: spacing.md,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceTintStrong,
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerImage: {
    width: "100%",
    height: "80%",
  },
  input: {
    fontSize: typography.fontSize.base,
    color: colors.textDark,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: "center",
    maxHeight: 100,
  },
  aiButtonContainer: {
    position: "relative",
    marginLeft: spacing.xs,
  },
  aiButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  aiButtonActive: {
    backgroundColor: colors.primary,
  },
  aiButtonText: {
    fontSize: typography.fontSize.sm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.xs,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: typography.fontSize.lg,
    color: "#FFFFFF",
    fontWeight: typography.fontWeight.bold,
  },
  toneSelector: {
    position: "absolute",
    right: 44,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 20,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderDark,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 5,
    minWidth: 120,
  },
  toneSelectorStatic: {
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
    marginLeft: spacing.xs,
  },
  toneButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    justifyContent: "center",
    alignItems: "center",
  },
  toneButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toneButtonText: {
    fontSize: typography.fontSize.base,
  },
  toneButtonTextActive: {
    opacity: 1,
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.xs,
  },
  voiceButtonRecording: {
    backgroundColor: colors.error,
  },
  voiceButtonPressed: {
    opacity: 0.8,
  },
  voiceButtonInner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  voiceButtonText: {
    fontSize: typography.fontSize.base,
  },
  recordingIndicator: {
    position: "absolute",
    top: -30,
    left: -20,
    right: -20,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignItems: "center",
  },
  recordingDuration: {
    color: "#FFFFFF",
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  audioPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 160,
    paddingVertical: 4,
  },
  audioPlayerContainerOther: {
    // adjustments for received messages
  },
  audioPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  audioPlayButtonMy: {
    backgroundColor: "#FFFFFF",
  },
  audioPlayButtonOther: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  audioContent: {
    flex: 1,
    gap: 2,
  },
  audioWaveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
    gap: 3,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  audioTime: {
    fontSize: 11,
    fontWeight: "500",
  },
  audioTimeMy: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  audioTimeOther: {
    color: colors.textSecondary,
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
    backgroundColor: colors.warning,
  },
  leaveChatButton: {
    backgroundColor: colors.error,
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
  waitingScreenContainer: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  waitingScreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  waitingScreenHeaderTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  waitingScreenContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  waitingScreenPhotoContainer: {
    position: "relative",
    marginBottom: spacing.xl,
  },
  waitingScreenPhoto: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: colors.accent,
  },
  waitingScreenPhotoPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.backgroundDark,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: colors.accent,
  },
  waitingScreenPhotoPlaceholderText: {
    fontSize: typography.fontSize["4xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondary,
  },
  waitingScreenPhotoRing: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 108,
    borderWidth: 2,
    borderColor: colors.accent + "40",
  },
  waitingScreenName: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  waitingScreenCity: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  waitingScreenMessageBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: spacing.xl,
    maxWidth: 320,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accent + "30",
  },
  waitingScreenMessageText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  waitingScreenMessageSubtext: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
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
});
