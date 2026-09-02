import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors } from "@/src/theme/colors";
const dc = { ...colors, background: colors.backgroundDark, backgroundSecondary: colors.backgroundSecondaryDark, surface: colors.surfaceDark, cardBackground: colors.cardBackgroundDark, text: colors.textDark, textSecondary: colors.textSecondaryDark, textTertiary: colors.textSecondaryDark, border: colors.borderDark };
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { Card } from "@/src/components/Card";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { BrandTexture } from "@/src/components/brand/BrandTexture";
import { api } from "@/src/services/api";
import { setToken } from "@/src/services/authStore";

export default function AuthScreen() {
  const { t } = useTranslation();
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
      await api.loginEmail(input.trim());

      // The server answers the same way for new and returning addresses, so
      // there is nothing to branch on: always go to the code screen.
      setLoading(false);
      router.push({
        pathname: "/(auth)/verify-code",
        params: { mode: "email", identifier: input.trim() },
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to authenticate";
      Alert.alert("Error", errorMessage);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BrandTexture />
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.innerContent}>
        <Text style={styles.title}>{t("auth.title_email")}</Text>
        <Text style={styles.subtitle}>{t("auth.subtitle_email")}</Text>

        <Card style={styles.card}>
          <Text style={styles.label}>{t("auth.label_email")}</Text>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t("auth.placeholder_email")}
            placeholderTextColor={dc.textTertiary}
            keyboardType={mode === "email" ? "email-address" : "phone-pad"}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <PrimaryButton
            title={t("auth.continue")}
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
    backgroundColor: dc.background,
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
    color: dc.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: dc.textSecondary,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  card: {
    marginTop: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: dc.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: dc.backgroundSecondary,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: dc.text,
    borderWidth: 1,
    borderColor: dc.border,
    marginBottom: spacing.md,
  },
  button: {
    marginTop: spacing.sm,
  },
});

