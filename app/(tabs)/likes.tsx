import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Card } from "@/src/components/Card";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { getToken } from "@/src/services/authStore";
import { api } from "@/src/services/api";
import { AxiosError } from "axios";

type Like = {
  fromUserId: string;
  displayName: string;
  city: string | null;
  photos: string[];
  createdAt: string;
};

export default function LikesScreen() {
  const router = useRouter();
  const [likes, setLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState<{ count: number; blurred?: boolean } | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  const loadLikesData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/(auth)/welcome");
        return;
      }

      setLoading(true);

      // Always get count first
      const countData = await api.getIncomingLikesCount();
      setCount(countData);

      // Check if user is premium by trying to get full list
      try {
        const likesData = await api.getIncomingLikes();
        setLikes(likesData);
        setIsPremium(true);
      } catch (error) {
        if (error instanceof AxiosError && (error.response?.status === 403 || error.response?.status === 402)) {
          setIsPremium(false);
          setLikes([]);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("Failed to load likes:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadLikesData();
    }, [loadLikesData])
  );

  const handleGoToPremium = () => {
    router.push("/premium");
  };

  const renderLike = ({ item }: { item: Like }) => {
    return (
      <Card style={styles.likeCard}>
        <View style={styles.likeContent}>
          {item.photos && item.photos.length > 0 ? (
            <Image
              source={{ uri: item.photos[0] }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.likeInfo}>
            <Text style={styles.likeName}>{item.displayName}</Text>
            {item.city && <Text style={styles.likeCity}>{item.city}</Text>}
          </View>
        </View>
      </Card>
    );
  };

  const renderBlurredCard = ({ index }: { index: number }) => {
    return (
      <Card style={[styles.likeCard, styles.blurredCard]}>
        <View style={styles.likeContent}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>?</Text>
          </View>
          <View style={styles.likeInfo}>
            <Text style={styles.blurredText}>Someone liked you</Text>
            <Text style={styles.blurredSubtext}>Upgrade to see who</Text>
          </View>
        </View>
      </Card>
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

  if (!count || count.count === 0) {
    return (
      <SafeAreaView>
        <View style={styles.content}>
          <Text style={styles.title}>Likes</Text>
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>💔</Text>
            <Text style={styles.emptyTitle}>No likes yet</Text>
            <Text style={styles.emptyText}>
              Keep swiping and someone will{"\n"}
              like you soon! ✨
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (!isPremium) {
    return (
      <SafeAreaView>
        <View style={styles.content}>
          <Text style={styles.title}>Likes</Text>
          <View style={styles.countContainer}>
            <Text style={styles.countText}>
              {count.count} {count.count === 1 ? "person" : "people"} liked you
            </Text>
          </View>
          <FlatList
            data={Array(count.count).fill(null)}
            renderItem={({ index }) => renderBlurredCard({ index })}
            keyExtractor={(_, index) => `blurred-${index}`}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
          <View style={styles.ctaContainer}>
            <PrimaryButton
              title="Go Premium to See Who"
              onPress={handleGoToPremium}
              style={styles.premiumButton}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <View style={styles.content}>
        <Text style={styles.title}>Likes</Text>
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {likes.length} {likes.length === 1 ? "person" : "people"} liked you
          </Text>
        </View>
        <FlatList
          data={likes}
          renderItem={renderLike}
          keyExtractor={(item) => item.fromUserId}
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
  countContainer: {
    marginBottom: spacing.md,
  },
  countText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  listContent: {
    paddingBottom: spacing.md,
  },
  likeCard: {
    marginBottom: spacing.sm,
  },
  blurredCard: {
    opacity: 0.6,
  },
  likeContent: {
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
  likeInfo: {
    flex: 1,
  },
  likeName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  likeCity: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  blurredText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  blurredSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
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
  ctaContainer: {
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  premiumButton: {
    width: "100%",
  },
});

