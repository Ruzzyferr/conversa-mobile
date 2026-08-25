/**
 * Geometry of the floating tab bar, shared by the screens that have to lay
 * out around it.
 *
 * The tab bar is absolutely positioned (app/(tabs)/_layout.tsx), so it does
 * not consume layout space — anything a screen renders at the bottom of the
 * viewport ends up underneath it unless the screen reserves the room itself.
 */

export const TAB_BAR_HEIGHT = 64;
/** Distance from the screen bottom to the tab bar: max(safe-area inset, 16). */
export const TAB_BAR_MIN_MARGIN = 16;
/** Breathing room between page content and the top of the tab bar. */
export const TAB_BAR_CONTENT_GAP = 12;

/** Total bottom space a screen must reserve to clear the floating tab bar. */
export function tabBarClearance(bottomInset: number): number {
  return (
    Math.max(bottomInset, TAB_BAR_MIN_MARGIN) +
    TAB_BAR_HEIGHT +
    TAB_BAR_CONTENT_GAP
  );
}
