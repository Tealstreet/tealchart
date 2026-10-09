/** Shared web/native widget contract: consumed TradingView methods plus Tealchart analysis.
 * DOM-dependent additions belong in `ITealchartWebWidget`.
 */

import type { AnalysisRequestIntent } from './analysis/analysisSelection';
import type { TealchartApi } from './TealchartApi';
import type { ChartOverrides, ContextMenuCallback, WidgetEvent, WidgetEventCallback } from './types';

/** Mirrors TradingView `SaveChartErrorInfo`. */
export interface SaveChartErrorInfo {
  message: string;
}

/** Mirrors TradingView `SaveChartToServerOptions`. */
export interface SaveChartToServerOptions {
  chartName?: string;
  defaultChartName?: string;
}

export interface ITealchartWidget {
  activeChart(): TealchartApi;
  activeChartIndex(): number;
  applyOverrides(overrides: ChartOverrides): void;
  /** @stub Accepted and dropped — study overrides are not applied yet. */
  applyStudiesOverrides(overrides: Record<string, unknown>): void;
  chart(index?: number): TealchartApi;
  chartsCount(): number;
  headerReady(): Promise<void>;
  onChartReady(callback: () => void): void;
  onContextMenu(callback: ContextMenuCallback): void;
  setAnalysisRequestHandler(handler: ((intent: AnalysisRequestIntent) => void) | undefined): void;
  startAnalysisSelection(): boolean;
  cancelAnalysisSelection(): void;
  remove(): void;
  /**
   * @stub Accepted and dropped — reports failure through `onFail`. Hosts that
   * persist layouts must drive their own save/load adapter.
   */
  saveChartToServer(
    onComplete?: () => void,
    onFail?: (error: SaveChartErrorInfo) => void,
    options?: SaveChartToServerOptions,
  ): void;
  /** @stub Accepted and dropped — there is no CSS surface to target. */
  setCSSCustomProperty(key: string, value: string): void;
  subscribe<TEvent extends WidgetEvent>(event: TEvent, callback: WidgetEventCallback<TEvent>): void;
  unsubscribe<TEvent extends WidgetEvent>(event: TEvent, callback: WidgetEventCallback<TEvent>): void;
}

/**
 * Web-only addition: `onShortcut` takes a DOM `KeyboardEvent`, which must not
 * reach a React Native tsconfig.
 */
export interface ITealchartWebWidget extends ITealchartWidget {
  onShortcut(shortcut: string, callback: (e: KeyboardEvent) => void): void;
}
