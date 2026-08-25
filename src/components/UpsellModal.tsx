import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { PurchasesPackage } from "react-native-purchases";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { getOfferings, purchasePremium } from "@/src/services/purchases";
import { api } from "@/src/services/api";

export type UpsellVariant = "premium" | "boost" | "favorite" | "whoLiked";

type UpsellModalProps = {
  visible: boolean;
  variant: UpsellVariant;
  onClose: () => void;
  /** Called after a successful pack purchase (boost/favorite variants). */
  onPurchased?: () => void;
};

const VARIANT_ICON: Record<UpsellVariant, keyof typeof Ionicons.glyphMap> = {
  premium: "diamond",
  boost: "rocket",
  favorite: "star",
  whoLiked: "heart",
};

const PACK_PRODUCT: Partial<Record<UpsellVariant, string>> = {
  boost: "conversa_boost_2pack",
  favorite: "conversa_favorite_5pack",
};

export function UpsellModal({ visible, variant, onClose, onPurchased }: UpsellModalProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [pack, setPack] = useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const packProductId = PACK_PRODUCT[variant];

  useEffect(() => {
    if (!visible || !packProductId) return;
    let cancelled = false;
    (async () => {
      try {
        const offerings = await getOfferings();
        const found = offerings?.availablePackages.find(
          (p) => p.identifier === packProductId || p.product.identifier === packProductId
        );
        if (!cancelled) setPack(found || null);
      } catch {
        // Offerings unavailable (e.g. store not ready) — pack button just hides
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, packProductId]);

  const features: string[] = t(`upsell.${variant}.features`, { returnObjects: true }) as string[];

  const handlePremium = () => {
    onClose();
    router.push("/premium");
  };

  const handleBuyPack = async () => {
    if (!pack || purchasing) return;
    setPurchasing(true);
    try {
      await purchasePremium(pack);
      if (variant === "boost") {
        // Immediate server sync so the credit is usable right away
        await api.purchaseBoost().catch(() => {});
      }
      onClose();
      Alert.alert(t("upsell.purchase_success_title"), t("upsell.purchase_success_msg"));
      onPurchased?.();
    } catch (error: any) {
      if (error?.message !== "Purchase cancelled" && !error?.userCancelled) {
        Alert.alert(t("common.error"), t("upsell.purchase_failed_msg"));
      }
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.iconCircle}>
              <Ionicons name={VARIANT_ICON[variant]} size={36} color={colors.onMedia} />
            </View>
            <Text style={styles.title}>{t(`upsell.${variant}.title`)}</Text>
            <Text style={styles.subtitle}>{t(`upsell.${variant}.subtitle`)}</Text>
          </LinearGradient>

          <View style={styles.body}>
            {Array.isArray(features) &&
              features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={14} color={colors.onMedia} />
                  </View>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}

            <TouchableOpacity onPress={handlePremium} activeOpacity={0.85} style={styles.premiumBtnWrapper}>
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.premiumBtn}
              >
                <Ionicons name="diamond" size={18} color={colors.onMedia} />
                <Text style={styles.premiumBtnText}>{t("upsell.premium_cta")}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {packProductId && pack && (
              <TouchableOpacity
                onPress={handleBuyPack}
                style={styles.packBtn}
                activeOpacity={0.85}
                disabled={purchasing}
              >
                {purchasing ? (
                  <ActivityIndicator size="small" color={colors.textDark} />
                ) : (
                  <Text style={styles.packBtnText}>
                    {t(`upsell.${variant}.pack_cta`, { price: pack.product.priceString })}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={onClose} style={styles.laterBtn}>
              <Text style={styles.laterText}>{t("upsell.later")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: colors.backgroundSecondaryDark,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  header: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.onMedia,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 20,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textDark,
    lineHeight: 20,
  },
  premiumBtnWrapper: {
    marginTop: spacing.md,
  },
  premiumBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 14,
    borderRadius: 16,
  },
  premiumBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.onMedia,
  },
  packBtn: {
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + "70",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  packBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  laterBtn: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  laterText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
  },
});
