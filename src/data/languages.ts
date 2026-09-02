/**
 * Diller icin tek dogruluk kaynagi.
 *
 * Profiller eskiden kullanicinin dokundugu YERELLESTIRILMIS ETIKETI
 * sakliyordu: Turkce telefon "Türkçe", Ingilizce telefon "Turkish" yaziyordu
 * ve ikisi asla eslesmiyordu. Kablodaki deger artik ISO kodu; etiketler
 * yalnizca gosterim icin aranıyor. `resolveLanguageCode` veritabaninda
 * duran eski etiket degerlerini koda geri cevirir.
 *
 * ---------------------------------------------------------------------
 * Neden BAYRAK YOK
 *
 * Liste otuz dilden butun dunyaya cikinca bayraklar yalnizca eksik degil,
 * YANLIS olur: bir dil bir ulke degildir. Arapca'ya Suudi bayragi koymak
 * Misirliyi, Ispanyolca'ya Ispanya bayragi koymak Meksikaliyi, Ingilizce'ye
 * Britanya bayragi koymak Amerikaliyi disarida birakir. Kurtce, Katalanca
 * ya da Suahili gibi diller icin dogru bir bayrak zaten yoktur.
 *
 * Yerine iki sey gosteriyoruz: dilin KENDI adi (Tiếng Việt) ve arayuz
 * dilindeki adi. Bir Vietnamli listede kendi dilini ararken "Vietnamca"
 * yazmiyor.
 * ---------------------------------------------------------------------
 */

export type Language = {
  /** ISO 639-1; 639-1 karsiligi olmayanlarda 639-3 (fil, yue, ceb...). */
  code: string;
  en: string;
  tr: string;
  /** Dilin kendi adi. Listede birincil etiket budur. */
  native: string;
};

