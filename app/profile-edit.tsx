import React, { useState, useEffect } from "react";
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
  Image,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { RainBackground } from "@/src/components/RainBackground";
import { api } from "@/src/services/api";

type Purpose = "CONVERSATION" | "PRACTICE" | "COFFEE";

const LANGUAGES = [
  "Türkçe",
  "İngilizce",
  "Almanca",
  "Fransızca",
  "İspanyolca",
  "İtalyanca",
  "Rusça",
  "Arapça",
  "Japonca",
  "Korece",
  "Çince",
  "Portekizce",
  "Hollandaca",
  "Yunanca",
  "İsveççe",
  "Norveççe",
  "Fince",
  "Lehçe",
  "Çekçe",
  "Macarca",
];

const INTERESTS = [
  "Müzik",
  "Seyahat",
  "Sanat",
  "Dil Öğrenimi",
  "Yemek",
  "Fotoğrafçılık",
  "Spor",
  "Kitap",
  "Sinema",
  "Teknoloji",
];

export default function ProfileEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState("");
  const [birthYear, setBirthYear] = useState<string>("");
  const [purpose, setPurpose] = useState<Purpose>("CONVERSATION");
  const [languagesNative, setLanguagesNative] = useState<string[]>([]);
  const [languagesPractice, setLanguagesPractice] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; city?: string } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await api.getMyProfile();
      setDisplayName(profile.displayName);
      setBirthYear(profile.birthYear?.toString() || "");
      setPurpose(profile.purpose);
      setLanguagesNative(profile.languagesNative || []);
      setLanguagesPractice(profile.languagesPractice || []);
      setPhotos(profile.photos || []);
      setBio(profile.bio || "");
      setSelectedInterests(profile.interests || []);
      if (profile.city) {
        setLocation({ lat: 0, lng: 0, city: profile.city });
      }
    } catch (error) {
      Alert.alert("Hata", "Profil yüklenemedi");
      router.back();
    } finally {
      setLoadingProfile(false);
    }
  };

  const requestMediaLibraryPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "İzin Gerekli",
        "Fotoğraf seçmek için galeri erişim izni gereklidir."
      );
      return false;
    }
    return true;
  };

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "İzin Gerekli",
        "Fotoğraf çekmek için kamera erişim izni gereklidir."
      );
      return false;
    }
    return true;
  };

  const pickImageFromLibrary = async (index: number) => {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newPhotos = [...photos];
      if (index < newPhotos.length) {
        newPhotos[index] = result.assets[0].uri;
      } else {
        newPhotos.push(result.assets[0].uri);
      }
      setPhotos(newPhotos.slice(0, 3));
    }
  };

  const takePhotoWithCamera = async (index: number) => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newPhotos = [...photos];
      if (index < newPhotos.length) {
        newPhotos[index] = result.assets[0].uri;
      } else {
        newPhotos.push(result.assets[0].uri);
      }
      setPhotos(newPhotos.slice(0, 3));
    }
  };

  const showImagePickerOptions = (index: number) => {
    setSelectedPhotoIndex(index);
    setShowImagePickerModal(true);
  };

  const handleCameraPress = () => {
    setShowImagePickerModal(false);
    if (selectedPhotoIndex !== null) {
      takePhotoWithCamera(selectedPhotoIndex);
    }
    setSelectedPhotoIndex(null);
  };

  const handleGalleryPress = () => {
    setShowImagePickerModal(false);
    if (selectedPhotoIndex !== null) {
      pickImageFromLibrary(selectedPhotoIndex);
    }
    setSelectedPhotoIndex(null);
  };

  const handleCloseModal = () => {
    setShowImagePickerModal(false);
    setSelectedPhotoIndex(null);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const toggleLanguagePractice = (language: string) => {
    setLanguagesPractice((prev) =>
      prev.includes(language)
        ? prev.filter((l) => l !== language)
        : [...prev, language]
    );
  };

  const requestLocationPermissions = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "İzin Gerekli",
        "Yakınındaki insanları görmek için konum erişim izni gereklidir."
      );
      return false;
    }
    return true;
  };

  const getCurrentLocation = async () => {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) return;

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
      });
    } catch (error) {
      console.error("Location error:", error);
      Alert.alert("Hata", "Konum alınamadı");
    }
  };

  const handleSave = async () => {
    if (languagesPractice.length === 0) {
      Alert.alert("Uyarı", "Lütfen en az bir öğrenmek istediğiniz dil seçin");
      return;
    }

    setLoading(true);
    try {
      await api.upsertMyProfile({
        displayName: displayName.trim(), // Cannot change but required
        birthYear: birthYear ? parseInt(birthYear) : undefined, // Cannot change but required
        purpose: purpose,
        languagesNative: languagesNative, // Cannot change but required
        languagesPractice: languagesPractice,
        photos: photos,
        bio: bio.trim() || undefined,
        interests: selectedInterests.length > 0 ? selectedInterests : undefined,
        city: location?.city,
        lat: location?.lat,
        lng: location?.lng,
      });

      Alert.alert("Başarılı", "Profil güncellendi");
      router.back();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Profil güncellenemedi";
      Alert.alert("Hata", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <RainBackground />
      
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={24} color={colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profili Düzenle</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Display Name - Read Only */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İsim</Text>
            <TextInput
              style={[styles.textInput, styles.readOnlyInput]}
              value={displayName}
              editable={false}
              placeholderTextColor={colors.textSecondaryDark}
            />
            <Text style={styles.readOnlyNote}>İsim değiştirilemez</Text>
          </View>

          {/* Birth Year - Read Only */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Doğum Yılı</Text>
            <TextInput
              style={[styles.textInput, styles.readOnlyInput]}
              value={birthYear}
              editable={false}
              placeholderTextColor={colors.textSecondaryDark}
            />
            <Text style={styles.readOnlyNote}>Doğum yılı değiştirilemez</Text>
          </View>

          {/* Native Languages - Read Only */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ana Dillerin</Text>
            <View style={styles.languagesContainer}>
              {languagesNative.map((lang) => (
                <View key={lang} style={[styles.languageTag, styles.readOnlyTag]}>
                  <Text style={styles.languageText}>{lang}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.readOnlyNote}>Ana diller değiştirilemez</Text>
          </View>

          {/* Purpose Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Arayışın Ne?</Text>
            <View style={styles.purposeContainer}>
              {(["CONVERSATION", "PRACTICE", "COFFEE"] as Purpose[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.purposeOption,
                    purpose === p && styles.purposeOptionSelected,
                  ]}
                  onPress={() => setPurpose(p)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.purposeText,
                      purpose === p && styles.purposeTextSelected,
                    ]}
                  >
                    {p === "CONVERSATION"
                      ? "💬 Sohbet"
                      : p === "PRACTICE"
                      ? "📚 Pratik"
                      : "☕ Kahve"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Practice Languages Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Öğrenmek İstediğin Diller *</Text>
            <Text style={styles.sectionSubtitle}>
              Pratik yapmak istediğin dilleri seç
            </Text>
            <View style={styles.languagesContainer}>
              {LANGUAGES.map((lang) => {
                const isSelected = languagesPractice.includes(lang);
                return (
                  <TouchableOpacity
                    key={lang}
                    style={[
                      styles.languageTag,
                      isSelected && styles.languageTagSelected,
                    ]}
                    onPress={() => toggleLanguagePractice(lang)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.languageText,
                        isSelected && styles.languageTextSelected,
                      ]}
                    >
                      {lang}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Photo Selection Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fotoğraflar</Text>
            <View style={styles.photosContainer}>
              {[0, 1, 2].map((index) => {
                const hasPhoto = !!photos[index];
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.photoSlot,
                      !hasPhoto && styles.photoSlotEmpty,
                    ]}
                    onPress={() => showImagePickerOptions(index)}
                    activeOpacity={0.8}
                  >
                    {hasPhoto ? (
                      <>
                        <Image
                          source={{ uri: photos[index] }}
                          style={styles.photoImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            removePhoto(index);
                          }}
                        >
                          <MaterialIcons name="close" size={16} color="#FFF" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <MaterialIcons
                          name="add"
                          size={32}
                          color={colors.accent}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* About Me Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kendinden Bahset</Text>
            <View style={styles.bioContainer}>
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={setBio}
                placeholder="İnsanlara senden bahset..."
                placeholderTextColor={colors.textSecondaryDark}
                multiline
                maxLength={500}
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{bio.length}/500</Text>
            </View>
          </View>

          {/* Interests Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İlgi Alanları</Text>
            <View style={styles.interestsContainer}>
              {INTERESTS.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <TouchableOpacity
                    key={interest}
                    style={[
                      styles.interestTag,
                      isSelected && styles.interestTagSelected,
                    ]}
                    onPress={() => toggleInterest(interest)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.interestText,
                        isSelected && styles.interestTextSelected,
                      ]}
                    >
                      {interest}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Konum</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={getCurrentLocation}
              activeOpacity={0.7}
            >
              <MaterialIcons name="location-on" size={20} color={colors.primary} />
              <Text style={styles.locationButtonText}>
                {location?.city || "Konum Güncelle"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePickerModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Fotoğraf Seç</Text>
            <Text style={styles.modalSubtitle}>
              Fotoğrafı nereden seçmek istersiniz?
            </Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleCameraPress}
              activeOpacity={0.7}
            >
              <View style={styles.modalOptionIcon}>
                <MaterialIcons name="camera-alt" size={24} color={colors.primary} />
              </View>
              <Text style={styles.modalOptionText}>Kamera</Text>
              <MaterialIcons name="chevron-right" size={24} color={colors.textSecondaryDark} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleGalleryPress}
              activeOpacity={0.7}
            >
              <View style={styles.modalOptionIcon}>
                <MaterialIcons name="photo-library" size={24} color={colors.primary} />
              </View>
              <Text style={styles.modalOptionText}>Galeri</Text>
              <MaterialIcons name="chevron-right" size={24} color={colors.textSecondaryDark} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={handleCloseModal}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.textDark,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    marginBottom: spacing.md,
  },
  textInput: {
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textDark,
    marginTop: spacing.sm,
  },
  readOnlyInput: {
    opacity: 0.6,
  },
  readOnlyNote: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondaryDark,
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
  purposeContainer: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  purposeOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondaryDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    alignItems: "center",
  },
  purposeOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  purposeText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textDark,
  },
  purposeTextSelected: {
    color: "#FFF",
  },
  languagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  languageTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondaryDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  languageTagSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  readOnlyTag: {
    opacity: 0.6,
  },
  languageText: {
    fontSize: typography.fontSize.sm,
    color: colors.textDark,
    fontWeight: typography.fontWeight.medium,
  },
  languageTextSelected: {
    color: "#FFF",
  },
  photosContainer: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  photoSlot: {
    width: 100,
    height: 130,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.backgroundSecondaryDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  photoSlotEmpty: {
    borderStyle: "dashed",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  editButton: {
    position: "absolute",
    bottom: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  bioContainer: {
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  bioInput: {
    fontSize: typography.fontSize.base,
    color: colors.textDark,
    minHeight: 120,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondaryDark,
    marginTop: spacing.sm,
    textAlign: "right",
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  interestTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondaryDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  interestTagSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  interestText: {
    fontSize: typography.fontSize.sm,
    color: colors.textDark,
    fontWeight: typography.fontWeight.medium,
  },
  interestTextSelected: {
    color: "#FFF",
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  locationButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.textDark,
    fontWeight: typography.fontWeight.medium,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  saveButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: "#FFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondaryDark,
    borderRadius: 20,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textDark,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondaryDark,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundDark,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  modalOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}20`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  modalOptionText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textDark,
  },
  modalCancelButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondaryDark,
  },
});

