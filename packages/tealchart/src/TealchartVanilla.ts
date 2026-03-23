// ============================================================================
// Simple Chart Wrapper (optional convenience class)
// ============================================================================
import type { CanvasContext } from './rendering';
import type { Bar, ChartMargins, RenderOptions, ResolutionString, Viewport } from './types';

import { WebCanvasContext } from './rendering';
import { AVAILABLE_TIMEFRAMES, getChartStore } from './state/chartState';
import { TealchartRenderer } from './TealchartRenderer';
import { DEFAULT_MARGINS, DEFAULT_RENDER_OPTIONS } from './types';
import { ChartTopBar } from './ui/ChartTopBar';
import { IndicatorsModal } from './ui/IndicatorsModal';

/**
 * TealchartVanilla - Framework-agnostic chart components
 *
 * This module provides the building blocks for creating a chart without React.
 * It exports individual components that can be composed together.
 *
 * For a full-featured chart experience, use TealchartWidget with React.
 * This vanilla module is designed for:
 * - Embedding in non-React applications
 * - Maximum control over rendering and state
 * - Smaller bundle size when only specific features are needed
 *
 * Example usage:
 * ```ts
 * import {
 *   TealchartRenderer,
 *   EventManager,
 *   InteractiveLineRenderer,
 *   ChartTopBar,
 *   IndicatorsModal,
 *   getChartStore,
 * } from '@tealstreet/tealchart/vanilla';
 *
 * // Create store for state management
 * const store = getChartStore('my-chart');
 *
 * // Create top bar
 * const topBar = new ChartTopBar({
 *   chartKey: 'my-chart',
 *   symbol: 'BTCUSDT',
 *   onIntervalChange: (interval) => loadData(interval),
 *   onIndicatorsClick: () => indicatorsModal.open(),
 * });
 * topBar.mount(container);
 *
 * // Create canvas and renderer
 * const canvas = document.createElement('canvas');
 * const ctx = canvas.getContext('2d')!;
 * const renderer = new TealchartRenderer(ctx);
 *
 * // Render bars
 * renderer.render(bars, { viewport, paneLayout });
 * ```
 */

// Re-export vanilla-compatible modules
export { TealchartRenderer } from './TealchartRenderer';
export {
  EventManager,
  type EventManagerCallbacks,
  type InteractionState,
  type CrosshairState,
  type DragMode,
  type PaneInfo,
} from './interaction/EventManager';
export { InteractiveLineRenderer, type InteractiveLineRendererOptions } from './interaction/InteractiveLineRenderer';
export { InteractiveLineState } from './interaction/InteractiveLineState';

// UI Components
export { Component, TemplateComponent, type ComponentOptions } from './ui/Component';
export { Modal, type ModalOptions, type ModalState } from './ui/Modal';
export { ChartTopBar, type ChartTopBarOptions } from './ui/ChartTopBar';
export { IndicatorsModal, type IndicatorsModalOptions } from './ui/IndicatorsModal';
export {
  IndicatorSettingsModal,
  type IndicatorSettingsModalOptions,
  type ActiveIndicator,
} from './ui/IndicatorSettingsModal';
export {
  ChartLegend,
  type ChartLegendOptions,
  type ActiveIndicator as LegendActiveIndicator,
  type IndicatorPaneInfo as LegendIndicatorPaneInfo,
} from './ui/ChartLegend';
export { ContextMenu, showContextMenu, type ContextMenuOptions } from './ui/ContextMenu';
export { ChartCore, type ChartCoreOptions, type IndicatorPaneInfo } from './ui/ChartCore';

// DOM utilities
export {
  h,
  div,
  span,
  button,
  input,
  select,
  label,
  clear,
  append,
  setCssVars,
  applyStyles,
  toggleClass,
  svg,
  icons,
  type ElementProps,
} from './ui/dom';

// State management (Nanostores-based, framework-agnostic)
export {
  getChartStore,
  type ChartStore,
  type ChartSettings,
  type IndicatorInstance,
  type PlotStyleOverride,
  type LineStyle,
  AVAILABLE_TIMEFRAMES,
} from './state/chartState';
export { createIndicatorActions, type IndicatorActions } from './state/indicatorActions';

