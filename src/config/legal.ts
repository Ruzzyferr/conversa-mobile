/**
 * Public legal / support pages.
 *
 * App Store Review Guideline 3.1.2 requires an auto-renewable subscription's
 * purchase screen to link to both the Terms of Use (EULA) and the Privacy
 * Policy, and Google Play requires the same for subscriptions. Keeping the
 * URLs here means the paywall, the profile screen and the store listings all
 * point at one place when the domain changes.
 */

const WEB_BASE =
  process.env.EXPO_PUBLIC_WEB_URL || "https://157-230-127-38.sslip.io";

export const LEGAL_URLS = {
  privacy: `${WEB_BASE}/privacy`,
  terms: `${WEB_BASE}/terms`,
  support: `${WEB_BASE}/support`,
  deleteAccount: `${WEB_BASE}/delete`,
} as const;
