/**
 * DO NOT RUN `expo prebuild` FOR ANDROID.
 *
 * android/ is checked in and is the source of truth: release builds are made
 * with `cd android && ./gradlew bundleRelease`. That directory carries changes
 * this config cannot express, and prebuild silently reverts every one of them:
 *
 *   - usesCleartextTraffic="false"           -> back to "true"
 *   - WRITE_EXTERNAL_STORAGE maxSdkVersion   -> unbounded again
 *   - windowSoftInputMode="adjustResize"     -> "adjustPan"
 *   - versionCode read from version.json     -> frozen as a literal
 *
 * It also writes ic_launcher*.webp next to the existing ic_launcher*.png, and
 * mergeReleaseResources then fails with "Duplicate resources" until the PNGs
 * are deleted. Regenerate android/ only if you are prepared to reapply all of
 * the above by hand.
 */
import { ExpoConfig, ConfigContext } from 'expo/config';
import versionConfig from './version.json';

/**
 * Google oturum acmanin iOS URL semasi.
 *
 * Sema, iOS istemci kimliginin ters cevrilmis halidir ve ikisi AYNI anda
 * dogru olmak zorunda. Elle yazildiginda bunu hicbir sey denetlemiyor:
 * kimlik degisir, sema eskide kalir ve uygulama yalnizca dugmeye
 * basildiginda -- yani incelemede -- cokerdi.
 *
 * Burada kimlikten turetiyoruz, boylece ikisi ayrisamiyor. Yayin
 * derlemesinde kimlik hic yoksa derlemeyi burada durduruyoruz: sessizce
 * semasiz bir paket uretmektense gurultuyle basarisiz olmak yegdir.
 */
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
if (!googleIosClientId && process.env.EXPO_PUBLIC_ENV === 'prod') {
    throw new Error(
        'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID yok: iOS derlemesi Google URL semasi olmadan cikar ' +
        've "Continue with Google" uygulamayi cokertir.'
    );
}
const googleIosUrlScheme = googleIosClientId
    ? 'com.googleusercontent.apps.' +
      googleIosClientId.replace(/\.apps\.googleusercontent\.com$/, '')
    : undefined;

/**
 * Sema bilinmiyorsa eklentiyi HIC eklemiyoruz.
 *
 * Eklentiyi `iosUrlScheme: undefined` ile cagirmak onu kendi icinde, hicbir
 * sey yazmadan dusuruyor: `expo config` sessizce 1 ile cikiyor. Yayin
 * derlemesi zaten yukarida duruyor; geri kalan her sey (eas-cli'nin
 * `.env` yuklemeden yaptigi config cagrilari, dev kosumlari) bu yuzden
 * kullanilamaz hale gelmisti -- yerel `eas submit` dahil.
 *
 * Yayinda sema her zaman var; disinda eksikligi aracları kirmiyor.
 */
const googleSignInPlugin: ExpoConfig['plugins'] = googleIosUrlScheme
    ? [['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]]
    : [];

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
        backgroundColor: "#0B0E13"
    },
    ios: {
        bundleIdentifier: "com.conversa.app",
        buildNumber: "15",
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
            backgroundColor: "#0B0E13"
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
        /**
         * Google oturum acmanin iOS'ta CALISMASI icin gereken tek sey.
         *
         * Bu eklentinin isi ters cevrilmis istemci kimligini Info.plist'teki
         * `CFBundleURLTypes`'a yazmak. Eklenti listede olmadigi icin sema
         * pakete girmiyordu ve GIDSignIn, tarayici akisini acmaya calistiginda
         * "Your app is missing support for the following URL schemes" diyerek
         * YAKALANAMAYAN bir Objective-C istisnasi atiyordu -- yani uygulama
         * try/catch'e hic ugramadan kapaniyordu.
         *
         * Apple bunu 2.1(a) olarak raporladi: "Tapped on 'Continue with
         * Google' button -> App crashed" (iPad Air 11", iPadOS 27).
         *
         * Sema, iOS istemci kimliginin ters cevrilmis halidir; kimlik
         * degisirse burasi da degismek zorunda.
         */
        ...(googleSignInPlugin ?? []),
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
