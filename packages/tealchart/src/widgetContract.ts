/**
 * The TradingView `IChartingLibraryWidget` subset Tealstreet hosts actually consume.
 *
 * Declaring it once lets a single React lifecycle hook drive both the web
 * `TealchartWidget` and the React Native Skia handle. Anything added here must be
 * implementable on both, so DOM types stay in `ITealchartWebWidget`.
 */

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
}

/**
 * Web-only addition: `onShortcut` takes a DOM `KeyboardEvent`, which must not
 * reach a React Native tsconfig.
 */
export interface ITealchartWebWidget extends ITealchartWidget {
  onShortcut(shortcut: string, callback: (e: KeyboardEvent) => void): void;
}
