import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Card } from "@/src/components/Card";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { getToken } from "@/src/services/authStore";
import { api } from "@/src/services/api";

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

export default function ChatScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/(auth)/welcome");
        return;
      }

      setLoading(true);
      const data = await api.getConversations();
      // Filter out conversations without conversationId (shouldn't happen, but just in case)
      setConversations(data.filter((c) => c.conversationId !== null) as Conversation[]);
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

  const renderConversation = ({ item }: { item: Conversation }) => {
    const { otherUser, conversationId } = item;

    if (!conversationId) return null;

    return (
      <TouchableOpacity
        onPress={() => handleConversationPress(conversationId)}
        activeOpacity={0.7}
      >
        <Card style={styles.conversationCard}>
          <View style={styles.conversationContent}>
            {otherUser.photos && otherUser.photos.length > 0 ? (
              <Image
                source={{ uri: otherUser.photos[0] }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {otherUser.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.conversationInfo}>
              <Text style={styles.conversationName}>
                {otherUser.displayName}
              </Text>
              {otherUser.city && (
                <Text style={styles.conversationCity}>{otherUser.city}</Text>
              )}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView>
        <View style={styles.content}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (conversations.length === 0) {
    return (
      <SafeAreaView>
        <View style={styles.content}>
          <Text style={styles.title}>Chat</Text>
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>Henüz konuşma yok</Text>
            <Text style={styles.emptyText}>
              Eşleştiğin kişilerle burada{"\n"}
              sohbet edebilirsin!{"\n\n"}
              Keşfet sayfasına gidip{"\n"}
              beğenmeye başla ✨
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <View style={styles.content}>
        <Text style={styles.title}>Chat</Text>
        <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.matchId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: spacing.md,
  },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
    paddingTop: spacing.md,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  listContent: {
    paddingBottom: spacing.md,
  },
  conversationCard: {
    marginBottom: spacing.sm,
  },
  conversationContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.text,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  conversationCity: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
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
    lineHeight: 24,
  },
});
