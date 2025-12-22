import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { Card } from "@/src/components/Card";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { api } from "@/src/services/api";

type Purpose = "CONVERSATION" | "PRACTICE" | "COFFEE";

export default function ProfileSetupScreen() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [city, setCity] = useState("");
  const [languagesNative, setLanguagesNative] = useState("");
  const [languagesPractice, setLanguagesPractice] = useState("");
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert("Error", "Display name is required");
      return;
    }

    if (!purpose) {
      Alert.alert("Error", "Please select a purpose");
      return;
    }

    const birthYearNum = birthYear ? parseInt(birthYear, 10) : undefined;
    if (birthYearNum) {
      const age = currentYear - birthYearNum;
      if (age < 18) {
        Alert.alert("Error", "You must be at least 18 years old");
        return;
      }
      if (birthYearNum < 1940 || birthYearNum > currentYear - 18) {
        Alert.alert("Error", "Please enter a valid birth year");
        return;
      }
    }

    setLoading(true);
    try {
      const languagesNativeArray = languagesNative
        .split(",")
        .map((lang) => lang.trim())
        .filter((lang) => lang.length > 0);
      const languagesPracticeArray = languagesPractice
        .split(",")
        .map((lang) => lang.trim())
        .filter((lang) => lang.length > 0);

      await api.upsertMyProfile({
        displayName: displayName.trim(),
        birthYear: birthYearNum,
        city: city.trim() || undefined,
        languagesNative: languagesNativeArray.length > 0 ? languagesNativeArray : undefined,
        languagesPractice: languagesPracticeArray.length > 0 ? languagesPracticeArray : undefined,
        purpose,
        bio: bio.trim() || undefined,
      });

      router.replace("/(tabs)/home");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save profile";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Your Profile</Text>
          <Text style={styles.subtitle}>Tell us about yourself</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.label}>Display Name *</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={colors.textTertiary}
            maxLength={40}
            editable={!loading}
          />

          <Text style={styles.label}>Birth Year</Text>
          <TextInput
            style={styles.input}
            value={birthYear}
            onChangeText={setBirthYear}
            placeholder={`e.g., ${currentYear - 25}`}
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            maxLength={4}
            editable={!loading}
          />

          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Your city"
            placeholderTextColor={colors.textTertiary}
            editable={!loading}
          />

          <Text style={styles.label}>Purpose *</Text>
          <View style={styles.purposeContainer}>
            {(["CONVERSATION", "PRACTICE", "COFFEE"] as Purpose[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.purposeChip,
                  purpose === p && styles.purposeChipActive,
                ]}
                onPress={() => setPurpose(p)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.purposeText,
                    purpose === p && styles.purposeTextActive,
                  ]}
                >
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Native Languages</Text>
          <Text style={styles.hint}>Comma-separated (e.g., English, Spanish)</Text>
          <TextInput
            style={styles.input}
            value={languagesNative}
            onChangeText={setLanguagesNative}
            placeholder="English, Spanish"
            placeholderTextColor={colors.textTertiary}
            editable={!loading}
          />

          <Text style={styles.label}>Practice Languages</Text>
          <Text style={styles.hint}>Comma-separated (e.g., French, German)</Text>
          <TextInput
            style={styles.input}
            value={languagesPractice}
            onChangeText={setLanguagesPractice}
            placeholder="French, German"
            placeholderTextColor={colors.textTertiary}
            editable={!loading}
          />

          <Text style={styles.label}>Bio</Text>
          <Text style={styles.hint}>Max 240 characters</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself..."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={240}
            numberOfLines={4}
            editable={!loading}
          />

          <PrimaryButton
            title="Save Profile"
            onPress={handleSave}
            loading={loading}
            style={styles.button}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
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
    textAlign: "center",
  },
  card: {
    marginTop: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
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
    marginBottom: spacing.sm,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  purposeContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: "wrap",
  },
  purposeChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  purposeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  purposeText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  purposeTextActive: {
    color: colors.text,
  },
  button: {
    marginTop: spacing.lg,
  },
});

