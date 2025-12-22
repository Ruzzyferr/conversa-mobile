import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { Card } from "@/src/components/Card";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { RainBackground } from "@/src/components/RainBackground";
import { api } from "@/src/services/api";
import { setToken } from "@/src/services/authStore";

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: "email" | "phone" }>();
  const mode = params.mode || "email";

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim()) {
      Alert.alert("Error", `Please enter your ${mode}`);
      return;
    }

    setLoading(true);
    try {
      const result = mode === "email"
        ? await api.loginEmail(input.trim())
        : await api.loginPhone(input.trim());

      // Code is always sent now, navigate to verify code screen
      if (result.userId) {
        setLoading(false); // Stop loading before navigation
        router.push({
          pathname: "/(auth)/verify-code",
          params: {
            mode,
            identifier: input.trim(),
            userId: result.userId,
          },
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to authenticate";
      Alert.alert("Error", errorMessage);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <RainBackground />
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.innerContent}>
        <Text style={styles.title}>
          {mode === "email" ? "Continue with Email" : "Continue with Phone"}
        </Text>
        <Text style={styles.subtitle}>
          Enter your {mode} to get started
        </Text>

        <Card style={styles.card}>
          <Text style={styles.label}>
            {mode === "email" ? "Email" : "Phone"}
          </Text>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={mode === "email" ? "your@email.com" : "+1234567890"}
            placeholderTextColor={colors.textTertiary}
            keyboardType={mode === "email" ? "email-address" : "phone-pad"}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <PrimaryButton
            title="Continue"
            onPress={handleSubmit}
            loading={loading}
            style={styles.button}
          />
        </Card>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  innerContent: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  card: {
    marginTop: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  button: {
    marginTop: spacing.sm,
  },
});

