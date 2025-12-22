import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Card } from "@/src/components/Card";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type ChatListItemProps = {
  conversationId: string;
  otherUser: {
    userId: string;
    displayName: string;
    photos: string[];
    city: string | null;
  };
  lastMessage?: string;
  time?: string;
  unread?: boolean;
  onPress: (conversationId: string) => void;
};

export function ChatListItem({
  conversationId,
  otherUser,
  lastMessage,
  time,
  unread = false,
  onPress,
}: ChatListItemProps) {
  const formatTime = (timeString?: string) => {
    if (!timeString) return null;
    try {
      const date = new Date(timeString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "now";
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      
      // Show date if older
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return null;
    }
  };

  return (
    <TouchableOpacity onPress={() => onPress(conversationId)} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.content}>
          {/* Avatar */}
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

          {/* Info */}
          <View style={styles.info}>
            <View style={styles.headerRow}>
              <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>
                {otherUser.displayName}
              </Text>
              {time && (
                <Text style={styles.time}>{formatTime(time)}</Text>
              )}
            </View>
            
            <View style={styles.footerRow}>
              {lastMessage ? (
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {lastMessage}
                </Text>
              ) : (
                <Text style={styles.lastMessagePlaceholder}>
                  {otherUser.city || "Start a conversation"}
                </Text>
              )}
              {unread && <View style={styles.unreadDot} />}
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary + "40",
  },
  avatarText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs / 2,
  },
  name: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.xs,
  },
  nameUnread: {
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  time: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.xs,
  },
  lastMessagePlaceholder: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    fontStyle: "italic",
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});

