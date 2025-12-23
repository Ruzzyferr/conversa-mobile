import React, { useState, useRef, useEffect } from "react";
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
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { RainBackground } from "@/src/components/RainBackground";
import { AnimatedStepIndicator } from "@/src/components/AnimatedStepIndicator";
import { api } from "@/src/services/api";
import { clearToken } from "@/src/services/authStore";

type Purpose = "CONVERSATION" | "PRACTICE" | "COFFEE";
type Gender = "MALE" | "FEMALE" | "OTHER";

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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ProfileSetupScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Form state
    const [displayName, setDisplayName] = useState("");
    const [birthYear, setBirthYear] = useState<string>("");
    const [gender, setGender] = useState<Gender | null>(null);
    const [purpose, setPurpose] = useState<Purpose>("CONVERSATION");
    const [languagesNative, setLanguagesNative] = useState<string[]>([]);
    const [languagesPractice, setLanguagesPractice] = useState<string[]>([]);
    const [photos, setPhotos] = useState<string[]>([]);
    const [bio, setBio] = useState("");
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [showImagePickerModal, setShowImagePickerModal] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number; city?: string } | null>(null);

    // Step management
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 4;

    // Animation for step transitions with flip effect
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const [isAnimating, setIsAnimating] = useState(false);
    const prevStep = useRef(1);

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
            "İptal Et",
            "Profil oluşturmayı iptal etmek istediğine emin misin? Tüm bilgiler kaybolacak.",
            [
                {
                    text: "Hayır",
                    style: "cancel",
                },
                {
                    text: "Evet, İptal Et",
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
        switch (step) {
            case 1:
                if (!displayName.trim()) {
                    Alert.alert("Uyarı", "Lütfen isminizi girin");
                    return false;
                }
                if (displayName.trim().length < 2) {
                    Alert.alert("Uyarı", "İsim en az 2 karakter olmalıdır");
                    return false;
                }
                if (!birthYear || birthYear.length !== 4) {
                    Alert.alert("Uyarı", "Lütfen geçerli bir doğum yılı girin (örn: 1990)");
                    return false;
                }
                const year = parseInt(birthYear);
                const currentYear = new Date().getFullYear();
                const minYear = currentYear - 100;
                const maxYear = currentYear - 18;
                if (isNaN(year) || year < minYear || year > maxYear) {
                    Alert.alert("Uyarı", `Doğum yılı ${minYear} ile ${maxYear} arasında olmalıdır`);
                    return false;
                }
                if (!gender) {
                    Alert.alert("Uyarı", "Lütfen cinsiyetinizi seçin");
                    return false;
                }
                return true;
            case 2:
                if (languagesNative.length === 0) {
                    Alert.alert("Uyarı", "Lütfen en az bir ana dil seçin");
                    return false;
                }
                if (languagesPractice.length === 0) {
                    Alert.alert("Uyarı", "Lütfen en az bir öğrenmek istediğiniz dil seçin");
                    return false;
                }
                return true;
            case 3:
                return true;
            case 4:
                if (photos.length === 0) {
                    Alert.alert("Uyarı", "Lütfen en az bir fotoğraf seçin");
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (!validateStep(currentStep)) {
            return;
        }
        if (currentStep < totalSteps && !isAnimating) {
            setCurrentStep(currentStep + 1);
        }
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
            const year = parseInt(birthYear);
            await api.upsertMyProfile({
                displayName: displayName.trim(),
                birthYear: year,
                gender: gender || undefined,
                purpose: purpose,
                languagesNative: languagesNative,
                languagesPractice: languagesPractice,
                photos: photos,
                bio: bio.trim() || undefined,
                interests: selectedInterests.length > 0 ? selectedInterests : undefined,
                city: location?.city,
                lat: location?.lat,
                lng: location?.lng,
            });

            router.replace("/(tabs)/home");
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : "Profil kaydedilemedi";
            Alert.alert("Hata", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.headerSection}>
                <Text style={styles.stepTitle}>Adın ve Doğum Tarihin</Text>
                <Text style={styles.stepSubtitle}>
                    Başlamak için temel bilgilerine ihtiyacımız var
                </Text>
            </View>

            {/* Display Name */}
            <View style={styles.section}>
                <Text style={styles.label}>İsmin Nedir? *</Text>
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
                        placeholder="İsmini gir"
                        placeholderTextColor={colors.textSecondaryDark}
                        maxLength={40}
                    />
                </View>
            </View>

            {/* Birth Year */}
            <View style={styles.section}>
                <Text style={styles.label}>Doğum Yılın? *</Text>
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
                        placeholder="Örn: 1990"
                        placeholderTextColor={colors.textSecondaryDark}
                        keyboardType="number-pad"
                        maxLength={4}
                    />
                </View>
            </View>

            {/* Gender */}
            <View style={styles.section}>
                <Text style={styles.label}>Cinsiyetin? *</Text>
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
                                    {g === "MALE" ? "Erkek" : g === "FEMALE" ? "Kadın" : "Diğer"}
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

            {/* Purpose */}
            <View style={styles.section}>
                <Text style={styles.label}>Arayışın Ne? *</Text>
                <View style={styles.optionGrid}>
                    {(["CONVERSATION", "PRACTICE", "COFFEE"] as Purpose[]).map((p) => (
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
                                >
                                    {p === "CONVERSATION" ? "Sohbet" : p === "PRACTICE" ? "Pratik" : "Kahve"}
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
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.headerSection}>
                <Text style={styles.stepTitle}>Dillerin</Text>
                <Text style={styles.stepSubtitle}>
                    Hangi dilleri konuşuyorsun ve hangilerini öğrenmek istiyorsun?
                </Text>
            </View>

            {/* Native Languages */}
            <View style={styles.section}>
                <Text style={styles.label}>Ana Dillerin *</Text>
                <Text style={styles.helperText}>
                    Anadili olarak konuştuğun dilleri seç
                </Text>
                <View style={styles.tagsContainer}>
                    {LANGUAGES.map((lang) => {
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
                                    {lang}
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
                <Text style={styles.label}>Öğrenmek İstediğin Diller *</Text>
                <Text style={styles.helperText}>
                    Pratik yapmak istediğin dilleri seç
                </Text>
                <View style={styles.tagsContainer}>
                    {LANGUAGES.map((lang) => {
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
                                    {lang}
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
                <Text style={styles.stepTitle}>Hobilerin ve Biografi</Text>
                <Text style={styles.stepSubtitle}>
                    Kendinden bahset ve ilgi alanlarını paylaş
                </Text>
            </View>

            {/* Bio */}
            <View style={styles.section}>
                <Text style={styles.label}>Kendinden Bahset</Text>
                <View style={styles.bioCard}>
                    <TextInput
                        style={styles.bioInput}
                        value={bio}
                        onChangeText={setBio}
                        placeholder="İnsanlara senden bahset. Nelerden hoşlanırsın, burada olma amacın ne?"
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
                            color={colors.accent}
                        />
                        <Text style={styles.charCount}>
                            {bio.length}/500
                        </Text>
                    </View>
                </View>
            </View>

            {/* Interests */}
            <View style={styles.section}>
                <Text style={styles.label}>İlgi Alanları</Text>
                <Text style={styles.helperText}>
                    Hobilerinizi ve ilgi alanlarınızı seçin
                </Text>
                <View style={styles.tagsContainer}>
                    {INTERESTS.map((interest) => {
                        const isSelected = selectedInterests.includes(interest);
                        return (
                            <TouchableOpacity
                                key={interest}
                                style={[
                                    styles.tag,
                                    styles.interestTag,
                                    isSelected && styles.tagSelectedAccent,
                                ]}
                                onPress={() => toggleInterest(interest)}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.tagText,
                                        isSelected && styles.tagTextSelected,
                                    ]}
                                >
                                    {interest}
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

    const renderStep4 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.headerSection}>
                <Text style={styles.stepTitle}>Fotoğrafların</Text>
                <Text style={styles.stepSubtitle}>
                    En iyi fotoğraflarını seç. Yüzünün net göründüğü fotoğraflar tercih edilir.
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
                                            <Text style={styles.coverBadgeText}>KAPAK FOTOĞRAFI</Text>
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
                                            color={colors.accent}
                                        />
                                    </View>
                                    <Text style={[
                                        styles.addPhotoText,
                                        index === 0 && styles.addPhotoTextLarge
                                    ]}>
                                        {index === 0 ? "Kapak Fotoğrafı" : `Fotoğraf ${index + 1}`}
                                    </Text>
                                    <Text style={styles.addPhotoHint}>
                                        {index === 0 ? "Dokunarak ekle" : "İsteğe bağlı"}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.photoTip}>
                <MaterialIcons name="info-outline" size={20} color={colors.accent} />
                <Text style={styles.photoTipText}>
                    İlk fotoğrafın profil kapak fotoğrafın olacak. Net ve kaliteli fotoğraflar seç.
                </Text>
            </View>
        </View>
    );

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1:
                return renderStep1();
            case 2:
                return renderStep2();
            case 3:
                return renderStep3();
            case 4:
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

                    {/* Fixed Bottom Navigation */}
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
                                    <Text style={styles.backButtonText}>Geri</Text>
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
                                        colors={[colors.accent, '#E91E63']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.nextButtonGradient}
                                    >
                                        <Text style={styles.nextButtonText}>Devam Et</Text>
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
                                        colors={[colors.accent, '#E91E63']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.nextButtonGradient}
                                    >
                                        {loading ? (
                                            <Text style={styles.nextButtonText}>Kaydediliyor...</Text>
                                        ) : (
                                            <>
                                                <Text style={styles.nextButtonText}>Tamamla</Text>
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
                            <Text style={styles.cancelButtonText}>İptal Et</Text>
                        </TouchableOpacity>
                    </View>
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
                            <Text style={styles.modalTitle}>Fotoğraf Seç</Text>
                            <Text style={styles.modalSubtitle}>
                                Fotoğrafı nereden eklemek istersin?
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
                                <Text style={styles.modalOptionText}>Kamera</Text>
                                <Text style={styles.modalOptionDesc}>Yeni fotoğraf çek</Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondaryDark} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalOption}
                            onPress={handleGalleryPress}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.modalIconContainer, { backgroundColor: `${colors.accent}15` }]}>
                                <MaterialIcons name="photo-library" size={26} color={colors.accent} />
                            </View>
                            <View style={styles.modalOptionContent}>
                                <Text style={styles.modalOptionText}>Galeri</Text>
                                <Text style={styles.modalOptionDesc}>Mevcut fotoğraflardan seç</Text>
                            </View>
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
    tagSelectedAccent: {
        backgroundColor: `${colors.accent}20`,
        borderColor: colors.accent,
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
        backgroundColor: `${colors.accent}15`,
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
        backgroundColor: `${colors.accent}10`,
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${colors.accent}30`,
    },
    photoTipText: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        color: colors.textSecondaryDark,
        lineHeight: 20,
    },

    // Bottom Navigation
    bottomNav: {
        backgroundColor: colors.backgroundDark,
        borderTopWidth: 1,
        borderTopColor: colors.borderDark,
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