export const LANGUAGES: Language[] = [
  { code: "ab", en: "Abkhaz", tr: "Abhazca", native: "Аҧсуа" },
  { code: "af", en: "Afrikaans", tr: "Afrikaanca", native: "Afrikaans" },
  { code: "am", en: "Amharic", tr: "Amharca", native: "አማርኛ" },
  { code: "ar", en: "Arabic", tr: "Arapça", native: "العربية" },
  { code: "hy", en: "Armenian", tr: "Ermenice", native: "Հայերեն" },
  { code: "as", en: "Assamese", tr: "Assamca", native: "অসমীয়া" },
  { code: "az", en: "Azerbaijani", tr: "Azerice", native: "Azərbaycanca" },
  { code: "bm", en: "Bambara", tr: "Bambaraca", native: "Bamanankan" },
  { code: "ba", en: "Bashkir", tr: "Başkurtça", native: "Башҡортса" },
  { code: "eu", en: "Basque", tr: "Baskça", native: "Euskara" },
  { code: "be", en: "Belarusian", tr: "Belarusça", native: "Беларуская" },
  { code: "bn", en: "Bengali", tr: "Bengalce", native: "বাংলা" },
  { code: "bs", en: "Bosnian", tr: "Boşnakça", native: "Bosanski" },
  { code: "br", en: "Breton", tr: "Bretonca", native: "Brezhoneg" },
  { code: "bg", en: "Bulgarian", tr: "Bulgarca", native: "Български" },
  { code: "my", en: "Burmese", tr: "Birmanca", native: "မြန်မာ" },
  { code: "yue", en: "Cantonese", tr: "Kantonca", native: "粵語" },
  { code: "ca", en: "Catalan", tr: "Katalanca", native: "Català" },
  { code: "ceb", en: "Cebuano", tr: "Cebuanoca", native: "Cebuano" },
  { code: "ny", en: "Chichewa", tr: "Çeva dili", native: "Chichewa" },
  { code: "zh", en: "Chinese (Mandarin)", tr: "Çince (Mandarin)", native: "中文" },
  { code: "co", en: "Corsican", tr: "Korsikaca", native: "Corsu" },
  { code: "hr", en: "Croatian", tr: "Hırvatça", native: "Hrvatski" },
  { code: "cs", en: "Czech", tr: "Çekçe", native: "Čeština" },
  { code: "da", en: "Danish", tr: "Danca", native: "Dansk" },
  { code: "dv", en: "Dhivehi", tr: "Divehi dili", native: "ދިވެހި" },
  { code: "nl", en: "Dutch", tr: "Hollandaca", native: "Nederlands" },
  { code: "en", en: "English", tr: "İngilizce", native: "English" },
  { code: "eo", en: "Esperanto", tr: "Esperanto", native: "Esperanto" },
  { code: "et", en: "Estonian", tr: "Estonca", native: "Eesti" },
  { code: "fo", en: "Faroese", tr: "Faroece", native: "Føroyskt" },
  { code: "fil", en: "Filipino", tr: "Filipince", native: "Filipino" },
  { code: "fi", en: "Finnish", tr: "Fince", native: "Suomi" },
  { code: "fr", en: "French", tr: "Fransızca", native: "Français" },
  { code: "fy", en: "Frisian", tr: "Frizce", native: "Frysk" },
  { code: "gl", en: "Galician", tr: "Galiçyaca", native: "Galego" },
  { code: "ka", en: "Georgian", tr: "Gürcüce", native: "ქართული" },
  { code: "de", en: "German", tr: "Almanca", native: "Deutsch" },
  { code: "el", en: "Greek", tr: "Yunanca", native: "Ελληνικά" },
  { code: "gn", en: "Guarani", tr: "Guaranice", native: "Avañe'ẽ" },
  { code: "gu", en: "Gujarati", tr: "Guceratça", native: "ગુજરાતી" },
  { code: "ht", en: "Haitian Creole", tr: "Haiti Kreolü", native: "Kreyòl ayisyen" },
  { code: "ha", en: "Hausa", tr: "Hausa dili", native: "Hausa" },
  { code: "haw", en: "Hawaiian", tr: "Hawaiice", native: "ʻŌlelo Hawaiʻi" },
  { code: "he", en: "Hebrew", tr: "İbranice", native: "עברית" },
  { code: "hi", en: "Hindi", tr: "Hintçe", native: "हिन्दी" },
  { code: "hmn", en: "Hmong", tr: "Hmongca", native: "Hmoob" },
  { code: "hu", en: "Hungarian", tr: "Macarca", native: "Magyar" },
  { code: "is", en: "Icelandic", tr: "İzlandaca", native: "Íslenska" },
  { code: "ig", en: "Igbo", tr: "İgbo dili", native: "Igbo" },
  { code: "id", en: "Indonesian", tr: "Endonezce", native: "Bahasa Indonesia" },
  { code: "ga", en: "Irish", tr: "İrlandaca", native: "Gaeilge" },
  { code: "it", en: "Italian", tr: "İtalyanca", native: "Italiano" },
  { code: "ja", en: "Japanese", tr: "Japonca", native: "日本語" },
  { code: "jv", en: "Javanese", tr: "Cavaca", native: "Basa Jawa" },
  { code: "kn", en: "Kannada", tr: "Kannada dili", native: "ಕನ್ನಡ" },
  { code: "kk", en: "Kazakh", tr: "Kazakça", native: "Қазақша" },
  { code: "km", en: "Khmer", tr: "Kmerce", native: "ខ្មែរ" },
  { code: "rw", en: "Kinyarwanda", tr: "Kinyarvanda", native: "Kinyarwanda" },
  { code: "ko", en: "Korean", tr: "Korece", native: "한국어" },
  { code: "ku", en: "Kurdish (Kurmanji)", tr: "Kürtçe (Kurmancî)", native: "Kurdî" },
  { code: "ckb", en: "Kurdish (Sorani)", tr: "Kürtçe (Soranî)", native: "کوردیی ناوەندی" },
  { code: "ky", en: "Kyrgyz", tr: "Kırgızca", native: "Кыргызча" },
  { code: "lo", en: "Lao", tr: "Laoca", native: "ລາວ" },
  { code: "la", en: "Latin", tr: "Latince", native: "Latina" },
  { code: "lv", en: "Latvian", tr: "Letonca", native: "Latviešu" },
  { code: "lt", en: "Lithuanian", tr: "Litvanca", native: "Lietuvių" },
  { code: "lb", en: "Luxembourgish", tr: "Lüksemburgca", native: "Lëtzebuergesch" },
  { code: "mk", en: "Macedonian", tr: "Makedonca", native: "Македонски" },
  { code: "mg", en: "Malagasy", tr: "Malgaşça", native: "Malagasy" },
  { code: "ms", en: "Malay", tr: "Malayca", native: "Bahasa Melayu" },
  { code: "ml", en: "Malayalam", tr: "Malayalam dili", native: "മലയാളം" },
  { code: "mt", en: "Maltese", tr: "Maltaca", native: "Malti" },
  { code: "mi", en: "Maori", tr: "Maorice", native: "Te Reo Māori" },
  { code: "mr", en: "Marathi", tr: "Marathi dili", native: "मराठी" },
  { code: "mn", en: "Mongolian", tr: "Moğolca", native: "Монгол" },
  { code: "ne", en: "Nepali", tr: "Nepalce", native: "नेपाली" },
  { code: "no", en: "Norwegian", tr: "Norveççe", native: "Norsk" },
  { code: "or", en: "Odia", tr: "Oriya dili", native: "ଓଡ଼ିଆ" },
  { code: "ps", en: "Pashto", tr: "Peştuca", native: "پښتو" },
  { code: "fa", en: "Persian", tr: "Farsça", native: "فارسی" },
  { code: "pl", en: "Polish", tr: "Lehçe", native: "Polski" },
  { code: "pt", en: "Portuguese", tr: "Portekizce", native: "Português" },
  { code: "pa", en: "Punjabi", tr: "Pencapça", native: "ਪੰਜਾਬੀ" },
  { code: "qu", en: "Quechua", tr: "Keçuva dili", native: "Runa Simi" },
  { code: "ro", en: "Romanian", tr: "Romence", native: "Română" },
  { code: "ru", en: "Russian", tr: "Rusça", native: "Русский" },
  { code: "sm", en: "Samoan", tr: "Samoaca", native: "Gagana Samoa" },
  { code: "gd", en: "Scottish Gaelic", tr: "İskoç Gaelcesi", native: "Gàidhlig" },
  { code: "sr", en: "Serbian", tr: "Sırpça", native: "Српски" },
  { code: "st", en: "Sesotho", tr: "Sesotho dili", native: "Sesotho" },
  { code: "sn", en: "Shona", tr: "Şona dili", native: "ChiShona" },
  { code: "sd", en: "Sindhi", tr: "Sintçe", native: "سنڌي" },
  { code: "si", en: "Sinhala", tr: "Sinhalaca", native: "සිංහල" },
  { code: "sk", en: "Slovak", tr: "Slovakça", native: "Slovenčina" },
  { code: "sl", en: "Slovenian", tr: "Slovence", native: "Slovenščina" },
  { code: "so", en: "Somali", tr: "Somalice", native: "Soomaali" },
  { code: "es", en: "Spanish", tr: "İspanyolca", native: "Español" },
  { code: "su", en: "Sundanese", tr: "Sundaca", native: "Basa Sunda" },
  { code: "sw", en: "Swahili", tr: "Svahili dili", native: "Kiswahili" },
  { code: "sv", en: "Swedish", tr: "İsveççe", native: "Svenska" },
  { code: "tg", en: "Tajik", tr: "Tacikçe", native: "Тоҷикӣ" },
  { code: "ta", en: "Tamil", tr: "Tamilce", native: "தமிழ்" },
  { code: "tt", en: "Tatar", tr: "Tatarca", native: "Татарча" },
  { code: "te", en: "Telugu", tr: "Telugu dili", native: "తెలుగు" },
  { code: "th", en: "Thai", tr: "Tayca", native: "ไทย" },
  { code: "bo", en: "Tibetan", tr: "Tibetçe", native: "བོད་སྐད" },
  { code: "ti", en: "Tigrinya", tr: "Tigrinya dili", native: "ትግርኛ" },
  { code: "tr", en: "Turkish", tr: "Türkçe", native: "Türkçe" },
  { code: "tk", en: "Turkmen", tr: "Türkmence", native: "Türkmençe" },
  { code: "uk", en: "Ukrainian", tr: "Ukraynaca", native: "Українська" },
  { code: "ur", en: "Urdu", tr: "Urduca", native: "اردو" },
  { code: "ug", en: "Uyghur", tr: "Uygurca", native: "ئۇيغۇرچە" },
  { code: "uz", en: "Uzbek", tr: "Özbekçe", native: "Oʻzbekcha" },
  { code: "vi", en: "Vietnamese", tr: "Vietnamca", native: "Tiếng Việt" },
  { code: "cy", en: "Welsh", tr: "Galce", native: "Cymraeg" },
  { code: "xh", en: "Xhosa", tr: "Zosa dili", native: "isiXhosa" },
  { code: "yi", en: "Yiddish", tr: "Yidiş", native: "ייִדיש" },
  { code: "yo", en: "Yoruba", tr: "Yoruba dili", native: "Yorùbá" },
  { code: "zu", en: "Zulu", tr: "Zuluca", native: "isiZulu" },
];

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

