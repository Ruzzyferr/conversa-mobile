import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
// RN'in KeyboardAvoidingView'i Android'de edge-to-edge ile calismiyor;
// bu paket kokte zaten saglaniyor (KeyboardProvider).
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors } from "@/src/theme/colors";
const dc = { ...colors, background: colors.backgroundDark, backgroundSecondary: colors.backgroundSecondaryDark, surface: colors.surfaceDark, cardBackground: colors.cardBackgroundDark, text: colors.textDark, textSecondary: colors.textSecondaryDark, textTertiary: colors.textSecondaryDark, border: colors.borderDark };
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { Card } from "@/src/components/Card";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { BrandTexture } from "@/src/components/brand/BrandTexture";
import { FieldError } from "@/src/components/ui/FieldError";
import { api } from "@/src/services/api";

/** Kabaca dogru mu: tek @, iki yaninda da bir sey, noktali bir alan adi. */
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

export default function AuthScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: "email" | "phone" }>();
  const mode = params.mode || "email";

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const value = input.trim();

    // Hatalar artik `Alert.alert` ile degil, alanin altinda gosteriliyor.
    //
    // Alert react-native-web'de SESSIZCE hicbir sey yapmiyordu: bos alanla
    // "Devam et"e basmak olu bir dugmeye basmak gibiydi. Calistigi
    // platformlarda bile metin Ingilizce sabitti ("Please enter your email")
    // ve Turkce arayuzun ortasinda duruyordu.
    if (!value) {
      setError(t("auth.empty_email"));
      return;
    }
    if (!looksLikeEmail(value)) {
      // Sunucuya gidip 400 ile donmek yerine burada soyluyoruz: yanlis yazilmis
      // bir adres icin ag turu beklemenin kullaniciya kazandirdigi bir sey yok.
      setError(t("auth.invalid_email"));
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await api.loginEmail(value);

      // The server answers the same way for new and returning addresses, so
      // there is nothing to branch on: always go to the code screen.
      setLoading(false);
      router.push({
        pathname: "/(auth)/verify-code",
        params: { mode: "email", identifier: value },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.failed"));
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BrandTexture />

      {/*
        Geri cikisi.

        Bu ekrana karsilama ekranindan "E-posta ile devam et" ile geliniyordu
        ve geri donusun hicbir yolu yoktu: iOS'ta donanim geri tusu olmadigi
        icin yanlislikla buraya giren biri Apple/Google secimine donemiyordu.
        Kayit akisinin devami (OnboardingShell) zaten ayni chevron'u
        gosteriyor; tutarsiz olan bu iki ekrandi.
      */}
      <View style={styles.bar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          style={styles.backHit}
        >
          <MaterialIcons name="arrow-back" size={24} color={dc.textSecondary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior="padding"
      >
        <View style={styles.innerContent}>
          <Text style={styles.title}>{t("auth.title_email")}</Text>
          <Text style={styles.subtitle}>{t("auth.subtitle_email")}</Text>

          <Card style={styles.card}>
            <Text style={styles.label}>{t("auth.label_email")}</Text>
            <TextInput
              style={[styles.input, !!error && styles.inputError]}
              value={input}
              onChangeText={(v) => {
                setInput(v);
                if (error) setError(null);
              }}
              placeholder={t("auth.placeholder_email")}
              placeholderTextColor={dc.textTertiary}
              keyboardType={mode === "email" ? "email-address" : "phone-pad"}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              inputMode="email"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              editable={!loading}
            />
            <FieldError message={error ?? undefined} />

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
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  backHit: { width: 24, height: 24, justifyContent: "center" },
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
  },
  inputError: {
    borderColor: colors.error,
  },
  button: {
    marginTop: spacing.md,
  },
});
