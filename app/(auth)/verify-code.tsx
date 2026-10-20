import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  Pressable,
  TouchableOpacity,
} from "react-native";
// RN'in KeyboardAvoidingView'i Android'de edge-to-edge ile calismiyor;
// bu paket kokte zaten saglaniyor (KeyboardProvider).
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { Card } from "@/src/components/Card";
import { BrandTexture } from "@/src/components/brand/BrandTexture";
import { FieldError } from "@/src/components/ui/FieldError";
import { api } from "@/src/services/api";
import { setToken } from "@/src/services/authStore";
import { useTranslation } from "react-i18next";

export default function VerifyCodeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode: "email" | "phone";
    identifier: string;
    userId: string;
  }>();

  const mode = params.mode || "email";
  const identifier = params.identifier || "";
  const userId = params.userId || "";

  // TEK girdi, alti KUTU.
  //
  // Eskiden alti ayri TextInput vardi ve her tusa basista odak bir sonraki
  // kutuya tasiniyordu. Odak degisimi native tarafta asenkron: hizli yazan
  // biri siradaki rakami odak tasinmadan once basiyor, rakam eski kutuya
  // dusuyor ve uzerine yaziliyordu -- 252999 yazip 229999 almanin sebebi
  // tam olarak buydu. Stale state icin konan codeRef bu yarisi cozmuyor,
  // cunku sorun React'in state'i degil isletim sisteminin odagi.
  //
  // Gorunmez tek bir girdi bu yarisi tamamen ortadan kaldiriyor: hicbir
  // odak tasimasi yok, yapistirma ve SMS otomatik doldurma dogal calisiyor,
  // geri silme de oyle.
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    // Ekran acilir acilmaz klavye gelsin.
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) {
      // Son rakam girilince kendiliginden gonder; "Dogrula" dugmesi de
      // ayni isi yapiyor, submittingRef ikisinin birden gitmesini onluyor.
      handleVerify(digits);
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const fullCode = codeToVerify ?? code;

    if (fullCode.length !== 6) {
      // Modal yerine alanin altinda.
      //
      // Hatayi bir modala tasimak kullaniciyi once kapatmaya, sonra hangi
      // kutunun bos oldugunu aramaya zorluyordu; react-native-web'de ise
      // Alert sessizce hicbir sey yapmiyor. Kayit akisinin geri kalani
      // zaten satir ici hata gosteriyor.
      setInlineError(t("otp.incomplete"));
      return;
    }
    setInlineError(null);
    // Auto-submit and a tap on "Doğrula" can both fire for the last digit.
    if (submittingRef.current) return;
    submittingRef.current = true;

    setLoading(true);
    try {
      const result =
        mode === "email"
          ? await api.verifyCode(fullCode, identifier, undefined)
          : await api.verifyCode(fullCode, undefined, identifier);

      await setToken(result.token);
      router.replace("/(tabs)/home");
    } catch (error: unknown) {
      let message = t('otp.invalid_code');

      if (error instanceof Error) {
        // Try to extract a user-friendly message
        if (error.message.includes("400") || error.message.includes("Invalid")) {
          message = t('otp.invalid_code');
        } else if (error.message.includes("expired") || error.message.includes("Expired")) {
          message = t('otp.expired_code');
        } else {
          message = error.message;
        }
      }

      setInlineError(message);
      // Hatada kutulari temizle ve klavyeyi ACIK birak: eskiden odak
      // kayboluyordu ve kullanici tekrar denemek icin once bir kutuya
      // dokunmak zorunda kaliyordu.
      setCode("");
      inputRef.current?.focus();
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.sendCode(
        mode === "email" ? identifier : undefined,
        mode === "phone" ? identifier : undefined
      );
      setInlineNotice(t("otp.resent"));
      setInlineError(null);
      setCode("");
      inputRef.current?.focus();
    } catch (error: unknown) {
      setInlineError(error instanceof Error ? error.message : t("otp.resend_failed"));
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BrandTexture />

      {/*
        Geri cikisi.

        Adres yanlis yazildiginda donup duzeltmenin bir yolu yoktu: ekran
        yalnizca kod bekliyordu, iOS'ta donanim geri tusu de olmadigi icin
        kullanici burada kaliyordu. Tek cikis uygulamayi kapatmakti.
      */}
      <View style={styles.bar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          style={styles.backHit}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.textSecondaryDark} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior="padding"
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t("otp.title")}</Text>
          <Text style={styles.subtitle}>
            {t("otp.subtitle")}{"\n"}
            <Text style={styles.identifier}>{identifier}</Text>
          </Text>

          <Card style={styles.card}>
            <Pressable
              style={styles.codeContainer}
              onPress={() => inputRef.current?.focus()}
              accessibilityRole="button"
              accessibilityLabel={t("otp.title")}
            >
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const filled = index < code.length;
                const active = focused && index === Math.min(code.length, 5);
                return (
                  <View
                    key={index}
                    style={[
                      styles.codeBox,
                      filled && styles.codeBoxFilled,
                      active && styles.codeBoxActive,
                    ]}
                  >
                    <Text style={styles.codeDigit}>{code[index] ?? ""}</Text>
                  </View>
                );
              })}

              {/*
                Gercek girdi: ekranda yok ama kutularin ustunde duruyor ki
                dokunma onu odaklasin. `opacity: 0` yerine saydam metin ve
                gizli imlec kullaniliyor; bazi Android surumlerinde tamamen
                saydam bir girdi otomatik doldurmayi atliyor.
              */}
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={handleCodeChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={styles.hiddenInput}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={6}
                caretHidden
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                importantForAutofill="yes"
                editable={!loading}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            </Pressable>

            <FieldError message={inlineError ?? undefined} />
            {inlineNotice && !inlineError ? (
              <Text style={styles.notice}>{inlineNotice}</Text>
            ) : null}

            <PrimaryButton
              title={t("otp.cta")}
              onPress={() => handleVerify()}
              loading={loading}
              disabled={code.length !== 6}
              style={styles.button}
            />

            <Text style={styles.resendText}>
              {t("otp.no_code")}{" "}
              <Text
                style={styles.resendLink}
                onPress={handleResend}
                disabled={resending}
              >
                {resending ? t("otp.sending") : t("otp.resend")}
              </Text>
            </Text>
          </Card>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  notice: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    color: colors.success,
    textAlign: "center",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  backHit: { width: 24, height: 24, justifyContent: "center" },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    marginBottom: spacing.xl,
    textAlign: "center",
    lineHeight: 24,
  },
  identifier: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
  },
  card: {
    marginTop: spacing.md,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  codeBox: {
    flex: 1,
    // `flex: 1` tek basina yetmiyor: bir metin girdisinin ic genisligi
    // (tarayicida ~150px, native'de daha az) kucultmeyi engelliyor ve alti
    // kutu satira sigmayip ekranin sagindan tasiyordu. Gorsel incelemede
    // yakalandi -- ikinci kutu kenarda yarim, kalani gorunmez.
    minWidth: 0,
    width: 0,
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderDark,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  codeBoxFilled: {
    borderColor: colors.primary,
  },
  codeBoxActive: {
    borderColor: colors.primaryLight,
  },
  codeDigit: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    textAlign: "center",
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    // Gorunmez ama dokunulabilir: metin ve imlec saydam, arka plan yok.
    color: "transparent",
    backgroundColor: "transparent",
    fontSize: typography.fontSize.xl,
    textAlign: "center",
  },
  button: {
    marginTop: spacing.sm,
  },
  resendText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    textAlign: "center",
    marginTop: spacing.md,
  },
  resendLink: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 20,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondaryDark,
    marginBottom: spacing.xl,
    textAlign: "center",
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: "#FFFFFF",
  },
});


