# RevenueCat Yapılandırma Rehberi

Bu rehber, Conversa uygulamasında RevenueCat'i nasıl yapılandıracağınızı adım adım açıklar.

## 📋 Adımlar

### 1. RevenueCat Hesabı Oluşturma

1. [RevenueCat Dashboard](https://app.revenuecat.com/)'a gidin
2. Ücretsiz hesap oluşturun (eğer yoksa)
3. Yeni bir proje oluşturun veya mevcut projenizi seçin

### 2. RevenueCat'te Uygulama Oluşturma

#### iOS Uygulaması
1. Dashboard'da **"Apps"** bölümüne gidin
2. **"Add new app"** butonuna tıklayın
3. App Name: `Conversa iOS` (veya istediğiniz isim)
4. Platform: **iOS**
5. Bundle ID: Apple Developer hesabınızdaki Bundle ID'yi girin
   - Örnek: `com.conversa.app` veya `app.conversa.mobile`
6. **"Create"** butonuna tıklayın
7. Açılan sayfada **"API Keys"** sekmesine gidin
8. **Public API Key** değerini kopyalayın (başında `appl_` ile başlar)

#### Android Uygulaması
1. Aynı projede **"Add new app"** butonuna tıklayın
2. App Name: `Conversa Android`
3. Platform: **Android**
4. Package Name: Android uygulamanızın package name'ini girin
   - Örnek: `com.conversa.app` veya `app.conversa.mobile`
   - Bu bilgiyi `android/app/build.gradle` dosyasındaki `applicationId` değerinden bulabilirsiniz
5. **"Create"** butonuna tıklayın
6. **"API Keys"** sekmesine gidin
7. **Public API Key** değerini kopyalayın (başında `goog_` ile başlar)

### 3. RevenueCat'te Product ve Entitlement Oluşturma

#### Entitlement Oluşturma
1. Dashboard'da **"Entitlements"** bölümüne gidin
2. **"Create entitlement"** butonuna tıklayın
3. Identifier: `premium` (kodda kullanılan identifier ile eşleşmeli)
4. Display Name: `Premium`
5. **"Save"** butonuna tıklayın

#### Product/Offering Oluşturma
1. **"Products"** bölümüne gidin
2. **"Create product"** butonuna tıklayın
3. Product ID: Apple App Store / Google Play Console'daki product ID'yi girin
4. **Store seçimi (ÖNEMLİ):**
   - iOS için: **App Store** veya **APP_STORE** seçin
   - Android için: **Google Play** veya **GOOGLE_PLAY** seçin
   - ❌ **"Test Store"** veya **"test_store"** gibi geçersiz store isimleri kullanmayın!
   - ✅ Sadece desteklenen store'ları kullanın: `APP_STORE`, `GOOGLE_PLAY`, `STRIPE`, `AMAZON`
5. **"Attach"** butonuna tıklayın

#### Offering Oluşturma
1. **"Offerings"** bölümüne gidin
2. **"Create offering"** butonuna tıklayın
3. Identifier: `default` (RevenueCat varsayılan offering'i)
4. Display Name: `Premium Offering`
5. **"Attach packages"** ile oluşturduğunuz product'ları ekleyin
6. **"Save"** butonuna tıklayın

### 4. Apple App Store / Google Play Console Yapılandırması

#### iOS (Apple App Store Connect)
1. [App Store Connect](https://appstoreconnect.apple.com/)'e gidin
2. Uygulamanızı seçin
3. **"In-App Purchases"** bölümüne gidin
4. **"+"** butonuna tıklayıp yeni bir subscription oluşturun
5. Product ID'yi not edin (RevenueCat'te kullanacaksınız)

#### Android (Google Play Console)
1. [Google Play Console](https://play.google.com/console/)'a gidin
2. Uygulamanızı seçin
3. **"Monetize" > "Subscriptions"** bölümüne gidin
4. **"Create subscription"** butonuna tıklayın
5. Product ID'yi not edin (RevenueCat'te kullanacaksınız)

### 5. Environment Dosyasını Yapılandırma

Proje klasöründe `.env.dev` dosyasını oluşturun (veya mevcut olanı düzenleyin):

```bash
# Proje kök dizininde
cp env.example .env.dev
```

`.env.dev` dosyasını düzenleyin:

```ini
# RevenueCat Configuration
EXPO_PUBLIC_RC_IOS_API_KEY=appl_xxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_RC_ANDROID_API_KEY=goog_xxxxxxxxxxxxxxxxxxxxx
```

**ÖNEMLİ:** 
- API anahtarlarını RevenueCat Dashboard'dan kopyaladığınızdan emin olun
- Test için sandbox API keys, production için production API keys kullanın
- API anahtarları public'tir, ancak yine de güvenli tutun

### 6. Android Package Name Kontrolü

Android için package name'in doğru olduğundan emin olun:

```bash
# android/app/build.gradle dosyasını kontrol edin
# applicationId değeri RevenueCat'teki Package Name ile eşleşmeli
```

### 7. Uygulamayı Test Etme

```bash
# Development build için
cp .env.dev .env
npx expo run:android
# veya
npx expo run:ios
```

Premium ekranını açtığınızda:
- ✅ Hata mesajı görünmemeli
- ✅ Premium paketler yüklenmeli
- ✅ Fiyatlar görünmeli

### 8. Production Yapılandırması

Production için `.env.prod` dosyasını oluşturun:

```bash
cp env.example .env.prod
```

`.env.prod` dosyasını düzenleyin ve production API keys ekleyin:

```ini
EXPO_PUBLIC_RC_IOS_API_KEY=appl_xxxxxxxxxxxxxxxxxxxxx  # Production key
EXPO_PUBLIC_RC_ANDROID_API_KEY=goog_xxxxxxxxxxxxxxxxxxxxx  # Production key
```

## 🔍 Sorun Giderme

### "There is no singleton instance" Hatası
- ✅ API anahtarlarının `.env` dosyasına doğru eklendiğinden emin olun
- ✅ Uygulamayı yeniden başlatın (sadece hot reload yeterli olmayabilir)
- ✅ Development build kullandığınızdan emin olun (Expo Go çalışmaz)

### "Failed to load offerings" Hatası
- ✅ RevenueCat Dashboard'da Offering'in oluşturulduğundan emin olun
- ✅ Offering'de en az bir package'in olduğundan emin olun
- ✅ Product'ların App Store / Play Console'da aktif olduğundan emin olun
- ✅ Entitlement identifier'ının `premium` olduğundan emin olun

### "test_store" veya Store Deserialization Hatası
- ❌ **"test_store"**, **"Test Store"** gibi geçersiz store isimleri kullanmayın
- ✅ Product oluştururken doğru store'u seçin:
  - Android için: **Google Play** veya **GOOGLE_PLAY**
  - iOS için: **App Store** veya **APP_STORE**
- ✅ Desteklenen store'lar: `APP_STORE`, `GOOGLE_PLAY`, `STRIPE`, `AMAZON`
- ✅ Eğer yanlış store ile product oluşturduysanız, yeni product oluşturup doğru store'u seçin

### "Premium status mismatch" Uyarısı
- ⚠️ Bu uyarı RevenueCat ve backend arasında premium durum uyuşmazlığı olduğunu gösterir
- ✅ Webhook'un doğru yapılandırıldığından emin olun
- ✅ Backend'in RevenueCat webhook'larını aldığından emin olun
- ✅ Webhook'un gecikmeli ulaşması normal olabilir (5-60 saniye)
- ✅ Kısa bir süre sonra otomatik olarak senkronize olmalı

### Paketler Görünmüyor
- ✅ RevenueCat Dashboard'da Offering'in **"default"** olarak işaretlendiğinden emin olun
- ✅ Package'lerin Offering'e eklendiğinden emin olun
- ✅ Product'ların store'da aktif olduğundan emin olun

### API Key Bulamıyorum
1. RevenueCat Dashboard'a gidin
2. Projenizi seçin
3. App'inizi seçin (iOS veya Android)
4. **"API Keys"** sekmesine tıklayın
5. **"Public API Key"** değerini kopyalayın

## 📚 Ek Kaynaklar

- [RevenueCat Dokümantasyonu](https://docs.revenuecat.com/)
- [React Native Purchases Dokümantasyonu](https://www.revenuecat.com/docs/react-native)
- [RevenueCat Dashboard](https://app.revenuecat.com/)

## ⚠️ Önemli Notlar

1. **Sandbox vs Production:**
   - Development için sandbox API keys kullanabilirsiniz
   - Production build için production API keys kullanın

2. **Package Name / Bundle ID:**
   - iOS Bundle ID ve Android Package Name'in RevenueCat'teki değerlerle tam olarak eşleşmesi gerekir

3. **Entitlement Identifier:**
   - Kodda `premium` olarak kullanılıyor, RevenueCat'te de aynı identifier'ı kullanın

4. **Offering Identifier:**
   - Kod varsayılan offering'i kullanıyor, RevenueCat'te `default` identifier'ı ile offering oluşturun

