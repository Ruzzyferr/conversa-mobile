# Sürüm çıkarma

`master`'a uygulama kodunu ilgilendiren her push, `.github/workflows/release.yml`
iş akışını çalıştırır. İş akışı sürümü yükseltir, notları commit'lerden yazar ve
her iki mağazanın **test kanalına** gönderir. Marketlere çıkmak elle kalır.

## Otomatik olan

| Adım | Sonuç |
| --- | --- |
| Sürüm | `version.json` içindeki `versionCode` ve `app.config.ts` içindeki `buildNumber` birer artar. `version` (1.0.3) elle değiştirilir. |
| Notlar | Son `v*` etiketinden bu yana atılan commit başlıkları madde madde derlenir. Play için 500, TestFlight için 4000 karakterle sınırlanır. |
| Android | `android/` klasörü gradle ile derlenir, AAB **Play kapalı testine** (`alpha`) yüklenir ve incelemeye gönderilir. |
| iOS | EAS bulutta derler, **TestFlight'a** yükler, ardından "What to Test" notları yazılır. |
| Kayıt | Sürüm artışı `[skip ci]` ile commit'lenir ve `v1.0.3+20` biçiminde etiketlenir. |

## Elle kalan

- **Play:** kapalı testten production'a terfi (Play Console → Test and release).
- **App Store:** yeni sürüm oluşturup TestFlight'taki build'i seçmek ve göndermek.

Bu iki adım bilerek otomatikleştirilmedi: ikisi de geri alınamayan, kullanıcıya
açılan işlemler.

## İnceleme sürerken push atmak

Kapalı test kanalına yeni bir sürüm yüklemek, o kanalda **incelemede bekleyen
sürümün yerine geçer** ve incelemeyi baştan başlatır. Play bunu uyarmadan yapar.

Bir sürüm incelemedeyken master'a bir şey göndermen gerekiyorsa:

- ya inceleme bitene kadar bekle,
- ya da commit başlığına `[skip ci]` ekle (iş akışı hiç çalışmaz),
- ya da Actions sekmesinden **kuru çalıştırma** ile sadece derlemeyi doğrula.

## Notların kalitesi

Notlar commit başlıklarından üretiliyor, yani **commit başlığı = kullanıcıya
görünen metin**. Başlığı kullanıcının okuyacağı gibi yaz:

```
iyi:  Sesli mesajlar artık arka planda da çalıyor
kötü: fix audio bug
```

Bir commit'in notlara girmesini istemiyorsan başlığa `[skip notes]` ekle.
`chore:`, `ci:`, `docs:`, `test:`, `refactor:` önekli commit'ler ve merge
commit'leri zaten dışarıda bırakılıyor.

## `expo prebuild` çalıştırma

Android projesi depoda duruyor ve doğrudan gradle ile derleniyor. `expo prebuild`
manifest'teki elle yapılmış sertleştirmeleri sessizce geri alır — ayrıntısı
`app.config.ts` başındaki nottadır. iOS'ta `ios/` klasörü yok; onu EAS bulutta
üretiyor, orada sorun değil.

## Secret'lar

Hepsi `Ruzzyferr/conversa-mobile` deposunun Actions secret'larında duruyor.

| Secret | Kaynak |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `android/app/conversa-upload.keystore`, base64 |
| `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD` | `credentials.json` |
| `PLAY_SERVICE_ACCOUNT_JSON` | Play Developer API servis hesabı anahtarı |
| `IOS_DIST_P12_BASE64` / `IOS_DIST_P12_PASSWORD` | `ios-credentials/dist.p12` |
| `IOS_PROVISIONING_PROFILE_BASE64` | `ios-credentials/conversa-appstore.mobileprovision` |
| `ASC_API_KEY_P8` / `ASC_KEY_ID` / `ASC_ISSUER_ID` | App Store Connect API anahtarı |
| `EXPO_TOKEN` | expo.dev → Settings → Access tokens |

Bunların hiçbiri depoda durmuyor; `.gitignore` imza malzemesini kapsıyor.

**Sağlama süresi:** provisioning profile 2027-08-21'de doluyor. O tarihten sonra
iOS derlemesi kimlik hatasıyla düşer; profili yenileyip
`IOS_PROVISIONING_PROFILE_BASE64` secret'ını güncellemek gerekir.

## EAS dakikası

Her push bir iOS bulut derlemesi başlatır. Sadece Android'e ihtiyacın olduğu bir
değişiklikte Actions sekmesinden iş akışını elle çalıştırıp **"iOS derlemesini
atla"** kutusunu işaretle.
