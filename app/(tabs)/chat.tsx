import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ChatListItem } from "@/src/components/chat/ChatListItem";
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

  const handleDiscoverPress = () => {
    router.push("/(tabs)/home");
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
        {conversations.length === 0 ? (
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
});
