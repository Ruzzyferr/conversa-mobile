/**
 * Premium theme colors for Conversa (Light + Dark support)
 */
export const colors = {
  // Primary colors (updated to match HTML mock)
  primary: "#6C5DD3", // Vibrant purple/indigo
  primaryDark: "#5A4FC0",
  primaryLight: "#818CF8",

  // Secondary/Accent colors (for like button)
  secondary: "#FF5B84", // Pink for like button
  accent: "#FF5B84", // Alias for secondary
  accentDark: "#FF3D6B",
  accentLight: "#FF8FA9",
  
  // Gradient colors
  accentGradientStart: "#FF5B84",
  accentGradientEnd: "#FF8FA9",

  // Background colors — SINGLE DARK THEME.
  // Base tokens and *Dark aliases are intentionally identical: the app ships
  // dark-only, and keeping the old light values as defaults caused every
  // accidental `colors.text`/`colors.surface` reference to render white boxes
  // or invisible text. Do not reintroduce light values here.
  background: "#111422",
  backgroundDark: "#111422",
  backgroundSecondary: "#1C2033",
  backgroundSecondaryDark: "#1C2033",
  backgroundTertiary: "#252A40",

  // Surface colors
  surface: "#1C2033",
  surfaceDark: "#1C2033",
  surfaceElevated: "#252A40",
  surfaceHover: "#252A40",

  // Text colors
  text: "#E5E7EB",
  textDark: "#E5E7EB",
  textSecondary: "#9CA3AF",
  textSecondaryDark: "#9CA3AF",
  textTertiary: "#6B7280",
  textInverse: "#FFFFFF",

  // Status colors
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  // Border colors
  border: "#374151",
  borderDark: "#374151",
  borderLight: "#4B5563",
  borderMuted: "#252A40",

  // Overlay
  overlay: "rgba(0, 0, 0, 0.7)",
  overlayLight: "rgba(0, 0, 0, 0.4)",
  overlayStrong: "rgba(0, 0, 0, 0.8)",

  // Card specific
  cardBackground: "#1C2033",
  cardBackgroundDark: "#1C2033",

  // Semantic action colors (swipe deck)
  passRed: "#FF4D6D",       // Pass / decline action
  favoriteBlue: "#60A5FA",  // Favorite / super-like action

  // Primary tints (chip / badge surfaces) — translucent purple over dark
  primaryTint: "rgba(108, 93, 211, 0.16)",
  primaryTintBorder: "rgba(108, 93, 211, 0.4)",
  primaryTintText: "#A78BFA",   // Light purple, readable on dark tint

  // Premium gradient (subscription cards / boost UI)
  premiumGradientStart: "#7A308F",
  premiumGradientEnd: "#C75FE4",

  // On-media text (text rendered over photos / dark gradients)
  onMedia: "#FFFFFF",
  onMediaSubtle: "rgba(255, 255, 255, 0.9)",
  onMediaMuted: "rgba(255, 255, 255, 0.7)",
  onMediaFaint: "rgba(255, 255, 255, 0.4)",

  // Primary at low alpha (waveform inactive bars, ghost surfaces)
  primaryFaint: "rgba(108, 93, 211, 0.3)",

  // Glass / tinted surfaces on dark backgrounds (cards layered on photos)
  surfaceTint: "rgba(255, 255, 255, 0.05)",
  surfaceTintStrong: "rgba(255, 255, 255, 0.08)",
  surfaceTintBorder: "rgba(255, 255, 255, 0.1)",

  // Pass action soft variants (decline button background)
  passRedSoft: "rgba(255, 77, 109, 0.15)",
  passRedBorder: "rgba(255, 77, 109, 0.4)",

  // Misc shadows / text shadows used over media
  shadowStrong: "rgba(0, 0, 0, 0.75)",

  // Recording (voice / video capture) — pulsing red
  recordingRed: "#FF5252",
  recordingRedSoft: "#FF525215",
  recordingRedBorder: "#FF525220",

  // Premium card supporting tints (subtitle / pricing meta on the deep purple BG)
  premiumMutedText: "#B884C7",
  premiumDeepBackdrop: "rgba(16, 5, 36, 1)",
  premiumDeepBackdropFade: "rgba(16, 5, 36, 0.26)",

  // Boost (premium boost feature highlight — warm gold)
  boostGold: "#FFD700",
  boostGoldDeep: "#FFA500",
  boostGoldSoft: "#FFD70015",
  boostGoldBorder: "#FFD70030",

  // "New user" badge — success green family
  newBadge: "#10B981",
  newBadgeBorder: "rgba(16, 185, 129, 0.5)",
} as const;

export type ColorKey = keyof typeof colors;

