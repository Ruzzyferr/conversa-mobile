import { ExpoConfig, ConfigContext } from 'expo/config';
import versionConfig from './version.json';

export default ({ config }: ConfigContext): ExpoConfig => ({
    name: "Conversa",
    slug: "conversa",
    version: versionConfig.version,
    orientation: "portrait",
    icon: "./assets/conversa.png",
    scheme: "conversa",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#111422"
    },
    ios: {
        bundleIdentifier: "com.conversa.app",
        buildNumber: "4",
        supportsTablet: true,
        // Matches the APPLE_ID_AUTH capability enabled on the App ID; without
        // this entitlement the Apple button fails at runtime.
        usesAppleSignIn: true,
        infoPlist: {
            NSCameraUsageDescription: "Conversa uses the camera so you can take profile photos.",
            NSLocationWhenInUseUsageDescription: "Conversa uses your location to show people near you.",
            NSMicrophoneUsageDescription: "Conversa uses the microphone so you can send voice messages.",
            NSPhotoLibraryUsageDescription: "Conversa needs access to your photos so you can add them to your profile.",
            ITSAppUsesNonExemptEncryption: false
        }
    },
    android: {
        package: "com.conversa.app",
        versionCode: versionConfig.versionCode,
        adaptiveIcon: {
            foregroundImage: "./assets/adaptive-icon.png",
            backgroundColor: "#111422"
        },
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
        softwareKeyboardLayoutMode: "pan",
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
                androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || "ca-app-pub-2953141598487358~1689467677",
                // Fallback is Google's TEST app id - must be replaced via
                // EXPO_PUBLIC_ADMOB_IOS_APP_ID env before any iOS release
                iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || "ca-app-pub-3940256099942544~1458002511"
            }
        ],
        [
            "expo-build-properties",
            {
                android: {
                    // Cleartext (http) only for non-prod builds (metro dev server on http://192.168.x.x)
                    // eas.json production profile sets EXPO_PUBLIC_ENV=prod
                    usesCleartextTraffic: process.env.EXPO_PUBLIC_ENV !== 'prod'
                }
            }
        ],
        "./plugins/withAndroidLaunchMode.js",
        "expo-audio",
        "expo-apple-authentication",
        "expo-secure-store",
        "expo-localization",
        // These plugins must run AFTER expo-audio to strip its services
        "./plugins/withDisableBootCompletedReceivers.js",
        "./plugins/withoutForegroundServices.js"
    ],
    experiments: {
        typedRoutes: true
    },
    extra: {
        router: {},
        eas: {
            projectId: "f2da5a52-4a44-4977-91e6-fc1b599646e2"
        },
        // Dynamically read from environment variables
        EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID: process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID,
        EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID,
        EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID: process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID,
        EXPO_PUBLIC_ADMOB_IOS_REWARDED_UNIT_ID: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_UNIT_ID,
        EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_UNIT_ID: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_UNIT_ID,
        EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID,
    },
    owner: "ruzzyfer"
});
