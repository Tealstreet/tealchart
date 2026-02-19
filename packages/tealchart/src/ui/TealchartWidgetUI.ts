import type { InputDefinition, PlotOutput } from '@tealstreet/tealscript';
import type { BuiltinIndicator } from '../indicators/builtinIndicators';
import type { PlotStyleOverride } from '../state/chartState';
import type {
  Bar,
  ContextMenuItem,
  OrderLineRenderData,
  PaneLayout,
  PositionLineRenderData,
  RenderOptions,
  ResolutionString,
  Viewport,
} from '../types';
import type { ChartCoreOptions, IndicatorPaneInfo } from './ChartCore';
import type { ActiveIndicator } from './ChartLegend';
import type { ChartTopBarOptions } from './ChartTopBar';

import { getChartStore } from '../state/chartState';
import { ChartCore } from './ChartCore';
import { ChartLegend } from './ChartLegend';
import { ChartTopBar } from './ChartTopBar';
import { div, icons, span } from './dom';
import { IndicatorPaneLegend } from './IndicatorPaneLegend';
import { IndicatorSettingsModal } from './IndicatorSettingsModal';
import { IndicatorsModal } from './IndicatorsModal';

/**
 * TealchartWidgetUI - Vanilla DOM UI layer for TealchartWidget
 *
 * This class handles the UI rendering that was previously done by React's ChartContainer.
 * It orchestrates:
 * - ChartCore (canvas + Konva layer)
 * - ChartTopBar (timeframe selector, indicators button)
 * - ChartLegend (OHLC display, indicator list)
 * - IndicatorsModal (indicator picker)
 * - IndicatorSettingsModal (indicator settings)
 * - Loading overlay
 * - Context menu
 */

// Top bar height - used to offset chart rendering so labels don't appear under the top bar
const TOP_BAR_HEIGHT = 32;

// ============================================================================
// Types
// ============================================================================

export interface TealchartWidgetUIOptions {
  /** Container element */
  container: HTMLElement;
  /** Chart key for state persistence */
  chartKey: string;
  /** Initial symbol */
  symbol: string;
  /** Initial interval */
  interval: ResolutionString;
  /** Show top bar */
  showTopBar?: boolean;
  /** Render options */
  renderOptions?: Partial<RenderOptions>;
  /** Callback when interval changes */
  onIntervalChange?: (interval: ResolutionString) => void;
  /** Callback when indicator is added */
  onAddIndicator?: (indicator: BuiltinIndicator) => void;
  /** Callback when indicator visibility is toggled */
  onToggleIndicator?: (indicatorId: string) => void;
  /** Callback when indicator settings are requested */
  onSettingsIndicator?: (indicatorId: string) => void;
  /** Callback when indicator is removed */
  onRemoveIndicator?: (indicatorId: string) => void;
  /** Get study input definitions */
  getStudyInputDefinitions?: (studyId: string) => InputDefinition[];
  /** Callback when indicator settings are saved */
  onSaveIndicatorSettings?: (
    indicatorId: string,
    inputs: Record<string, unknown>,
    styleOverrides?: PlotStyleOverride[],
  ) => void;
  /** Callback when viewport changes */
  onViewportChange?: (viewport: Viewport) => void;
  /** Callback when more bars are needed */
  onRequestMoreBars?: (direction: 'left' | 'right') => void;
  /** Callback when order is moved */
  onOrderMove?: (orderId: string, newPrice: number) => void;
  /** Callback when order is cancelled */
  onOrderCancel?: (orderId: string) => void;
  /** Callback when position is closed */
  onPositionClose?: (positionId: string) => void;
  /** Callback when position is reversed */
  onPositionReverse?: (positionId: string) => void;
  /** Callback when TP drag ends */
  onTPDragEnd?: (positionId: string, price: number, partialPercent?: number) => void;
  /** Callback when SL drag ends */
  onSLDragEnd?: (positionId: string, price: number, partialPercent?: number) => void;
  /** Callback when TP is clicked */
  onTPClick?: (positionId: string) => void;
  /** Callback when SL is clicked */
  onSLClick?: (positionId: string) => void;
  /** Context menu callback */
  onContextMenu?: (unixTime: number, price: number) => ContextMenuItem[];
  /** Mouse down callback */
  onMouseDown?: () => void;
  /** Mouse up callback */
  onMouseUp?: () => void;
  /** Crosshair moved callback */
  onCrossHairMoved?: (price: number, time: number) => void;
}

