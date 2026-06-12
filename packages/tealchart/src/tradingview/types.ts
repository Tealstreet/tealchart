import type { Bar } from '../types';
import type { CandleCoordinates } from '../jailbreak/types';

export const TRADINGVIEW_ADAPTER_HOOK_KEY = '__tealchartTradingViewHooks__';

export const SUPPORTED_TRADINGVIEW_VERSION = '31.2.0';

export type TradingViewPatchTarget = 'bundle' | 'loader';

export interface TradingViewCanvasDimensions {
  width: number;
  height: number;
}

export interface TradingViewSymbolInfo {
  exchange: string;
  symbol: string;
  resolutionString: string;
}

export interface TradingViewRenderFrame extends TradingViewSymbolInfo {
  ctx: CanvasRenderingContext2D;
  bars: Bar[];
  candleCoords: CandleCoordinates[];
  chartWidth: number;
  chartHeight: number;
  priceToCoord: (price: number) => number;
  coordToPrice: (coord: number) => number;
  studySources: readonly unknown[];
  coordinates?: TradingViewCanvasDimensions;
  raw?: unknown;
}

export interface TradingViewCoordinatesPayload {
  mediaSize?: TradingViewCanvasDimensions;
  width?: number;
  height?: number;
}

export type TradingViewRealBar =
  | Bar
  | readonly [time: number | string, open: number | string, high: number | string, low: number | string, close: number | string, volume?: number | string];

export type TradingViewCoordinateBar = Partial<CandleCoordinates> & {
  center: number;
};

export interface TradingViewRawRenderFrame extends Partial<TradingViewSymbolInfo> {
  ctx?: CanvasRenderingContext2D;
  bars?: readonly Bar[];
  realBars?: readonly TradingViewRealBar[];
  candleCoords?: readonly CandleCoordinates[];
  coordinateBars?: readonly TradingViewCoordinateBar[];
  coordinates?: TradingViewCoordinatesPayload;
  chartWidth?: number;
  chartHeight?: number;
  priceToCoord?: (price: number) => number;
  coordToPrice?: (coord: number) => number;
  studySources?: readonly unknown[];
  raw?: unknown;
}

export type TradingViewRenderFrameInput = TradingViewRenderFrame | TradingViewRawRenderFrame;

export interface TradingViewPatchCallbacks {
  beforeBars?: (frame: TradingViewRenderFrameInput) => void;
  afterBars?: (frame: TradingViewRenderFrameInput) => void;
  shouldSkipNativeBars?: (frame: TradingViewRenderFrameInput) => boolean;
}

export interface TradingViewPatchHandle {
  dispose: () => void;
}

export interface TradingViewTextPatch {
  id: string;
  target?: TradingViewPatchTarget;
  find: string;
  replace: string;
  required?: boolean;
  occurrence?: number | 'all';
}

export interface TradingViewPatchSpec {
  id: string;
  tradingViewVersion: string;
  sourceSha256?: string;
  patches: readonly TradingViewTextPatch[];
}

export interface TradingViewPatchOptions {
  allowHashMismatch?: boolean;
  expectedSha256?: string;
}

export interface TradingViewPatchResult {
  code: string;
  specId: string;
  tradingViewVersion: string;
  sourceSha256?: string;
  appliedPatches: string[];
  warnings: string[];
}

export type TradingViewPatchErrorCode =
  | 'hash-mismatch'
  | 'missing-anchor'
  | 'ambiguous-anchor'
  | 'invalid-occurrence';

export interface TradingViewHookHost {
  [TRADINGVIEW_ADAPTER_HOOK_KEY]?: TradingViewPatchCallbacks;
  top?: Window | null;
}
