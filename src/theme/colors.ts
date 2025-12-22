/**
 * Premium dark theme colors for Swiip
 */
export const colors = {
  // Primary colors
  primary: "#6366F1", // Indigo
  primaryDark: "#4F46E5",
  primaryLight: "#818CF8",

  // Background colors
  background: "#0A0A0F",
  backgroundSecondary: "#141420",
  backgroundTertiary: "#1E1E2E",

  // Surface colors
  surface: "#1A1A2E",
  surfaceElevated: "#252538",
  surfaceHover: "#2A2A3E",

  // Text colors
  text: "#FFFFFF",
  textSecondary: "#A0A0B0",
  textTertiary: "#6B6B7F",
  textInverse: "#0A0A0F",

  // Accent colors
  accent: "#EC4899", // Pink
  accentDark: "#DB2777",
  accentLight: "#F472B6",
  
  // Gradient colors
  accentGradientStart: "#EC4899",
  accentGradientEnd: "#F472B6",

  // Status colors
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  // Border colors
  border: "#2A2A3E",
  borderLight: "#3A3A4E",
  borderDark: "#1A1A2E",

  // Overlay
  overlay: "rgba(0, 0, 0, 0.7)",
  overlayLight: "rgba(0, 0, 0, 0.4)",
} as const;

export type ColorKey = keyof typeof colors;