// ============================================================================
// TealchartWidgetUI Class
// ============================================================================

export class TealchartWidgetUI {
  private options: TealchartWidgetUIOptions;
  private container: HTMLElement;

  // DOM elements
  private rootEl: HTMLDivElement;
  private chartArea: HTMLDivElement;
  private loadingOverlay: HTMLDivElement | null = null;

  // Components
  private chartCore: ChartCore | null = null;
  private topBar: ChartTopBar | null = null;
  private legend: ChartLegend | null = null;
  private indicatorsModal: IndicatorsModal | null = null;
  private settingsModal: IndicatorSettingsModal | null = null;

  // State (not used for rendering, just for API access)
  private isLoading = false;
  private activeIndicators: ActiveIndicator[] = [];
  private currentPlots: PlotOutput[] = [];
  private currentPaneLayout: PaneLayout | null = null;
  private currentIndicatorPaneInfo: Record<string, IndicatorPaneInfo> = {};

  // Indicator pane legends (one per non-overlay indicator pane)
  private indicatorPaneLegends: Map<string, IndicatorPaneLegend> = new Map();

  constructor(options: TealchartWidgetUIOptions) {
    this.options = options;
    this.container = options.container;

    // Create root element - chart renders at full size, top bar overlays
    this.rootEl = div({
      style: {
        position: 'relative',
        width: '100%',
        height: '100%',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
        backgroundColor: 'var(--chart-bg, #131722)',
      },
    });

    // Create chart area - takes full size of container (behind top bar)
    this.chartArea = div({
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
      },
    });
    this.rootEl.appendChild(this.chartArea);

    // Create top bar - positioned absolutely over the chart
    if (options.showTopBar !== false) {
      const topBarWrapper = div({
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          zIndex: '5',
        },
      });

