import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, Alert, Modal, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { colors, spacing, radius, textStyles } from "@/src/theme";
import { api } from "@/src/services/api";
import { clearToken } from "@/src/services/authStore";
import { InterestPicker } from "@/src/components/InterestPicker";
import { OnboardingShell } from "@/src/components/onboarding/OnboardingShell";
import { LanguageSelect } from "@/src/components/onboarding/LanguageSelect";
import {
  NameStep,
  BirthStep,
  GenderStep,
  PurposeStep,
  AboutStep,
  PhotosStep,
} from "@/src/components/onboarding/steps";
// app/ altindaki her dosya expo-router icin bir ROUTE'tur; adim
// bilesenleri orada durursa router onlari sayfa sanip "missing default
// export" diye uyarir ve rota agacini kirletir. Bilesenler src/ altinda.
import { TrackStep, type Track } from "@/src/components/onboarding/TrackStep";
import { ExamStep, type ExamOutcome } from "@/src/components/onboarding/ExamStep";

type Gender = "MALE" | "FEMALE" | "OTHER";
type Purpose = "CONVERSATION" | "COFFEE";

/**
 * Kayit akisi.
 *
 * Eski hali 1578 satirlik tek bir dosyaydi ve alti ekranin hepsi ayni
 * kalibi tekrarliyordu: ustte numarali cam toplar + "Adim 2/6" + yuzde
 * (ayni bilgi uc kez, ~120 piksel), ortada kaydirilan kart yigini, altta
 * "Geri / Devam et" ve onlarin ALTINDA bir de "Iptal". Ikinci ekran ad,
 * dogum yili, cinsiyet ve amaci tek sayfaya yigiyordu; ucuncu ekran ayni
 * otuz dilli cip duvarini iki kez alt alta koyuyordu.
 *
 * Yeni akis her ekranda TEK sey soruyor. Bu daha cok adim demek (dokuz),
 * ama her adim kaydirmasiz, tek eylemli ve saniyeler suruyor -- Bumble ve
 * Hinge'in yaptigi da bu. Duzen OnboardingShell'de, icerikler
 * onboarding/steps.tsx ve LanguageSelect'te; bu dosya yalnizca sirayi,
 * dogrulamayi ve kaydetmeyi yonetiyor.
 */

type StepKey =
  | "track"
  | "name"
  | "birth"
  | "gender"
  | "purpose"
  | "native"
  | "learning"
  | "exam"
  | "about"
  | "photos";