// Indicators
export {
  BUILTIN_INDICATORS,
  INDICATOR_CATEGORIES,
  getIndicatorById,
  getIndicatorsByCategory,
  searchIndicators,
  type BuiltinIndicator,
} from './indicators/builtinIndicators';

// Tealscript (optional, for indicator execution)
export { TealscriptManager } from './tealscript/TealscriptManager';

// Pane management
export { PaneManager } from './rendering/PaneManager';

// Types
export type {
  Bar,
  Viewport,
  RenderOptions,
  ChartMargins,
  PriceLine,
  OrderLineRenderData,
  PositionLineRenderData,
  PaneLayout,
  UnifiedPaneLayout,
  ChartPane,
  ResolutionString,
  IBasicDataFeed,
  LibrarySymbolInfo,
} from './types';

export { DEFAULT_MARGINS, DEFAULT_RENDER_OPTIONS } from './types';

/**
 * Options for SimpleChart
 */
export interface SimpleChartOptions {
  /** Container element */
  container: HTMLElement;
  /** Symbol to display */
  symbol: string;
  /** Exchange name for display */
  exchangeName?: string;
  /** Initial interval */
  interval?: ResolutionString;
  /** Chart key for state persistence */
  chartKey?: string;
  /** Show top bar */
  showTopBar?: boolean;
  /** Chart margins */
  margins?: Partial<ChartMargins>;
  /** Render options */
  renderOptions?: Partial<RenderOptions>;
}

/**
 * SimpleChart - A minimal vanilla chart wrapper
 *
 * This is a simplified chart that demonstrates how to compose the vanilla
 * components. For production use, consider the full TealchartWidget with React.
 */
export class SimpleChart {
  private _container: HTMLElement;
  private _chartKey: string;
  private _symbol: string;
  private _interval: ResolutionString;
  private _margins: ChartMargins;
  private _renderOptions: RenderOptions;

  private _rootEl: HTMLElement;
  private _canvasEl: HTMLCanvasElement;
  private _ctx: CanvasContext;
  private _renderer: TealchartRenderer;

  private _topBar: ChartTopBar | null = null;
  private _indicatorsModal: IndicatorsModal | null = null;

  private _bars: Bar[] = [];
  private _viewport: Viewport | null = null;
  private _rafId: number | null = null;

  private _onIntervalChange?: (interval: ResolutionString) => void;
  private _onIndicatorAdd?: (indicator: { id: string; name: string }) => void;

