/**
 * Premium theme colors for Swiip (Light + Dark support)
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

  // Background colors (Light mode support)
  background: "#F3F4F6", // Light mode background
  backgroundDark: "#111422", // Dark mode background
  backgroundSecondary: "#FFFFFF", // Light mode card background
  backgroundSecondaryDark: "#1C2033", // Dark mode card background
  backgroundTertiary: "#F9FAFB",

  // Surface colors
  surface: "#FFFFFF",
  surfaceDark: "#1C2033",
  surfaceElevated: "#FFFFFF",
  surfaceHover: "#F3F4F6",

  // Text colors (Light mode support)
  text: "#1F2937", // Light mode text
  textDark: "#E5E7EB", // Dark mode text
  textSecondary: "#6B7280", // Light mode muted
  textSecondaryDark: "#9CA3AF", // Dark mode muted
  textTertiary: "#9CA3AF",
  textInverse: "#FFFFFF",

  // Status colors
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  // Border colors (Light mode support)
  border: "#E5E7EB", // Light mode border
  borderDark: "#374151", // Dark mode border
  borderLight: "#D1D5DB",
  borderMuted: "#F3F4F6",

  // Overlay
  overlay: "rgba(0, 0, 0, 0.7)",
  overlayLight: "rgba(0, 0, 0, 0.4)",
  
  // Card specific
  cardBackground: "#FFFFFF",
  cardBackgroundDark: "#1C2033",
} as const;

export type ColorKey = keyof typeof colors;

