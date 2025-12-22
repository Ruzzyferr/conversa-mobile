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
      const currentOffering = await getOfferings();
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

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert("Error", "Please select a package");
      return;
    }

    try {
      setPurchasing(true);
      const customerInfo = await purchasePremium(selectedPackage);
      
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
      const customerInfo = await restorePurchases();
      
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
        return "Monthly";
      case "ANNUAL":
        return "Annual";
      case "WEEKLY":
        return "Weekly";
      default:
        return packageToFormat.identifier;
    }
  };

  if (premiumEnabled) {
    return (
      <SafeAreaView>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.header}>
            <Text style={styles.emoji}>✨</Text>
            <Text style={styles.title}>You're Premium!</Text>
            <Text style={styles.subtitle}>
              Thank you for supporting Swiip
            </Text>
          </View>

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
    <SafeAreaView>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={styles.emoji}>✨</Text>
          <Text style={styles.title}>Swiip Premium</Text>
          <Text style={styles.subtitle}>
            Unlock unlimited features and better experience
          </Text>
        </View>

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
          <Card style={styles.packagesCard}>
            <Text style={styles.packagesTitle}>Choose Your Plan</Text>
            {offering.availablePackages.map((pkg) => (
              <TouchableOpacity
                key={pkg.identifier}
                style={[
                  styles.packageOption,
                  selectedPackage?.identifier === pkg.identifier &&
                    styles.packageOptionSelected,
                ]}
                onPress={() => setSelectedPackage(pkg)}
              >
                <View style={styles.packageInfo}>
                  <Text style={styles.packageLabel}>{getPackageLabel(pkg)}</Text>
                  <Text style={styles.packagePrice}>{formatPrice(pkg)}</Text>
                </View>
                {selectedPackage?.identifier === pkg.identifier && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </Card>
        ) : (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>
              Premium packages are not available at the moment. Please try again later.
            </Text>
          </Card>
        )}

        {offering && offering.availablePackages.length > 0 && (
          <>
            <PrimaryButton
              title={purchasing ? "Processing..." : "Go Premium"}
              onPress={handlePurchase}
              disabled={purchasing || !selectedPackage}
              style={styles.premiumButton}
            />

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
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
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
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: "center",
  },
  benefitsCard: {
    marginBottom: spacing.md,
  },
  benefitsTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
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
    color: colors.text,
    marginBottom: spacing.xs,
  },
  benefitDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: "center",
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  packagesCard: {
    marginBottom: spacing.md,
  },
  packagesTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  packageOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  packageOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "20",
  },
  packageInfo: {
    flex: 1,
  },
  packageLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  packagePrice: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  checkmark: {
    fontSize: typography.fontSize.xl,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
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
  premiumButton: {
    marginTop: spacing.sm,
  },
  restoreButton: {
    marginTop: spacing.md,
    padding: spacing.md,
    alignItems: "center",
  },
  restoreText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
});
