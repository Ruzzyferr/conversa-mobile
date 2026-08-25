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
- ya da commit başlığına `[skip ci]` ekle (iş akışı hiç çalışmaz).

TestFlight'ta böyle bir sorun yok: yeni bir build, App Store incelemesindeki
sürümü etkilemez — inceleme belirli bir build'e bağlıdır.

**Mağaza bazında atlama yoktur.** Çıkan her sürüm iki mağazaya da gider; tek
tek atlanabilseydi iki mağaza farklı kodda kalırdı. Bir şey göndermeden sadece
derlemeyi görmek istersen **kuru çalıştırma** ikisini birden atlar, yani
aralarında fark oluşmaz.

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

## Ortam değişkenleri

`EXPO_PUBLIC_*` değerleri **paket derlenirken koda gömülür**; çalışma anında
okunmaz. Tek doğru kaynak `eas.json` → `build.production.env`:

- **iOS:** EAS bu bloğu kendisi uygular.
- **Android:** düz `gradlew` uygulamaz. `scripts/ci/build-env.mjs` aynı bloğu
  okuyup derleme ortamına aktarır.

Depodaki `.env` yalnızca yerel geliştirme kolaylığıdır ve git'e girmez; bu
yüzden CI'da yoktur. İkisi arasında değer kopyalamak yerine `eas.json`'ı
güncelle — Android ve iOS'un birbirinden ayrışmasının tek yolu budur.

`EXPO_PUBLIC_API_URL` boşken uygulama açılışta bilerek hata fırlatır
(`src/services/api.ts`), yani eksik yapılandırma sessiz bir hata değil,
çöken bir uygulamadır. Bu yüzden `scripts/ci/verify-bundle.mjs` her derlemeden
sonra üretilen AAB'nin içindeki paketi açıp API adresini, web adresini ve
RevenueCat anahtarını arar; biri yoksa koşuyu düşürür ve mağazaya yükleme
yapılmaz. **versionCode 20 tam olarak bu yüzden bozuk çıktı** — derleme,
imzalama ve yükleme sorunsuz geçmişti.

> Not: `api.conversa.swiip.app` gerçek alan adıdır. Caddy eski
> `*.sslip.io` adreslerini de sunmaya devam ediyor; kurulu eski sürümler oradan
> konuşuyor, o host kapatılmamalı.

## Bildirimler

Her koşunun sonunda — başarılı ya da başarısız — **bulutruzgaremir@gmail.com**
adresine e-posta gider. Gönderim backend'in kullandığı Resend hesabı üzerinden,
`noreply@swiip.app` adresinden yapılır. Mesajda sürüm numaraları, hangi mağazaya
neyin gittiği, sürüm notları ve koşu bağlantısı bulunur.

GitHub'ın kendi bildirimi yalnızca **başarısız** koşular için ve yalnızca hesap
sahibine gider; bu yüzden başarı bildirimi ayrıca kuruldu — asıl görmek
istediğin durum, testçilerin eline yeni bir sürüm geçtiği andır.

**Telegram istersen** iki secret eklemen yeterli, kod hazır:

1. Telegram'da `@BotFather` ile konuşup `/newbot` de, çıkan token'ı al.
2. Bota bir mesaj yaz, sonra
   `https://api.telegram.org/bot<TOKEN>/getUpdates` adresinden `chat.id`'yi oku.
3. Depoya ekle:
   ```
   gh secret set TELEGRAM_BOT_TOKEN --repo Ruzzyferr/conversa-mobile
   gh secret set TELEGRAM_CHAT_ID   --repo Ruzzyferr/conversa-mobile
   ```

İkisi yoksa Telegram adımı sessizce atlanır. Bildirim hiçbir durumda koşuyu
düşürmez.

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
| `EXPO_TOKEN` | expo.dev → Settings → Access tokens (kuruldu) |
| `RESEND_API_KEY` / `NOTIFY_EMAIL` / `NOTIFY_FROM` | bildirim e-postası (kuruldu) |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | isteğe bağlı, yoksa atlanır |

Bunların hiçbiri depoda durmuyor; `.gitignore` imza malzemesini kapsıyor.

**Sağlama süresi:** provisioning profile 2027-08-21'de doluyor. O tarihten sonra
iOS derlemesi kimlik hatasıyla düşer; profili yenileyip
`IOS_PROVISIONING_PROFILE_BASE64` secret'ını güncellemek gerekir.

## EAS dakikası

Her sürüm bir iOS bulut derlemesi başlatır — iki mağazanın aynı kodda kalması
bunu gerektiriyor. Bir değişikliğin sürüm çıkarmasını istemiyorsan commit
başlığına `[skip ci]` ekle; iş akışı hiç çalışmaz ve dakika harcanmaz.
