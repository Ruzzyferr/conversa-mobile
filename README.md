# Swiip Mobile - Kapsamlı Rehber

## 📋 İçindekiler

1. [Hızlı Başlangıç](#hızlı-başlangıç)
2. [Ortam Yapılandırması](#ortam-yapılandırması)
3. [Development Build](#development-build)
4. [EAS Build vs Local Build](#eas-build-vs-local-build)
5. [Expo Go ile Test](#expo-go-ile-test)
6. [Sorun Giderme](#sorun-giderme)

---

## 🚀 Hızlı Başlangıç

### ⚠️ ÖNEMLİ: Development Build Gerekli

Swiip uygulaması **native modüller** kullanıyor (AdMob, RevenueCat, SecureStore, Clipboard). Bu yüzden **Expo Go çalışmaz**. Development build oluşturmanız gerekiyor.

### İlk Kurulum

```bash
# 1. Dependencies yükle
cd Swiip-mobile
npm install

# 2. Environment dosyalarını oluştur
cp env.example .env.dev
cp env.example .env.prod

# 3. .env.dev dosyasını düzenle
# EXPO_PUBLIC_API_URL=http://localhost:4000
```

### Development Build Oluştur (İLK KEZ - ZORUNLU)

**Seçenek 1: Local Build (Önerilen - Daha Hızlı)**

```bash
cd Swiip-mobile
cp .env.dev .env
npx expo run:android
```

Bu komut:
- ✅ Development build oluşturur (5-10 dakika)
- ✅ Emülatöre/cihaza yükler
- ✅ Metro bundler'ı başlatır

**Seçenek 2: EAS Build (Cloud)**

```bash
# EAS CLI kur (sadece bir kez)
npm install -g eas-cli
eas login

# Build oluştur
cd Swiip-mobile
cp .env.dev .env
npm run build:android:dev
```

### Development Build Sonrası

Build tamamlandıktan sonra:

```bash
cd Swiip-mobile
npm run start:dev
# veya
npx expo start --dev-client
```

Artık tüm native modüller çalışacak! ✅

---

## 📋 Ortam Yapılandırması

### Ortamlar

| Ortam | Platform | Backend | Kullanım |
|-------|----------|---------|----------|
| **TEST** | Expo Go | `localhost:4000` | UI testleri, hızlı iteration |
| **DEV** | Development Build (APK) | `api-dev.swiip.app` | Kendi telefonunda test, native modüller |
| **PROD** | Production Build (AAB) | `api.swiip.app` | Google Play Store |

### Environment Dosyalarını Oluştur

```bash
cd Swiip-mobile

# Test ortamı (Expo Go)
cp env.example .env.test

# Dev ortamı (Development build)
cp env.example .env.dev

# Prod ortamı (Production build)
cp env.example .env.prod
```

### Environment Dosyalarını Düzenle

#### `.env.test` (Expo Go)
```ini
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_ENV=test
EXPO_PUBLIC_RC_IOS_API_KEY=
EXPO_PUBLIC_RC_ANDROID_API_KEY=
EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID=
EXPO_PUBLIC_PROJECT_ID=
```

#### `.env.dev` (Development Build)
```ini
EXPO_PUBLIC_API_URL=https://api-dev.swiip.app
EXPO_PUBLIC_ENV=dev
EXPO_PUBLIC_RC_IOS_API_KEY=your_dev_revenuecat_ios_key
EXPO_PUBLIC_RC_ANDROID_API_KEY=your_dev_revenuecat_android_key
EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID=your_dev_admob_unit_id
EXPO_PUBLIC_PROJECT_ID=your_expo_project_id
```

#### `.env.prod` (Production Build)
```ini
EXPO_PUBLIC_API_URL=https://api.swiip.app
EXPO_PUBLIC_ENV=prod
EXPO_PUBLIC_RC_IOS_API_KEY=your_prod_revenuecat_ios_key
EXPO_PUBLIC_RC_ANDROID_API_KEY=your_prod_revenuecat_android_key
EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID=your_prod_admob_unit_id
EXPO_PUBLIC_PROJECT_ID=your_expo_project_id
```

### Ortam Değiştirme

Expo otomatik olarak `.env` dosyasını yükler. Ortam değiştirmek için:

```bash
# Test ortamı
cp .env.test .env
npm start

# Dev ortamı
cp .env.dev .env
npm run start:dev

# Prod ortamı (build için)
cp .env.prod .env
npm run build:android:prod
```

---

## ⚠️ Expo Go Desteklenmiyor

Swiip uygulaması şu native modülleri kullanıyor:
- `expo-secure-store` - Token storage
- `expo-clipboard` - Referral code kopyalama
- `react-native-google-mobile-ads` - Rewarded ads
- `react-native-purchases` - Premium satın alma
- `expo-notifications` - Push notifications

**Bu modüller Expo Go'da çalışmaz!** Development build zorunludur.

### Neden Development Build?

- ✅ Tüm native modüller çalışır
- ✅ AdMob çalışır
- ✅ RevenueCat çalışır
- ✅ Push notifications çalışır
- ✅ Production'a hazır

---

## 🔧 Development Build

### Neden Development Build?

Swiip uygulaması şu native modülleri kullanıyor:
- **AdMob** (`react-native-google-mobile-ads`) - Rewarded ads
- **RevenueCat** (`react-native-purchases`) - Premium satın alma
- **Push Notifications** (`expo-notifications`) - Bildirimler
- **expo-dev-client** - Development build

Bu modüller **native kod** içerir ve Expo Go'da çalışmaz.

### EAS Build (Cloud) - Önerilen İlk Build

#### Kurulum

```bash
# EAS CLI kur (sadece bir kez)
npm install -g eas-cli
eas login
```

#### APK Oluşturma

```bash
cd Swiip-mobile
cp .env.dev .env
npm run build:android:dev
```

#### APK'yı Yükleme

1. Build tamamlandığında EAS size bir link gönderecek
2. Link'ten APK'yı indirin
3. Android cihazınıza yükleyin

#### Uygulamayı Başlatma

```bash
cd Swiip-mobile
npm run start:dev
# veya
npx expo start --dev-client
```

QR kodu tarayın veya cihazınızı USB ile bağlayın.

**Avantajlar:**
- ✅ Android Studio kurmanıza gerek yok
- ✅ Mac olmadan iOS build yapabilirsiniz
- ✅ Cloud'da build yapılır

**Dezavantajlar:**
- ❌ İnternet bağlantısı gerekli
- ❌ Build 20-30 dakika sürebilir

### Local Build (Android Studio) - Daha Hızlı

#### Gereksinimler

- Android Studio
- JDK 17 (veya üzeri)
- Android SDK

#### Build

```bash
cd Swiip-mobile
cp .env.dev .env
npx expo run:android
```

Bu komut:
- ✅ Native modülleri derler
- ✅ APK oluşturur
- ✅ Cihaza yükler
- ✅ Metro bundler'ı başlatır

**Avantajlar:**
- ✅ Çok daha hızlı (5-10 dakika)
- ✅ İnternet gerekmez (ilk kurulumdan sonra)
- ✅ Sınırsız build

**Dezavantajlar:**
- ❌ Android Studio kurmanız gerekir
- ❌ JDK kurmanız gerekir
- ❌ iOS için Mac gerekir

### JAVA_HOME Hatası Düzeltme

#### Sorun
```
ERROR: JAVA_HOME is set to an invalid directory: C:\Program Files\JAVA\jre1.8.0_471\bin
```

#### Çözüm

**ÖNEMLİ:** JAVA_HOME `bin` klasörüne değil, JDK root klasörüne işaret etmeli!

**Yanlış:**
```
JAVA_HOME=C:\Program Files\JAVA\jre1.8.0_471\bin  ❌
```

**Doğru:**
```
JAVA_HOME=C:\Program Files\Java\jdk-17  ✅
```

**PowerShell (Geçici):**
```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
echo $env:JAVA_HOME
```

**Sistem Environment Variable (Kalıcı):**
1. Windows tuşu + "Environment Variables" ara
2. "Edit the system environment variables" aç
3. "Environment Variables" butonuna tıkla
4. "System variables" altında `JAVA_HOME` bul
5. Değeri düzelt: `C:\Program Files\Java\jdk-17`
6. Tüm PowerShell/CMD pencerelerini kapat ve yeniden aç

### ANDROID_HOME Hatası Düzeltme

#### Sorun
```
SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable
```

#### Çözüm

**PowerShell (Geçici):**
```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
echo $env:ANDROID_HOME
```

**local.properties Oluştur (Otomatik):**

PowerShell'de:
```powershell
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
$content = "sdk.dir=$($sdkPath.Replace('\', '\\'))"
Set-Content -Path ".\Swiip-mobile\android\local.properties" -Value $content
```

**Manuel:**
```bash
# Swiip-mobile/android/local.properties
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```

---

## 🚀 Production Build

### AAB Oluşturma (Google Play için)

```bash
cd Swiip-mobile
cp .env.prod .env
npm run build:android:prod
```

### Google Play Store'a Yükleme

1. EAS build tamamlandığında AAB dosyasını indirin
2. Google Play Console'a giriş yapın
3. Yeni release oluşturun
4. AAB dosyasını yükleyin
5. Test edin ve yayınlayın

### Önemli Notlar

- ✅ Production API keys kullanılmalı
- ✅ Production AdMob unit IDs
- ✅ Production RevenueCat API keys
- ✅ Backend production ortamında çalışmalı

---

## 🐛 Sorun Giderme

### "Loading from 192.168.1.100:8082..." ama uygulama açılmıyor

**Sorun:** Emülatörde development build yüklü değil.

**Çözüm 1: Expo Go Kullan (Hızlı Test)**
```bash
# Metro bundler'ı durdur (Ctrl+C)
npm start
# Expo Go'da QR kodu tara
```

**Çözüm 2: Development Build Oluştur**
```bash
# Local build (hızlı)
npx expo run:android

# Build tamamlandıktan sonra
npm run start:dev
```

### "No development build installed"

- Development build oluşturup cihaza yükleyin
- `npm run start:dev` kullanın (normal `npm start` değil)
- Veya Expo Go kullanın: `npm start`

### AdMob Hataları

- Development build kullandığınızdan emin olun
- `app.json`'da AdMob plugin yapılandırmasını kontrol edin
- Expo Go'da AdMob çalışmaz (normal)

### SecureStore Hatası

✅ **Çözüldü!** Artık `expo-secure-store` kullanılıyor (Expo Go'da çalışır).

### Environment Variables Yüklenmiyor

```bash
# .env dosyasını kontrol et
cat .env

# Expo'yu yeniden başlat
npm start -- --clear
```

### Build Başarısız

```bash
# EAS cache'i temizle
eas build --clear-cache

# Local build dene
npx expo run:android
```

### JAVA_HOME Hatası

- JDK 17 kurulu olmalı (JRE değil)
- JAVA_HOME JDK root klasörüne işaret etmeli (bin değil)
- Sistem environment variable'ını kontrol edin

### ANDROID_HOME Hatası

**Hızlı Çözüm:**
```powershell
# ANDROID_HOME set et
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

# local.properties oluştur
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
$content = "sdk.dir=$($sdkPath -replace '\\', '\\')"
[System.IO.File]::WriteAllText("$PWD\Swiip-mobile\android\local.properties", $content, [System.Text.Encoding]::ASCII)

# Build'i tekrar dene
cd Swiip-mobile
npx expo run:android
```

**Kontrol:**
- Android SDK kurulu olmalı: `$env:LOCALAPPDATA\Android\Sdk`
- `local.properties` dosyası: `Swiip-mobile\android\local.properties`
- `ANDROID_HOME` environment variable (opsiyonel ama önerilir)

---

## 📝 Önemli Notlar

1. **Environment Variables:**
   - `.env.test`, `.env.dev`, `.env.prod` dosyaları `.gitignore`'da
   - `env.example` dosyasını commit edin
   - Gerçek API keys'leri asla commit etmeyin

2. **Backend URL:**
   - Test: `http://localhost:4000` (sadece local)
   - Dev: `https://api-dev.swiip.app` (test backend)
   - Prod: `https://api.swiip.app` (production backend)

3. **Build Profiles:**
   - `development`: Dev build (APK, internal)
   - `preview`: Dev build (APK, internal) - preview için
   - `production`: Prod build (AAB, Google Play)

4. **Native Modüller:**
   - Expo Go'da çalışmaz
   - Development build gerekir
   - Production build için AAB oluşturulmalı

---

## 🎯 Önerilen Workflow

### Günlük Development (Test)
```bash
cp .env.test .env
npm start
```

### Development Build Test
```bash
cp .env.dev .env
npm run build:android:dev
```

### Production Build
```bash
cp .env.prod .env
npm run build:android:prod
```

---

## 📚 Ek Kaynaklar

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [React Native Documentation](https://reactnative.dev/)

