import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { Card } from "@/src/components/Card";
import { BrandTexture } from "@/src/components/brand/BrandTexture";
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

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // A React state update is asynchronous, but the keyboard fires one
  // onChangeText per keystroke without waiting for a re-render. Reading `code`
  // from the render closure therefore copied a *stale* array on fast input and
  // dropped digits — typing 534322 landed as 53322. The ref always holds the
  // newest value, so every handler builds on what actually got typed.
  const codeRef = useRef<string[]>(["", "", "", "", "", ""]);
  const submittingRef = useRef(false);

  const applyCode = (next: string[]) => {
    codeRef.current = next;
    setCode(next);
  };

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleCodeChange = (value: string, index: number) => {
    const digits = value.replace(/[^0-9]/g, "");
    const next = [...codeRef.current];

    if (digits.length === 0) {
      // Deletion inside a filled box.
      next[index] = "";
      applyCode(next);
      return;
    }

    // A pasted or auto-filled code arrives in a single box as one string.
    // The old handler bailed out on anything longer than one character, so
    // pasting the e-mailed code did nothing at all. Spread it across the
    // boxes instead, starting where the paste landed.
    let cursor = index;
    for (const d of digits) {
      if (cursor > 5) break;
      next[cursor] = d;
      cursor += 1;
    }
    applyCode(next);

    const focusAt = Math.min(cursor, 5);
    inputRefs.current[focusAt]?.focus();

    // Submit as soon as all six are present, no matter which box completed
    // them — a paste fills the last box without ever "typing" into it.
    const fullCode = next.join("");
    if (fullCode.length === 6 && !next.includes("")) {
      handleVerify(fullCode);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key !== "Backspace") return;
    // Backspace on an empty box steps back AND clears the previous digit;
    // stepping back without clearing left the code un-editable, because the
    // box you land on is already full and maxLength blocks re-typing.
    if (!codeRef.current[index] && index > 0) {
      const next = [...codeRef.current];
      next[index - 1] = "";
      applyCode(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || code.join("");

    if (fullCode.length !== 6) {
      Alert.alert(t("common.error"), t("otp.incomplete"));
      return;
    }
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

      setErrorMessage(message);
      setShowErrorModal(true);
      // Clear code on error
      applyCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
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
      Alert.alert(t("common.success"), t("otp.resent"));
      applyCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : t("otp.resend_failed");
      Alert.alert(t("common.error"), errorMessage);
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BrandTexture />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t("otp.title")}</Text>
          <Text style={styles.subtitle}>
            {t("otp.subtitle")}{"\n"}
            <Text style={styles.identifier}>{identifier}</Text>
          </Text>

          <Card style={styles.card}>
            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={styles.codeInput}
                  value={digit}
                  onChangeText={(value) => handleCodeChange(value, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, index)
                  }
                  keyboardType="number-pad"
                  // maxLength must exceed 1 or the platform truncates a pasted
                  // / auto-filled code to its first character before the
                  // handler ever sees it. handleCodeChange spreads the extra
                  // digits across the remaining boxes and keeps each at one.
                  maxLength={6}
                  selectTextOnFocus
                  autoComplete={index === 0 ? "sms-otp" : "off"}
                  textContentType={index === 0 ? "oneTimeCode" : "none"}
                  importantForAutofill={index === 0 ? "yes" : "no"}
                  accessibilityLabel={t("otp.digit_label", { n: index + 1 })}
                  editable={!loading}
                />
              ))}
            </View>

            <PrimaryButton
              title={t("otp.cta")}
              onPress={() => handleVerify()}
              loading={loading}
              disabled={code.join("").length !== 6}
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

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('common.error')}</Text>
            <Text style={styles.modalMessage}>
              {errorMessage || t('otp.generic_error')}
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowErrorModal(false);
                setErrorMessage(null);
              }}
            >
              <Text style={styles.modalButtonText}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  codeInput: {
    flex: 1,
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 12,
    padding: spacing.sm,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    borderWidth: 2,
    borderColor: colors.borderDark,
    textAlign: "center",
    minHeight: 50,
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


