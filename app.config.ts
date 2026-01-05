import { ExpoConfig, ConfigContext } from 'expo/config';
import versionConfig from './version.json';

export default ({ config }: ConfigContext): ExpoConfig => ({
    name: "Swiip",
    slug: "swiip",
    version: versionConfig.version,
    orientation: "portrait",
    icon: "./assets/swiip.png",
    scheme: "swiipmobile",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
        image: "./assets/swiip.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff"
    },
    ios: {
        bundleIdentifier: "com.swiip.mobile",
        supportsTablet: true,
        infoPlist: {
            NSCameraUsageDescription: "Profil fotoğraflarınızı çekmek için kamera erişimine ihtiyacımız var.",
            NSLocationWhenInUseUsageDescription: "Yakınındaki insanları görmek için konum erişimine ihtiyacımız var.",
            NSMicrophoneUsageDescription: "Ses mesajı göndermek için mikrofon erişimine ihtiyacımız var.",
            ITSAppUsesNonExemptEncryption: false
        }
    },
    android: {
        package: "com.swiip.mobile",
        versionCode: versionConfig.versionCode,
        adaptiveIcon: {
            foregroundImage: "./assets/swiip.png",
            backgroundColor: "#ffffff"
        },
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
        permissions: [
            "CAMERA",
            "ACCESS_FINE_LOCATION",
            "ACCESS_COARSE_LOCATION",
            "RECORD_AUDIO",
            "android.permission.RECORD_AUDIO",
            "android.permission.MODIFY_AUDIO_SETTINGS",
            "com.android.vending.BILLING"
        ]
    },
    web: {
        bundler: "metro",
        output: "static",
        favicon: "./assets/images/favicon.png"
    },
    plugins: [
        "expo-router",
        [
            "react-native-google-mobile-ads",
            {
                androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || "ca-app-pub-3940256099942544~3347511713",
                iosAppId: "ca-app-pub-3940256099942544~1458002511"
            }
        ],
        [
            "expo-build-properties",
            {
                android: {
                    usesCleartextTraffic: true
                }
            }
        ],
        "./plugins/withAndroidLaunchMode.js",
        "expo-audio",
        "expo-secure-store",
        "expo-localization"
    ],
    experiments: {
        typedRoutes: true
    },
    extra: {
        router: {},
        eas: {
            projectId: "d73c1139-dfa9-4772-94cc-61bb0f8c4f1e"
        },
        // Dynamically read from environment variables
        EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID: process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID,
        EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID,
    },
    owner: "ruzzyfer"
});
