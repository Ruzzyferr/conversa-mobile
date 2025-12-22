import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SafeAreaView } from "@/src/components/SafeAreaView";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView>
      <View style={styles.content}>
      <Text style={styles.title}>Welcome to Swiip</Text>
      <Text style={styles.subtitle}>Your premium dating experience</Text>

      <View style={styles.buttonContainer}>
        <PrimaryButton
          title="Continue with Email"
          onPress={() => router.push("/(auth)/auth?mode=email")}
          style={styles.button}
        />
        <PrimaryButton
          title="Continue with Phone"
          onPress={() => router.push("/(auth)/auth?mode=phone")}
          style={[styles.button, styles.buttonSecondary]}
        />
      </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize["4xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  button: {
    width: "100%",
  },
  buttonSecondary: {
    backgroundColor: colors.primaryDark,
  },
});

