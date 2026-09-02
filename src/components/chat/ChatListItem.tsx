import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import i18n from "@/src/i18n";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { OptimizedImage } from "@/src/components/ui/OptimizedImage";

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

function ChatListItemBase({
  conversationId,
  otherUser,
  lastMessage,
  time,
  unread = false,
  unreadCount = 0,
  isMyMessage = false,
  onPress,
}: ChatListItemProps) {
  const { t } = useTranslation();
  const handlePress = useCallback(() => onPress(conversationId), [conversationId, onPress]);
  const formatTime = (timeString?: string) => {
    if (!timeString) return null;
    try {
      const date = new Date(timeString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      // These were hardcoded Turkish initials that also read as the wrong unit:
      // "46d" for 46 *dakika* is "46 days" to an English reader, and "s" for
      // saat is "seconds". Both the abbreviations and the date format now
      // follow the active language.
      if (diffMins < 1) return t("chat.time.now");
      if (diffMins < 60) return t("chat.time.minutes", { count: diffMins });
      if (diffHours < 24) return t("chat.time.hours", { count: diffHours });
      if (diffDays < 7) return t("chat.time.days", { count: diffDays });

      // Show date if older
      return date.toLocaleDateString(i18n.language || "en", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t("chat.open_conversation_with", { name: otherUser.displayName })}
    >
      <View style={styles.container}>
        {/* Avatar */}
        {otherUser.photos && otherUser.photos.length > 0 ? (
          <OptimizedImage
            source={{ uri: otherUser.photos[0] }}
            style={styles.avatar}
            containerStyle={styles.avatar}
            resizeMode="cover"
            fallbackIconSize={28}
            showLoader={false}
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
              {isMyMessage && <Text style={styles.senderPrefix}>{t("chat.you_prefix")}</Text>}
              {lastMessage || <Text style={styles.placeholderText}>{otherUser.city || t("chat.start_conversation")}</Text>}
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
      <View style={styles.divider} />
    </TouchableOpacity>
  );
}

export const ChatListItem = React.memo(ChatListItemBase, (prev, next) => {
  // Re-render only when message-row state actually changes
  return (
    prev.conversationId === next.conversationId &&
    prev.lastMessage === next.lastMessage &&
    prev.time === next.time &&
    prev.unread === next.unread &&
    prev.unreadCount === next.unreadCount &&
    prev.isMyMessage === next.isMyMessage &&
    prev.otherUser.displayName === next.otherUser.displayName &&
    prev.otherUser.photos[0] === next.otherUser.photos[0]
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundDark,
  },
  // Ayirici cizgi avatarin ALTINDAN da geciyordu ve satirlar birbirine
  // bitisik duruyordu. Cizgi metin sutununa hizalaninca liste "kutular"
  // yerine "kayitlar" gibi okunuyor; ayrica gozun satir basini bulmasi
  // kolaylasiyor.
  divider: {
    height: 1,
    backgroundColor: colors.borderMuted,
    marginLeft: spacing.md + 60 + spacing.md,
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
  // `textInverse` koyu murekkeptir (#14100A). Eski ACIK palette
  // "okunmamis = daha koyu, daha guclu" demekti; palet koyuya donunce ayni
  // deger ismi ARKA PLANLA ayni tona getirdi ve sohbet listesindeki her
  // okunmamis satirin ismi gorunmez oldu -- ustelik mesaj onizlemesi
  // parlak kalarak hiyerarsiyi tersine cevirdi. Gorsel incelemede
  // yakalandi.
  nameUnread: {
    color: colors.text,
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
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
  },
});

