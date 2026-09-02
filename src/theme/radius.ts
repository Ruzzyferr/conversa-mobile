/**
 * Corner radius scale.
 *
 * Every screen used to write its own number (12 here, 16 there, 999 for a
 * pill), so nothing lined up when two components sat next to each other.
 */
export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 28,
  pill: 999,
} as const;

export type RadiusKey = keyof typeof radius;
