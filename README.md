<div align="center">

# Conversa — Mobile App

**A modern, real-time dating & social-matching app** built with React Native and Expo — location-based discovery, swipe matching, real-time chat with voice messages, AI-assisted messaging, and premium subscriptions.

[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo Router](https://img.shields.io/badge/Expo%20Router-6-000020?logo=expo&logoColor=white)](https://docs.expo.dev/router/introduction/)
[![Platforms](https://img.shields.io/badge/platforms-iOS%20%7C%20Android-lightgrey)](https://reactnative.dev/)

</div>

---

## 📖 Overview

Conversa is the cross-platform mobile client for the Conversa dating platform. It pairs a polished, animated UI with real-time messaging, monetization, and growth features expected of a production app store release. It talks to the [Conversa backend](https://github.com/Ruzzyferr/conversa-backend) over REST and Socket.IO.

## ✨ Features

- 🔥 **Discovery & Swiping** — location-aware discovery feed with smooth swipe interactions
- 💞 **Matching & Likes** — mutual matches, likes inbox, conversation requests
- 💬 **Real-time Chat** — Socket.IO messaging with typing indicators, presence, and **voice messages**
- 🤖 **AI Assist** — polish your messages with adjustable tone before sending
- 💎 **Premium** — subscriptions via RevenueCat with gated features and entitlements
- 🎁 **Rewards & Growth** — rewarded ads (AdMob), referral program, and profile boosts
- 🔔 **Push Notifications** — match, message, and engagement notifications
- 🌍 **Internationalization** — multi-language support via i18next + device localization
- 🔐 **Secure by default** — tokens stored in `expo-secure-store`

## 🛠️ Tech Stack

- **Framework:** React Native 0.81 + Expo SDK 54 (New Architecture enabled)
- **Language:** TypeScript, React 19
- **Navigation:** Expo Router 6 (file-based, typed routes)
- **Realtime:** `socket.io-client`
- **Networking:** Axios + Zod
- **Secure storage:** `expo-secure-store`
- **i18n:** `i18next`, `react-i18next`, `expo-localization`
- **Monetization:** RevenueCat (`react-native-purchases`), Google AdMob (`react-native-google-mobile-ads`)
- **Media & Device:** `expo-location`, `expo-image-picker`, `expo-audio`, `expo-notifications`
- **UI/Animation:** Reanimated, Gesture Handler, Linear Gradient, Blur
- **Build:** EAS Build

## 🧭 App Structure

```
app/                         # Expo Router (file-based routing)
├── (auth)/                  # welcome · auth · verify-code · profile-setup
├── (tabs)/                  # home · likes · chat · profile
├── conversation/[id].tsx    # chat thread
├── premium.tsx              # subscriptions
└── profile-edit.tsx
src/                         # services, hooks, contexts, i18n, utils
components/ · constants/ · plugins/ · assets/
```

## 🚀 Getting Started

> ⚠️ **A development build is required.** Conversa uses native modules (AdMob, RevenueCat, Secure Store, Notifications) that **do not run in Expo Go**.

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp env.example .env        # set EXPO_PUBLIC_API_URL and keys

# 3. Build & run a development client (compiles native modules)
npx expo run:android       # or: npx expo run:ios

# 4. Subsequent runs — start the dev client
npm run start:dev
```

### Environments

| Environment | Backend | Use case |
| --- | --- | --- |
| **dev** | `api-dev.conversa.app` | On-device testing with native modules |
| **prod** | `api.conversa.app` | Google Play / App Store release |

Switch by swapping your `.env` file, then run the matching script.

### Build Scripts

| Script | Description |
| --- | --- |
| `npm run start:dev` | Start the Expo dev client |
| `npm run android` / `npm run ios` | Local native build & run |
| `npm run build:android:dev` | EAS development build (APK) |
| `npm run build:android:preview` | EAS preview build (APK) |
| `npm run build:android:prod` | EAS production build (AAB) |

### EAS (cloud) vs Local builds

- **EAS Build** — no local Android Studio / Xcode setup; builds in the cloud (~20–30 min).
- **Local Build** — faster iteration (~5–10 min) once tooling (JDK 17, Android SDK) is installed.

## 📦 Production

```bash
cp .env.prod .env
npm run build:android:prod   # produces an AAB for Google Play
```

Ensure production AdMob unit IDs, RevenueCat keys, and the production backend URL are configured before building.

<details>
<summary><strong>🐛 Troubleshooting (build & environment)</strong></summary>

### `JAVA_HOME` is set to an invalid directory
`JAVA_HOME` must point to the **JDK root**, not the `bin` folder, and must be a JDK (not JRE):

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
```

### `SDK location not found` / `ANDROID_HOME`
```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
# Or create android/local.properties:
#   sdk.dir=C:\\Users\\<USER>\\AppData\\Local\\Android\\Sdk
```

### "No development build installed"
Use `npm run start:dev` (not `npm start`) after installing a development build on the device/emulator.

### Native modules not working (AdMob, RevenueCat, push)
These require a development/production build — they cannot run in Expo Go.

### Environment variables not loading
```bash
cat .env              # verify values
npm start -- --clear  # restart with cleared cache
```

### Build failed
```bash
eas build --clear-cache   # clear EAS cache
npx expo run:android      # or try a local build
```

</details>

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Expo Router](https://docs.expo.dev/router/introduction/)

---

<div align="center">

Built with ❤️ by [**Rüzgar Emir Bulut**](https://github.com/Ruzzyferr) · Part of the **Conversa** platform ([backend API →](https://github.com/Ruzzyferr/conversa-backend))

</div>