/** Her tarihsel yazim (en + tr etiketleri, kucuk harf) -> kod. */
const BY_LEGACY_LABEL = new Map<string, string>();
for (const l of LANGUAGES) {
  BY_LEGACY_LABEL.set(l.en.toLowerCase(), l.code);
  BY_LEGACY_LABEL.set(l.tr.toLowerCase(), l.code);
  BY_LEGACY_LABEL.set(l.native.toLowerCase(), l.code);
}

/**
 * Kod ya da eski yerellestirilmis etiketi alir, kanonik kodu dondurur.
 * Bilinmeyen degerler oldugu gibi gecer, boylece hicbir sey sessizce
 * kaybolmaz.
 */
export function resolveLanguageCode(value: string): string {
  if (!value) return value;
  const raw = value.trim();
  if (BY_CODE.has(raw.toLowerCase())) return raw.toLowerCase();
  return (
    BY_LEGACY_LABEL.get(raw.toLocaleLowerCase("tr")) ??
    BY_LEGACY_LABEL.get(raw.toLowerCase()) ??
    raw
  );
}

/** Arayuz dilindeki gosterim adi. */
export function languageLabel(value: string, uiLanguage: string): string {
  const lang = BY_CODE.get(resolveLanguageCode(value));
  if (!lang) return value;
  return uiLanguage?.startsWith("tr") ? lang.tr : lang.en;
}

/** Dilin kendi adi; bilinmiyorsa degerin kendisi. */
export function languageNativeName(value: string): string {
  return BY_CODE.get(resolveLanguageCode(value))?.native ?? value;
}

/** Saklanan listeyi kodlara indirger, tekrarlari atar. */
export function normalizeLanguages(values: string[] | undefined | null): string[] {
  if (!values) return [];
  return Array.from(new Set(values.map(resolveLanguageCode)));
}