export default function ProfileSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  // Apple ilk yetkilendirmede adi bir kez donuyor; karsilama ekrani onu
  // buraya tasiyor ki bu alan o kullanicilarda bos olmasin.
  const { suggestedName } = useLocalSearchParams<{ suggestedName?: string }>();

  const [displayName, setDisplayName] = useState(
    typeof suggestedName === "string" ? suggestedName : ""
  );
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [purpose, setPurpose] = useState<Purpose>("CONVERSATION");
  const [track, setTrack] = useState<Track | null>(null);
  const [examOutcome, setExamOutcome] = useState<ExamOutcome | null>(null);
  const [languagesNative, setLanguagesNative] = useState<string[]>([]);
  const [languagesPractice, setLanguagesPractice] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  const [showInterestPicker, setShowInterestPicker] = useState(false);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [location, setLocation] =
    useState<{ lat: number; lng: number; city?: string; country?: string } | null>(null);

  // ---- Sira ------------------------------------------------------------

  const steps = useMemo<StepKey[]>(() => {
    const base: StepKey[] = ["track", "name", "birth", "gender"];
    if (track === "LANGUAGE") {
      return [...base, "native", "learning", "exam", "about", "photos"];
    }
    return [...base, "purpose", "native", "learning", "about", "photos"];
  }, [track]);

  const [index, setIndex] = useState(0);
  const key = steps[index] ?? "track";
  const isLast = index === steps.length - 1;

  const back = useCallback(() => {
    setErrors({});
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const cancel = useCallback(() => {
    // Yarim kalan kayittan cikan kullanicinin oturumu duruyor olsaydi,
    // uygulamayi bir daha actiginda profilsiz bir hesapla ana ekrana
    // dusurdu.
    clearToken();
    router.replace("/(auth)/welcome");
  }, [router]);

  // ---- Dogrulama -------------------------------------------------------

  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 100;
  const maxYear = currentYear - 18;

  /** Adim gecerli mi -- dugmeyi kapatmak icin, mesaj uretmeden. */
  const valid = useMemo(() => {
    switch (key) {
      case "track":
        return track !== null;
      case "name":
        return displayName.trim().length >= 2;
      case "birth": {
        const y = parseInt(birthYear, 10);
        return birthYear.length === 4 && !isNaN(y) && y >= minYear && y <= maxYear;
      }
      case "gender":
        return gender !== null;
      case "purpose":
        return true;
      case "native":
        return languagesNative.length > 0;
      case "learning":
        return languagesPractice.length > 0;
      case "exam":
        return examOutcome !== null;
      case "about":
        return true;
      case "photos":
        return photos.length > 0;
      default:
        return true;
    }
  }, [
    key, track, displayName, birthYear, gender, languagesNative,
    languagesPractice, examOutcome, photos, minYear, maxYear,
  ]);

  /**
   * Mesaj uretimi dugmeden AYRI.
   *
   * Dugme gecersizken zaten kapali, yani kullanici cogunlukla hicbir hata
   * gormuyor -- gorunur bir hata yalnizca gecerli gorunup gecerli olmayan
   * durumlarda gerekiyor (dogum yilinin araligi gibi). Eski akis bunu
   * Alert.alert ile yapiyordu ve react-native-web'de Alert SESSIZCE
   * hicbir sey yapmadigi icin "Devam et" olu bir dugmeye donusuyordu.
   */
  const explain = useCallback((): Record<string, string> => {
    switch (key) {
      case "name":
        return displayName.trim()
          ? { name: t("setup.alerts.name_length") }
          : { name: t("setup.alerts.name_required") };
      case "birth":
        return birthYear.length === 4
          ? { birth: t("setup.alerts.birth_range", { min: minYear, max: maxYear }) }
          : { birth: t("setup.alerts.birth_required") };
      case "gender":
        return { gender: t("setup.alerts.gender_required") };
      case "native":
        return { native: t("setup.alerts.native_required") };
      case "learning":
        return { practice: t("setup.alerts.practice_required") };
      case "photos":
        return { photos: t("setup.alerts.photo_required") };
      default:
        return {};
    }
  }, [key, displayName, birthYear, minYear, maxYear, t]);

  const next = useCallback(() => {
    if (!valid) {
      setErrors(explain());
      return;
    }
    setErrors({});
    if (isLast) {
      submit();
    } else {
      setIndex((i) => i + 1);
    }
    // submit stabil degil; bagimliliga almiyoruz, bkz. asagidaki tanim.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, explain, isLast]);

  // ---- Konum -----------------------------------------------------------

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      try {
        const loc = await Location.getCurrentPositionAsync({});
        const [address] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        setLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          city: address?.city || address?.region || undefined,
          // Ters cozumleme ulkeyi zaten biliyor; eskiden atiliyordu ve
          // Profile.country her gercek kullanicida null kaliyordu, bu da
          // ulke filtresini ve yakinlik bonusunu sessizce devre disi
          // birakiyordu.
          country: address?.isoCountryCode || undefined,
        });
      } catch (error) {
        console.error("Location error:", error);
      }
    })();
  }, []);

  // ---- Fotograf --------------------------------------------------------

  const putPhoto = (i: number, uri: string) => {
    setPhotos((prev) => {
      const nextPhotos = [...prev];
      if (i < nextPhotos.length) nextPhotos[i] = uri;
      else nextPhotos.push(uri);
      return nextPhotos.slice(0, 3);
    });
  };

  const fromLibrary = async () => {
    const i = pickerIndex;
    setPickerIndex(null);
    if (i === null) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("setup.alerts.permission_required"), t("setup.alerts.gallery_permission"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) putPhoto(i, result.assets[0].uri);
  };

  const fromCamera = async () => {
    const i = pickerIndex;
    setPickerIndex(null);
    if (i === null) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("setup.alerts.permission_required"), t("setup.alerts.camera_permission"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) putPhoto(i, result.assets[0].uri);
  };

  // ---- Kaydet ----------------------------------------------------------

  async function submit() {
    setLoading(true);
    try {
      const uploaded = await Promise.all(
        photos.map(async (uri) => {
          if (uri.startsWith("http")) return uri;
          try {
            return await api.uploadPhoto(uri);
          } catch (error) {
            console.error("Failed to upload photo:", uri, error);
            throw new Error(t("setup.alerts.upload_error"));
          }
        })
      );

      await api.upsertMyProfile({
        displayName: displayName.trim(),
        birthYear: parseInt(birthYear, 10),
        gender: gender || undefined,
        // Dil hattinda amac sorulmuyor: hattin kendisi zaten amaci soyluyor.
        purpose: track === "LANGUAGE" ? "PRACTICE" : purpose,
        // Kayitta ilk secim bedava: sunucu create yolunda trackChangedAt
        // yazmiyor, yani bu secim 30 gun kuralina takilmiyor.
        track: track ?? "DATE",
        languagesNative,
        languagesPractice,
        photos: uploaded,
        bio: bio.trim() || undefined,
        interests: interests.length > 0 ? interests : undefined,
        city: location?.city,
        country: location?.country,
        lat: location?.lat,
        lng: location?.lng,
      });

      router.replace("/(tabs)/home");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("setup.alerts.save_error");
      Alert.alert(t("common.error"), message);
    } finally {
      setLoading(false);
    }
  }

  // ---- Ekran ------------------------------------------------------------

  const copy: Record<StepKey, { title: string; helper?: string }> = {
    track: { title: t("setup.track.title"), helper: t("setup.track.subtitle") },
    name: { title: t("setup.q.name"), helper: t("setup.q.name_helper") },
    birth: { title: t("setup.q.birth"), helper: t("setup.q.birth_helper") },
    gender: { title: t("setup.q.gender") },
    purpose: { title: t("setup.q.purpose") },
    native: { title: t("setup.q.native"), helper: t("setup.q.native_helper") },
    learning: { title: t("setup.q.learning"), helper: t("setup.q.learning_helper") },
    exam: { title: t("setup.q.exam"), helper: t("setup.q.exam_helper") },
    about: { title: t("setup.q.about"), helper: t("setup.q.about_helper") },
    photos: { title: t("setup.q.photos"), helper: t("setup.q.photos_helper") },
  };

  const body = () => {
    switch (key) {
      case "track":
        return <TrackStep value={track} onChange={setTrack} />;
      case "name":
        return <NameStep value={displayName} onChange={setDisplayName} error={errors.name} />;
      case "birth":
        return <BirthStep value={birthYear} onChange={setBirthYear} error={errors.birth} />;
      case "gender":
        return <GenderStep value={gender} onChange={setGender} error={errors.gender} />;
      case "purpose":
        return <PurposeStep value={purpose} onChange={setPurpose} />;
      case "native":
        return (
          <LanguageSelect
            value={languagesNative}
            onChange={setLanguagesNative}
            placeholder={t("setup.q.search")}
            emptyHint={t("setup.step2.native_helper")}
          />
        );
      case "learning":
        return (
          <LanguageSelect
            value={languagesPractice}
            onChange={setLanguagesPractice}
            placeholder={t("setup.q.search")}
            emptyHint={t("setup.step2.practice_helper")}
          />
        );
      case "exam":
        return (
          <ExamStep
            language={languagesPractice[0]}
            onComplete={(outcome) => {
              setExamOutcome(outcome);
              setIndex((i) => i + 1);
            }}
          />
        );
      case "about":
        return (
          <AboutStep
            bio={bio}
            onBio={setBio}
            interests={interests}
            onOpenInterests={() => setShowInterestPicker(true)}
          />
        );
      case "photos":
        return (
          <PhotosStep
            photos={photos}
            onPick={setPickerIndex}
            onRemove={(i) => setPhotos((p) => p.filter((_, n) => n !== i))}
            error={errors.photos}
          />
        );
    }
  };

  // Dil listeleri kendi FlatList'ini kaydiriyor; kabuk kaydirmamali,
  // yoksa ic ice iki kaydirma alani olusuyor.
  const selfScrolling = key === "native" || key === "learning";

  return (
    <>
      <OnboardingShell
        progress={(index + 1) / steps.length}
        title={copy[key].title}
        helper={copy[key].helper}
        onBack={index > 0 ? back : undefined}
        onCancel={cancel}
        ctaLabel={isLast ? t("common.complete") : t("common.continue")}
        onCta={next}
        ctaDisabled={!valid}
        ctaLoading={loading}
        hideCta={key === "exam"}
        scroll={!selfScrolling}
      >
        {body()}
      </OnboardingShell>

      <InterestPicker
        visible={showInterestPicker}
        selected={interests}
        onSave={(next) => {
          setInterests(next);
          setShowInterestPicker(false);
        }}
        onClose={() => setShowInterestPicker(false)}
      />

      <Modal
        visible={pickerIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerIndex(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setPickerIndex(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t("setup.modal.title")}</Text>
            <Pressable style={styles.sheetRow} onPress={fromCamera}>
              <MaterialIcons name="photo-camera" size={22} color={colors.primary} />
              <Text style={styles.sheetRowText}>{t("setup.modal.camera")}</Text>
            </Pressable>
            <Pressable style={styles.sheetRow} onPress={fromLibrary}>
              <MaterialIcons name="photo-library" size={22} color={colors.primary} />
              <Text style={styles.sheetRowText}>{t("setup.modal.gallery")}</Text>
            </Pressable>
            <Pressable style={styles.sheetCancel} onPress={() => setPickerIndex(null)}>
              <Text style={styles.sheetCancelText}>{t("common.cancel")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sheetTitle: {
    ...textStyles.heading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 54,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  sheetRowText: { ...textStyles.label, color: colors.text },
  sheetCancel: { alignItems: "center", paddingVertical: spacing.md },
  sheetCancelText: { ...textStyles.label, color: colors.textSecondary },
});
