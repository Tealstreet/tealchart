import type { Bar } from '../types';

/**
 * Pre-computed pixel positions for a single candle.
 * These are in logical (CSS) pixels — DPR scaling is handled by the caller.
 */
export interface CandleCoordinates {
  /** Y pixel of candle body top */
  top: number;
  /** Y pixel of candle body bottom */
  bottom: number;
  /** X pixel center */
  center: number;
  /** X pixel left edge */
  left: number;
  /** X pixel right edge */
  right: number;
  /** Width in pixels */
  candleWidth: number;
  /** Y pixel of high wick */
  high: number;
  /** Y pixel of low wick */
  low: number;
  /** Wick width in pixels */
  wickWidth: number;
}

/**
 * Arguments passed to indicator draw methods.
 * Chart-engine-agnostic — works for both TradingView and tealchart.
 */
export interface IndicatorDrawArgs {
  /** Raw canvas context (DPR pre-scaled by caller) */
  ctx: CanvasRenderingContext2D;
  /** OHLCV bar objects */
  bars: Bar[];
  /** Pre-computed pixel positions (same length as bars) */
  candleCoords: CandleCoordinates[];
  /** Flat settings object (no nested _value wrappers) */
  settings: Record<string, unknown>;
  /** Exchange name */
  exchange: string;
  /** Symbol name */
  symbol: string;
  /** Resolution string (e.g. '1', '5', '1D') */
  resolutionString: string;
  /** Chart width in logical pixels */
  chartWidth: number;
  /** Chart height in logical pixels */
  chartHeight: number;
  /** Convert a price to a Y coordinate */
  priceToCoord: (price: number) => number;
  /** Convert a Y coordinate to a price */
  coordToPrice: (coord: number) => number;
}

/**
 * Arguments passed to indicator tooltip methods.
 */
export interface IndicatorTooltipArgs {
  /** OHLCV bar objects */
  bars: Bar[];
  /** Flat settings object */
  settings: Record<string, unknown>;
  /** Mouse X position */
  mouseX: number;
  /** Mouse Y position */
  mouseY: number;
  /** Index into bars/candleCoords for the hovered bar */
  barIndex: number;
}

/**
 * A single tooltip entry returned by an indicator.
 */
export interface CrossHairTooltip {
  /** Label text */
  label: string;
  /** Value text */
  value: string;
  /** Optional color */
  color?: string;
}

/**
 * Scale a font size for the current canvas context.
 *
 * - Tealchart path: canvas has ctx.scale(dpr, dpr), so logical font sizes render correctly → returns `size` as-is.
 * - TradingView path: canvas has no pre-scaling, CtxWithPixelRatio handles coords but not fonts → uses
 *   the wrapper's fontSize() method to scale by DPR.
 *
 * Use this when setting ctx.font in indicators that need to work on both chart engines.
 */
export function scaleFontSize(ctx: CanvasRenderingContext2D, size: number): number {
  if ('fontSize' in ctx && typeof (ctx as any).fontSize === 'function') {
    return (ctx as any).fontSize(size);
  }
  return size;
}
