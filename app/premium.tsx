import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Card } from "@/src/components/Card";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { PremiumCard } from "@/src/components/PremiumCard";
import { usePremium } from "@/src/state/premium";
import {
  getOfferings,
  purchasePremium,
  restorePurchases,
  PurchasesPackage,
  PurchasesOffering,
} from "@/src/services/purchases";
import { api } from "@/src/services/api";
import { useRouter } from "expo-router";

export default function PremiumScreen() {
  const { premiumEnabled, refreshPremiumStatus } = usePremium();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      setLoading(true);
      
      // Get user ID for RevenueCat initialization
      let userId: string | undefined;
      try {
        const me = await api.getMe();
        userId = me.user.id;
      } catch (error) {
        console.error("Failed to get user info for RevenueCat:", error);
        // Continue anyway, getOfferings will try to initialize
      }
      
      const currentOffering = await getOfferings(userId);
      setOffering(currentOffering);

      // Auto-select monthly package if available
      if (currentOffering) {
        const monthlyPackage = currentOffering.availablePackages.find(
          (pkg) => pkg.packageType === "MONTHLY"
        );
        if (monthlyPackage) {
          setSelectedPackage(monthlyPackage);
        } else if (currentOffering.availablePackages.length > 0) {
          setSelectedPackage(currentOffering.availablePackages[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load offerings:", error);
      Alert.alert(
        "Error",
        "Failed to load premium packages. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg?: PurchasesPackage) => {
    const packageToPurchase = pkg || selectedPackage;
    if (!packageToPurchase) {
      Alert.alert("Error", "Please select a package");
      return;
    }

    try {
      setPurchasing(true);
      
      // Get user ID for RevenueCat initialization
      let userId: string | undefined;
      try {
        const me = await api.getMe();
        userId = me.user.id;
      } catch (error) {
        console.error("Failed to get user info for RevenueCat:", error);
      }
      
      const customerInfo = await purchasePremium(packageToPurchase, userId);
      
      // Check if purchase was successful
      const isPremium = customerInfo.entitlements.active["premium"] !== undefined;
      
      if (isPremium) {
        // Server will be updated via webhook automatically
        // Just refresh status from server (may take a moment for webhook to process)
        await refreshPremiumStatus();
        
        Alert.alert("Success", "Welcome to Premium! 🎉", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert("Error", "Purchase completed but premium not activated. Please contact support.");
      }
    } catch (error: any) {
      if (error.message === "Purchase cancelled") {
        // User cancelled, no need to show error
        return;
      }
      console.error("Purchase failed:", error);
      Alert.alert(
        "Purchase Failed",
        error.message || "Failed to complete purchase. Please try again."
      );
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setRestoring(true);
      
      // Get user ID for RevenueCat initialization
      let userId: string | undefined;
      try {
        const me = await api.getMe();
        userId = me.user.id;
      } catch (error) {
        console.error("Failed to get user info for RevenueCat:", error);
      }
      
      const customerInfo = await restorePurchases(userId);
      
      const isPremium = customerInfo.entitlements.active["premium"] !== undefined;
      
      if (isPremium) {
        // Server will be updated via webhook automatically
        // Just refresh status from server (may take a moment for webhook to process)
        await refreshPremiumStatus();
        
        Alert.alert("Success", "Purchases restored! 🎉", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert("Info", "No previous purchases found to restore.");
      }
    } catch (error) {
      console.error("Restore failed:", error);
      Alert.alert("Error", "Failed to restore purchases. Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  const formatPrice = (packageToFormat: PurchasesPackage): string => {
    return packageToFormat.product.priceString;
  };

  const getPackageLabel = (packageToFormat: PurchasesPackage): string => {
    switch (packageToFormat.packageType) {
      case "MONTHLY":
        return "Pro";
      case "ANNUAL":
        return "Pro Annual";
      case "WEEKLY":
        return "Pro Weekly";
      default:
        return "Pro";
    }
  };

  const getPackageSubtitle = (packageToFormat: PurchasesPackage): string => {
    return "Everything on Basic plus:";
  };

  const getPackageFeatures = (): string[] => {
    return [
      "Unlimited AI Polish",
      "Unlimited Messages",
      "Who Liked You",
      "Boost Profile",
      "Advanced Filters",
    ];
  };

  const extractPriceAndTime = (priceString: string): { price: string; time: string } => {
    // Try to extract price and time from price string
    // Format might be "$8.99/month" or "$8.99 / month" or "$8.99/mo"
    const match = priceString.match(/^([^/\s]+)(?:\s*\/\s*([^/\s]+))?/);
    if (match) {
      const price = match[1];
      const time = match[2] || "/ month";
      return { price, time: time.startsWith("/") ? time : `/${time}` };
    }
    return { price: priceString, time: "/ month" };
  };

  if (premiumEnabled) {
    return (
      <SafeAreaView edges={["bottom"]}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          <Card style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>Your Premium Benefits</Text>

            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🤖</Text>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Unlimited AI Polish</Text>
                <Text style={styles.benefitDescription}>
                  Polish your messages with AI unlimited times
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>💬</Text>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Unlimited Messages</Text>
                <Text style={styles.benefitDescription}>
                  Send as many messages as you want, no daily limits
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>👀</Text>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Who Liked You</Text>
                <Text style={styles.benefitDescription}>
                  See who liked your profile
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🚀</Text>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Boost</Text>
                <Text style={styles.benefitDescription}>
                  Boost your profile to get more visibility
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>⚙️</Text>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Advanced Filters</Text>
                <Text style={styles.benefitDescription}>
                  Exclude countries, verified only, recently active, minimum photos
                </Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <Card style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Premium Benefits</Text>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🤖</Text>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Unlimited AI Polish</Text>
              <Text style={styles.benefitDescription}>
                Polish your messages with AI unlimited times
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>💬</Text>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Unlimited Messages</Text>
              <Text style={styles.benefitDescription}>
                Send as many messages as you want, no daily limits
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>👀</Text>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Who Liked You</Text>
              <Text style={styles.benefitDescription}>
                See who liked your profile
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🚀</Text>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Boost</Text>
              <Text style={styles.benefitDescription}>
                Boost your profile to get more visibility
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>⚙️</Text>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Advanced Filters</Text>
              <Text style={styles.benefitDescription}>
                Exclude countries, verified only, recently active, minimum photos
              </Text>
            </View>
          </View>
        </Card>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading packages...</Text>
          </View>
        ) : offering && offering.availablePackages.length > 0 ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsContainer}
              style={styles.cardsScrollView}
            >
              {offering.availablePackages.map((pkg: PurchasesPackage) => {
                const { price, time } = extractPriceAndTime(formatPrice(pkg));
                return (
                  <PremiumCard
                    key={pkg.identifier}
                    title={getPackageLabel(pkg)}
                    price={price}
                    priceTime={time}
                    subtitle={getPackageSubtitle(pkg)}
                    features={getPackageFeatures()}
                    buttonText={purchasing ? "Processing..." : "Get pro now"}
                    onPress={() => {
                      setSelectedPackage(pkg);
                      handlePurchase(pkg);
                    }}
                    isSelected={selectedPackage?.identifier === pkg.identifier}
                    style={styles.premiumCard}
                  />
                );
              })}
            </ScrollView>

            <TouchableOpacity
              onPress={handleRestore}
              disabled={restoring}
              style={styles.restoreButton}
            >
              {restoring ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Text style={styles.restoreText}>Restore Purchases</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>
              Premium packages are not available at the moment. Please try again later.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize["4xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    textAlign: "center",
  },
  benefitsCard: {
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  benefitsTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.lg,
  },
  benefitItem: {
    flexDirection: "row",
    marginBottom: spacing.lg,
    alignItems: "flex-start",
  },
  benefitIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  benefitDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: "center",
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
  },
  cardsScrollView: {
    marginBottom: spacing.md,
  },
  cardsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  premiumCard: {
    marginRight: spacing.md,
  },
  errorCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.error + "20",
    borderColor: colors.error,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    textAlign: "center",
    lineHeight: 20,
  },
  restoreButton: {
    marginTop: spacing.md,
    padding: spacing.md,
    alignItems: "center",
  },
  restoreText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    textDecorationLine: "underline",
  },
});
