import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Card } from "@/src/components/Card";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LikesListItem } from "@/src/components/likes/LikesListItem";
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

  const handleLikePress = (userId: string) => {
    // Navigate to home screen to view this user's profile
    router.push("/(tabs)/home");
  };

  const handleImproveProfile = () => {
    router.push("/(tabs)/profile");
  };

  const subtitle = count 
    ? `${count.count} ${count.count === 1 ? "person" : "people"} liked you`
    : undefined;

  if (loading && !count) {
    return (
      <SafeAreaView>
        <View style={styles.container}>
          <ScreenHeader title="Likes" />
          <View style={styles.loadingContainer}>
            <EmptyState
              icon="💔"
              title="Loading..."
              description=""
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!count || count.count === 0) {
    return (
      <SafeAreaView>
        <View style={styles.container}>
          <ScreenHeader title="Likes" />
          <EmptyState
            icon="💔"
            title="No likes yet"
            description="Keep swiping and improving your profile to get more likes!"
            ctaText="Improve profile"
            onCtaPress={handleImproveProfile}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!isPremium) {
    return (
      <SafeAreaView>
        <View style={styles.container}>
          <ScreenHeader title="Likes" subtitle={subtitle} />
          <Card style={styles.premiumBanner}>
            <Text style={styles.premiumBannerTitle}>See Who Liked You</Text>
            <Text style={styles.premiumBannerText}>
              Upgrade to Premium to see all the people who liked your profile
            </Text>
            <PrimaryButton
              title="Go Premium"
              onPress={handleGoToPremium}
              style={styles.premiumButton}
            />
          </Card>
          <FlatList
            data={Array(count.count).fill(null)}
            renderItem={({ index }) => (
              <LikesListItem
                userId={`blurred-${index}`}
                displayName="Someone"
                city={null}
                photos={[]}
                blurred={true}
              />
            )}
            keyExtractor={(_, index) => `blurred-${index}`}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={loadLikesData}
                tintColor={colors.primary}
              />
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <View style={styles.container}>
        <ScreenHeader title="Likes" subtitle={subtitle} />
        <FlatList
          data={likes}
          renderItem={({ item }) => (
            <LikesListItem
              userId={item.fromUserId}
              displayName={item.displayName}
              city={item.city}
              photos={item.photos}
              onPress={handleLikePress}
              blurred={false}
            />
          )}
          keyExtractor={(item) => item.fromUserId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadLikesData}
              tintColor={colors.primary}
            />
          }
        />
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
  premiumBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.primary + "10",
    borderColor: colors.primary + "30",
  },
  premiumBannerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  premiumBannerText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  premiumButton: {
    marginTop: spacing.xs,
  },
});

