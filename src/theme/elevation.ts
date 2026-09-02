import { Platform } from "react-native";

/**
 * Elevation scale.
 *
 * On a dark surface a black shadow is nearly invisible, so the lower steps
 * lean on a tinted shadow instead of a stronger black. Android only reads
 * `elevation`, so both are always set together.
 */
function shadow(
  elevation: number,
  opacity: number,
  radiusPx: number,
  offsetY: number
) {
  return Platform.select({
    android: { elevation },
    default: {
      shadowColor: "#000000",
      shadowOpacity: opacity,
      shadowRadius: radiusPx,
      shadowOffset: { width: 0, height: offsetY },
    },
  })!;
}

export const elevation = {
  /** Flat on the background. */
  none: Platform.select({ android: { elevation: 0 }, default: {} })!,
  /** Card resting on the page. */
  sm: shadow(2, 0.18, 6, 2),
  /** Raised card, selected state. */
  md: shadow(6, 0.26, 14, 6),
  /** Sheet, modal, floating action. */
  lg: shadow(12, 0.34, 26, 12),
} as const;

export type ElevationKey = keyof typeof elevation;
