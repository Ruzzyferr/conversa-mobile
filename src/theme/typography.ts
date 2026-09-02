/**
 * Typography system for Conversa
 *
 * The app used to render everything in the platform's `System` font. That is
 * the single loudest signal that an app is unfinished: system type reads as
 * "nobody chose this". Plus Jakarta Sans is a geometric grotesque with enough
 * character to be recognisable and enough neutrality to disappear in body
 * copy — the same register Bumble and Hinge sit in.
 *
 * `fontFamily` names must match the keys `useFonts` is given in
 * `app/_layout.tsx`, or React Native silently falls back to System and the
 * whole change becomes invisible.
 */
export const typography = {
  // Font families
  fontFamily: {
    regular: "PlusJakartaSans_400Regular",
    medium: "PlusJakartaSans_500Medium",
    semibold: "PlusJakartaSans_600SemiBold",
    bold: "PlusJakartaSans_700Bold",
    extrabold: "PlusJakartaSans_800ExtraBold",
  },

  // Font sizes (raw scale)
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
    "5xl": 48,
  },

  // Font weights
  fontWeight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter spacing. Large type needs negative tracking to stop looking loose;
  // small caps-ish labels need positive tracking to stay legible.
  letterSpacing: {
    tighter: -0.8,
    tight: -0.4,
    normal: 0,
    wide: 0.4,
    wider: 1.2,
  },
} as const;

/**
 * Semantic text styles.
 *
 * Screens should reach for these, not for raw `fontSize` numbers. A raw number
 * in a screen is a decision made twice: once here and once there, and they
 * drift.
 */
export const textStyles = {
  /** Onboarding hero, empty-state headline. One per screen at most. */
  display: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.fontSize["4xl"],
    lineHeight: typography.fontSize["4xl"] * typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tighter,
  },
  /** Screen title. */
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize["2xl"],
    lineHeight: typography.fontSize["2xl"] * typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  /** Section heading, card title. */
  heading: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.lg,
    lineHeight: typography.fontSize.lg * typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.tight,
  },
  /** Default running text. */
  body: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.normal,
  },
  /** Secondary running text, helper copy under a field. */
  bodySmall: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.normal,
  },
  /** Button text, field label, chip. */
  label: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.normal,
  },
  /** Small label — badges, step counters. */
  labelSmall: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.fontSize.xs * typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.wide,
  },
  /** Timestamps, footnotes, legal. */
  caption: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.normal,
  },
} as const;

export type TypographyKey = keyof typeof typography;
export type TextStyleKey = keyof typeof textStyles;
