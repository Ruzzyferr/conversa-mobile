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
import { RainBackground } from "@/src/components/RainBackground";
import { api } from "@/src/services/api";
import { setToken } from "@/src/services/authStore";

export default function VerifyCodeScreen() {
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

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleCodeChange = (value: string, index: number) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, "");
    if (digit.length > 1) return;

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (digit && index === 5) {
      const fullCode = newCode.join("");
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || code.join("");
    
    if (fullCode.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === "email"
          ? await api.verifyCode(fullCode, identifier, undefined)
          : await api.verifyCode(fullCode, undefined, identifier);

      await setToken(result.token);
      router.replace("/(tabs)/home");
    } catch (error: unknown) {
      let message = "Geçersiz doğrulama kodu. Lütfen tekrar deneyin.";
      
      if (error instanceof Error) {
        // Try to extract a user-friendly message
        if (error.message.includes("400") || error.message.includes("Invalid")) {
          message = "Geçersiz doğrulama kodu. Lütfen tekrar deneyin.";
        } else if (error.message.includes("expired") || error.message.includes("Expired")) {
          message = "Doğrulama kodu süresi dolmuş. Lütfen yeni bir kod isteyin.";
        } else {
          message = error.message;
        }
      }
      
      setErrorMessage(message);
      setShowErrorModal(true);
      // Clear code on error
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
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
      Alert.alert("Success", "Verification code sent!");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to resend code";
      Alert.alert("Error", errorMessage);
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <RainBackground />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{"\n"}
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
                maxLength={1}
                selectTextOnFocus
                editable={!loading}
              />
            ))}
          </View>

          <PrimaryButton
            title="Verify"
            onPress={() => handleVerify()}
            loading={loading}
            disabled={code.join("").length !== 6}
            style={styles.button}
          />

          <Text style={styles.resendText}>
            Didn't receive the code?{" "}
            <Text
              style={styles.resendLink}
              onPress={handleResend}
              disabled={resending}
            >
              {resending ? "Sending..." : "Resend"}
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
            <Text style={styles.modalTitle}>Hata</Text>
            <Text style={styles.modalMessage}>
              {errorMessage || "Bir hata oluştu. Lütfen tekrar deneyin."}
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowErrorModal(false);
                setErrorMessage(null);
              }}
            >
              <Text style={styles.modalButtonText}>Tamam</Text>
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
    padding: spacing.md,
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    borderWidth: 2,
    borderColor: colors.borderDark,
    textAlign: "center",
    minHeight: 60,
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


