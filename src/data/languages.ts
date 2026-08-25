/**
 * Single source of truth for languages.
 *
 * Profiles previously stored the *localized label* the user tapped, so a
 * Turkish phone wrote "Türkçe" while an English phone wrote "Turkish" for the
 * same language — the two could never match, and the filter sheet (which used
 * English labels) matched nothing at all. Values on the wire are now the ISO
 * 639-1 code; labels are looked up for display only.
 *
 * `resolveLanguageCode` maps the legacy label values still in the database
 * back onto codes, so old profiles keep rendering and matching correctly.
 */

export type Language = {
  /** ISO 639-1 — the only value ever sent to or stored by the API. */
  code: string;
  en: string;
  tr: string;
  flag: string;
};

export const LANGUAGES: Language[] = [
  { code: "tr", en: "Turkish", tr: "Türkçe", flag: "🇹🇷" },
  { code: "en", en: "English", tr: "İngilizce", flag: "🇬🇧" },
  { code: "de", en: "German", tr: "Almanca", flag: "🇩🇪" },
  { code: "fr", en: "French", tr: "Fransızca", flag: "🇫🇷" },
  { code: "es", en: "Spanish", tr: "İspanyolca", flag: "🇪🇸" },
  { code: "it", en: "Italian", tr: "İtalyanca", flag: "🇮🇹" },
  { code: "ru", en: "Russian", tr: "Rusça", flag: "🇷🇺" },
  { code: "ar", en: "Arabic", tr: "Arapça", flag: "🇸🇦" },
  { code: "ja", en: "Japanese", tr: "Japonca", flag: "🇯🇵" },
  { code: "ko", en: "Korean", tr: "Korece", flag: "🇰🇷" },
  { code: "zh", en: "Chinese", tr: "Çince", flag: "🇨🇳" },
  { code: "pt", en: "Portuguese", tr: "Portekizce", flag: "🇵🇹" },
  { code: "nl", en: "Dutch", tr: "Hollandaca", flag: "🇳🇱" },
  { code: "el", en: "Greek", tr: "Yunanca", flag: "🇬🇷" },
  { code: "sv", en: "Swedish", tr: "İsveççe", flag: "🇸🇪" },
  { code: "no", en: "Norwegian", tr: "Norveççe", flag: "🇳🇴" },
  { code: "fi", en: "Finnish", tr: "Fince", flag: "🇫🇮" },
  { code: "pl", en: "Polish", tr: "Lehçe", flag: "🇵🇱" },
  { code: "cs", en: "Czech", tr: "Çekçe", flag: "🇨🇿" },
  { code: "hu", en: "Hungarian", tr: "Macarca", flag: "🇭🇺" },
  { code: "da", en: "Danish", tr: "Danca", flag: "🇩🇰" },
  { code: "he", en: "Hebrew", tr: "İbranice", flag: "🇮🇱" },
  { code: "hi", en: "Hindi", tr: "Hintçe", flag: "🇮🇳" },
  { code: "id", en: "Indonesian", tr: "Endonezce", flag: "🇮🇩" },
  { code: "th", en: "Thai", tr: "Tayca", flag: "🇹🇭" },
  { code: "vi", en: "Vietnamese", tr: "Vietnamca", flag: "🇻🇳" },
  { code: "uk", en: "Ukrainian", tr: "Ukraynaca", flag: "🇺🇦" },
  { code: "ro", en: "Romanian", tr: "Romence", flag: "🇷🇴" },
  { code: "fa", en: "Persian", tr: "Farsça", flag: "🇮🇷" },
  { code: "ur", en: "Urdu", tr: "Urduca", flag: "🇵🇰" },
];

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

/** Every historical spelling (en + tr labels, lowercased) -> code. */
const BY_LEGACY_LABEL = new Map<string, string>();
for (const l of LANGUAGES) {
  BY_LEGACY_LABEL.set(l.en.toLowerCase(), l.code);
  BY_LEGACY_LABEL.set(l.tr.toLowerCase(), l.code);
}

/**
 * Accepts a code or a legacy localized label and returns the canonical code.
 * Unknown values pass through unchanged so nothing silently disappears.
 */
export function resolveLanguageCode(value: string): string {
  if (!value) return value;
  const raw = value.trim();
  if (BY_CODE.has(raw.toLowerCase())) return raw.toLowerCase();
  return BY_LEGACY_LABEL.get(raw.toLocaleLowerCase("tr")) ??
    BY_LEGACY_LABEL.get(raw.toLowerCase()) ??
    raw;
}

/** Display label for a code (or legacy label) in the given UI language. */
export function languageLabel(value: string, uiLanguage: string): string {
  const lang = BY_CODE.get(resolveLanguageCode(value));
  if (!lang) return value;
  return uiLanguage?.startsWith("tr") ? lang.tr : lang.en;
}

/** Flag emoji for a code (or legacy label); empty string when unknown. */
export function languageFlag(value: string): string {
  return BY_CODE.get(resolveLanguageCode(value))?.flag ?? "";
}

/** Normalize a stored list to codes, dropping duplicates. */
export function normalizeLanguages(values: string[] | undefined | null): string[] {
  if (!values) return [];
  return Array.from(new Set(values.map(resolveLanguageCode)));
}
