import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";

import { colors, spacing, radius, textStyles, elevation } from "@/src/theme";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { StatusModal } from "@/src/components/StatusModal";
import { Mark } from "@/src/components/brand/Mark";
import { CompareTable, CompareRow } from "@/src/components/premium/CompareTable";
import { PlanRow } from "@/src/components/premium/PlanRow";
import { usePremium } from "@/src/state/premium";
import {
  getOfferings,
  purchasePremium,
  restorePurchases,
  PurchasesPackage,
  PurchasesOffering,
} from "@/src/services/purchases";
import { api } from "@/src/services/api";
import { LEGAL_URLS } from "@/src/config/legal";

/**
 * Odeme ekrani.
 *
 * Eski hali bes maddelik bir avantaj listesi satiyordu ve maddeler urunle
 * uyusmuyordu: "Sinirsiz Mesaj" dogru degildi (gunluk yeni sohbet hakki
 * premiumda da ayni), "Boost" ise aboneligin degil ayri bir tuketilebilir
 * urunun ozelligi. Bir satis yuzeyindeki yanlis vaat yalnizca kotu metin
 * degil, yanlis beyandir.
 *
 * Yeni hali sunucudaki gercek haklardan (`billing/entitlements`) besleniyor,
 * hata payi birakmayacak sekilde iki sutunlu: su an ne var, premiumda ne
 * olur. Ayni yerde DEGISMEYENLERI de yaziyor -- satmadigimiz seyi
 * satmadigimizi soylemek, listeye bir madde daha eklemekten daha ikna edici.
 */

type Entitlements = Awaited<ReturnType<typeof api.getEntitlements>>["data"];

const WEEKLY_IDS = [
  "$rc_weekly",
  "conversa_plus_weekly",
  "conversa_premium_weekly:weekly-plan",
  "conversa_premium_weekly",
];
const MONTHLY_IDS = [
  "$rc_monthly",
  "conversa_plus_monthly",
  "conversa_premium_monthly:monthly-plan",
  "conversa_premium_monthly",
];

/**
 * Paket eslestirmesi RevenueCat kimlikleri, urun kimlikleri ve paket turu
 * arasinda degisebiliyor. Bu ucu de kontrol eden kontrol dort ayri yere
 * kopyalanmisti; tek yerde tutuluyor.
 */
const isWeekly = (p: PurchasesPackage) =>
  WEEKLY_IDS.includes(p.identifier) ||
  WEEKLY_IDS.includes(p.product.identifier) ||
  p.packageType === "WEEKLY";

const isMonthly = (p: PurchasesPackage) =>
  MONTHLY_IDS.includes(p.identifier) ||
  MONTHLY_IDS.includes(p.product.identifier) ||
  p.packageType === "MONTHLY";

