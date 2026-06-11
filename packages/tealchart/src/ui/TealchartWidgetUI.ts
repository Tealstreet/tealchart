import type { DrawingOutput, InputDefinition, PlotOutput } from '@tealstreet/tealscript';
import type { BuiltinIndicator } from '../indicators/builtinIndicators';
import type { DirtyFlags } from '../rendering/RenderScheduler';
import type { PlotStyleOverride } from '../state/chartState';
import type {
  DrawingCoordinateSpace,
  DrawingScreenPoint,
  UserDrawingInputPoint,
  UserDrawingSelectionAtPointResult,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTextAlign,
  UserDrawingTool,
} from '../drawings';
import type {
  Bar,
  ContextMenuItem,
  ExecutionLineRenderData,
  OrderLineRenderData,
  PaneLayout,
  PositionLineRenderData,
  PriceLine,
  RenderOptions,
  ResolutionString,
  Viewport,
} from '../types';
import type { IndicatorPaneInfo } from './ChartCore';
import type { ActiveIndicator } from './ChartLegend';
import type { LayoutSelectorCallbacks } from './LayoutSelector';

import { TIME_AXIS_HEIGHT } from '../types';
import {
  anchorToScreenPoint,
  getUserDrawingToolbarStateKey,
  isUserDrawingTextAnnotation,
  resolveUserDrawingTextEditMetrics,
} from '../drawings';
import { ChartCore } from './ChartCore';
import { ChartLegend } from './ChartLegend';
import { ChartTopBar } from './ChartTopBar';
import { div, span } from './dom';
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
  /** Context menu callback */
  onContextMenu?: (unixTime: number, price: number) => ContextMenuItem[];
  /** Mouse down callback */
  onMouseDown?: () => void;
  /** Mouse up callback */
  onMouseUp?: () => void;
  /** Crosshair moved callback */
  onCrossHairMoved?: (price: number, time: number) => void;
  /** Called when a chart-surface click/tap resolves to a user drawing input point */
  onUserDrawingInput?: (point: UserDrawingInputPoint) => boolean;
  /** Called when select-mode chart-surface input should select or clear a user drawing */
  onUserDrawingSelection?: (
    point: DrawingScreenPoint,
    spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  ) => UserDrawingSelectionAtPointResult;
  /** Called when select-mode pointer down may start editing a user drawing */
  onUserDrawingEditStart?: (
    point: DrawingScreenPoint,
    spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  ) => boolean;
  /** Called while an active user drawing edit drag moves */
  onUserDrawingEditMove?: (point: DrawingScreenPoint) => boolean;
  /** Called when an active user drawing edit drag ends */
  onUserDrawingEditEnd?: () => void;
  /** Called when path-tool pointer down starts collecting freehand samples */
  onUserDrawingPathDragStart?: (point: UserDrawingInputPoint) => boolean;
  /** Called while an active path-tool drag collects freehand samples */
  onUserDrawingPathDragMove?: (point: UserDrawingInputPoint) => boolean;
  /** Called when an active path-tool drag ends */
  onUserDrawingPathDragEnd?: () => void;
  /** Initial/current user drawing state for top-bar controls */
  userDrawingState?: UserDrawingState;
  /** Called when a drawing tool is selected from the top bar */
  onUserDrawingToolSelect?: (tool: UserDrawingTool) => void;
  /** Called when the top bar should delete the selected user drawing */
  onUserDrawingDeleteSelected?: () => void;
  /** Called when the top bar should cancel the active user drawing draft */
  onUserDrawingCancelDraft?: () => void;
  /** Called when the top bar should clear all user drawings */
  onUserDrawingClearAll?: () => void;
  /** Called when the top bar should update selected drawing style */
  onUserDrawingStyleChange?: (style: Partial<UserDrawingStyle>) => void;
  /** Called when the top bar should update selected text-label alignment */
  onUserDrawingTextAlignChange?: (textAlign: UserDrawingTextAlign) => void;
  /** Called when the top bar should update selected drawing visibility */
  onUserDrawingVisibilityChange?: (visible: boolean) => void;
  /** Called when the top bar should update selected drawing locked state */
  onUserDrawingLockedChange?: (locked: boolean, includeLocked?: boolean) => void;
  /** Called when the active user drawing text editor changes */
  onUserDrawingTextEditChange?: (value: string) => void;
  /** Called when the active user drawing text editor should commit */
  onUserDrawingTextEditCommit?: () => void;
  /** Called when the active user drawing text editor should cancel */
  onUserDrawingTextEditCancel?: () => void;
  /** Called when auto-scale should be disabled (user starts price axis zoom) */
  onAutoScaleDisabled?: (paneId: string) => void;
  /** Called when viewport is reset (re-enables auto-scale) */
  onResetViewport?: () => void;
  /** Returns whether auto-scale is active for a given pane */
  isAutoScale?: (paneId: string) => boolean;
  /** Called on double-click/double-tap on a pane */
  onPaneDoubleClick?: (
    paneId: string,
    point: DrawingScreenPoint,
    spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  ) => void;
  /** Layout selector callbacks — if provided, layout selector is shown in the top bar */
  layoutCallbacks?: LayoutSelectorCallbacks;
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
  private loadingDots: HTMLDivElement | null = null;
  private userDrawingTextEditor: HTMLTextAreaElement | null = null;

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
  private currentUserDrawingToolbarStateKey: string | null = null;

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
        fontFamily: 'var(--tc-font-family, inherit)',
        overflow: 'hidden',
      },
    });
    this.rootEl.setAttribute('data-tealchart-root', 'true');

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
      this.currentUserDrawingToolbarStateKey = options.userDrawingState
        ? getUserDrawingToolbarStateKey(options.userDrawingState)
        : null;
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
        userDrawingState: options.userDrawingState,
        onUserDrawingToolSelect: options.onUserDrawingToolSelect,
        onUserDrawingDeleteSelected: options.onUserDrawingDeleteSelected,
        onUserDrawingCancelDraft: options.onUserDrawingCancelDraft,
        onUserDrawingClearAll: options.onUserDrawingClearAll,
        onUserDrawingStyleChange: options.onUserDrawingStyleChange,
        onUserDrawingTextAlignChange: options.onUserDrawingTextAlignChange,
        onUserDrawingVisibilityChange: options.onUserDrawingVisibilityChange,
        onUserDrawingLockedChange: options.onUserDrawingLockedChange,
        layoutCallbacks: options.layoutCallbacks,
      });
      this.topBar.mount(topBarWrapper);
      this.rootEl.appendChild(topBarWrapper);
    }

    // Mount to container — don't clear old children yet.
    // The old widget's DOM stays visible until we paint the first frame with bars,
    // preventing a blank flash during HMR / theme switch / widget recreation.
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

    // Create loading dots indicator (shown when loading with no candles)
    // Appended to the legend so it appears below the OHLC/indicator info
    this.loadingDots = div({
      style: {
        display: 'none',
        fontSize: '20px',
        color: 'rgba(255, 255, 255, 0.5)',
        letterSpacing: '1px',
        padding: '2px 0 0 4px',
      },
    });
    for (let i = 0; i < 3; i++) {
      const dot = span({ text: '•' });
      dot.style.animation = `tc-pulse 1.4s ease-in-out ${i * 0.15}s infinite`;
      this.loadingDots.appendChild(dot);
    }
    if (!document.getElementById('tc-pulse-keyframes')) {
      const style = document.createElement('style');
      style.id = 'tc-pulse-keyframes';
      style.textContent = `@keyframes tc-pulse { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.8; } }`;
      document.head.appendChild(style);
    }
    this.legend?.getElement()?.appendChild(this.loadingDots);

    // Create modals (mounted to rootEl so they're positioned within the chart)
    this.indicatorsModal = new IndicatorsModal({
      onSelectIndicator: (indicator) => {
        options.onAddIndicator?.(indicator);
      },
    });
    this.indicatorsModal.mount(this.rootEl);

    this.settingsModal = new IndicatorSettingsModal();
    this.settingsModal.mount(this.rootEl);

    // Mount layout selector modal to rootEl (if layout callbacks are provided)
    this.topBar?.getLayoutSelector()?.mount(this.rootEl);

    // No loading overlay — empty canvas grid renders while bars load
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
      onContextMenu: this.options.onContextMenu,
      onMouseDown: this.options.onMouseDown,
      onMouseUp: this.options.onMouseUp,
      onCrossHairMoved: this.options.onCrossHairMoved,
      onUserDrawingInput: this.options.onUserDrawingInput,
      onUserDrawingSelection: this.options.onUserDrawingSelection,
      onUserDrawingEditStart: this.options.onUserDrawingEditStart,
      onUserDrawingEditMove: this.options.onUserDrawingEditMove,
      onUserDrawingEditEnd: this.options.onUserDrawingEditEnd,
      onUserDrawingPathDragStart: this.options.onUserDrawingPathDragStart,
      onUserDrawingPathDragMove: this.options.onUserDrawingPathDragMove,
      onUserDrawingPathDragEnd: this.options.onUserDrawingPathDragEnd,
      onAutoScaleDisabled: this.options.onAutoScaleDisabled,
      onResetViewport: this.options.onResetViewport,
      isAutoScale: this.options.isAutoScale,
      onPaneDoubleClick: this.options.onPaneDoubleClick,
    });
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Update bars (full replacement) - calls ChartCore directly
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
   * Set viewport directly - used by TealchartWidget to restore viewport
   * from ViewScaleState after symbol/interval/account changes.
   */
  setViewport(viewport: Viewport): void {
    this.chartCore?.setViewport(viewport);
    this.renderUserDrawingTextEditor(this.options.userDrawingState);
  }

  /**
   * Update a single bar (real-time tick) - lightweight path that
   * bypasses the full setBars reference check and render pipeline.
   */
  updateBar(bar: Bar, bars: Bar[]): void {
    this.chartCore?.updateBar(bar);

    // Update legend with latest bar
    const previousBar = bars.length > 1 ? bars[bars.length - 2] : null;
    this.legend?.setBars(bar, previousBar);
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
   * Update execution markers - calls ChartCore directly
   */
  setExecutionLines(lines: ExecutionLineRenderData[]): void {
    this.chartCore?.setExecutionLines(lines);
  }

  /**
   * Update price lines (including last trade line) - calls ChartCore directly
   */
  setPriceLines(lines: PriceLine[]): void {
    this.chartCore?.setPriceLines(lines);
  }

  /**
   * Update indicator plots - calls ChartCore directly
   */
  setPlots(plots: PlotOutput[]): void {
    this.currentPlots = plots; // Store for openIndicatorSettings
    this.chartCore?.setPlots(plots);
  }

  /**
   * Update indicator drawings - calls ChartCore directly
   */
  setDrawings(drawings: DrawingOutput[]): void {
    this.chartCore?.setDrawings(drawings);
  }

  /**
   * Update user drawing state - calls ChartCore directly
   */
  setUserDrawingState(state: UserDrawingState): void {
    this.options.userDrawingState = state;
    const toolbarStateKey = getUserDrawingToolbarStateKey(state);
    if (toolbarStateKey !== this.currentUserDrawingToolbarStateKey) {
      this.currentUserDrawingToolbarStateKey = toolbarStateKey;
      this.topBar?.setUserDrawingState(state);
    }
    this.chartCore?.setUserDrawingState(state);
    this.renderUserDrawingTextEditor(state);
  }

  private removeUserDrawingTextEditor(): void {
    this.userDrawingTextEditor?.remove();
    this.userDrawingTextEditor = null;
  }

  private renderUserDrawingTextEditor(state: UserDrawingState | undefined): void {
    const textEdit = state?.textEdit;
    if (!state || !textEdit) {
      this.removeUserDrawingTextEditor();
      return;
    }

    const drawing = state.drawings.find((candidate) => candidate.id === textEdit.drawingId);
    if (!drawing || !isUserDrawingTextAnnotation(drawing)) {
      this.removeUserDrawingTextEditor();
      return;
    }

    const spacesByPaneId = this.chartCore?.getUserDrawingSpacesForCurrentViewport();
    const space = spacesByPaneId?.get(drawing.paneId);
    if (!space) {
      this.removeUserDrawingTextEditor();
      return;
    }

    const point = anchorToScreenPoint(drawing.point, space);
    const editMetrics = resolveUserDrawingTextEditMetrics(textEdit.value);
    const width = Math.max(120, Math.min(260, editMetrics.longestLineLength * 7 + 32));
    const height = Math.max(28, Math.min(160, editMetrics.lines.length * 18 + 10));
    const chartWidth = this.chartArea.clientWidth || this.rootEl.clientWidth || 0;
    const left = Math.max(space.chartLeft, Math.min(point.x - width / 2, Math.max(space.chartLeft, chartWidth - width - 8)));
    const top = Math.max(space.pane.top, point.y - height / 2);

    if (!this.userDrawingTextEditor) {
      const editor = document.createElement('textarea');
      editor.setAttribute('aria-label', 'Edit drawing text');
      editor.dataset.tealchartUserDrawingTextEditor = 'true';
      editor.rows = 1;
      Object.assign(editor.style, {
        position: 'absolute',
        zIndex: '6',
        minHeight: '28px',
        maxHeight: '160px',
        resize: 'none',
        overflowY: 'auto',
        padding: '4px 6px',
        border: '1px solid rgba(245, 197, 66, 0.9)',
        borderRadius: '4px',
        outline: 'none',
        background: 'rgba(9, 12, 18, 0.92)',
        color: drawing.style.textColor ?? drawing.style.lineColor,
        fontSize: `${drawing.style.fontSize ?? 12}px`,
        fontFamily: drawing.style.fontFamily ?? 'var(--tc-font-family, inherit)',
        lineHeight: '18px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.28)',
        pointerEvents: 'auto',
      });
      editor.addEventListener('mousedown', (event) => event.stopPropagation());
      editor.addEventListener('mouseup', (event) => event.stopPropagation());
      editor.addEventListener('click', (event) => event.stopPropagation());
      editor.addEventListener('input', () => this.options.onUserDrawingTextEditChange?.(editor.value));
      editor.addEventListener('keydown', (event) => {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          this.options.onUserDrawingTextEditCancel?.();
        } else if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          this.options.onUserDrawingTextEditCommit?.();
        }
      });
      editor.addEventListener('blur', () => this.options.onUserDrawingTextEditCommit?.());
      this.rootEl.appendChild(editor);
      this.userDrawingTextEditor = editor;
      queueMicrotask(() => {
        if (this.userDrawingTextEditor === editor) {
          editor.focus();
          editor.select();
        }
      });
    }

    const editor = this.userDrawingTextEditor;
    if (editor.value !== textEdit.value) editor.value = textEdit.value;
    editor.rows = Math.max(1, Math.min(8, editMetrics.lines.length));
    Object.assign(editor.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      color: drawing.style.textColor ?? drawing.style.lineColor,
      fontSize: `${drawing.style.fontSize ?? 12}px`,
      fontFamily: drawing.style.fontFamily ?? 'var(--tc-font-family, inherit)',
    });
  }

  /**
   * Set auto-scale computed Y ranges for indicator panes
   */
  setPaneYRanges(ranges: Map<string, { yMin: number; yMax: number }>): void {
    this.chartCore?.setPaneYRanges(ranges);
  }

  /**
   * Update pane layout - calls ChartCore directly
   */
  setPaneLayout(layout: PaneLayout): void {
    this.currentPaneLayout = layout;
    this.chartCore?.setPaneLayout(layout);
    // Update indicator pane legend positions
    this.updateIndicatorPaneLegends();
    this.renderUserDrawingTextEditor(this.options.userDrawingState);
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
   * Set the jailbreak indicator manager for custom indicator rendering on the canvas.
   */
  setJailbreakManager(
    manager: import('../jailbreak/JailbreakIndicatorManager').JailbreakIndicatorManager | null,
  ): void {
    this.chartCore?.setJailbreakManager(manager);
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
   * Update supported resolutions (filters timeframe buttons in top bar)
   */
  setSupportedResolutions(resolutions: string[] | null): void {
    this.topBar?.setSupportedResolutions(resolutions);
  }

  /**
   * Update the current layout shown in the layout selector
   */
  setCurrentLayout(layoutId: string | number | null, layoutName: string | null): void {
    this.topBar?.setCurrentLayout(layoutId, layoutName);
  }

  /**
   * Update the context menu callback (called when onContextMenu is registered after init)
   */
  setContextMenuCallback(callback: (unixTime: number, price: number) => ContextMenuItem[]): void {
    this.chartCore?.setContextMenuCallback(callback);
  }

  /**
   * Set loading state
   */
  setLoading(_loading: boolean): void {
    // No-op — empty canvas grid renders while bars load (no overlay needed)
  }

  /**
   * Set canvas opacity while loading + show loading dots if no candles
   */
  setCanvasOpacity(opacity: number, hasBars: boolean = true): void {
    this.chartCore?.setCanvasOpacity(opacity);
    // Show loading dots only when loading AND no candles visible
    if (this.loadingDots) {
      this.loadingDots.style.display = opacity < 1 && !hasBars ? 'block' : 'none';
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

    this.settingsModal?.openWith(
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
   * Paint the chart — passthrough to ChartCore.
   * Called synchronously by TealchartWidget._render() after pushing state.
   * The dirty flags tell ChartCore what needs repainting.
   */
  paint(dirty: DirtyFlags): void {
    this.chartCore?.paint(dirty);
  }

  /**
   * Dispose and clean up
   */
  dispose(preserveDom = false): void {
    this.removeUserDrawingTextEditor();
    this.chartCore?.dispose(preserveDom);
    this.topBar?.unmount();
    this.legend?.unmount();
    // Clean up indicator pane legends
    for (const legend of this.indicatorPaneLegends.values()) {
      legend.unmount();
    }
    this.indicatorPaneLegends.clear();
    this.indicatorsModal?.unmount();
    this.settingsModal?.unmount();
    if (!preserveDom) {
      this.rootEl.remove();
    }
    // When preserveDom is true, old DOM stays visible until the new widget
    // paints its first frame, then calls cleanupStaleSiblings() to remove it.
  }

  /**
   * Remove any sibling elements from the container that aren't our rootEl.
   * Called after first successful paint with bars to clean up old widget DOM.
   */
  cleanupStaleSiblings(): void {
    const children = Array.from(this.container.children);
    for (const child of children) {
      if (child !== this.rootEl && child.hasAttribute('data-tealchart-root')) {
        child.remove();
      }
    }
  }
}
