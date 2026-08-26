import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

/**
 * Persistent pass / favorite / like bar for the discovery deck.
 *
 * These controls previously sat at the bottom of the card's own ScrollView,
 * below the bio, interests, languages and every extra photo — so the app's
 * primary actions were invisible until the user scrolled several screens.
 * Every mainstream dating app keeps them pinned; so does this.
 */
type Props = {
  onPass: () => void;
  onFavorite: () => void;
  onLike: () => void;
  /** Remaining favorites for free users; hidden for premium. */
  favoritesRemaining?: number;
  isPremium?: boolean;
  disabled?: boolean;
};

export function DeckActionBar({
  onPass,
  onFavorite,
  onLike,
  favoritesRemaining,
  isPremium,
  disabled,
}: Props) {
  const { t } = useTranslation();
  // A red pill reading "0" over the Favorite button looked like an unread
  // counter that had gone wrong; it was actually telling the user they have no
  // favorites left. Zero is the lock state, not a count — the button already
  // opens the upsell — so the badge only appears when there is something to
  // count.
  const showBadge = !isPremium && (favoritesRemaining ?? 0) > 0;

  return (
    <View style={styles.row} pointerEvents={disabled ? "none" : "auto"}>
      <TouchableOpacity
        style={[styles.circle, styles.decline, disabled && styles.dimmed]}
        onPress={onPass}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t("a11y.pass")}
      >
        <MaterialIcons name="close" size={32} color={colors.passRed} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.circle, styles.overflowHidden, disabled && styles.dimmed]}
        onPress={onFavorite}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t("a11y.favorite")}
      >
        <LinearGradient colors={[colors.accent, colors.primary]} style={styles.gradient}>
          <MaterialIcons name="star" size={26} color={colors.onMedia} />
        </LinearGradient>
        {showBadge && (
          <View style={styles.badge} pointerEvents="none">
            <Text style={styles.badgeText}>{favoritesRemaining}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.circle, styles.overflowHidden, disabled && styles.dimmed]}
        onPress={onLike}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t("a11y.like")}
      >
        <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.gradient}>
          <MaterialIcons name="favorite" size={28} color={colors.onMedia} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const SIZE = 64;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    paddingVertical: spacing.md,
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  overflowHidden: {
    // The badge must escape the circle, so the gradient clips itself instead.
    overflow: "visible",
  },
  decline: {
    backgroundColor: colors.passRedSoft,
    borderWidth: 2,
    borderColor: colors.passRedBorder,
  },
  dimmed: {
    opacity: 0.4,
  },
  gradient: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: colors.backgroundDark,
    borderWidth: 2,
    borderColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: colors.textDark,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
});
