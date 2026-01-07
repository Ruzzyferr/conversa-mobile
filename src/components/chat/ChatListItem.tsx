import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
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
  unreadCount?: number;
  isMyMessage?: boolean;
  onPress: (conversationId: string) => void;
};

export function ChatListItem({
  conversationId,
  otherUser,
  lastMessage,
  time,
  unread = false,
  unreadCount = 0,
  isMyMessage = false,
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

      if (diffMins < 1) return "Şimdi";
      if (diffMins < 60) return `${diffMins}d`;
      if (diffHours < 24) return `${diffHours}s`;
      if (diffDays < 7) return `${diffDays}g`;

      // Show date if older
      return date.toLocaleDateString("tr-TR", { month: "short", day: "numeric" });
    } catch {
      return null;
    }
  };

  return (
    <TouchableOpacity onPress={() => onPress(conversationId)} activeOpacity={0.7}>
      <View style={styles.container}>
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
              <Text style={[styles.time, unread && styles.timeUnread]}>{formatTime(time)}</Text>
            )}
          </View>

          <View style={styles.footerRow}>
            <Text
              style={[styles.lastMessage, unread && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {isMyMessage && <Text style={styles.senderPrefix}>Sen: </Text>}
              {lastMessage || <Text style={styles.placeholderText}>{otherUser.city || "Sohbete başla"}</Text>}
            </Text>
            {unread && unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
    backgroundColor: colors.backgroundDark,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.backgroundSecondaryDark,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  avatarText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  info: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    flex: 1,
    marginRight: spacing.xs,
  },
  nameUnread: {
    color: "#FFFFFF",
  },
  time: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondaryDark,
    fontWeight: typography.fontWeight.regular,
  },
  timeUnread: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    flex: 1,
    marginRight: spacing.xs,
    lineHeight: 20,
  },
  lastMessageUnread: {
    color: colors.textDark,
    fontWeight: typography.fontWeight.medium,
  },
  placeholderText: {
    fontStyle: "italic",
    opacity: 0.8,
  },
  senderPrefix: {
    color: colors.textDark,
    fontWeight: typography.fontWeight.medium,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: spacing.xs,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginLeft: spacing.xs,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
  },
});