export default function PremiumScreen() {
  const { t } = useTranslation();
  const { premiumEnabled, refreshPremiumStatus } = usePremium();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);

  const [statusVisible, setStatusVisible] = useState(false);
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");
  const [statusTitle, setStatusTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusButtonText, setStatusButtonText] = useState(t("common.ok"));
  const [statusAction, setStatusAction] = useState<(() => void) | undefined>(undefined);

  const showStatus = (
    type: "success" | "error" | "info",
    title: string,
    message: string,
    buttonText = t("common.ok"),
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

  const loadOfferings = useCallback(async () => {
    try {
      setLoading(true);

      let userId: string | undefined;
      try {
        const me = await api.getMe();
        userId = me.user.id;
      } catch (error) {
        console.error("Failed to get user info for RevenueCat:", error);
      }

      const currentOffering = await getOfferings(userId);
      setOffering(currentOffering);

      if (currentOffering) {
        const weekly = currentOffering.availablePackages.find(isWeekly);
        const monthly = currentOffering.availablePackages.find(isMonthly);
        // Aylik varsayilan: iki plan yan yana gorunurken varsayilanin daha
        // pahali haftalik olmasi, kullanicinin kendi lehine olan secimi
        // yapmasini bir adim zorlastirirdi.
        setSelectedPackage(monthly ?? weekly ?? null);
      }
    } catch (error: any) {
      console.error("Failed to load offerings:", error);
      if (error.code) {
        console.error(
          `RevenueCat Error Code: ${error.code}, Message: ${error.message}, UserInfo: ${JSON.stringify(error.userInfo)}`
        );
      }
      // Bilerek modal yok: asagidaki bos durum karti ayni cumleyi zaten
      // yaziyor ve tekrar dugmesini onunde bir kapatma adimi olmadan veriyor.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOfferings();
  }, [loadOfferings]);

  useEffect(() => {
    // Karsilastirma sayilari sunucudan. Basarisiz olursa ekran satis
    // yapmayi surdurur, yalnizca tablo gizlenir -- uydurma sayi
    // gostermektense hic gostermemek dogru.
    api
      .getEntitlements()
      .then((r) => setEntitlements(r.data))
      .catch((e) => console.error("Failed to load entitlements:", e));
  }, [premiumEnabled]);

  const handlePurchase = async (pkg?: PurchasesPackage) => {
    const packageToPurchase = pkg || selectedPackage;
    if (!packageToPurchase) {
      showStatus("info", t("premium.select_package_title"), t("premium.select_package_msg"));
      return;
    }

    try {
      setPurchasing(true);

      let userId: string | undefined;
      try {
        const me = await api.getMe();
        userId = me.user.id;
      } catch (error) {
        console.error("Failed to get user info for RevenueCat:", error);
      }

      const customerInfo = await purchasePremium(packageToPurchase, userId);
      const isPremium = customerInfo.entitlements.active["premium"] !== undefined;

      if (isPremium) {
        await refreshPremiumStatus();
        showStatus(
          "success",
          t("common.success"),
          t("premium.purchase_success_msg"),
          t("common.ok"),
          () => router.back()
        );
      } else {
        showStatus("error", t("common.error"), t("premium.purchase_incomplete"));
      }
    } catch (error: any) {
      if (error.message === "Purchase cancelled") {
        return;
      }
      console.error("Purchase failed:", error);
      showStatus(
        "error",
        t("premium.purchase_failed_title"),
        error.message || t("premium.purchase_failed_msg")
      );
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setRestoring(true);
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
          t("common.success"),
          t("premium.restore_success_msg"),
          t("common.ok"),
          () => router.back()
        );
      } else {
        showStatus("info", t("premium.restore_none_title"), t("premium.restore_none_msg"));
      }
    } catch (error) {
      console.error("Restore failed:", error);
      showStatus("error", t("common.error"), t("premium.restore_failed_msg"));
    } finally {
      setRestoring(false);
    }
  };

  const packageLabel = (p: PurchasesPackage): string => {
    if (isWeekly(p)) return t("premium.weekly");
    if (isMonthly(p)) return t("premium.monthly");
    switch (p.packageType) {
      case "ANNUAL":
        return t("premium.annual");
      case "LIFETIME":
        return t("premium.lifetime");
      default:
        return t("premium.pro");
    }
  };

  /**
   * "$8.99/month" ya da "$8.99" gelebiliyor. Donem etiketini magazanin
   * bicimlendirmesinden okumak yerine paket turunden uretiyoruz: magaza
   * dizesi yerellestirmeye gore degisiyor ve bazen hic donem icermiyor.
   */
  const priceOnly = (p: PurchasesPackage): string =>
    p.product.priceString.split("/")[0].trim();

  const periodLabel = (p: PurchasesPackage): string =>
    isWeekly(p) ? t("premium.per_week_short") : t("premium.per_month_short");

  const plans = (offering?.availablePackages ?? [])
    .filter((p) => isWeekly(p) || isMonthly(p))
    .sort((a, b) => (isWeekly(a) ? -1 : isWeekly(b) ? 1 : 0));

  /**
   * "En avantajli" rozeti aylik plana SABITLENMISTI. Bugun dogru olmasi
   * yarin dogru kalacagi anlamina gelmiyor: fiyatlar magazadan geliyor ve
   * ulkeye gore degisiyor. Haftaligi ayda 4,345 haftayla normallestirip
   * gercekten ucuz olani isaretliyoruz; esitlik ya da fiyat okunamama
   * durumunda hic rozet yok -- yanlis rozet, rozetsizlikten kotudur.
   */
  const bestValueId = React.useMemo(() => {
    const perMonth = plans.map((p) => {
      const n = Number(p.product.price);
      if (!Number.isFinite(n) || n <= 0) return null;
      return { id: p.identifier, cost: isWeekly(p) ? n * 4.345 : n };
    });
    if (perMonth.some((x) => x === null) || perMonth.length < 2) return null;
    const sorted = [...(perMonth as { id: string; cost: number }[])].sort(
      (a, b) => a.cost - b.cost
    );
    return sorted[0].cost < sorted[1].cost ? sorted[0].id : null;
  }, [plans]);

  // ---- Karsilastirma satirlari -------------------------------------------

  const perDay = (n: number | null) =>
    n === null ? t("premium.val_unlimited") : t("premium.val_per_day", { count: n });
  const perWeek = (n: number | null) =>
    n === null ? t("premium.val_unlimited") : t("premium.val_per_week", { count: n });

  const compareRows: CompareRow[] = React.useMemo(() => {
    // `premiumPreview` sunucudan geliyor ve uygulama sunucudan YENI olabilir
    // (kademeli dagitimda normal). Yoksa tabloyu gizliyoruz; ekranin geri
    // kalani satis yapmayi surdurur. Onceki hali burada dogrudan cokuyordu
    // ve odeme ekraninin tamamini goturuyordu.
    if (!entitlements?.premiumPreview) return [];
    const e = entitlements;
    const p = e.premiumPreview;

    const shared: CompareRow[] = [
      {
        label: t("premium.row_slots"),
        now: String(e.concurrencySlots),
        premium: String(p.concurrencySlots),
        unchanged: e.concurrencySlots === p.concurrencySlots,
      },
      {
        label: t("premium.row_daily"),
        now: String(e.dailyConversations),
        premium: String(p.dailyConversations),
        unchanged: e.dailyConversations === p.dailyConversations,
      },
      {
        label: t("premium.row_translate"),
        now: perDay(e.translationsPerDay),
        premium: perDay(p.translationsPerDay),
        unchanged: e.translationsPerDay === p.translationsPerDay,
      },
    ];

    if (e.track === "LANGUAGE") {
      return [
        ...shared,
        {
          label: t("premium.row_coach"),
          now: perDay(e.coachPerDay),
          premium: perDay(p.coachPerDay),
          unchanged: e.coachPerDay === p.coachPerDay,
        },
        {
          label: t("premium.row_sessions"),
          now: perWeek(e.sessionsPerWeek),
          premium: perWeek(p.sessionsPerWeek),
          unchanged: e.sessionsPerWeek === p.sessionsPerWeek,
        },
      ];
    }

    // DATE hattinda kesfi etkileyen iki hak var; bunlar sayisal degil
    // acik/kapali oldugu icin onizleme ucundan degil buradan geliyor.
    return [
      ...shared,
      {
        label: t("premium.row_who_liked"),
        now: e.isPremium ? t("premium.val_open") : t("premium.val_locked"),
        premium: t("premium.val_open"),
        unchanged: e.isPremium,
      },
      {
        label: t("premium.row_filters"),
        now: e.isPremium ? t("premium.val_open") : t("premium.val_locked"),
        premium: t("premium.val_open"),
        unchanged: e.isPremium,
      },
    ];
  }, [entitlements, t]);

  // ---- Parcalar -----------------------------------------------------------

  const hero = (
    <LinearGradient
      colors={[colors.premiumGradientStart, colors.accentDark, colors.background]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroMark}>
        <Mark size={30} color={colors.boostGold} />
      </View>
      <Text style={styles.heroTitle}>{t("premium.hero_title")}</Text>
      <Text style={styles.heroSub}>
        {premiumEnabled
          ? t("premium.hero_sub_active")
          : entitlements?.track === "LANGUAGE"
            ? t("premium.hero_sub_language")
            : t("premium.hero_sub_date")}
      </Text>
    </LinearGradient>
  );

  const comparison =
    compareRows.length > 0 ? (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("premium.compare_title")}</Text>
        <CompareTable
          rows={compareRows}
          nowLabel={t("premium.col_now")}
          premiumLabel={t("premium.col_premium")}
        />
      </View>
    ) : null;

  /**
   * Satmadiklarimiz.
   *
   * Bir odeme ekraninda bir seyi satmadigini yazmak sezgiye aykiri gorunuyor
   * ama bu urunun tum iddiasi burada: erisim degil ogrenme satiliyor. Bunu
   * soylememek, kullanicinin premiumdan sonra "hala gunde 10 sohbet mi?"
   * diye sormasina birakmak demek -- ve o soru satin aldiktan SONRA soruluyor.
   */
  const honesty = (
    <View style={styles.honesty}>
      <View style={styles.honestyHead}>
        <MaterialCommunityIcons
          name="shield-check-outline"
          size={18}
          color={colors.success}
        />
        <Text style={styles.honestyTitle}>{t("premium.honesty_title")}</Text>
      </View>
      <Text style={styles.honestyText}>{t("premium.honesty_daily")}</Text>
      <Text style={styles.honestyText}>{t("premium.honesty_corrections")}</Text>
    </View>
  );

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

  const legalLinks = (
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
  );

  /**
   * Geri yukleme ve zorunlu baglantilar HER durumda ekranda kalir: paketler
   * yuklenemediginde (incelemecinin sandbox hesabinda gordugu ekran) ve
   * kullanici zaten premiumken de. App Review 3.1.1 geri yukleme yolunun
   * ulasilabilir olmasini bekliyor.
   */
  const footer = (withDisclosure: boolean) => (
    <>
      {restoreButton}
      <View style={styles.legalBlock}>
        {withDisclosure && (
          <Text style={styles.legalText}>{t("premium.renewal_disclosure")}</Text>
        )}
        {legalLinks}
      </View>
    </>
  );

  // ---- Ekranlar -----------------------------------------------------------

  if (premiumEnabled) {
    return (
      <SafeAreaView edges={["bottom"]}>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {hero}
          <View style={styles.activeBanner}>
            <MaterialCommunityIcons name="check-decagram" size={20} color={colors.primary} />
            <Text style={styles.activeText}>{t("premium.active_title")}</Text>
          </View>
          {comparison}
          {honesty}
          <Text style={styles.manageHint}>{t("premium.manage_hint")}</Text>
          {footer(false)}
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
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {hero}
        {comparison}
        {honesty}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t("premium.loading_packages")}</Text>
          </View>
        ) : plans.length > 0 ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("premium.plans_title")}</Text>
              <View style={styles.planList}>
                {plans.map((p) => (
                  <PlanRow
                    key={p.identifier}
                    title={packageLabel(p)}
                    price={priceOnly(p)}
                    period={periodLabel(p)}
                    badge={p.identifier === bestValueId ? t("premium.plan_best") : undefined}
                    selected={selectedPackage?.identifier === p.identifier}
                    disabled={purchasing}
                    onPress={() => setSelectedPackage(p)}
                  />
                ))}
              </View>
            </View>

            <PrimaryButton
              title={
                purchasing
                  ? t("premium.processing")
                  : selectedPackage
                    ? t("premium.cta_subscribe", { plan: packageLabel(selectedPackage) })
                    : t("premium.cta_select")
              }
              onPress={() => handlePurchase()}
              loading={purchasing}
              disabled={!selectedPackage}
              style={styles.cta}
            />

            {footer(true)}
          </>
        ) : (
          <>
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{t("premium.not_available")}</Text>
              <TouchableOpacity
                onPress={loadOfferings}
                style={styles.retryButton}
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>{t("common.retry")}</Text>
              </TouchableOpacity>
            </View>
            {footer(false)}
          </>
        )}
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
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },

  hero: {
    borderRadius: radius["2xl"],
    padding: spacing.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.boostGoldBorder,
    ...elevation.md,
  },
  heroMark: {
    marginBottom: spacing.xs,
  },
  heroTitle: {
    ...textStyles.display,
    color: colors.onMedia,
  },
  heroSub: {
    ...textStyles.body,
    color: colors.onMediaSubtle,
  },

  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...textStyles.heading,
    color: colors.text,
  },

  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  activeText: {
    ...textStyles.label,
    color: colors.primaryTintText,
  },

  honesty: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  honestyHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  honestyTitle: {
    ...textStyles.label,
    color: colors.text,
  },
  honestyText: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },

  planList: {
    gap: spacing.sm,
  },
  cta: {
    marginTop: spacing.xs,
  },

  loadingContainer: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },

  // Paketlerin yuklenememesi beklenen ve duzeltilebilir bir durum (aginin
  // koptugu an, incelemecinin sandbox hesabi). Tam kirmizi cerceve bunu
  // alarm gibi okutuyordu; asil is Tekrar Dene dugmesinde.
  errorCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    alignItems: "center",
  },
  errorText: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignSelf: "center",
  },
  retryText: {
    ...textStyles.label,
    color: colors.primary,
  },

  manageHint: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textAlign: "center",
  },
  restoreButton: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  restoreText: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
  legalBlock: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  legalText: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textAlign: "center",
  },
  legalLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  legalLink: {
    ...textStyles.caption,
    color: colors.primary,
    textDecorationLine: "underline",
  },
  legalSeparator: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
});
