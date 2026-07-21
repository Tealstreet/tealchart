/**
 * Shared constants for tealchart — used by both web (ChartCore) and mobile (SkiaTealchart).
 */

/** Canvas opacity while getBars is in flight. Previous candles stay visible but faded. */
export const LOADING_OPACITY = 0.7;

/** Default candle up/buy color used by trading-line positive states. */
export const DEFAULT_BUY_CANDLE_COLOR = '#0ECB81';

/** Default candle down/sell color. */
export const DEFAULT_SELL_CANDLE_COLOR = '#F6465D';

/** Default neutral order/position line color. */
export const DEFAULT_TRADE_LINE_COLOR = '#2196F3';

/** Low-glare default fill for order/position line labels and action buttons. */
export const DEFAULT_TRADE_LINE_LABEL_COLOR = '#338DE2';

/** Default separator/border color between order/position line label segments. */
export const DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR = 'rgba(255, 255, 255, 0.16)';

/** Visible dotted stroke pattern for explicit dotted trade lines. */
export const TRADE_LINE_DOTTED_DASH_PATTERN = [1, 5];

/** Default bracket colors shared by web canvas/Konva and mobile/Skia renderers. */
export const TAKE_PROFIT_COLOR = DEFAULT_BUY_CANDLE_COLOR;
export const STOP_LOSS_COLOR = '#f97316';

/** Default positive PnL color shared by web canvas/Konva and mobile/Skia renderers. */
export const POSITIVE_PNL_COLOR = DEFAULT_BUY_CANDLE_COLOR;