  constructor(options: SimpleChartOptions) {
    this._container = options.container;
    this._symbol = options.symbol;
    this._interval = (options.interval || '1h') as ResolutionString;
    this._chartKey = options.chartKey || `chart_${Date.now()}`;
    this._margins = { ...DEFAULT_MARGINS, ...options.margins };
    this._renderOptions = { ...DEFAULT_RENDER_OPTIONS, ...options.renderOptions };

    // Initialize store
    const store = getChartStore(this._chartKey);
    store.settings.setKey('interval', this._interval);

    // Create DOM structure
    this._rootEl = document.createElement('div');
    this._rootEl.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background-color: var(--chart-bg, #131722);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
    `;

    // Top bar
    if (options.showTopBar !== false) {
      this._topBar = new ChartTopBar({
        chartKey: this._chartKey,
        symbol: this._symbol,
        exchangeName: options.exchangeName,
        onIntervalChange: (interval) => {
          this._interval = interval;
          this._onIntervalChange?.(interval);
        },
        onIndicatorsClick: () => this._indicatorsModal?.toggle(),
      });
      this._rootEl.appendChild(this._topBar.getElement());
    }

    // Chart area
    const chartArea = document.createElement('div');
    chartArea.style.cssText = `
      flex: 1;
      position: relative;
      min-height: 0;
    `;

    // Canvas
    this._canvasEl = document.createElement('canvas');
    this._canvasEl.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    `;
    chartArea.appendChild(this._canvasEl);

    this._rootEl.appendChild(chartArea);
    this._container.appendChild(this._rootEl);

    // Get context and wrap in abstraction layer
    const nativeCtx = this._canvasEl.getContext('2d')!;
    this._ctx = new WebCanvasContext(nativeCtx);

    // Create renderer
    this._renderer = new TealchartRenderer(this._ctx, this._renderOptions, this._margins);

    // Create indicators modal
    this._indicatorsModal = new IndicatorsModal({
      onSelectIndicator: (indicator) => {
        this._onIndicatorAdd?.(indicator);
      },
    });
    this._indicatorsModal.mount(document.body);

    // Handle resize
    this._handleResize();
    window.addEventListener('resize', () => this._handleResize());
  }

  private _handleResize(): void {
    const rect = this._canvasEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this._canvasEl.width = rect.width * dpr;
    this._canvasEl.height = rect.height * dpr;
    this._ctx.scale(dpr, dpr);

    this._requestRender();
  }

  private _requestRender(): void {
    if (this._rafId !== null) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      this._render();
    });
  }

  private _render(): void {
    if (this._bars.length === 0) return;

    // Calculate viewport if not set
    const viewport = this._viewport || this._calculateDefaultViewport();

    // Render
    this._renderer.render(this._bars, viewport);
  }

  private _calculateDefaultViewport(): Viewport {
    const count = Math.min(100, this._bars.length);
    const lastBar = this._bars[this._bars.length - 1];
    const firstVisibleBar = this._bars[Math.max(0, this._bars.length - count)];

    let priceMin = Infinity;
    let priceMax = -Infinity;
    for (let i = Math.max(0, this._bars.length - count); i < this._bars.length; i++) {
      const bar = this._bars[i];
      priceMin = Math.min(priceMin, bar.low);
      priceMax = Math.max(priceMax, bar.high);
    }

    const padding = (priceMax - priceMin) * 0.1;
    return {
      startTime: firstVisibleBar.time,
      endTime: lastBar.time,
      priceMin: priceMin - padding,
      priceMax: priceMax + padding,
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Set bar data
   */
  setBars(bars: Bar[]): void {
    this._bars = bars;
    this._requestRender();
  }

  /**
   * Update a single bar (for real-time updates)
   */
  updateBar(bar: Bar): void {
    if (this._bars.length === 0) {
      this._bars.push(bar);
    } else {
      const lastBar = this._bars[this._bars.length - 1];
      if (bar.time === lastBar.time) {
        this._bars[this._bars.length - 1] = bar;
      } else if (bar.time > lastBar.time) {
        this._bars.push(bar);
      }
    }
    this._requestRender();
  }

  /**
   * Set viewport
   */
  setViewport(viewport: Viewport): void {
    this._viewport = viewport;
    this._requestRender();
  }

  /**
   * Set symbol
   */
  setSymbol(symbol: string, exchangeName?: string): void {
    this._symbol = symbol;
    this._topBar?.setSymbol(symbol, exchangeName);
  }

  /**
   * Set interval change callback
   */
  onIntervalChange(callback: (interval: ResolutionString) => void): void {
    this._onIntervalChange = callback;
  }

  /**
   * Set indicator add callback
   */
  onIndicatorAdd(callback: (indicator: { id: string; name: string }) => void): void {
    this._onIndicatorAdd = callback;
  }

  /**
   * Get current bars
   */
  getBars(): Bar[] {
    return [...this._bars];
  }

  /**
   * Get current interval
   */
  getInterval(): ResolutionString {
    return this._interval;
  }

  /**
   * Force render
   */
  render(): void {
    this._requestRender();
  }

  /**
   * Dispose and clean up
   */
  dispose(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
    }

    this._topBar?.unmount();
    this._indicatorsModal?.unmount();
    this._rootEl.remove();

    window.removeEventListener('resize', () => this._handleResize());
  }
}

/**
 * Create a simple vanilla chart
 */
export function createSimpleChart(options: SimpleChartOptions): SimpleChart {
  return new SimpleChart(options);
}
