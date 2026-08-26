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
import { StatusModal } from "@/src/components/StatusModal";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { LEGAL_URLS } from "@/src/config/legal";

/**
 * Paywall benefits. These were emoji glyphs rendered as text, which pick up
 * the platform emoji font and read as clip art on the single screen where the
 * app asks to be paid — the rest of the product uses the vector icon set.
 */
const BENEFITS = [
  { icon: "robot-happy-outline", titleKey: "premium.ai_polish_title", descKey: "premium.ai_polish_desc" },
  { icon: "message-text-outline", titleKey: "premium.messages_title", descKey: "premium.messages_desc" },
  { icon: "eye-outline", titleKey: "premium.who_liked_title", descKey: "premium.who_liked_desc" },
  { icon: "rocket-launch-outline", titleKey: "premium.boost_title", descKey: "premium.boost_desc" },
  { icon: "tune-variant", titleKey: "premium.filters_title", descKey: "premium.filters_desc" },
] as const;

export default function PremiumScreen() {
  const { t } = useTranslation();
  const { premiumEnabled, refreshPremiumStatus } = usePremium();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);

  // Status Modal State
  const [statusVisible, setStatusVisible] = useState(false);
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");
  const [statusTitle, setStatusTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusButtonText, setStatusButtonText] = useState(t('common.ok'));
  const [statusAction, setStatusAction] = useState<(() => void) | undefined>(undefined);

  const showStatus = (
    type: "success" | "error" | "info",
    title: string,
    message: string,
    buttonText = t('common.ok'),
    action?: () => void
  ) => {
    setStatusType(type);
    setStatusTitle(title);
    setStatusMessage(message);
    setStatusButtonText(buttonText);
    setStatusAction(() => action);
    setStatusVisible(true);
  };

  const handleStatusClose = () => {
    setStatusVisible(false);
    if (statusAction) {
      statusAction();
      setStatusAction(undefined);
    }
  };

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

      // Auto-select WEEKLY package if available, otherwise MONTHLY
      if (currentOffering) {
        // Match RevenueCat package identifiers
        const weeklyPackage = currentOffering.availablePackages.find(
          (pkg) =>
            pkg.identifier === "$rc_weekly" ||
            pkg.identifier === "conversa_plus_weekly" ||
            pkg.product.identifier === "conversa_premium_weekly:weekly-plan" ||
            pkg.product.identifier === "conversa_premium_weekly" ||
            pkg.packageType === "WEEKLY"
        );
        const monthlyPackage = currentOffering.availablePackages.find(
          (pkg) =>
            pkg.identifier === "$rc_monthly" ||
            pkg.identifier === "conversa_plus_monthly" ||
            pkg.product.identifier === "conversa_premium_monthly:monthly-plan" ||
            pkg.product.identifier === "conversa_premium_monthly" ||
            pkg.packageType === "MONTHLY"
        );

        if (weeklyPackage) {
          setSelectedPackage(weeklyPackage);
        } else if (monthlyPackage) {
          setSelectedPackage(monthlyPackage);
        }
        // Do not auto-select other types since we filter them out in UI
      }
    } catch (error: any) {
      console.error("Failed to load offerings:", error);
      // Log specific RevenueCat details if available
      if (error.code) {
        console.error(`RevenueCat Error Code: ${error.code}, Message: ${error.message}, UserInfo: ${JSON.stringify(error.userInfo)}`);
      }
      // No modal here on purpose. The empty-state card below already renders
      // `premium.not_available` together with a Retry button and the legal
      // links, so raising a blocking dialog printed the same sentence twice
      // and put a dismiss step in front of the retry.
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg?: PurchasesPackage) => {
    // ... (existing handlePurchase code)
    const packageToPurchase = pkg || selectedPackage;
    if (!packageToPurchase) {
      showStatus("info", t('premium.select_package_title'), t('premium.select_package_msg'));
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

        showStatus(
          "success",
          t('common.success'),
          t('premium.purchase_success_msg'),
          t('common.ok'),
          () => router.back()
        );
      } else {
        showStatus(
          "error",
          t('common.error'),
          t('premium.purchase_incomplete')
        );
      }
    } catch (error: any) {
      if (error.message === "Purchase cancelled") {
        return;
      }
      console.error("Purchase failed:", error);
      showStatus(
        "error",
        t('premium.purchase_failed_title'),
        error.message || t('premium.purchase_failed_msg')
      );
    } finally {
      setPurchasing(false);
    }
  };

  // ... (handleRestore code logic remains similar but localized) ...

  const handleRestore = async () => {
    try {
      setRestoring(true);
      // ... (get user id logic) ...
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
        await refreshPremiumStatus();
        showStatus(
          "success",
          t('common.success'),
          t('premium.restore_success_msg'),
          t('common.ok'),
          () => router.back()
        );
      } else {
        showStatus(
          "info",
          t('premium.restore_none_title'),
          t('premium.restore_none_msg')
        );
      }
    } catch (error) {
      console.error("Restore failed:", error);
      showStatus("error", t('common.error'), t('premium.restore_failed_msg'));
    } finally {
      setRestoring(false);
    }
  };

  const formatPrice = (packageToFormat: PurchasesPackage): string => {
    return packageToFormat.product.priceString;
  };

  const getPackageLabel = (packageToFormat: PurchasesPackage): string => {
    // Match RevenueCat package identifiers
    if (
      packageToFormat.identifier === "$rc_weekly" ||
      packageToFormat.identifier === "conversa_plus_weekly" ||
      packageToFormat.product.identifier === "conversa_premium_weekly:weekly-plan" ||
      packageToFormat.product.identifier === "conversa_premium_weekly"
    ) return t("premium.weekly");
    
    if (
      packageToFormat.identifier === "$rc_monthly" ||
      packageToFormat.identifier === "conversa_plus_monthly" ||
      packageToFormat.product.identifier === "conversa_premium_monthly:monthly-plan" ||
      packageToFormat.product.identifier === "conversa_premium_monthly"
    ) return t("premium.monthly");

    switch (packageToFormat.packageType) {
      case "WEEKLY":
        return t("premium.weekly");
      case "MONTHLY":
        return t("premium.monthly");
      case "ANNUAL":
        return t("premium.annual");
      case "LIFETIME":
        return t("premium.lifetime");
      default:
        return t("premium.pro");
    }
  };

  const getPackageSubtitle = (packageToFormat: PurchasesPackage): string => {
    return t('premium.subtitle');
  };

  const getPackageFeatures = (): string[] => {
    return [
      t('premium.ai_polish_title'),
      t('premium.messages_title'),
      t('premium.who_liked_title'),
      t('premium.boost_profile'),
      t('premium.filters_title'),
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

  /**
   * Restore + the required legal links.
   *
   * "Restore Purchases" used to live INSIDE the branch that renders the
   * packages, so the two situations where it matters most had no restore
   * button at all: when the offerings call fails (the screen a reviewer sees
   * on a sandbox account, and what a paying user gets after a reinstall on a
   * flaky connection), and when the user already has premium. App Review
   * guideline 3.1.1 expects a restore mechanism to be reachable, and a
   * subscriber needs a way back to their subscription.
   */
  const restoreButton = (
    <TouchableOpacity
      onPress={handleRestore}
      disabled={restoring}
      style={styles.restoreButton}
      accessibilityRole="button"
    >
      {restoring ? (
        <ActivityIndicator size="small" color={colors.textSecondary} />
      ) : (
        <Text style={styles.restoreText}>{t("premium.restore")}</Text>
      )}
    </TouchableOpacity>
  );

  const restoreAndLegal = (
    <>
      {restoreButton}
      <View style={styles.legalBlock}>
        <View style={styles.legalLinks}>
          <TouchableOpacity
            onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}
            accessibilityRole="link"
          >
            <Text style={styles.legalLink}>{t("premium.terms")}</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>·</Text>
          <TouchableOpacity
            onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)}
            accessibilityRole="link"
          >
            <Text style={styles.legalLink}>{t("premium.privacy")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  if (premiumEnabled) {
    return (
      <SafeAreaView edges={["bottom"]}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          <Card style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>{t("premium.benefits_title_active")}</Text>

            {BENEFITS.map(({ icon, titleKey, descKey }) => (
              <View style={styles.benefitItem} key={titleKey}>
                <View style={styles.benefitIconWrap}>
                  <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>{t(titleKey)}</Text>
                  <Text style={styles.benefitDescription}>{t(descKey)}</Text>
                </View>
              </View>
            ))}
          </Card>

          {restoreAndLegal}
        </ScrollView>
        <StatusModal
          visible={statusVisible}
          type={statusType}
          title={statusTitle}
          message={statusMessage}
          buttonText={statusButtonText}
          onClose={handleStatusClose}
        />
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
          <Text style={styles.benefitsTitle}>{t("premium.benefits_title")}</Text>

          {BENEFITS.map(({ icon, titleKey, descKey }) => (
            <View style={styles.benefitItem} key={titleKey}>
              <View style={styles.benefitIconWrap}>
                <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>{t(titleKey)}</Text>
                <Text style={styles.benefitDescription}>{t(descKey)}</Text>
              </View>
            </View>
          ))}
        </Card>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t("premium.loading_packages")}</Text>
          </View>
        ) : offering && offering.availablePackages.length > 0 ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsContainer}
              style={styles.cardsScrollView}
            >
              {offering.availablePackages
                .filter(
                  (pkg) =>
                    pkg.identifier === "$rc_weekly" ||
                    pkg.identifier === "$rc_monthly" ||
                    pkg.identifier === "conversa_plus_weekly" ||
                    pkg.identifier === "conversa_plus_monthly" ||
                    pkg.product.identifier === "conversa_premium_weekly:weekly-plan" ||
                    pkg.product.identifier === "conversa_premium_weekly" ||
                    pkg.product.identifier === "conversa_premium_monthly:monthly-plan" ||
                    pkg.product.identifier === "conversa_premium_monthly" ||
                    pkg.packageType === "WEEKLY" ||
                    pkg.packageType === "MONTHLY"
                )
                .sort((a, b) => {
                  // Weekly first, then Monthly
                  const isAWeekly =
                    a.identifier === "$rc_weekly" ||
                    a.identifier === "conversa_plus_weekly" ||
                    a.product.identifier === "conversa_premium_weekly:weekly-plan" ||
                    a.product.identifier === "conversa_premium_weekly" ||
                    a.packageType === "WEEKLY";
                  const isBWeekly =
                    b.identifier === "$rc_weekly" ||
                    b.identifier === "conversa_plus_weekly" ||
                    b.product.identifier === "conversa_premium_weekly:weekly-plan" ||
                    b.product.identifier === "conversa_premium_weekly" ||
                    b.packageType === "WEEKLY";
                  if (isAWeekly) return -1;
                  if (isBWeekly) return 1;
                  return 0;
                })
                .map((pkg: PurchasesPackage) => {
                  const { price, time } = extractPriceAndTime(formatPrice(pkg));
                  return (
                    <PremiumCard
                      key={pkg.identifier}
                      title={getPackageLabel(pkg)}
                      price={price}
                      priceTime={time}
                      subtitle={getPackageSubtitle(pkg)}
                      features={getPackageFeatures()}
                      buttonText={purchasing ? t("premium.processing") : t("premium.get_pro")}
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

            {restoreButton}

            {/*
              Required on any screen selling an auto-renewable subscription:
              renewal terms plus working links to the Terms of Use and Privacy
              Policy (App Store Review Guideline 3.1.2 / Play subscription
              policy). Their absence is a routine rejection reason.
            */}
            <View style={styles.legalBlock}>
              <Text style={styles.legalText}>{t("premium.renewal_disclosure")}</Text>
              <View style={styles.legalLinks}>
                <TouchableOpacity
                  onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}
                  accessibilityRole="link"
                >
                  <Text style={styles.legalLink}>{t("premium.terms")}</Text>
                </TouchableOpacity>
                <Text style={styles.legalSeparator}>·</Text>
                <TouchableOpacity
                  onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)}
                  accessibilityRole="link"
                >
                  <Text style={styles.legalLink}>{t("premium.privacy")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>
              {t("premium.not_available")}
            </Text>
            <TouchableOpacity
              onPress={loadOfferings}
              style={styles.retryButton}
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>{t("common.retry")}</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/*
          Restore, Terms and Privacy stay on the screen even when the packages
          fail to load: somebody who already paid must still be able to get
          their entitlement back, and the required links must never be missing
          from a purchase surface.
        */}
        {!loading && !(offering && offering.availablePackages.length > 0) && restoreAndLegal}
      </ScrollView>
      <StatusModal
        visible={statusVisible}
        type={statusType}
        title={statusTitle}
        message={statusMessage}
        buttonText={statusButtonText}
        onClose={handleStatusClose}
      />
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
  benefitIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  retryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    alignSelf: "center",
  },
  retryText: {
    color: colors.primary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  legalBlock: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    gap: spacing.sm,
  },
  legalText: {
    fontSize: typography.fontSize.xs,
    lineHeight: 18,
    color: colors.textSecondaryDark,
    textAlign: "center",
  },
  legalLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  legalLink: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    textDecorationLine: "underline",
  },
  legalSeparator: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondaryDark,
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
