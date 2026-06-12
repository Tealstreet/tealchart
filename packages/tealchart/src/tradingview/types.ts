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

export interface TradingViewPatchCallbacks {
  beforeBars?: (frame: TradingViewRenderFrame) => void;
  afterBars?: (frame: TradingViewRenderFrame) => void;
  shouldSkipNativeBars?: (frame: TradingViewRenderFrame) => boolean;
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
