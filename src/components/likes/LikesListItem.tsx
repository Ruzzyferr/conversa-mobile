import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Card } from "@/src/components/Card";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type LikesListItemProps = {
  userId: string;
  displayName: string;
  city: string | null;
  photos: string[];
  onPress?: (userId: string) => void;
  blurred?: boolean;
};

export function LikesListItem({
  userId,
  displayName,
  city,
  photos,
  onPress,
  blurred = false,
}: LikesListItemProps) {
  const Component = onPress ? TouchableOpacity : View;
  const pressProps = onPress ? { onPress: () => onPress(userId), activeOpacity: 0.7 } : {};

  return (
    <Component {...pressProps}>
      <Card style={[styles.card, blurred ? styles.blurredCard : undefined]}>
        <View style={styles.content}>
          {/* Avatar */}
          {photos && photos.length > 0 && !blurred ? (
            <Image
              source={{ uri: photos[0] }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, blurred ? styles.blurredAvatar : undefined]}>
              <Text style={styles.avatarText}>
                {blurred ? "?" : displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Info */}
          <View style={styles.info}>
            <View style={styles.headerRow}>
              <Text style={[styles.name, blurred ? styles.blurredText : undefined]} numberOfLines={1}>
                {blurred ? "Someone liked you" : displayName}
              </Text>
              {!blurred && (
                <View style={styles.likedTag}>
                  <Text style={styles.likedTagText}>Liked you</Text>
                </View>
              )}
            </View>
            
            {city && !blurred && (
              <Text style={styles.city} numberOfLines={1}>
                {city}
              </Text>
            )}
            {blurred && (
              <Text style={styles.blurredSubtext}>Upgrade to see who</Text>
            )}
          </View>
        </View>
      </Card>
    </Component>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  blurredCard: {
    opacity: 0.7,
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
  blurredAvatar: {
    backgroundColor: colors.textTertiary + "40",
    borderColor: colors.textTertiary + "60",
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
    gap: spacing.xs,
  },
  name: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  blurredText: {
    color: colors.textSecondary,
  },
  likedTag: {
    backgroundColor: colors.accent + "15",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  likedTagText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.accent,
  },
  city: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  blurredSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    fontStyle: "italic",
  },
});

