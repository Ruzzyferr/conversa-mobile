# RevenueCat API Key Güncelleme

## Adımlar

1. RevenueCat Dashboard'dan Public API key'i kopyalayın
2. `.env.dev` dosyasını açın
3. Şu satırları güncelleyin:

```ini
EXPO_PUBLIC_RC_IOS_API_KEY=yeni_key_buraya
EXPO_PUBLIC_RC_ANDROID_API_KEY=yeni_key_buraya
```

4. Dosyayı kaydedin

## Uygulamayı Yeniden Başlatma

```bash
# Uygulamayı durdurun (Ctrl+C)
# Sonra tekrar başlatın
npx expo start --dev-client
```

**Önemli:** Sadece hot reload yeterli değildir, uygulamayı tamamen yeniden başlatmanız gerekir.

