/**
 * Conversa palet — "Pirinç"
 *
 * Eski palet mor (#6C5DD3) + pembe (#FF5B84) gradyandı. 2020'lerin her
 * uygulamasının rengi; oyunsu ve genç duruyordu, istenen ise oturaklı ve
 * yetişkin bir tanışma ve dil uygulaması.
 *
 * Yeni aksan pirinç: bir şeker rengi değil, bir METAL rengi. Bumble'ın
 * parlak sarısının (#FFC629) aksine doygunluğu kısık ve koyu, o yüzden
 * kopya durmuyor. Yeşil denendi ve elendi -- fotoğraf ağırlıklı bir
 * uygulamada ten tonlarının üstünde hastalıklı duruyor. Kırmızı-turuncu
 * ise Tinder'ın bölgesi.
 *
 * TEK TEMA (koyu). Taban token'lar ve *Dark takma adları bilerek aynı:
 * uygulama koyu gönderiyor ve eskiden burada duran açık değerler, yanlışlıkla
 * `colors.text` yazan her yeri beyaz kutuya ya da görünmez yazıya
 * çeviriyordu. Açık değerleri geri getirmeyin.
 *
 * Token ADLARI kasıtlı olarak korundu. Kimlik değişimi 49 ekranı tek tek
 * düzenlemekle değil, bu dosyanın değerlerini değiştirmekle yapıldı.
 */
export const colors = {
  // Marka — pirinç
  primary: "#C98A3E",
  primaryDark: "#A06B2C",
  primaryLight: "#E0A75C",

  // İkincil eylem. Eskiden pembeydi; artık soğuk bir karşıt ton, çünkü
  // iki sıcak rengin yan yana durması hiyerarşiyi düzleştiriyordu.
  secondary: "#7E93AE",
  accent: "#C98A3E",
  accentDark: "#7A5526",
  accentLight: "#E0A75C",

  // Gradyanlar — tek aile içinde, iki farklı renk arası değil.
  accentGradientStart: "#C98A3E",
  accentGradientEnd: "#E0A75C",

  // Zeminler — mavimsi değil, nötre yakın mürekkep.
  background: "#0B0E13",
  backgroundDark: "#0B0E13",
  backgroundSecondary: "#121722",
  backgroundSecondaryDark: "#121722",
  backgroundTertiary: "#1A2130",

  // Yüzeyler
  surface: "#121722",
  surfaceDark: "#121722",
  surfaceElevated: "#1A2130",
  surfaceHover: "#1A2130",

  // Metin — saf beyaz değil kağıt beyazı: koyu zeminde saf beyaz keskin
  // ve yorucu okunuyor.
  text: "#ECE9E3",
  textDark: "#ECE9E3",
  textSecondary: "#A8B0BC",
  textSecondaryDark: "#A8B0BC",
  textTertiary: "#6C7688",
  textInverse: "#14100A",

  // Durum renkleri — aksandan AYRI tutuluyor. Aksan da sıcak olduğu için
  // uyarı sarısı ona çok yaklaşmamalı, yoksa "dikkat" ile "marka"
  // birbirine karışır.
  success: "#4E8C7A",
  warning: "#D9A441",
  error: "#D45B4B",
  info: "#7E93AE",

  // Kenarlıklar
  border: "#262E3D",
  borderDark: "#262E3D",
  borderLight: "#39445A",
  borderMuted: "#1D2432",

  // Örtüler
  overlay: "rgba(6, 8, 12, 0.72)",
  overlayLight: "rgba(6, 8, 12, 0.42)",
  overlayStrong: "rgba(6, 8, 12, 0.86)",

  // Kart
  cardBackground: "#121722",
  cardBackgroundDark: "#121722",

  // Deste eylemleri. Beğeni marka rengi: uygulamadaki asıl olumlu eylem o.
  passRed: "#C4574A",
  favoriteBlue: "#7E93AE",

  // Aksan tonlamaları (çip / rozet yüzeyleri)
  primaryTint: "rgba(201, 138, 62, 0.14)",
  primaryTintBorder: "rgba(201, 138, 62, 0.38)",
  primaryTintText: "#E0A75C",

  // Premium — markadan bir adım YUKARISI olmalı, yoksa "ayrıcalık"
  // hissi doğmuyor. Derin pirinçten şampanyaya.
  premiumGradientStart: "#8A5E28",
  premiumGradientEnd: "#E8C88C",

  // Fotoğraf üstü metin
  onMedia: "#FFFFFF",
  onMediaSubtle: "rgba(255, 255, 255, 0.9)",
  onMediaMuted: "rgba(255, 255, 255, 0.7)",
  onMediaFaint: "rgba(255, 255, 255, 0.4)",

  // Düşük opaklıkta aksan (dalga çubukları, hayalet yüzeyler)
  primaryFaint: "rgba(201, 138, 62, 0.28)",

  // Cam / tonlu yüzeyler (fotoğraf üstüne binen kartlar)
  surfaceTint: "rgba(255, 255, 255, 0.05)",
  surfaceTintStrong: "rgba(255, 255, 255, 0.08)",
  surfaceTintBorder: "rgba(255, 255, 255, 0.1)",

  // Geç eylemi yumuşak varyantları
  passRedSoft: "rgba(196, 87, 74, 0.15)",
  passRedBorder: "rgba(196, 87, 74, 0.4)",

  // Gölge
  shadowStrong: "rgba(0, 0, 0, 0.75)",

  // Kayıt (ses/video) — durum rengi ailesinden, markadan değil.
  recordingRed: "#D45B4B",
  recordingRedSoft: "rgba(212, 91, 75, 0.12)",
  recordingRedBorder: "rgba(212, 91, 75, 0.28)",

  // Premium kart destek tonları
  premiumMutedText: "#C9A87A",
  premiumDeepBackdrop: "rgba(18, 12, 4, 1)",
  premiumDeepBackdropFade: "rgba(18, 12, 4, 0.26)",

  // Boost — marka pirinci DEĞİL: aynı renk olsaydı "boost açık mı"
  // sorusunun görsel cevabı kalmazdı. Şampanya, bir üst basamak.
  boostGold: "#E8C88C",
  boostGoldDeep: "#C9A87A",
  boostGoldSoft: "rgba(232, 200, 140, 0.12)",
  boostGoldBorder: "rgba(232, 200, 140, 0.3)",

  // "Yeni" rozeti — durum yeşili ailesinden
  newBadge: "#4E8C7A",
  newBadgeBorder: "rgba(78, 140, 122, 0.5)",
} as const;

export type ColorKey = keyof typeof colors;
