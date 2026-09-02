import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, textStyles } from "@/src/theme";

/**
 * Kayit akisinin ortak iskeleti.
 *
 * Onceki duzen her adimda ayni seyi yapiyordu: ustte numarali toplar +
 * "Adim 2/6" + yuzde (uc kez ayni bilgi, ~120 piksel), ortada kaydirilan
 * bir kart yigini, altta "Geri / Devam et" ve onlarin ALTINDA bir de
 * "Iptal". Bir ekranda uc eylem, uc ilerleme gostergesi ve birden fazla
 * soru vardi.
 *
 * Yeni iskelet tek bir sey soruyor:
 *   - Ilerleme: ust kenarda 3 piksellik bir cizgi. Sayi yok, yuzde yok.
 *   - Geri: kosede bir chevron, yarim genislikte bir dugme degil.
 *   - Iptal: sag ustte kucuk metin -- birincil eylemle ayni bolgede
 *     durmuyor, dolayisiyla yanlislikla basilmiyor.
 *   - Soru: ekranin en buyuk yazisi ve tek basina.
 *   - Eylem: altta TEK dugme, gecersizken kapali.
 */

interface Props {
  /** 0..1 */
  progress: number;
  title: string;
  helper?: string;
  children: React.ReactNode;

  onBack?: () => void;
  onCancel?: () => void;

  ctaLabel: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;

  /** Sinav gibi kendi akisini yoneten adimlar alt cubugu gizler. */
  hideCta?: boolean;
  /** Icerik kendi kaydirmasini yonetiyorsa (uzun listeler). */
  scroll?: boolean;
}

export function OnboardingShell({
  progress,
  title,
  helper,
  children,
  onBack,
  onCancel,
  ctaLabel,
  onCta,
  ctaDisabled,
  ctaLoading,
  hideCta,
  scroll = true,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const body = (
    <>
      <Text style={styles.title}>{title}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      <View style={styles.content}>{children}</View>
    </>
  );

  return (
    <View style={styles.root}>
      {/* Ilerleme: kenardan kenara, ust kenarda. */}
      <View style={[styles.track, { top: insets.top }]}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <View style={[styles.bar, { paddingTop: insets.top + spacing.md }]}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            style={styles.backHit}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.textSecondary} />
          </Pressable>
        ) : (
          <View style={styles.backHit} />
        )}

        {onCancel ? (
          <Pressable onPress={onCancel} hitSlop={12} accessibilityRole="button">
            <Text style={styles.cancel}>{t("common.cancel")}</Text>
          </Pressable>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.scrollContent]}>{body}</View>
        )}

        {!hideCta && (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <Pressable
              onPress={onCta}
              disabled={ctaDisabled || ctaLoading}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!ctaDisabled }}
              style={({ pressed }) => [
                styles.cta,
                (ctaDisabled || ctaLoading) && styles.ctaOff,
                pressed && !ctaDisabled && styles.ctaPressed,
              ]}
            >
              {ctaLoading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={[styles.ctaText, ctaDisabled && styles.ctaTextOff]}>
                  {ctaLabel}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  track: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.borderMuted,
    zIndex: 2,
  },
  fill: { height: 3, backgroundColor: colors.primary },

  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backHit: { width: 24, height: 24, justifyContent: "center" },
  cancel: {
    ...textStyles.bodySmall,
    color: colors.textTertiary,
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  title: {
    ...textStyles.display,
    color: colors.text,
  },
  helper: {
    ...textStyles.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  content: {
    marginTop: spacing.xl,
    flex: 1,
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
    backgroundColor: colors.background,
  },
  cta: {
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaOff: {
    backgroundColor: colors.surfaceElevated,
  },
  ctaPressed: { opacity: 0.9 },
  ctaText: {
    ...textStyles.label,
    color: colors.textInverse,
  },
  ctaTextOff: {
    color: colors.textTertiary,
  },
});
