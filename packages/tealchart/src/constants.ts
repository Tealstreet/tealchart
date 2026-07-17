/**
 * Shared constants for tealchart — used by both web (ChartCore) and mobile (SkiaTealchart).
 */

/** Canvas opacity while getBars is in flight. Previous candles stay visible but faded. */
export const LOADING_OPACITY = 0.7;

/** Default bracket colors shared by web canvas/Konva and mobile/Skia renderers. */
export const TAKE_PROFIT_COLOR = '#22c55e';
export const STOP_LOSS_COLOR = '#f97316';
