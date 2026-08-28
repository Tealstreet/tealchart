/**
 * Shared constants for tealchart — used by both web (ChartCore) and mobile (SkiaTealchart).
 */

/** Canvas opacity while getBars is in flight. Previous candles stay visible but faded. */
export const LOADING_OPACITY = 0.7;

/** Default candle up/buy color used by trading-line positive states. */
export const DEFAULT_BUY_CANDLE_COLOR = '#0ECB81';

/** Default candle down/sell color. */
export const DEFAULT_SELL_CANDLE_COLOR = '#F6465D';

/** Default buy/long order/position line color. */
export const DEFAULT_TRADE_LINE_BUY_COLOR = '#0ba7da';

/** Default sell/short order/position line color. */
export const DEFAULT_TRADE_LINE_SELL_COLOR = '#fa6b67';

/** Default neutral order/position line color. */
export const DEFAULT_TRADE_LINE_COLOR = DEFAULT_TRADE_LINE_BUY_COLOR;

/** Low-glare default fill for order/position line labels and action buttons. */
export const DEFAULT_TRADE_LINE_LABEL_COLOR = 'rgba(32, 33, 42, 0.88)';

/** Default font for order/position line label segments. */
export const DEFAULT_TRADE_LINE_LABEL_FONT = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/** Default separator/border color between order/position line label segments. */
export const DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR = 'rgba(255, 255, 255, 0.16)';

/**
 * Hairline used for the label outline and the seams between its segments.
 * Neighbouring segments stroke the same 1px column, so this reads as one rule.
 */
export const DEFAULT_TRADE_LINE_HAIRLINE_COLOR = 'rgba(255, 255, 255, 0.10)';

/**
 * How much of its own hue a colored label segment keeps as a background. Full
 * strength fills turn the label into a bright bar across the candles and flatten
 * every segment to the same importance; a tint keeps the color legible while the
 * text carries it at full strength.
 */
export const TRADE_LINE_SEGMENT_TINT_ALPHA = 0.14;

/** Warmer hues read weaker at the same alpha, so orange gets a touch more. */
export const TRADE_LINE_WARM_SEGMENT_TINT_ALPHA = 0.18;

/** Width of the side-colored rail on the leading edge of a trade line label. */
export const TRADE_LINE_ACCENT_RAIL_WIDTH = 3;

/** Default dark text for filled positive/PnL and TP/SL segments. */
export const DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR = '#1f2933';

/** Ink for a filled segment whose fill is too dark to carry the dark text. */
export const DEFAULT_TRADE_LINE_FILLED_SEGMENT_LIGHT_TEXT_COLOR = '#ffffff';

/** Visible dotted stroke pattern for explicit dotted trade lines. */
export const TRADE_LINE_DOTTED_DASH_PATTERN = [1, 5];

/** Default bracket colors shared by web canvas/Konva and mobile/Skia renderers. */
export const TAKE_PROFIT_COLOR = DEFAULT_BUY_CANDLE_COLOR;
export const STOP_LOSS_COLOR = '#f97316';

/** Default positive PnL color shared by web canvas/Konva and mobile/Skia renderers. */
export const POSITIVE_PNL_COLOR = DEFAULT_BUY_CANDLE_COLOR;

/** Pane divider resize affordance. Shared so web and native cannot drift apart. */
export const PANE_DIVIDER_HIGHLIGHT_BAND = 'rgba(41, 98, 255, 0.12)';
export const PANE_DIVIDER_HIGHLIGHT_LINE = 'rgba(41, 98, 255, 0.6)';
/** Half-height of the highlight band, and the divider's own stroke width. */
export const PANE_DIVIDER_HIGHLIGHT_BAND_RADIUS = 3;
export const PANE_DIVIDER_HIGHLIGHT_LINE_WIDTH = 2;

/**
 * The legend's loading indicator, shared so web's CSS keyframes and the native
 * overlay's Reanimated timing describe the same animation rather than drifting.
 */
export const LOADING_DOT_COUNT = 3;
export const LOADING_DOT_PERIOD_MS = 1400;
export const LOADING_DOT_STAGGER_MS = 150;
export const LOADING_DOT_MIN_OPACITY = 0.15;
export const LOADING_DOT_MAX_OPACITY = 0.8;
