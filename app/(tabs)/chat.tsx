import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ChatListItem } from "@/src/components/chat/ChatListItem";
import { Card } from "@/src/components/Card";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { getToken } from "@/src/services/authStore";
import { api } from "@/src/services/api";
import { AxiosError } from "axios";

type Conversation = {
  conversationId: string | null;
  matchId: string;
  otherUser: {
    userId: string;
    displayName: string;
    photos: string[];
    city: string | null;
  };
  createdAt: string;
};

type ChatRequest = {
  requestId: string;
  fromUserId: string;
  createdAt: string;
  fromUser: {
    userId: string;
    displayName: string;
    photos: string[];
    city: string | null;
  };
  firstMessage: {
    id: string;
    text: string;
    createdAt: string;
  } | null;
};

export default function ChatScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingToRequestId, setReplyingToRequestId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const loadConversations = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/(auth)/welcome");
        return;
      }

      setLoading(true);
      const [conversationsData, requestsData] = await Promise.all([
        api.getConversations(),
        api.getChatRequests(),
      ]);
      
      // Filter out conversations without conversationId (shouldn't happen, but just in case)
      setConversations(conversationsData.filter((c) => c.conversationId !== null) as Conversation[]);
      setChatRequests(requestsData);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Reload conversations every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const handleConversationPress = (conversationId: string) => {
    router.push(`/conversation/${conversationId}`);
  };

  const handleDiscoverPress = () => {
    router.push("/(tabs)/home");
  };

  const handleReply = async (requestId: string) => {
    if (replyText.trim().length === 0) {
      Alert.alert("Uyarı", "Lütfen bir mesaj yazın");
      return;
    }

    try {
      const result = await api.replyToRequest(requestId, replyText.trim());
      setReplyingToRequestId(null);
      setReplyText("");
      
      // Navigate to conversation
      router.push(`/conversation/${result.conversationId}`);
      
      // Reload conversations
      await loadConversations();
    } catch (error: any) {
      let errorMessage = error instanceof Error ? error.message : "Mesaj gönderilemedi";
      
      // Check for first message restriction errors
      if (error instanceof AxiosError) {
        const errorData = error.response?.data?.error;
        const code = errorData?.code;
        const message = errorData?.message || errorMessage;
        
        if (code === "FIRST_MESSAGE_RESTRICTED" || code === "MALE_CANNOT_SEND_FIRST_MESSAGE" || message.toLowerCase().includes("kadın") || message.toLowerCase().includes("first message")) {
          errorMessage = "Bu eşleşmede ilk mesajı kadın tarafı göndermelidir. Lütfen karşı tarafın ilk mesajı göndermesini bekleyin.";
        } else {
          errorMessage = message;
        }
      }
      
      Alert.alert("Hata", errorMessage);
    }
  };

  const handleAcceptRequest = async (requestId: string, fromUserId: string) => {
    try {
      const result = await api.acceptRequest(fromUserId);
      
      if (result.conversationId) {
        router.push(`/conversation/${result.conversationId}`);
      }
      
      // Reload conversations
      await loadConversations();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "İstek kabul edilemedi";
      Alert.alert("Hata", message);
    }
  };

  const subtitle = conversations.length > 0 
    ? `${conversations.length} ${conversations.length === 1 ? "conversation" : "conversations"}`
    : undefined;

  if (loading && conversations.length === 0) {
    return (
      <SafeAreaView>
        <View style={styles.container}>
          <ScreenHeader title="Chat" />
          <View style={styles.loadingContainer}>
            <EmptyState
              icon="💬"
              title="Loading..."
              description=""
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <View style={styles.container}>
        <ScreenHeader 
          title="Chat" 
          subtitle={subtitle}
        />
        
        {/* Requests Section */}
        {chatRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <Text style={styles.requestsSectionTitle}>İstekler</Text>
            <FlatList
              data={chatRequests}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.requestsList}
              renderItem={({ item }) => (
                <Card style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    {item.fromUser.photos && item.fromUser.photos.length > 0 ? (
                      <Image
                        source={{ uri: item.fromUser.photos[0] }}
                        style={styles.requestAvatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.requestAvatarPlaceholder}>
                        <Text style={styles.requestAvatarText}>
                          {item.fromUser.displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.requestUserInfo}>
                      <Text style={styles.requestUserName}>{item.fromUser.displayName}</Text>
                      {item.fromUser.city && (
                        <Text style={styles.requestUserCity}>📍 {item.fromUser.city}</Text>
                      )}
                    </View>
                  </View>
                  {item.firstMessage && (
                    <Text style={styles.requestMessage} numberOfLines={3}>
                      {item.firstMessage.text}
                    </Text>
                  )}
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.requestActionButton, styles.replyButton]}
                      onPress={() => setReplyingToRequestId(item.requestId)}
                    >
                      <Text style={styles.replyButtonText}>Cevapla</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.requestActionButton, styles.acceptButton]}
                      onPress={() => handleAcceptRequest(item.requestId, item.fromUserId)}
                    >
                      <Text style={styles.acceptButtonText}>Kabul Et</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              )}
              keyExtractor={(item) => item.requestId}
            />
          </View>
        )}

        {conversations.length === 0 && chatRequests.length === 0 ? (
          <EmptyState
            icon="💬"
            title="No conversations yet"
            description="Start swiping and match with people to begin chatting!"
            ctaText="Discover people"
            onCtaPress={handleDiscoverPress}
          />
        ) : (
          <FlatList
            data={conversations}
            renderItem={({ item }) => (
              <ChatListItem
                conversationId={item.conversationId!}
                otherUser={item.otherUser}
                onPress={handleConversationPress}
              />
            )}
            keyExtractor={(item) => item.matchId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={loadConversations}
                tintColor={colors.primary}
              />
            }
          />
        )}

        {/* Reply Modal */}
        <Modal
          visible={replyingToRequestId !== null}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setReplyingToRequestId(null);
            setReplyText("");
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Cevapla</Text>
              <TextInput
                style={styles.replyInput}
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Mesajınızı yazın..."
                placeholderTextColor={colors.textSecondaryDark}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={styles.charCount}>
                {replyText.length}/2000
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setReplyingToRequestId(null);
                    setReplyText("");
                  }}
                >
                  <Text style={styles.modalButtonCancelText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalButtonConfirm,
                    replyText.trim().length === 0 && styles.modalButtonDisabled,
                  ]}
                  onPress={() => replyingToRequestId && handleReply(replyingToRequestId)}
                  disabled={replyText.trim().length === 0}
                >
                  <Text style={styles.modalButtonConfirmText}>Gönder</Text>
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
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
  },
  requestsSection: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  requestsSectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  requestsList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  requestCard: {
    width: 280,
    padding: spacing.md,
    marginRight: spacing.sm,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  requestAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  requestAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  requestAvatarText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: "#FFFFFF",
  },
  requestUserInfo: {
    flex: 1,
  },
  requestUserName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
    marginBottom: spacing.xs / 2,
  },
  requestUserCity: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondaryDark,
  },
  requestMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  requestActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  requestActionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: "center",
  },
  replyButton: {
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  replyButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  acceptButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: "#FFFFFF",
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
  replyInput: {
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
  charCount: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondaryDark,
    textAlign: "right",
    marginBottom: spacing.md,
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
    backgroundColor: colors.primary,
  },
  modalButtonDisabled: {
    opacity: 0.5,
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
});
