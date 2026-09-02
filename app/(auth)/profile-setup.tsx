import React, { useState, useRef, useEffect, useMemo } from "react";
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
    Animated,
    Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { RainBackground } from "@/src/components/RainBackground";
import { AnimatedStepIndicator } from "@/src/components/AnimatedStepIndicator";
import { api } from "@/src/services/api";
import { clearToken } from "@/src/services/authStore";
import { InterestPicker } from "@/src/components/InterestPicker";
// Languages are stored as ISO codes; the label shown is derived from the UI
// language so a Turkish and an English phone write the same value.
import { LANGUAGES, languageLabel, normalizeLanguages } from "@/src/data/languages";

type Purpose = "CONVERSATION" | "PRACTICE" | "COFFEE";
import { TrackStep, type Track } from "./steps/TrackStep";
import { ExamStep, type ExamOutcome } from "./steps/ExamStep";
type Gender = "MALE" | "FEMALE" | "OTHER";


const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ProfileSetupScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Form state
    // Apple returns the user's name only on the first authorization; the
    // welcome screen forwards it so this field is not blank for those users.
    const { suggestedName } = useLocalSearchParams<{ suggestedName?: string }>();
    const [displayName, setDisplayName] = useState(
        typeof suggestedName === "string" ? suggestedName : ""
    );
    const [birthYear, setBirthYear] = useState<string>("");
    const [gender, setGender] = useState<Gender | null>(null);
    const [purpose, setPurpose] = useState<Purpose>("CONVERSATION");
    const [track, setTrack] = useState<Track | null>(null);
    const [examOutcome, setExamOutcome] = useState<ExamOutcome | null>(null);
    const [languagesNative, setLanguagesNative] = useState<string[]>([]);
    const [languagesPractice, setLanguagesPractice] = useState<string[]>([]);
    const [photos, setPhotos] = useState<string[]>([]);
    const [bio, setBio] = useState("");
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [showInterestPicker, setShowInterestPicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showImagePickerModal, setShowImagePickerModal] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number; city?: string; country?: string } | null>(null);

    // Step management
    const [currentStep, setCurrentStep] = useState(1);
    // Adim listesi hatta gore degisir. Sabit bir sayi yerine anahtar
    // dizisi tutuyoruz: "4. adim" LANGUAGE'de sinav, DATE'te hakkinda
    // demek olurdu ve dogrulama ile render'in birbirinden ayrilmasi an
    // meselesiydi.
    const stepKeys = useMemo(
        () =>
            track === "LANGUAGE"
                ? (["track", "basics", "languages", "exam", "about", "photos"] as const)
                : (["track", "basics", "languages", "about", "photos"] as const),
        [track]
    );
    const totalSteps = stepKeys.length;
    const currentKey = stepKeys[currentStep - 1] ?? "track";

    // Animation for step transitions with flip effect
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const [isAnimating, setIsAnimating] = useState(false);
    const prevStep = useRef(1);
    const scrollViewRef = useRef<ScrollView>(null);

    // Animate step change with page flip effect
    useEffect(() => {
        if (prevStep.current !== currentStep) {
            setIsAnimating(true);
            const direction = currentStep > prevStep.current ? 1 : -1;

            // Reset values
            slideAnim.setValue(direction * SCREEN_WIDTH * 0.3);
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.9);
            rotateAnim.setValue(direction * 15);

            // Animate in with flip
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 50,
                    friction: 9,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.spring(rotateAnim, {
                    toValue: 0,
                    tension: 50,
                    friction: 9,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setIsAnimating(false);
            });

            prevStep.current = currentStep;

            // Scroll to top when step changes
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        }
    }, [currentStep]);

    const rotate = rotateAnim.interpolate({
        inputRange: [-15, 15],
        outputRange: ['-15deg', '15deg'],
    });

    const requestMediaLibraryPermissions = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert(
                t('setup.alerts.permission_required'),
                t('setup.alerts.gallery_permission')
            );
            return false;
        }
        return true;
    };

    const requestCameraPermissions = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            Alert.alert(
                t('setup.alerts.permission_required'),
                t('setup.alerts.camera_permission')
            );
            return false;
        }
        return true;
    };

    const requestLocationPermissions = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            Alert.alert(
                t('setup.alerts.permission_required'),
                t('setup.alerts.location_permission')
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
                country: address?.isoCountryCode || undefined,
            });
        } catch (error) {
            console.error("Location error:", error);
        }
    };

    React.useEffect(() => {
        getCurrentLocation();
    }, []);

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

    const toggleLanguageNative = (language: string) => {
        setLanguagesNative((prev) =>
            prev.includes(language)
                ? prev.filter((l) => l !== language)
                : [...prev, language]
        );
    };

    const toggleLanguagePractice = (language: string) => {
        setLanguagesPractice((prev) =>
            prev.includes(language)
                ? prev.filter((l) => l !== language)
                : [...prev, language]
        );
    };

    const handleCancel = () => {
        Alert.alert(
            t('setup.alerts.cancel_title'),
            t('setup.alerts.cancel_message'),
            [
                {
                    text: t('setup.alerts.no_keep'),
                    style: "cancel",
                },
                {
                    text: t('setup.alerts.yes_cancel'),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.logout();
                        } catch (error) {
                            // Ignore logout errors
                        }
                        await clearToken();
                        router.replace("/(auth)/welcome");
                    },
                },
            ]
        );
    };

    const validateStep = (step: number): boolean => {
        const key = stepKeys[step - 1];
        switch (key) {
            case "track":
                if (!track) {
                    Alert.alert(t('common.error'), t('setup.track.title'));
                    return false;
                }
                return true;
            case "exam":
                // Sinav adimi kendi ic akisini yonetir; "devam" dugmesi
                // sonuc ekraninda gorunur ve onComplete ile ilerletir.
                return examOutcome !== null;
            case "basics":
                if (!displayName.trim()) {
                    Alert.alert(t('common.error'), t('setup.alerts.name_required'));
                    return false;
                }
                if (displayName.trim().length < 2) {
                    Alert.alert(t('common.error'), t('setup.alerts.name_length'));
                    return false;
                }
                if (!birthYear || birthYear.length !== 4) {
                    Alert.alert(t('common.error'), t('setup.alerts.birth_required'));
                    return false;
                }
                const year = parseInt(birthYear);
                const currentYear = new Date().getFullYear();
                const minYear = currentYear - 100;
                const maxYear = currentYear - 18;
                if (isNaN(year) || year < minYear || year > maxYear) {
                    Alert.alert(t('common.error'), t('setup.alerts.birth_range', { min: minYear, max: maxYear }));
                    return false;
                }
                if (!gender) {
                    Alert.alert(t('common.error'), t('setup.alerts.gender_required'));
                    return false;
                }
                return true;
            case "languages":
                if (languagesNative.length === 0) {
                    Alert.alert(t('common.error'), t('setup.alerts.native_required'));
                    return false;
                }
                if (languagesPractice.length === 0) {
                    Alert.alert(t('common.error'), t('setup.alerts.practice_required'));
                    return false;
                }
                return true;
            case "about":
                return true;
            case "photos":
                if (photos.length === 0) {
                    Alert.alert(t('common.error'), t('setup.alerts.photo_required'));
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    /**
     * Dogrulamadan ilerletir.
     *
     * Sinav adimi kendi sonucunu yazip hemen ilerletmek istiyor. handleNext
     * cagirmak ise yaramazdi: validateStep bu tick'te henuz yazilmamis
     * examOutcome'i okuyup null gorur ve akis oldugu yerde kalirdi.
     */
    const advanceStep = () => {
        if (currentStep < totalSteps && !isAnimating) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleNext = () => {
        if (!validateStep(currentStep)) {
            return;
        }
        advanceStep();
    };

    const handleBack = () => {
        if (currentStep > 1 && !isAnimating) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleContinue = async () => {
        if (!validateStep(currentStep)) {
            return;
        }

        setLoading(true);
        try {
            // 1. Upload photos first
            const uploadedPhotos = await Promise.all(
                photos.map(async (photoUri) => {
                    // Check if it's already a remote URL (unlikely in setup, but good practice)
                    if (photoUri.startsWith("http")) return photoUri;

                    try {
                        const publicUrl = await api.uploadPhoto(photoUri);
                        return publicUrl;
                    } catch (error) {
                        console.error("Failed to upload photo:", photoUri, error);
                        // If upload fails, just return original URI or handle error?
                        // Better to fail loudly so user knows
                        throw new Error(t('setup.alerts.upload_error'));
                    }
                })
            );

            const year = parseInt(birthYear);
            await api.upsertMyProfile({
                displayName: displayName.trim(),
                birthYear: year,
                gender: gender || undefined,
                purpose: purpose,
                // Kayitta ilk secim bedava: sunucu create yolunda
                // trackChangedAt yazmiyor, yani bu secim 30 gun kuralina
                // takilmiyor.
                track: track ?? "DATE",
                languagesNative: languagesNative,
                languagesPractice: languagesPractice,
                photos: uploadedPhotos,
                bio: bio.trim() || undefined,
                interests: selectedInterests.length > 0 ? selectedInterests : undefined,
                // The reverse geocode already knows the country; it used to be
                // thrown away. Profile.country stayed null for every real user,
                // which quietly disabled the country filter, the premium
                // exclude-countries filter and the LOCAL/EUROPE ranking bonus.
                city: location?.city,
                country: location?.country,
                lat: location?.lat,
                lng: location?.lng,
            });

            router.replace("/(tabs)/home");
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : t('setup.alerts.save_error');
            Alert.alert(t('common.error'), errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.headerSection}>
                <Text style={styles.stepTitle}>{t('setup.step1.title')}</Text>
                <Text style={styles.stepSubtitle}>
                    {t('setup.step1.subtitle')}
                </Text>
            </View>

            {/* Display Name */}
            <View style={styles.section}>
                <Text style={styles.label}>{t('setup.step1.name_label')} *</Text>
                <View style={styles.inputContainer}>
                    <MaterialIcons
                        name="person-outline"
                        size={20}
                        color={colors.textSecondaryDark}
                        style={styles.inputIcon}
                    />
                    <TextInput
                        style={styles.textInput}
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder={t('setup.step1.name_placeholder')}
                        placeholderTextColor={colors.textSecondaryDark}
                        maxLength={40}
                    />
                </View>
            </View>

            {/* Birth Year */}
            <View style={styles.section}>
                <Text style={styles.label}>{t('setup.step1.birth_label')} *</Text>
                <View style={styles.inputContainer}>
                    <MaterialIcons
                        name="cake"
                        size={20}
                        color={colors.textSecondaryDark}
                        style={styles.inputIcon}
                    />
                    <TextInput
                        style={styles.textInput}
                        value={birthYear}
                        onChangeText={setBirthYear}
                        placeholder={t('setup.step1.birth_placeholder')}
                        placeholderTextColor={colors.textSecondaryDark}
                        keyboardType="number-pad"
                        maxLength={4}
                    />
                </View>
            </View>

            {/* Gender */}
            <View style={styles.section}>
                <Text style={styles.label}>{t('setup.step1.gender_label')} *</Text>
                <View style={styles.optionGrid}>
                    {(["MALE", "FEMALE", "OTHER"] as Gender[]).map((g) => (
                        <TouchableOpacity
                            key={g}
                            style={[
                                styles.optionCard,
                                gender === g && styles.optionCardSelected,
                            ]}
                            onPress={() => setGender(g)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.optionContent}>
                                <Text style={styles.optionEmoji}>
                                    {g === "MALE" ? "👨" : g === "FEMALE" ? "👩" : "🌈"}
                                </Text>
                                <Text
                                    style={[
                                        styles.optionText,
                                        gender === g && styles.optionTextSelected,
                                    ]}
                                >
                                    {t(`setup.step1.gender_${g.toLowerCase()}`)}
                                </Text>
                            </View>
                            {gender === g && (
                                <View style={styles.checkmark}>
                                    <MaterialIcons name="check" size={16} color="#FFF" />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Purpose — yalnizca DATE hattinda.
                LANGUAGE hattinda purpose PRACTICE'e sabitleniyor; oradaki
                bir kullaniciya "amacin ne" diye sormak, zaten cevapladigi
                bir soruyu ikinci kez sormaktir. */}
            {track !== "LANGUAGE" && (
            <View style={styles.section}>
                <Text style={styles.label}>{t('setup.step1.purpose_label')} *</Text>
                <View style={styles.optionGrid}>
                    {(["CONVERSATION", "COFFEE"] as Purpose[]).map((p) => (
                        <TouchableOpacity
                            key={p}
                            style={[
                                styles.optionCard,
                                purpose === p && styles.optionCardSelected,
                            ]}
                            onPress={() => setPurpose(p)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.optionContent}>
                                <Text style={styles.optionEmoji}>
                                    {p === "CONVERSATION" ? "💬" : p === "PRACTICE" ? "📚" : "☕"}
                                </Text>
                                <Text
                                    style={[
                                        styles.optionText,
                                        purpose === p && styles.optionTextSelected,
                                    ]}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.7}
                                >
                                    {t(`setup.step1.purpose_${p.toLowerCase()}`)}
                                </Text>
                            </View>
                            {purpose === p && (
                                <View style={styles.checkmark}>
                                    <MaterialIcons name="check" size={16} color="#FFF" />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            )}
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.headerSection}>
                <Text style={styles.stepTitle}>{t('setup.step2.title')}</Text>
                <Text style={styles.stepSubtitle}>
                    {t('setup.step2.subtitle')}
                </Text>
            </View>

            {/* Native Languages */}
            <View style={styles.section}>
                <Text style={styles.label}>{t('setup.step2.native_label')} *</Text>
                <Text style={styles.helperText}>
                    {t('setup.step2.native_helper')}
                </Text>
                <View style={styles.tagsContainer}>
                    {LANGUAGES.map(({ code: lang }) => {
                        const isSelected = languagesNative.includes(lang);
                        return (
                            <TouchableOpacity
                                key={lang}
                                style={[
                                    styles.tag,
                                    isSelected && styles.tagSelectedPrimary,
                                ]}
                                onPress={() => toggleLanguageNative(lang)}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.tagText,
                                        isSelected && styles.tagTextSelected,
                                    ]}
                                >
                                    {languageLabel(lang, i18n.language)}
                                </Text>
                                {isSelected && (
                                    <MaterialIcons name="check-circle" size={16} color="#FFF" style={styles.tagIcon} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Practice Languages */}
            <View style={styles.section}>
                <Text style={styles.label}>{t('setup.step2.practice_label')} *</Text>
                <Text style={styles.helperText}>
                    {t('setup.step2.practice_helper')}
                </Text>
                <View style={styles.tagsContainer}>
                    {LANGUAGES.map(({ code: lang }) => {
                        const isSelected = languagesPractice.includes(lang);
                        return (
                            <TouchableOpacity
                                key={lang}
                                style={[
                                    styles.tag,
                                    isSelected && styles.tagSelectedAccent,
                                ]}
                                onPress={() => toggleLanguagePractice(lang)}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.tagText,
                                        isSelected && styles.tagTextSelected,
                                    ]}
                                >
                                    {languageLabel(lang, i18n.language)}
                                </Text>
                                {isSelected && (
                                    <MaterialIcons name="check-circle" size={16} color="#FFF" style={styles.tagIcon} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.headerSection}>
                <Text style={styles.stepTitle}>{t('setup.step3.title')}</Text>
                <Text style={styles.stepSubtitle}>
                    {t('setup.step3.subtitle')}
                </Text>
            </View>

            {/* Bio */}
            <View style={styles.section}>
                <Text style={styles.label}>{t('setup.step3.bio_label')}</Text>
                <View style={styles.bioCard}>
                    <TextInput
                        style={styles.bioInput}
                        value={bio}
                        onChangeText={setBio}
                        placeholder={t('setup.step3.bio_placeholder')}
                        placeholderTextColor={colors.textSecondaryDark}
                        multiline
                        maxLength={500}
                        numberOfLines={6}
                        textAlignVertical="top"
                    />
                    <View style={styles.bioFooter}>
                        <MaterialIcons
                            name="auto-awesome"
                            size={18}
                            color={colors.primary}
                        />
                        <Text style={styles.charCount}>
                            {bio.length}/500
                        </Text>
                    </View>
                </View>
            </View>

            {/* Interests */}
            <View style={styles.section}>
                <Text style={styles.label}>{t('setup.step3.interests_label')}</Text>
                <Text style={styles.helperText}>
                    {t('setup.step3.interests_helper')}
                </Text>
                <View style={styles.tagsContainer}>
                    {selectedInterests.map((interest) => (
                        <TouchableOpacity
                            key={interest}
                            style={[styles.tag, styles.interestTag, styles.tagSelectedAccent]}
                            onPress={() => toggleInterest(interest)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tagText, styles.tagTextSelected]}>
                                {t(`interests.${interest}`, { defaultValue: interest })}
                            </Text>
                            <MaterialIcons name="close" size={16} color="#FFF" style={styles.tagIcon} />
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={[styles.tag, styles.interestTag]}
                        onPress={() => setShowInterestPicker(true)}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="add" size={16} color={colors.primaryTintText} />
                        <Text style={[styles.tagText, { color: colors.primaryTintText }]}>
                            {t('interest_picker.title')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <InterestPicker
                visible={showInterestPicker}
                selected={selectedInterests}
                onClose={() => setShowInterestPicker(false)}
                onSave={setSelectedInterests}
            />
        </View>
    );

    const renderStep4 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.headerSection}>
                <Text style={styles.stepTitle}>{t('setup.step4.title')}</Text>
                <Text style={styles.stepSubtitle}>
                    {t('setup.step4.subtitle')}
                </Text>
            </View>

            <View style={styles.photosGrid}>
                {[0, 1, 2].map((index) => {
                    const hasPhoto = !!photos[index];
                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.photoCard,
                                !hasPhoto && styles.photoCardEmpty,
                                index === 0 && styles.photoCardLarge,
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
                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                                        style={styles.photoGradient}
                                    />
                                    {index === 0 && (
                                        <View style={styles.coverBadge}>
                                            <MaterialIcons name="star" size={14} color="#FFD700" />
                                            <Text style={styles.coverBadgeText}>{t('setup.step4.cover_photo')}</Text>
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={styles.removePhotoButton}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            removePhoto(index);
                                        }}
                                    >
                                        <MaterialIcons name="close" size={18} color="#FFF" />
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <View style={styles.photoPlaceholder}>
                                    <View style={styles.addIconContainer}>
                                        <MaterialIcons
                                            name="add-a-photo"
                                            size={index === 0 ? 36 : 28}
                                            color={colors.primary}
                                        />
                                    </View>
                                    <Text style={[
                                        styles.addPhotoText,
                                        index === 0 && styles.addPhotoTextLarge
                                    ]}>
                                        {index === 0
                                            ? t('setup.step4.photo_placeholder_cover')
                                            : t('setup.step4.photo_placeholder_other', { index: index + 1 })}
                                    </Text>
                                    <Text style={styles.addPhotoHint}>
                                        {index === 0
                                            ? t('setup.step4.add_hint_cover')
                                            : t('setup.step4.add_hint_other')}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.photoTip}>
                <MaterialIcons name="info-outline" size={20} color={colors.primary} />
                <Text style={styles.photoTipText}>
                    {t('setup.step4.tip')}
                </Text>
            </View>
        </View>
    );

    const renderCurrentStep = () => {
        switch (currentKey) {
            case "track":
                return (
                    <TrackStep
                        value={track}
                        onChange={(next) => {
                            setTrack(next);
                            // Purpose yalnizca DATE hattinda anlamli.
                            // LANGUAGE'de PRACTICE'e sabitleniyor ve secici
                            // gizleniyor; kullaniciya anlamsiz bir soru
                            // sormuyoruz.
                            setPurpose(next === "LANGUAGE" ? "PRACTICE" : "CONVERSATION");
                        }}
                    />
                );
            case "basics":
                return renderStep1();
            case "languages":
                return renderStep2();
            case "exam":
                return (
                    <ExamStep
                        language={languagesPractice[0] ?? "en"}
                        onComplete={(outcome) => {
                            setExamOutcome(outcome);
                            advanceStep();
                        }}
                    />
                );
            case "about":
                return renderStep3();
            case "photos":
                return renderStep4();
            default:
                return renderStep1();
        }
    };

    return (
        <View style={styles.container}>
            <RainBackground />

            <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
                <KeyboardAvoidingView
                    style={styles.keyboardView}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={0}
                >
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.scrollView}
                        contentContainerStyle={[
                            styles.scrollContent,
                            { paddingBottom: insets.bottom + 100 },
                        ]}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Animated Step Indicator */}
                        <AnimatedStepIndicator
                            currentStep={currentStep}
                            totalSteps={totalSteps}
                        />

                        {/* Step Content with Page Flip Animation */}
                        <Animated.View
                            style={[
                                styles.stepWrapper,
                                {
                                    transform: [
                                        { translateX: slideAnim },
                                        { scale: scaleAnim },
                                        { perspective: 1000 },
                                        { rotateY: rotate },
                                    ],
                                    opacity: fadeAnim,
                                },
                            ]}
                        >
                            {renderCurrentStep()}
                        </Animated.View>
                    </ScrollView>

                    {/* Fixed Bottom Navigation
                        Sinav adiminda gizli: ExamStep kendi ilerleme
                        dugmesini yonetiyor ve iki "devam" dugmesi ayni
                        ekranda birbiriyle celisirdi. */}
                    {currentKey !== "exam" && (
                    <View style={[
                        styles.bottomNav
                    ]}>
                        <View style={styles.navButtons}>
                            {currentStep > 1 && (
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={handleBack}
                                    disabled={loading || isAnimating}
                                    activeOpacity={0.7}
                                >
                                    <MaterialIcons name="arrow-back" size={22} color={colors.textDark} />
                                    <Text style={styles.backButtonText}>{t('common.back')}</Text>
                                </TouchableOpacity>
                            )}

                            {currentStep < totalSteps ? (
                                <TouchableOpacity
                                    style={[
                                        styles.nextButton,
                                        currentStep === 1 && styles.nextButtonFullWidth
                                    ]}
                                    onPress={handleNext}
                                    disabled={loading || isAnimating}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={[colors.primary, colors.primaryLight]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.nextButtonGradient}
                                    >
                                        <Text style={styles.nextButtonText}>{t('common.continue')}</Text>
                                        <MaterialIcons name="arrow-forward" size={22} color="#FFF" />
                                    </LinearGradient>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[
                                        styles.nextButton,
                                        currentStep === 1 && styles.nextButtonFullWidth
                                    ]}
                                    onPress={handleContinue}
                                    disabled={loading || isAnimating}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={[colors.primary, colors.primaryLight]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.nextButtonGradient}
                                    >
                                        {loading ? (
                                            <Text style={styles.nextButtonText}>{t('common.saving')}</Text>
                                        ) : (
                                            <>
                                                <Text style={styles.nextButtonText}>{t('common.complete')}</Text>
                                                <MaterialIcons name="check-circle" size={22} color="#FFF" />
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancel}
                            disabled={loading || isAnimating}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>

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
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('setup.modal.title')}</Text>
                            <Text style={styles.modalSubtitle}>
                                {t('setup.modal.subtitle')}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.modalOption}
                            onPress={handleCameraPress}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.modalIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                                <MaterialIcons name="camera-alt" size={26} color={colors.primary} />
                            </View>
                            <View style={styles.modalOptionContent}>
                                <Text style={styles.modalOptionText}>{t('setup.modal.camera')}</Text>
                                <Text style={styles.modalOptionDesc}>{t('setup.modal.camera_desc')}</Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondaryDark} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalOption}
                            onPress={handleGalleryPress}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.modalIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                                <MaterialIcons name="photo-library" size={26} color={colors.primary} />
                            </View>
                            <View style={styles.modalOptionContent}>
                                <Text style={styles.modalOptionText}>{t('setup.modal.gallery')}</Text>
                                <Text style={styles.modalOptionDesc}>{t('setup.modal.gallery_desc')}</Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondaryDark} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalCancelButton}
                            onPress={handleCloseModal}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    safeArea: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
    },

    // Step Wrapper
    stepWrapper: {
        flex: 1,
    },
    stepContainer: {
        gap: spacing.lg,
    },

    // Header Section
    headerSection: {
        marginBottom: spacing.md,
    },
    stepTitle: {
        fontSize: typography.fontSize["3xl"],
        fontWeight: typography.fontWeight.bold,
        color: colors.textDark,
        marginBottom: spacing.xs,
        letterSpacing: -0.5,
    },
    stepSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.textSecondaryDark,
        lineHeight: 22,
    },

    // Section
    section: {
        gap: spacing.sm,
    },
    label: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.textDark,
        marginBottom: spacing.xs,
    },
    helperText: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondaryDark,
        marginBottom: spacing.xs,
    },

    // Input Container
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.backgroundSecondaryDark,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.borderDark,
        paddingHorizontal: spacing.md,
        height: 56,
    },
    inputIcon: {
        marginRight: spacing.sm,
    },
    textInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.textDark,
        fontWeight: typography.fontWeight.medium,
    },

    // Option Grid
    optionGrid: {
        flexDirection: "row",
        gap: spacing.md,
    },
    optionCard: {
        flex: 1,
        backgroundColor: colors.backgroundSecondaryDark,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.borderDark,
        padding: spacing.md,
        minHeight: 80,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    optionCardSelected: {
        backgroundColor: `${colors.primary}20`,
        borderColor: colors.primary,
    },
    optionContent: {
        alignItems: "center",
        gap: spacing.xs,
    },
    optionEmoji: {
        fontSize: 32,
    },
    optionText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textDark,
        textAlign: "center",
    },
    optionTextSelected: {
        color: colors.primary,
    },
    checkmark: {
        position: "absolute",
        top: spacing.xs,
        right: spacing.xs,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },

    // Tags
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm,
    },
    tag: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 24,
        backgroundColor: colors.backgroundSecondaryDark,
        borderWidth: 1.5,
        borderColor: colors.borderDark,
    },
    tagSelectedPrimary: {
        backgroundColor: `${colors.primary}20`,
        borderColor: colors.primary,
    },
    // "Learning" chips, distinct from the purple "speaks" chips. Not the pink
    // accent: at 20% over the dark background it reads as a red error pill.
    tagSelectedAccent: {
        backgroundColor: `${colors.favoriteBlue}20`,
        borderColor: colors.favoriteBlue,
    },
    tagText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textDark,
    },
    tagTextSelected: {
        color: colors.textDark,
    },
    tagIcon: {
        marginLeft: -2,
    },
    interestTag: {
        // Additional styling for interest tags if needed
    },

    // Bio
    bioCard: {
        backgroundColor: colors.backgroundSecondaryDark,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.borderDark,
        padding: spacing.md,
    },
    bioInput: {
        fontSize: typography.fontSize.base,
        color: colors.textDark,
        minHeight: 120,
        textAlignVertical: "top",
        lineHeight: 22,
    },
    bioFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.borderDark,
    },
    charCount: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textSecondaryDark,
    },

    // Photos
    photosGrid: {
        flexDirection: "row",
        gap: spacing.md,
    },
    photoCard: {
        width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 2) / 3,
        height: 140,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: colors.backgroundSecondaryDark,
        borderWidth: 1.5,
        borderColor: colors.borderDark,
    },
    photoCardEmpty: {
        borderStyle: "dashed",
    },
    photoCardLarge: {
        width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 2) / 3,
    },
    photoImage: {
        width: "100%",
        height: "100%",
    },
    photoGradient: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "50%",
    },
    coverBadge: {
        position: "absolute",
        top: spacing.sm,
        left: spacing.sm,
        right: spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        paddingHorizontal: spacing.xs,
        paddingVertical: 4,
        borderRadius: 6,
    },
    coverBadgeText: {
        fontSize: 9,
        fontWeight: typography.fontWeight.bold,
        color: "#FFD700",
        letterSpacing: 0.5,
    },
    removePhotoButton: {
        position: "absolute",
        top: spacing.sm,
        right: spacing.sm,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        justifyContent: "center",
        alignItems: "center",
    },
    photoPlaceholder: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: spacing.xs,
    },
    addIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${colors.primary}15`,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.xs,
    },
    addPhotoText: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.bold,
        color: colors.textDark,
        textAlign: "center",
    },
    addPhotoTextLarge: {
        fontSize: typography.fontSize.sm,
    },
    addPhotoHint: {
        fontSize: 10,
        color: colors.textSecondaryDark,
        textAlign: "center",
    },
    photoTip: {
        flexDirection: "row",
        gap: spacing.sm,
        backgroundColor: `${colors.primary}10`,
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
    },
    photoTipText: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        color: colors.textSecondaryDark,
        lineHeight: 20,
    },

    // Bottom Navigation
    bottomNav: {
        backgroundColor: 'transparent',
        paddingTop: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    navButtons: {
        flexDirection: "row",
        gap: spacing.md,
        marginBottom: spacing.xs,
        height: 52,
    },
    backButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        backgroundColor: colors.backgroundSecondaryDark,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.borderDark,
        paddingVertical: spacing.md,
    },
    backButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
        color: colors.textDark,
    },
    nextButton: {
        flex: 1,
        borderRadius: 14,
        overflow: "hidden",
    },
    nextButtonFullWidth: {
        flex: 1,
    },
    nextButtonGradient: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        paddingVertical: spacing.md,
    },
    nextButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
        color: "#FFF",
    },
    cancelButton: {
        alignItems: "center",
        paddingTop: spacing.xs,
        paddingBottom: 0,
    },
    cancelButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.textSecondaryDark,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: colors.backgroundSecondaryDark,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.xl,
        borderTopWidth: 1,
        borderColor: colors.borderDark,
    },
    modalHeader: {
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontSize: typography.fontSize["2xl"],
        fontWeight: typography.fontWeight.bold,
        color: colors.textDark,
        marginBottom: spacing.xs,
    },
    modalSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondaryDark,
    },
    modalOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        backgroundColor: colors.backgroundDark,
        borderRadius: 14,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderDark,
    },
    modalIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: "center",
        alignItems: "center",
    },
    modalOptionContent: {
        flex: 1,
    },
    modalOptionText: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
        color: colors.textDark,
        marginBottom: 2,
    },
    modalOptionDesc: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondaryDark,
    },
    modalCancelButton: {
        marginTop: spacing.sm,
        paddingVertical: spacing.md,
        alignItems: "center",
    },
    modalCancelText: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
        color: colors.textSecondaryDark,
    },
});