      this.topBar = new ChartTopBar({
        chartKey: options.chartKey,
        symbol: options.symbol,
        onIntervalChange: (interval) => {
          options.onIntervalChange?.(interval);
        },
        onIndicatorsClick: () => {
          this.indicatorsModal?.toggle();
        },
      });
      this.topBar.mount(topBarWrapper);
      this.rootEl.appendChild(topBarWrapper);
    }

    // Mount to container
    this.container.appendChild(this.rootEl);

    // Initialize chart core after getting dimensions
    this.initChartCore();

    // Create legend
    this.legend = new ChartLegend({
      symbol: options.symbol,
      interval: options.interval,
      onToggleIndicator: options.onToggleIndicator,
      onSettingsIndicator: (indicatorId) => this.openIndicatorSettings(indicatorId),
      onRemoveIndicator: options.onRemoveIndicator,
    });
    // Use mount() instead of getElement() to trigger onMount/render
    this.legend.mount(this.chartArea);

    // Create modals (mounted to rootEl so they're positioned within the chart)
    this.indicatorsModal = new IndicatorsModal({
      onSelectIndicator: (indicator) => {
        options.onAddIndicator?.(indicator);
      },
    });
    this.indicatorsModal.mount(this.rootEl);

    this.settingsModal = new IndicatorSettingsModal();
    this.settingsModal.mount(this.rootEl);

    // Create loading overlay (hidden by default)
    this.createLoadingOverlay();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initChartCore(): void {
    const rect = this.chartArea.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;

    // When top bar is shown, add top margin so price labels don't render under it
    const margins = this.options.showTopBar !== false ? { top: TOP_BAR_HEIGHT } : undefined;

    this.chartCore = new ChartCore({
      container: this.chartArea,
      width,
      height,
      margins,
      renderOptions: this.options.renderOptions,
      onViewportChange: this.options.onViewportChange,
      onRequestMoreBars: this.options.onRequestMoreBars,
      onOrderMove: this.options.onOrderMove,
      onOrderCancel: this.options.onOrderCancel,
      onPositionClose: this.options.onPositionClose,
      onPositionReverse: this.options.onPositionReverse,
      onTPDragEnd: this.options.onTPDragEnd,
      onSLDragEnd: this.options.onSLDragEnd,
      onTPClick: this.options.onTPClick,
      onSLClick: this.options.onSLClick,
      onContextMenu: this.options.onContextMenu,
      onMouseDown: this.options.onMouseDown,
      onMouseUp: this.options.onMouseUp,
      onCrossHairMoved: this.options.onCrossHairMoved,
    });
  }

  private createLoadingOverlay(): void {
    // Position below the top bar so timeframe buttons remain clickable during loading
    const topOffset = this.options.showTopBar !== false ? TOP_BAR_HEIGHT : 0;
    this.loadingOverlay = div({
      style: {
        position: 'absolute',
        top: `${topOffset}px`,
        left: '0',
        right: '0',
        bottom: '0',
        backgroundColor: 'var(--chart-bg, #131722)',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '10',
      },
    });

    const spinner = div({
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        color: 'var(--text2, #787b86)',
      },
    });

    spinner.appendChild(icons.spinner(24, 'var(--text2, #787b86)'));
    spinner.appendChild(span({ text: 'Loading chart data...' }));

    this.loadingOverlay.appendChild(spinner);
    this.chartArea.appendChild(this.loadingOverlay);
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Update bars - calls ChartCore directly
   */
  setBars(bars: Bar[]): void {
    this.chartCore?.setBars(bars);

    // Update legend with latest bar
    if (bars.length > 0) {
      const latestBar = bars[bars.length - 1];
      const previousBar = bars.length > 1 ? bars[bars.length - 2] : null;
      this.legend?.setBars(latestBar, previousBar);
    }
  }

  /**
   * Update order lines - calls ChartCore directly
   */
  setOrderLines(lines: OrderLineRenderData[]): void {
    this.chartCore?.setOrderLines(lines);
  }

  /**
   * Update position lines - calls ChartCore directly
   */
  setPositionLines(lines: PositionLineRenderData[]): void {
    this.chartCore?.setPositionLines(lines);
  }

  /**
   * Update indicator plots - calls ChartCore directly
   */
  setPlots(plots: PlotOutput[]): void {
    this.currentPlots = plots; // Store for openIndicatorSettings
    this.chartCore?.setPlots(plots);
  }

  /**
   * Update pane layout - calls ChartCore directly
   */
  setPaneLayout(layout: PaneLayout): void {
    this.currentPaneLayout = layout;
    this.chartCore?.setPaneLayout(layout);
    // Update indicator pane legend positions
    this.updateIndicatorPaneLegends();
  }

  /**
   * Update active indicators for legend - calls ChartCore directly
   */
  setActiveIndicators(indicators: ActiveIndicator[], paneInfo: Record<string, IndicatorPaneInfo>): void {
    this.activeIndicators = indicators;
    this.currentIndicatorPaneInfo = paneInfo;

    // Update ChartCore with indicator pane info
    this.chartCore?.setIndicatorPaneInfo(paneInfo);

    // Build plotStyleOverrides map from activeIndicators
    // (React equivalent: ChartContainer.tsx:550-560)
    const map = new Map<string, PlotStyleOverride>();
    for (const indicator of indicators) {
      if (indicator.styleOverrides) {
        for (const override of indicator.styleOverrides) {
          map.set(override.plotId, override);
        }
      }
    }
    this.chartCore?.setPlotStyleOverrides(map);

    // Update main legend (overlay indicators)
    this.legend?.setIndicators(indicators, paneInfo);

    // Update indicator pane legends (non-overlay indicators)
    this.updateIndicatorPaneLegends();
  }

  /**
   * Update symbol display
   */
  setSymbol(symbol: string, exchangeName?: string): void {
    this.topBar?.setSymbol(symbol, exchangeName);
    this.legend?.setSymbol(symbol, exchangeName);
  }

  /**
   * Update interval display
   */
  setInterval(interval: ResolutionString): void {
    this.topBar?.setInterval(interval);
    this.legend?.setInterval(interval);
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.isLoading = loading;
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = loading ? 'flex' : 'none';
    }
  }

  /**
   * Update render options (colors, styles) - calls ChartCore directly
   */
  setRenderOptions(options: Partial<RenderOptions>): void {
    this.options.renderOptions = { ...this.options.renderOptions, ...options };
    this.chartCore?.setRenderOptions(options);
  }

  /**
   * Resize the chart
   */
  resize(width?: number, height?: number): void {
    const rect = this.chartArea.getBoundingClientRect();
    const w = width ?? rect.width;
    const h = height ?? rect.height;
    this.chartCore?.resize(w, h);
  }

  /**
   * Open indicator settings modal
   */
  openIndicatorSettings(indicatorId: string): void {
    const indicator = this.activeIndicators.find((i) => i.id === indicatorId);
    if (!indicator) return;

    const inputDefinitions = this.options.getStudyInputDefinitions?.(indicatorId) ?? [];
    // Use current plots for this indicator (filter by scriptId)
    const indicatorPlots = this.currentPlots.filter((p: PlotOutput) => p.scriptId === indicatorId);

    this.settingsModal?.open(
      indicator,
      inputDefinitions,
      indicatorPlots,
      indicator.styleOverrides ?? [],
      (inputs, styleOverrides) => {
        this.options.onSaveIndicatorSettings?.(indicatorId, inputs, styleOverrides);
      },
    );
  }

  /**
   * Get the underlying ChartCore
   */
  getChartCore(): ChartCore | null {
    return this.chartCore;
  }

  /**
   * Update indicator pane legends - creates, updates positions, and removes as needed
   */
  private updateIndicatorPaneLegends(): void {
    const paneLayout = this.currentPaneLayout;
    const paneInfo = this.currentIndicatorPaneInfo;
    const indicators = this.activeIndicators;

    // If no pane layout or no indicator panes, remove all legends
    if (!paneLayout || !paneLayout.indicatorPanes || paneLayout.indicatorPanes.length === 0) {
      for (const legend of this.indicatorPaneLegends.values()) {
        legend.unmount();
      }
      this.indicatorPaneLegends.clear();
      return;
    }

    // Get chart height from chartArea
    const chartHeight = this.chartArea.clientHeight;
    if (chartHeight <= 0) return;

    // Constants matching the renderer
    const TIME_AXIS_HEIGHT = 30;
    const availableHeight = chartHeight - TIME_AXIS_HEIGHT;

    // Calculate main pane height
    const mainPanePixelHeight = availableHeight * paneLayout.mainPaneHeight;

    // Track which pane IDs we've seen (to remove stale legends)
    const currentPaneIds = new Set<string>();

    // Calculate positions and update legends for each indicator pane
    let currentTop = mainPanePixelHeight;
    for (const pane of paneLayout.indicatorPanes) {
      const paneHeight = availableHeight * pane.heightRatio;
      currentPaneIds.add(pane.id);

      // Get indicators for this pane
      const paneIndicators = indicators.filter((ind) => {
        const info = paneInfo[ind.id];
        return info?.overlay === false && pane.indicatorIds.includes(ind.id);
      });

      if (paneIndicators.length === 0) {
        // No indicators for this pane, remove legend if it exists
        const existing = this.indicatorPaneLegends.get(pane.id);
        if (existing) {
          existing.unmount();
          this.indicatorPaneLegends.delete(pane.id);
        }
        currentTop += paneHeight;
        continue;
      }

      // Create or update legend for this pane
      let legend = this.indicatorPaneLegends.get(pane.id);
      if (!legend) {
        // Create new legend
        legend = new IndicatorPaneLegend({
          paneId: pane.id,
          top: currentTop,
          onToggleIndicator: this.options.onToggleIndicator,
          onSettingsIndicator: (indicatorId) => this.openIndicatorSettings(indicatorId),
          onRemoveIndicator: this.options.onRemoveIndicator,
        });
        legend.mount(this.chartArea);
        this.indicatorPaneLegends.set(pane.id, legend);
      } else {
        // Update position
        legend.setPosition(currentTop);
      }

      // Update indicators
      legend.setIndicators(paneIndicators, paneInfo);

      currentTop += paneHeight;
    }

    // Remove legends for panes that no longer exist
    for (const [paneId, legend] of this.indicatorPaneLegends) {
      if (!currentPaneIds.has(paneId)) {
        legend.unmount();
        this.indicatorPaneLegends.delete(paneId);
      }
    }
  }

  /**
   * Dispose and clean up
   */
  dispose(): void {
    this.chartCore?.dispose();
    this.topBar?.unmount();
    this.legend?.unmount();
    // Clean up indicator pane legends
    for (const legend of this.indicatorPaneLegends.values()) {
      legend.unmount();
    }
    this.indicatorPaneLegends.clear();
    this.indicatorsModal?.unmount();
    this.settingsModal?.unmount();
    this.rootEl.remove();
  }
}
