/**
 * Single import point for design tokens.
 *
 * Screens import from here so a token move never means touching every screen.
 */
export { colors } from "./colors";
export type { ColorKey } from "./colors";

export { spacing } from "./spacing";
export type { SpacingKey } from "./spacing";

export { typography, textStyles } from "./typography";
export type { TypographyKey, TextStyleKey } from "./typography";

export { radius } from "./radius";
export type { RadiusKey } from "./radius";

export { elevation } from "./elevation";
export type { ElevationKey } from "./elevation";
