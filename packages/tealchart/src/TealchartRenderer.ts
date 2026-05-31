import type { BoxDrawingOutput, DrawingOutput, LabelDrawingOutput, LineDrawingOutput, PlotOutput, PlotStyle } from '@tealstreet/tealscript';
import type { JailbreakIndicatorManager } from './jailbreak/JailbreakIndicatorManager';
import type { CanvasContext } from './rendering/CanvasContext';
import type { PaneOffset } from './rendering/PaneManager';
import type { TealScriptDrawingPartition } from './rendering/TealScriptDrawingPartition';

import { computeCandleCoordinates } from './jailbreak/computeCandleCoordinates';
import { partitionTealScriptDrawings } from './rendering/TealScriptDrawingPartition';
import { getDecimalPlacesFromPrecision, LineStyle, PlotStyleOverride } from './state/chartState';
import {
  Bar,
  ChartMargins,
  // New unified pane types
  ChartPane,
  ComputedPane,
  CrosshairState,
  DEFAULT_MARGINS,
  DEFAULT_RENDER_OPTIONS,
  // Legacy types for backward compatibility
  ExecutionLineRenderData,
  IndicatorPane,
  OrderLineRenderData,
  PaneLayout,
  PositionLineRenderData,
  PRICE_AXIS_RIGHT_PADDING,
  PriceLine,
  PriceLineLabelBounds,
  RenderOptions,
  TIME_AXIS_HEIGHT,
  UnifiedPaneLayout,
  Viewport,
} from './types';
import { resolveLabelCollisions } from './utils/labelCollision';

/**
 * TealchartRenderer - Pure canvas rendering for OHLCV data
 * No React, no state - just rendering functions
 */

/** Info about an indicator for pane assignment (matches ChartContainer) */
interface IndicatorPaneInfo {
  overlay: boolean;
  yAxisRange?: { min: number; max: number };
  /** Indicator name for pane label */
  name?: string;
  /** Input values for pane label display */
  inputs?: Record<string, unknown>;
}

// Cached number formatters by decimal places
const numberFormatterCache = new Map<number, Intl.NumberFormat>();

function getNumberFormatter(decimals: number): Intl.NumberFormat {
  let formatter = numberFormatterCache.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    });
    numberFormatterCache.set(decimals, formatter);
  }
  return formatter;
}

function formatCountdown(targetTimeMs: number): string {
  const now = Date.now();
  const remaining = Math.max(0, targetTimeMs - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${totalMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Text width cache - avoids expensive ctx.measureText calls
// Key format: "font|text", value: width in pixels
const textWidthCache = new Map<string, number>();
const TEXT_WIDTH_CACHE_MAX_SIZE = 500;

function getCachedTextWidth(ctx: CanvasContext, text: string, font: string): number {
  const cacheKey = `${font}|${text}`;
  const cached = textWidthCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Prune cache if too large
  if (textWidthCache.size >= TEXT_WIDTH_CACHE_MAX_SIZE) {
    // Delete oldest entries (first 100)
    const keys = Array.from(textWidthCache.keys()).slice(0, 100);
    for (const key of keys) {
      textWidthCache.delete(key);
    }
  }

  // Ensure font is set before measuring
  if (ctx.font !== font) {
    ctx.font = font;
  }
  const width = ctx.measureText(text).width;
  textWidthCache.set(cacheKey, width);
  return width;
}

export class TealchartRenderer {
  private ctx: CanvasContext;
  private options: RenderOptions;
  private margins: ChartMargins;
  private jailbreakManager: JailbreakIndicatorManager | null = null;

  constructor(ctx: CanvasContext, options: Partial<RenderOptions> = {}, margins: Partial<ChartMargins> = {}) {
    this.ctx = ctx;
    this.options = { ...DEFAULT_RENDER_OPTIONS, ...options };
    this.margins = { ...DEFAULT_MARGINS, ...margins };
  }

  /**
   * Set the jailbreak indicator manager for custom indicator rendering.
   * If null, no custom indicators are drawn.
   */
  setJailbreakManager(manager: JailbreakIndicatorManager | null): void {
    this.jailbreakManager = manager;
  }

  /**
   * Get the jailbreak indicator manager (if set).
   */
  getJailbreakManager(): JailbreakIndicatorManager | null {
    return this.jailbreakManager;
  }

  /**
   * Update options (e.g., on theme change)
   */
  setOptions(options: Partial<RenderOptions>): void {
    this.options = { ...this.options, ...options };
    // Update margins if provided in options
    if (options.margins) {
      this.margins = { ...DEFAULT_MARGINS, ...options.margins };
    }
  }

  /**
   * Get current render options (for external validation)
   */
  getOptions(): RenderOptions & { margins: ChartMargins } {
    return { ...this.options, margins: this.margins };
  }

  /**
   * Get the configured font family string for canvas ctx.font usage.
   * Falls back to 'sans-serif' if not set (canvas requires a concrete font, not 'inherit').
   */
  get font(): string {
    const fontFamily = this.options.fontFamily?.trim();
    if (!fontFamily || fontFamily === 'inherit' || fontFamily.includes('var(')) {
      return 'sans-serif';
    }
    return fontFamily;
  }

  /**
   * Convert legacy PaneLayout to UnifiedPaneLayout
   */
  private convertToUnifiedLayout(paneLayout?: PaneLayout): UnifiedPaneLayout {
    const timeAxisHeight = TIME_AXIS_HEIGHT;

    if (!paneLayout) {
      // Default: main pane takes all space
      return {
        panes: [
          {
            id: 'main',
            type: 'main',
            heightRatio: 1.0,
            yMin: 0,
            yMax: 0,
            fixedRange: false,
          },
        ],
        timeAxisHeight,
      };
    }

    const panes: ChartPane[] = [];

    // Main pane - combines mainPaneHeight and volumePaneHeight since volume is now overlay
    const mainRatio = paneLayout.mainPaneHeight + paneLayout.volumePaneHeight;
    panes.push({
      id: 'main',
      type: 'main',
      heightRatio: mainRatio,
      yMin: 0,
      yMax: 0,
      fixedRange: false,
    });

    // Indicator panes
    for (const indicatorPane of paneLayout.indicatorPanes) {
      panes.push({
        id: indicatorPane.id,
        type: 'indicator',
        heightRatio: indicatorPane.heightRatio,
        yMin: indicatorPane.yMin,
        yMax: indicatorPane.yMax,
        fixedRange: indicatorPane.fixedRange,
        indicatorIds: indicatorPane.indicatorIds,
      });
    }

    return { panes, timeAxisHeight };
  }

  /**
   * Unified render entry point - renders all panes using the unified pane system
   * This is the preferred method for new code.
   */
  renderWithLayout(
    bars: Bar[],
    viewport: Viewport,
    layout: UnifiedPaneLayout,
    priceLines?: PriceLine[],
    plots?: PlotOutput[],
    indicatorPaneInfo?: Record<string, IndicatorPaneInfo>,
    crosshair?: CrosshairState,
    plotStyleOverrides?: Map<string, PlotStyleOverride>,
    precomputedPriceLineBounds?: PriceLineLabelBounds[],
    executionLines?: ExecutionLineRenderData[],
    drawings?: DrawingOutput[],
  ): void {
    const { ctx, options } = this;
    const { width, height, devicePixelRatio } = options;

    // Clear canvas
    ctx.save();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (bars.length === 0) {
      this.drawNoDataMessage();
      ctx.restore();
      return;
    }

    // Pass all bars to renderUnifiedPanes - filtering happens inside each render function
    // Note: We render even if no bars are visible (scrolled off screen) - only show "no data" when bars.length === 0
    // This is critical for indicators where plot.values is indexed to the full bars array
    this.renderUnifiedPanes(
      bars,
      viewport,
      layout,
      priceLines,
      plots,
      indicatorPaneInfo,
      crosshair,
      plotStyleOverrides,
      precomputedPriceLineBounds,
      executionLines,
      drawings,
    );

    ctx.restore();
  }

  /**
   * Main render entry point (legacy)
   * @deprecated Use renderWithLayout() for unified pane rendering
   */
  render(bars: Bar[], viewport: Viewport, priceLines?: PriceLine[], paneLayout?: PaneLayout): void {
    const { ctx, options } = this;
    const { width, height, devicePixelRatio } = options;

    // Clear canvas
    ctx.save();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (bars.length === 0) {
      this.drawNoDataMessage();
      ctx.restore();
      return;
    }

    // Filter bars within viewport
    // Note: We render even if no bars are visible (scrolled off screen) - only show "no data" when bars.length === 0
    const visibleBars = bars.filter((bar) => bar.time >= viewport.startTime && bar.time <= viewport.endTime);

    // Calculate price line label bounds with conflict resolution
    const labelBounds = priceLines ? this.calculatePriceLineLabelBounds(priceLines, viewport) : [];

    // Draw components - candles first, then volume on top
    this.drawGrid(viewport, paneLayout);
    this.drawCandles(visibleBars, viewport, paneLayout);
    if (options.showVolume) {
      this.drawVolume(visibleBars, viewport, paneLayout);
    }
    this.drawPriceAxis(viewport, labelBounds, paneLayout);
    this.drawTimeAxis(viewport);

    // Draw price lines on top
    if (labelBounds.length > 0) {
      this.drawPriceLines(labelBounds, viewport);
    }

    ctx.restore();
  }

  /**
   * Draw grid lines
   */
  private drawGrid(viewport: Viewport, paneLayout?: PaneLayout): void {
    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left - margins.right;
    // Extended width for horizontal lines that go under price axis
    const extendedWidth = options.width - margins.left;
    const chartHeight = options.height - margins.top - margins.bottom;

    // Use pane layout if available, otherwise fall back to default ratios
    const mainPaneRatio = paneLayout?.mainPaneHeight ?? 1 - (options.showVolume ? options.volumeHeight : 0);
    const priceHeight = chartHeight * mainPaneRatio;

    ctx.strokeStyle = options.gridColor;
    ctx.lineWidth = 1;

    // Horizontal grid lines (price levels) - extend under price axis for transparency
    const priceMarkers = this.generatePriceMarkers(viewport, priceHeight);
    for (const price of priceMarkers) {
      const y = this.priceToY(price, viewport, priceHeight);
      ctx.beginPath();
      ctx.moveTo(margins.left, y);
      ctx.lineTo(margins.left + extendedWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines (time intervals) - based on available width
    const timeMarkers = this.generateTimeMarkers(viewport, chartWidth);
    for (const { time } of timeMarkers) {
      const x = this.timeToX(time, viewport, chartWidth);
      ctx.beginPath();
      ctx.moveTo(x, margins.top);
      ctx.lineTo(x, margins.top + chartHeight);
      ctx.stroke();
    }
  }

  /**
   * Draw candlesticks
   */
  private drawCandles(bars: Bar[], viewport: Viewport, paneLayout?: PaneLayout): void {
    const { ctx, options, margins } = this;
    // Use extended width that goes under the price axis for transparency effect
    const chartWidth = options.width - margins.left;
    const chartHeight = options.height - margins.top - margins.bottom;

    // Use pane layout if available, otherwise fall back to default ratios
    // With pane layout, mainPaneHeight is already the ratio for price area
    // Without pane layout, we subtract volume height
    let priceHeight: number;
    if (paneLayout) {
      priceHeight = chartHeight * paneLayout.mainPaneHeight;
    } else {
      const volumeHeight = options.showVolume ? chartHeight * options.volumeHeight : 0;
      priceHeight = chartHeight - volumeHeight;
    }

    // Calculate candle width based on actual time interval between bars
    // This ensures candles don't overlap regardless of viewport padding
    const viewportTimeRange = viewport.endTime - viewport.startTime;
    let barInterval = viewportTimeRange / bars.length; // Fallback

    // Use actual interval from consecutive bars if available
    if (bars.length >= 2) {
      barInterval = bars[1].time - bars[0].time;
    }

    // Convert time interval to pixel width
    const pixelsPerMs = chartWidth / viewportTimeRange;
    const slotWidth = barInterval * pixelsPerMs;
    const spacingRatio = 0.2; // 20% spacing, 80% candle
    const candleWidth = Math.max(options.minCandleWidth, slotWidth * (1 - spacingRatio));

    bars.forEach((bar) => {
      const x = this.timeToX(bar.time, viewport, chartWidth);
      const isUp = bar.close >= bar.open;
      const color = isUp ? options.upColor : options.downColor;

      // Wick (high-low line)
      const highY = this.priceToY(bar.high, viewport, priceHeight);
      const lowY = this.priceToY(bar.low, viewport, priceHeight);

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body (open-close rectangle)
      const openY = this.priceToY(bar.open, viewport, priceHeight);
      const closeY = this.priceToY(bar.close, viewport, priceHeight);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));

      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });
  }

  /**
   * Draw volume bars
   */
  private drawVolume(bars: Bar[], viewport: Viewport, paneLayout?: PaneLayout): void {
    const { ctx, options, margins } = this;
    // Use extended width that goes under the price axis for transparency effect
    const chartWidth = options.width - margins.left;
    const chartHeight = options.height - margins.top - margins.bottom;

    // Use pane layout if available
    // With pane layout, volume pane is positioned after the main pane
    let volumeHeight: number;
    let volumeTop: number;
    if (paneLayout) {
      const mainPaneHeight = chartHeight * paneLayout.mainPaneHeight;
      volumeHeight = chartHeight * paneLayout.volumePaneHeight;
      volumeTop = margins.top + mainPaneHeight;
    } else {
      volumeHeight = chartHeight * options.volumeHeight;
      volumeTop = margins.top + chartHeight - volumeHeight;
    }

    // Find max volume for scaling
    const maxVolume = Math.max(...bars.map((b) => b.volume));
    if (maxVolume === 0) return;

    // Calculate bar width based on actual time interval (same as candles)
    const viewportTimeRange = viewport.endTime - viewport.startTime;
    let barInterval = viewportTimeRange / bars.length; // Fallback

    if (bars.length >= 2) {
      barInterval = bars[1].time - bars[0].time;
    }

    const pixelsPerMs = chartWidth / viewportTimeRange;
    const slotWidth = barInterval * pixelsPerMs;
    const spacingRatio = 0.2; // 20% spacing, 80% bar
    const barWidth = Math.max(options.minCandleWidth, slotWidth * (1 - spacingRatio));

    bars.forEach((bar) => {
      const x = this.timeToX(bar.time, viewport, chartWidth);
      const isUp = bar.close >= bar.open;
      const color = isUp ? options.upColor : options.downColor;
      const barHeight = (bar.volume / maxVolume) * volumeHeight * 0.8;

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(x - barWidth / 2, volumeTop + volumeHeight - barHeight, barWidth, barHeight);
      ctx.globalAlpha = 1;
    });
  }

  /**
   * Draw price axis on the right
   */
  private drawPriceAxis(viewport: Viewport, priceLineBounds: PriceLineLabelBounds[], paneLayout?: PaneLayout): void {
    const { ctx, options, margins } = this;
    const chartHeight = options.height - margins.top - margins.bottom;

    // Use pane layout if available
    let priceHeight: number;
    if (paneLayout) {
      priceHeight = chartHeight * paneLayout.mainPaneHeight;
    } else {
      const volumeHeight = options.showVolume ? chartHeight * options.volumeHeight : 0;
      priceHeight = chartHeight - volumeHeight;
    }

    // Price axis labels should align with the price area (not volume area)
    // Use priceHeight to match priceToY() calculation
    const priceMarkers = this.generatePriceMarkers(viewport, priceHeight);

    // Use market precision if available, otherwise fall back to range-based calculation
    let decimals: number;
    if (options.pricePrecision && options.pricePrecision > 0) {
      decimals = getDecimalPlacesFromPrecision(options.pricePrecision);
    } else {
      const priceRange = viewport.priceMax - viewport.priceMin;
      decimals = this.getDecimalPlaces(priceRange / Math.max(priceMarkers.length, 1));
    }

    ctx.fillStyle = options.textColor;
    ctx.font = `11px ${this.font}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Draw price markers, skipping those that would overlap with price line labels
    const formatter = getNumberFormatter(decimals);
    const labelRightEdge = options.width - 4; // 4px padding from right edge
    // Bottom safe zone - don't draw price labels that would overlap with time axis
    const bottomSafeZone = options.height - margins.bottom;

    for (const price of priceMarkers) {
      // Map price to Y using same calculation as priceToY()
      // priceMax → margins.top, priceMin → margins.top + priceHeight
      const y = this.priceToY(price, viewport, priceHeight);

      // Skip labels above the top bar (safe zone)
      if (y < margins.top) {
        continue;
      }

      // Skip labels that would overlap with time axis (bottom safe zone)
      if (y > bottomSafeZone - 8) {
        continue;
      }

      // Check if this label would overlap with any price line label
      const wouldOverlap = priceLineBounds.some((bound) => {
        const labelTop = bound.adjustedY - bound.height / 2;
        const labelBottom = bound.adjustedY + bound.height / 2;
        // Add some padding (8px) around the price axis label
        return y >= labelTop - 8 && y <= labelBottom + 8;
      });

      if (wouldOverlap) {
        continue;
      }

      const label = formatter.format(price);
      ctx.fillText(label, labelRightEdge, y);
    }
  }

  /**
   * Draw time axis on the bottom
   */
  private drawTimeAxis(viewport: Viewport): void {
    const { ctx, options, margins } = this;
    // Use full width minus left margin so time labels extend under price axis (like TradingView)
    const chartWidth = options.width - margins.left;
    const axisY = options.height - margins.bottom / 2;

    const timeMarkers = this.generateTimeMarkers(viewport, chartWidth);

    ctx.fillStyle = options.textColor;
    ctx.font = `11px ${this.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const { time, showMonthLabel, step } of timeMarkers) {
      const x = this.timeToX(time, viewport, chartWidth);
      const label = this.formatTimeLabel(time, step, showMonthLabel);
      ctx.fillText(label, x, axisY);
    }
  }

  /**
   * Draw "No Data" message
   */
  private drawNoDataMessage(): void {
    const { ctx, options } = this;
    ctx.fillStyle = options.textColor;
    ctx.font = `14px ${this.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No data available', options.width / 2, options.height / 2);
  }

  /**
   * Calculate price line label bounds with conflict resolution
   * Returns labels with adjusted Y positions to prevent overlap
   */
  private calculatePriceLineLabelBounds(priceLines: PriceLine[], viewport: Viewport): PriceLineLabelBounds[] {
    const { ctx, options, margins } = this;
    const chartHeight = options.height - margins.top - margins.bottom;
    const volumeHeight = options.showVolume ? chartHeight * options.volumeHeight : 0;
    const priceHeight = chartHeight - volumeHeight;

    // Calculate initial bounds for each label
    const labelFont = `11px ${this.font}`;
    const bounds: PriceLineLabelBounds[] = priceLines.map((line) => {
      const originalY = this.priceToY(line.price, viewport, priceHeight);
      const primaryWidth = getCachedTextWidth(ctx, line.label.primaryText, labelFont);
      // Check for secondary text or countdown (countdown renders as secondary text)
      const hasSecondaryText = line.label.secondaryText || line.countdownToTime;
      const secondaryWidth = line.label.secondaryText
        ? getCachedTextWidth(ctx, line.label.secondaryText, labelFont)
        : line.countdownToTime
          ? 40
          : 0;
      const width = Math.max(primaryWidth, secondaryWidth) + 12;
      // Height includes text + padding + border + extra margin for collision
      // Must match or exceed actual rendered height to prevent visual overlap
      const baseHeight = line.type === 'price' || !line.type ? 20 : 18;
      const height = hasSecondaryText ? baseHeight + 6 : baseHeight;

      return {
        lineId: line.id,
        price: line.price,
        originalY,
        adjustedY: originalY,
        width,
        height,
        color: line.color,
        label: line.label,
        lineStyle: line.lineStyle,
        // Extended fields for unified line system
        type: line.type,
        chartLabel: line.chartLabel,
        lineLength: line.lineLength,
        extendLeft: line.extendLeft,
        lineWidth: line.lineWidth,
        floatingLabel: line.floatingLabel,
        priority: line.priority,
        renderLineOnCanvas: line.renderLineOnCanvas,
        countdownToTime: line.countdownToTime,
        draggable: line.draggable,
        targetPaneId: line.targetPaneId,
        // Position-specific fields for bracket TP/SL drag
        positionId: line.positionId,
        partialEnabled: line.partialEnabled,
        positionData: line.positionData,
      };
    });

    // Separate floating labels (they don't participate in collision detection)
    const floatingBounds = bounds.filter((b) => b.floatingLabel);
    const staticBounds = bounds.filter((b) => !b.floatingLabel);

    // Resolve collisions using cluster-based stacking (gap-free by construction)
    resolveLabelCollisions(staticBounds);

    // Sort by Y position for consistent rendering order
    staticBounds.sort((a, b) => a.adjustedY - b.adjustedY);

    // Merge back: static bounds first, floating bounds last (so they render on top)
    const allBounds = [...staticBounds, ...floatingBounds];

    // Filter out labels that are completely off the visible area
    // Top: below top bar (margins.top) - labels should not render in the top bar area
    // Bottom: just above time axis (can go into volume area but not time axis)
    const visibleTop = margins.top;
    const visibleBottom = options.height - margins.bottom;

    // Clamp adjustedY to keep labels within visible bounds
    // This prevents labels from being pushed into the top bar or time axis during collision resolution
    for (const bound of allBounds) {
      const labelTop = bound.adjustedY - bound.height / 2;
      const labelBottom = bound.adjustedY + bound.height / 2;

      // Clamp to stay below top bar
      if (labelTop < visibleTop) {
        bound.adjustedY = visibleTop + bound.height / 2;
      }
      // Clamp to stay above time axis
      if (labelBottom > visibleBottom) {
        bound.adjustedY = visibleBottom - bound.height / 2;
      }
    }

    return allBounds
      .filter((b) => {
        // Hide if line is completely outside visible area
        return b.originalY >= visibleTop && b.originalY <= visibleBottom;
      })
      .map((b) => {
        return {
          ...b,
          isOffScreen: false, // If we got here, it's on screen
        };
      });
  }

  /**
   * Draw price lines with their labels
   * Handles different line types: 'price' (default), 'order', 'position', 'liquidation'
   */
  private drawPriceLines(bounds: PriceLineLabelBounds[], viewport: Viewport): void {
    const { ctx, options, margins } = this;
    const chartHeight = options.height - margins.top - margins.bottom;
    const volumeHeight = options.showVolume ? chartHeight * options.volumeHeight : 0;
    const priceHeight = chartHeight - volumeHeight;

    for (const bound of bounds) {
      const lineType = bound.type || 'price';

      if (lineType === 'price') {
        // Simple price line (last price, countdown timer, etc.)
        this.drawSimplePriceLine(bound, viewport, priceHeight);
      } else if (lineType === 'order' || lineType === 'position') {
        // Order/position lines are rendered by Konva layer for interactivity
        // Skip canvas rendering
        continue;
      } else {
        // Liquidation or other trading lines with chart label
        this.drawTradingLine2(bound, viewport, priceHeight);
      }
    }
  }

  /**
   * Draw a simple price line (type: 'price') with price axis label
   */
  private drawSimplePriceLine(bound: PriceLineLabelBounds, viewport: Viewport, priceHeight: number): void {
    const { ctx, options, margins } = this;

    const rawLineY = this.priceToY(bound.price, viewport, priceHeight);
    const color = bound.color;
    const labelCenterY = bound.adjustedY;

    // Clamp lineY: can go to top (0) and into volume area, but not below time axis
    const lineY = Math.max(0, Math.min(options.height - margins.bottom, rawLineY));

    // Label box position with padding from right edge (matches Konva PriceLineLayer)
    const labelX = options.width - bound.width - PRICE_AXIS_RIGHT_PADDING;
    const labelY = labelCenterY - bound.height / 2;

    // Draw horizontal line - stop before label with gap (always draw, clamped to visible area)
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = bound.lineWidth || 1;
    if (bound.lineStyle === 'dashed') {
      ctx.setLineDash([4, 4]);
    } else if (bound.lineStyle === 'dotted') {
      ctx.setLineDash([2, 2]);
    }
    ctx.beginPath();
    ctx.moveTo(margins.left, lineY);
    ctx.lineTo(labelX - PRICE_AXIS_RIGHT_PADDING, lineY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // For lines with renderLineOnCanvas, skip connector and label
    // (Konva handles these for collision resolution with order/position labels)
    if (bound.renderLineOnCanvas) {
      return;
    }

    // Draw connector line if label is offset from price line
    if (Math.abs(labelCenterY - lineY) > 2) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(labelX, lineY);
      ctx.lineTo(labelX, labelCenterY);
      ctx.stroke();
      ctx.restore();
    }

    // Draw label border with rounded corners (no background - transparent)
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    const borderRadius = 2;
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, bound.width, bound.height, borderRadius);
    ctx.stroke();

    // Draw text
    const textColor = bound.label.textColor || color;
    ctx.fillStyle = textColor;
    ctx.font = `11px ${this.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const secondaryText = bound.countdownToTime ? formatCountdown(bound.countdownToTime) : bound.label.secondaryText;

    if (secondaryText) {
      // Two lines of text with minimal padding
      ctx.fillText(bound.label.primaryText, labelX + bound.width / 2, labelY + 7);
      ctx.fillText(secondaryText, labelX + bound.width / 2, labelY + 19);
    } else {
      // Single line centered
      ctx.fillText(bound.label.primaryText, labelX + bound.width / 2, labelCenterY);
    }
  }

  /**
   * Draw a trading line (order/position/liquidation) with chart label and price axis label
   */
  private drawTradingLine2(bound: PriceLineLabelBounds, viewport: Viewport, priceHeight: number): void {
    const { ctx, options, margins } = this;

    const rawLineY = this.priceToY(bound.price, viewport, priceHeight);
    const color = bound.color;
    const lineWidth = bound.lineWidth || 1;
    const lineLength = bound.lineLength ?? 100;
    const extendLeft = bound.extendLeft ?? true;
    const labelCenterY = bound.adjustedY;

    // Clamp lineY: can go to top (0) and into volume area, but not below time axis
    const lineY = Math.max(0, Math.min(options.height - margins.bottom, rawLineY));

    // Calculate chart label dimensions if present
    const chartLabel = bound.chartLabel;
    let chartLabelWidth = 0;
    let chartLabelX = margins.left;
    const labelHeight = 18;

    if (chartLabel && chartLabel.segments.length > 0) {
      ctx.font = `11px ${this.font}`;

      // Calculate total width of chart label (no gaps between segments)
      for (const segment of chartLabel.segments) {
        const text = segment.textShort || segment.text;
        chartLabelWidth += ctx.measureText(text).width + 8; // padding only, no gap
      }
      for (const button of chartLabel.buttons || []) {
        chartLabelWidth += 16; // button width, no gap
      }

      // Calculate chart label X position based on lineLength
      // lineLength=100 means line extends full width, label at LEFT edge
      // lineLength=0 means no line extension, label at RIGHT edge (near price axis)
      const maxLabelX = options.width - margins.right - chartLabelWidth;
      const minLabelX = margins.left;
      chartLabelX = minLabelX + ((maxLabelX - minLabelX) * (100 - lineLength)) / 100;
    }

    // Set line style
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    if (bound.lineStyle === 'dashed') {
      ctx.setLineDash([4, 4]);
    } else if (bound.lineStyle === 'dotted') {
      ctx.setLineDash([2, 2]);
    }

    // Draw line from left margin to chart label (if chartLabel exists)
    if (chartLabel && chartLabel.segments.length > 0) {
      const lineEndX = chartLabelX - 4;
      if (extendLeft) {
        ctx.beginPath();
        ctx.moveTo(margins.left, lineY);
        ctx.lineTo(lineEndX, lineY);
        ctx.stroke();
      }
    } else {
      // No chart label - draw line all the way to price axis label
      const priceAxisLabelX = options.width - bound.width;
      ctx.beginPath();
      ctx.moveTo(margins.left, lineY);
      ctx.lineTo(priceAxisLabelX, lineY);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // Draw chart label if present
    if (chartLabel && chartLabel.segments.length > 0) {
      const chartLabelY = lineY - labelHeight / 2;
      let currentX = chartLabelX;

      // Calculate item counts for corner rounding
      const segmentCount = chartLabel.segments.length;
      const buttonCount = (chartLabel.buttons || []).length;

      // Draw segments with appropriate corner rounding
      chartLabel.segments.forEach((segment, index) => {
        const text = segment.textShort || segment.text;
        const textWidth = ctx.measureText(text).width + 8;
        const isFirst = index === 0;
        const isLast = index === segmentCount - 1 && buttonCount === 0;
        const corners = isFirst && isLast ? 'all' : isFirst ? 'left' : isLast ? 'right' : 'none';
        this.drawLabelBox(
          currentX,
          chartLabelY,
          textWidth,
          labelHeight,
          segment.backgroundColor,
          segment.borderColor,
          text,
          segment.textColor,
          corners,
        );
        currentX += textWidth; // No gap between segments
      });

      // Draw buttons with appropriate corner rounding (no gaps)
      const buttons = chartLabel.buttons || [];
      buttons.forEach((button, index) => {
        const isLastItem = index === buttonCount - 1;
        const corners: 'left' | 'right' | 'none' = isLastItem ? 'right' : 'none';
        if (button.type === 'cancel' || button.type === 'close') {
          this.drawCancelButton(
            currentX,
            chartLabelY,
            16,
            labelHeight,
            button.backgroundColor,
            button.borderColor,
            button.iconColor,
            corners,
          );
        } else if (button.type === 'reverse') {
          this.drawIconButton(
            currentX,
            chartLabelY,
            16,
            labelHeight,
            button.backgroundColor,
            button.borderColor,
            button.icon,
            button.iconColor,
            corners,
          );
        }
        currentX += 16; // No gap between buttons
      });

      // Draw line from right side of chart label to price axis label
      const chartLabelRightX = currentX;
      const priceAxisLabelX = options.width - bound.width;
      if (chartLabelRightX < priceAxisLabelX) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        if (bound.lineStyle === 'dashed') {
          ctx.setLineDash([4, 4]);
        } else if (bound.lineStyle === 'dotted') {
          ctx.setLineDash([2, 2]);
        }
        ctx.beginPath();
        ctx.moveTo(chartLabelRightX + 4, lineY);
        ctx.lineTo(priceAxisLabelX, lineY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    // Draw price axis label with connector if needed
    const priceAxisLabelX = options.width - bound.width;
    const priceAxisLabelY = labelCenterY - bound.height / 2;

    // Draw connector line if label is offset from price line
    if (Math.abs(labelCenterY - lineY) > 2) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(priceAxisLabelX, lineY);
      ctx.lineTo(priceAxisLabelX, labelCenterY);
      ctx.stroke();
      ctx.restore();
    }

    // Draw price axis label with background (for trading lines)
    const bgColor = bound.label.backgroundColor || color;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(priceAxisLabelX, priceAxisLabelY, bound.width, bound.height, 2);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(priceAxisLabelX, priceAxisLabelY, bound.width, bound.height, 2);
    ctx.stroke();

    // Draw text
    const textColor = bound.label.textColor || '#ffffff';
    ctx.fillStyle = textColor;
    ctx.font = `11px ${this.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (bound.label.secondaryText) {
      ctx.fillText(bound.label.primaryText, priceAxisLabelX + bound.width / 2, priceAxisLabelY + 7);
      ctx.fillText(bound.label.secondaryText, priceAxisLabelX + bound.width / 2, priceAxisLabelY + 19);
    } else {
      ctx.fillText(bound.label.primaryText, priceAxisLabelX + bound.width / 2, labelCenterY);
    }
  }

  // =========================================================================
  // Order and Position Line Rendering
  // =========================================================================

  /**
   * Draw order lines (limit orders, stop losses, take profits)
   * TradingView-compatible rendering with TEALSTREET extensions
   */
  drawOrderLines(orderLines: OrderLineRenderData[], viewport: Viewport): void {
    if (orderLines.length === 0) return;

    const { ctx, options, margins } = this;
    const chartHeight = options.height - margins.top - margins.bottom;
    const volumeHeight = options.showVolume ? chartHeight * options.volumeHeight : 0;
    const priceHeight = chartHeight - volumeHeight;

    ctx.save();
    ctx.scale(options.devicePixelRatio, options.devicePixelRatio);

    for (const line of orderLines) {
      this.drawOrderLine(line, viewport, priceHeight);
    }

    ctx.restore();
  }

  /**
   * Draw a single order line with its label
   */
  private drawOrderLine(line: OrderLineRenderData, viewport: Viewport, priceHeight: number): void {
    const { ctx, options, margins } = this;

    // Calculate Y position
    const rawY = this.priceToY(line.price, viewport, priceHeight);
    // Clamp to visible area (can go to top, but not below time axis)
    const lineY = Math.max(0, Math.min(options.height - margins.bottom, rawY));

    // Check if line is outside visible price area (for future use)
    const _isOutsidePrice = line.price < viewport.priceMin || line.price > viewport.priceMax;

    // Calculate label dimensions
    ctx.font = `11px ${this.font}`;
    const text = line.textShort || line.text || '';
    const quantity = line.quantityShort || line.quantity || '';

    const textWidth = text ? ctx.measureText(text).width + 8 : 0;
    const quantityWidth = quantity ? ctx.measureText(quantity).width + 8 : 0;
    const cancelButtonWidth = line.cancellable ? 18 : 0;
    const labelHeight = 18;
    const totalLabelWidth = textWidth + quantityWidth + cancelButtonWidth + 4; // gaps

    // Label position based on lineLength percentage
    // lineLength=100 means line extends full width, label at LEFT edge
    // lineLength=0 means no line extension, label at RIGHT edge (near price axis)
    const maxLabelX = options.width - margins.right - totalLabelWidth; // rightmost position
    const minLabelX = margins.left; // leftmost position
    const labelX = minLabelX + ((maxLabelX - minLabelX) * (100 - line.lineLength)) / 100;
    const labelY = lineY - labelHeight / 2;

    // Draw horizontal line from left margin to label
    const lineEndX = labelX - 4;
    ctx.save();
    ctx.strokeStyle = line.lineColor;
    ctx.lineWidth = line.lineWidth;
    if (line.lineStyle === 1)
      ctx.setLineDash([2, 2]); // dotted
    else if (line.lineStyle === 2)
      ctx.setLineDash([4, 4]); // dashed
    else if (line.lineStyle === 4) ctx.setLineDash([6, 3]); // long dashed
    ctx.beginPath();
    if (line.extendLeft) {
      ctx.moveTo(margins.left, lineY);
      ctx.lineTo(lineEndX, lineY);
    } else {
      ctx.moveTo(lineEndX, lineY);
      ctx.lineTo(options.width - margins.right, lineY);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Skip label rendering if completely outside visible area
    if (labelY + labelHeight < 0 || labelY > options.height - margins.bottom) {
      return;
    }

    // Draw label boxes
    let currentX = labelX;

    // Text box (order type: Limit, Stop, etc.)
    if (text) {
      this.drawLabelBox(
        currentX,
        labelY,
        textWidth,
        labelHeight,
        line.bodyBackgroundColor,
        line.bodyBorderColor,
        text,
        line.bodyTextColor,
      );
      currentX += textWidth + 2;
    }

    // Quantity box
    if (quantity) {
      this.drawLabelBox(
        currentX,
        labelY,
        quantityWidth,
        labelHeight,
        line.quantityBackgroundColor,
        line.quantityBorderColor,
        quantity,
        line.quantityTextColor,
      );
      currentX += quantityWidth + 2;
    }

    // Cancel button
    if (line.cancellable) {
      this.drawCancelButton(
        currentX,
        labelY,
        16,
        labelHeight,
        line.cancelButtonBackgroundColor,
        line.cancelButtonBorderColor,
        line.cancelButtonIconColor,
      );
      currentX += 16 + 2;
    }

    // Draw line from right side of label to price axis
    const labelRightX = currentX;
    const priceAxisX = options.width - margins.right;
    if (labelRightX < priceAxisX) {
      ctx.save();
      ctx.strokeStyle = line.lineColor;
      ctx.lineWidth = line.lineWidth;
      if (line.lineStyle === 1) ctx.setLineDash([2, 2]);
      else if (line.lineStyle === 2) ctx.setLineDash([4, 4]);
      else if (line.lineStyle === 4) ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(labelRightX + 4, lineY);
      ctx.lineTo(priceAxisX, lineY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Draw price label in the price axis area
    this.drawTradingPriceLabel(
      lineY,
      line.price,
      line.lineColor,
      line.bodyBackgroundColor,
      line.bodyTextColor,
      viewport,
      priceHeight,
    );
  }

  /**
   * Draw position lines (open positions with entry price, PnL)
   * TradingView-compatible rendering with TEALSTREET extensions
   */
  drawPositionLines(positionLines: PositionLineRenderData[], viewport: Viewport): void {
    if (positionLines.length === 0) return;

    const { ctx, options, margins } = this;
    const chartHeight = options.height - margins.top - margins.bottom;
    const volumeHeight = options.showVolume ? chartHeight * options.volumeHeight : 0;
    const priceHeight = chartHeight - volumeHeight;

    ctx.save();
    ctx.scale(options.devicePixelRatio, options.devicePixelRatio);

    for (const line of positionLines) {
      this.drawPositionLine(line, viewport, priceHeight);
    }

    ctx.restore();
  }

  /**
   * Draw a single position line with its label
   */
  private drawPositionLine(line: PositionLineRenderData, viewport: Viewport, priceHeight: number): void {
    const { ctx, options, margins } = this;

    // Calculate Y position
    const rawY = this.priceToY(line.price, viewport, priceHeight);
    // Clamp to visible area
    const lineY = Math.max(0, Math.min(options.height - margins.bottom, rawY));

    // Calculate label dimensions
    ctx.font = `11px ${this.font}`;
    const text = line.textShort || line.text || '';
    const quantity = line.quantityShort || line.quantity || '';
    const pnl = line.pnlShort || line.pnl || '';

    // Calculate widths for each segment
    const textWidth = text ? ctx.measureText(text).width + 8 : 0;
    const pnlWidth = pnl ? ctx.measureText(pnl).width + 8 : 0;
    const quantityWidth = quantity ? ctx.measureText(quantity).width + 8 : 0;
    const reverseButtonWidth = line.reversible ? 18 : 0; // ↩ button (only if callback provided)
    const closeButtonWidth = line.closeable ? 18 : 0; // X button (only if callback provided)
    const labelHeight = 18;
    const totalLabelWidth = textWidth + pnlWidth + quantityWidth + reverseButtonWidth + closeButtonWidth + 8; // gaps

    // Label position based on lineLength percentage
    // lineLength=100 means line extends full width, label at LEFT edge
    // lineLength=0 means no line extension, label at RIGHT edge (near price axis)
    const maxLabelX = options.width - margins.right - totalLabelWidth; // rightmost position
    const minLabelX = margins.left; // leftmost position
    const labelX = minLabelX + ((maxLabelX - minLabelX) * (100 - line.lineLength)) / 100;
    const labelY = lineY - labelHeight / 2;

    // Draw horizontal line from left margin to label
    const lineEndX = labelX - 4;
    ctx.save();
    ctx.strokeStyle = line.lineColor;
    ctx.lineWidth = line.lineWidth;
    if (line.lineStyle === 1)
      ctx.setLineDash([2, 2]); // dotted
    else if (line.lineStyle === 2)
      ctx.setLineDash([4, 4]); // dashed
    else if (line.lineStyle === 4) ctx.setLineDash([6, 3]); // long dashed
    ctx.beginPath();
    if (line.extendLeft) {
      ctx.moveTo(margins.left, lineY);
      ctx.lineTo(lineEndX, lineY);
    } else {
      ctx.moveTo(lineEndX, lineY);
      ctx.lineTo(options.width - margins.right, lineY);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Skip label rendering if completely outside visible area
    if (labelY + labelHeight < 0 || labelY > options.height - margins.bottom) {
      return;
    }

    // Determine PnL color based on profit state
    let pnlTextColor = line.bodyTextColor;
    if (line.profitState === 'positive') {
      pnlTextColor = '#26a69a'; // Green
    } else if (line.profitState === 'negative') {
      pnlTextColor = '#ef5350'; // Red
    }

    // Draw label boxes
    let currentX = labelX;

    // Text box (Long/Short)
    if (text) {
      this.drawLabelBox(
        currentX,
        labelY,
        textWidth,
        labelHeight,
        line.bodyBackgroundColor,
        line.bodyBorderColor,
        text,
        line.bodyTextColor,
      );
      currentX += textWidth + 2;
    }

    // PnL box (with colored text)
    if (pnl) {
      this.drawLabelBox(
        currentX,
        labelY,
        pnlWidth,
        labelHeight,
        line.bodyBackgroundColor,
        line.bodyBorderColor,
        pnl,
        pnlTextColor,
      );
      currentX += pnlWidth + 2;
    }

    // Quantity box
    if (quantity) {
      this.drawLabelBox(
        currentX,
        labelY,
        quantityWidth,
        labelHeight,
        line.quantityBackgroundColor,
        line.quantityBorderColor,
        quantity,
        line.quantityTextColor,
      );
      currentX += quantityWidth + 2;
    }

    // Reverse button (↩) - only if onReverse callback was provided
    if (line.reversible) {
      this.drawIconButton(
        currentX,
        labelY,
        16,
        labelHeight,
        line.reverseButtonBackgroundColor,
        line.reverseButtonBorderColor,
        '↩',
        line.reverseButtonIconColor,
      );
      currentX += reverseButtonWidth + 2;
    }

    // Close button (X) - only if onClose callback was provided
    if (line.closeable) {
      this.drawCancelButton(
        currentX,
        labelY,
        16,
        labelHeight,
        line.closeButtonBackgroundColor,
        line.closeButtonBorderColor,
        line.closeButtonIconColor,
      );
      currentX += closeButtonWidth + 2;
    }

    // Draw line from right side of label to price axis
    const labelRightX = currentX;
    const priceAxisX = options.width - margins.right;
    if (labelRightX < priceAxisX) {
      ctx.save();
      ctx.strokeStyle = line.lineColor;
      ctx.lineWidth = line.lineWidth;
      if (line.lineStyle === 1) ctx.setLineDash([2, 2]);
      else if (line.lineStyle === 2) ctx.setLineDash([4, 4]);
      else if (line.lineStyle === 4) ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(labelRightX + 4, lineY);
      ctx.lineTo(priceAxisX, lineY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Draw price label in the price axis area
    this.drawTradingPriceLabel(
      lineY,
      line.price,
      line.lineColor,
      line.bodyBackgroundColor,
      line.bodyTextColor,
      viewport,
      priceHeight,
    );
  }

  /**
   * Helper: Draw a price label in the price axis area for trading lines
   */
  private drawTradingPriceLabel(
    lineY: number,
    price: number,
    lineColor: string,
    backgroundColor: string,
    textColor: string,
    viewport: Viewport,
    priceHeight: number,
  ): void {
    const { ctx, options, margins } = this;

    // Format price
    const priceText = this.formatPrice(price, viewport);

    // Calculate label dimensions
    ctx.font = `11px ${this.font}`;
    const textWidth = ctx.measureText(priceText).width;
    const labelWidth = textWidth + 8;
    const labelHeight = 16;

    // Position label in the price axis area
    const labelX = options.width - margins.right + 2;
    const labelY = lineY - labelHeight / 2;

    // Clamp label to visible area
    const clampedLabelY = Math.max(margins.top, Math.min(options.height - margins.bottom - labelHeight, labelY));

    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    ctx.roundRect(labelX, clampedLabelY, labelWidth, labelHeight, 2);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(labelX, clampedLabelY, labelWidth, labelHeight, 2);
    ctx.stroke();

    // Draw text
    ctx.fillStyle = textColor;
    ctx.font = `11px ${this.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(priceText, labelX + labelWidth / 2, clampedLabelY + labelHeight / 2);
  }

  /**
   * Helper: Draw a label box with text
   * @param corners - Which corners to round: 'all', 'left', 'right', 'none'
   */
  private drawLabelBox(
    x: number,
    y: number,
    width: number,
    height: number,
    backgroundColor: string,
    borderColor: string,
    text: string,
    textColor: string,
    corners: 'all' | 'left' | 'right' | 'none' = 'all',
  ): void {
    const { ctx } = this;
    const r = 2; // border radius

    // Determine corner radii: [top-left, top-right, bottom-right, bottom-left]
    let radii: number[];
    switch (corners) {
      case 'left':
        radii = [r, 0, 0, r];
        break;
      case 'right':
        radii = [0, r, r, 0];
        break;
      case 'none':
        radii = [0, 0, 0, 0];
        break;
      default:
        radii = [r, r, r, r];
    }

    // Background
    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radii);
    ctx.fill();

    // Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radii);
    ctx.stroke();

    // Text
    ctx.fillStyle = textColor;
    ctx.font = `11px ${this.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
  }

  /**
   * Helper: Draw cancel/close button (X icon)
   * @param corners - Which corners to round: 'all', 'left', 'right', 'none'
   */
  private drawCancelButton(
    x: number,
    y: number,
    width: number,
    height: number,
    backgroundColor: string,
    borderColor: string,
    iconColor: string,
    corners: 'all' | 'left' | 'right' | 'none' = 'all',
  ): void {
    const { ctx } = this;
    const r = 2;

    // Determine corner radii: [top-left, top-right, bottom-right, bottom-left]
    let radii: number[];
    switch (corners) {
      case 'left':
        radii = [r, 0, 0, r];
        break;
      case 'right':
        radii = [0, r, r, 0];
        break;
      case 'none':
        radii = [0, 0, 0, 0];
        break;
      default:
        radii = [r, r, r, r];
    }

    // Background
    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radii);
    ctx.fill();

    // Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radii);
    ctx.stroke();

    // X icon
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const iconSize = 4;

    ctx.strokeStyle = iconColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX - iconSize, centerY - iconSize);
    ctx.lineTo(centerX + iconSize, centerY + iconSize);
    ctx.moveTo(centerX + iconSize, centerY - iconSize);
    ctx.lineTo(centerX - iconSize, centerY + iconSize);
    ctx.stroke();
  }

  /**
   * Helper: Draw icon button with text icon (e.g., ↩ for reverse)
   * @param corners - Which corners to round: 'all', 'left', 'right', 'none'
   */
  private drawIconButton(
    x: number,
    y: number,
    width: number,
    height: number,
    backgroundColor: string,
    borderColor: string,
    icon: string,
    iconColor: string,
    corners: 'all' | 'left' | 'right' | 'none' = 'all',
  ): void {
    const { ctx } = this;
    const r = 2;

    // Determine corner radii: [top-left, top-right, bottom-right, bottom-left]
    let radii: number[];
    switch (corners) {
      case 'left':
        radii = [r, 0, 0, r];
        break;
      case 'right':
        radii = [0, r, r, 0];
        break;
      case 'none':
        radii = [0, 0, 0, 0];
        break;
      default:
        radii = [r, r, r, r];
    }

    // Background
    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radii);
    ctx.fill();

    // Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radii);
    ctx.stroke();

    // Icon text
    ctx.fillStyle = iconColor;
    ctx.font = `11px ${this.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, x + width / 2, y + height / 2);
  }

  /**
   * Draw crosshair vertical line, horizontal lines on all panes, and time label
   * Note: Price label for main pane is rendered through the unified PriceLine system
   */
  drawCrosshair(crosshair: CrosshairState, viewport: Viewport, layout?: UnifiedPaneLayout): void {
    if (!crosshair.visible) return;

    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left - margins.right;
    const chartHeight = options.height - margins.top - margins.bottom;

    const { x, y } = crosshair;

    // Check if cursor is in chart area (horizontally)
    if (x < margins.left || x > options.width - margins.right) return;

    ctx.save();
    ctx.scale(options.devicePixelRatio, options.devicePixelRatio);

    // Draw vertical crosshair line
    ctx.strokeStyle = options.crosshairColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, margins.top);
    ctx.lineTo(x, options.height - margins.bottom);
    ctx.stroke();

    // Draw horizontal crosshair line across chart area
    // Stop short of the + context menu button (18px wide + 2px offset + 2px gap)
    if (y >= margins.top && y <= options.height - margins.bottom) {
      const rightStop = options.width - margins.right - 22;
      ctx.beginPath();
      ctx.moveTo(margins.left, y);
      ctx.lineTo(rightStop, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Calculate time from position for time label
    const time = this.xToTime(x, viewport, chartWidth);

    // Draw time label on bottom axis (centered vertically in time axis area)
    const timeLabel = this.formatCrosshairTime(time);
    ctx.font = `11px ${this.font}`;
    const timeLabelWidth = ctx.measureText(timeLabel).width + 8;
    const timeLabelHeight = 18;
    const timeLabelX = x - timeLabelWidth / 2;
    const timeAxisTop = options.height - margins.bottom;
    const timeLabelY = timeAxisTop + (margins.bottom - timeLabelHeight) / 2;

    // Background
    ctx.fillStyle = options.crosshairColor;
    ctx.beginPath();
    ctx.roundRect(timeLabelX, timeLabelY, timeLabelWidth, timeLabelHeight, 2);
    ctx.fill();

    // Text
    ctx.fillStyle = options.backgroundColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeLabel, x, timeLabelY + timeLabelHeight / 2);

    ctx.restore();
  }

  // =========================================================================
  // Tealscript Plot Rendering
  // =========================================================================

  /**
   * Render Tealscript indicator plots
   * Call this after rendering candles and before rendering crosshair
   */
  renderPlots(
    plots: PlotOutput[],
    bars: Bar[],
    viewport: Viewport,
    paneLayout?: PaneLayout,
    indicatorPaneInfo?: Record<string, IndicatorPaneInfo>,
  ): void {
    if (plots.length === 0 || bars.length === 0) return;

    const { ctx, options, margins } = this;
    const chartHeight = options.height - margins.top - margins.bottom;

    ctx.save();
    ctx.scale(options.devicePixelRatio, options.devicePixelRatio);

    // Group plots by scriptId
    const plotsByScript = new Map<string, PlotOutput[]>();
    for (const plot of plots) {
      const scriptId = plot.scriptId ?? 'unknown';
      const existing = plotsByScript.get(scriptId) ?? [];
      existing.push(plot);
      plotsByScript.set(scriptId, existing);
    }

    // Calculate pane offsets if we have indicator panes
    const paneOffsets = new Map<string, PaneOffset>();
    if (paneLayout && paneLayout.indicatorPanes.length > 0) {
      let currentTop = margins.top;

      // Main pane
      const mainHeight = chartHeight * paneLayout.mainPaneHeight;
      paneOffsets.set('main', {
        top: currentTop,
        height: mainHeight,
        yMin: viewport.priceMin,
        yMax: viewport.priceMax,
      });
      currentTop += mainHeight;

      // Volume pane
      const volumeHeight = chartHeight * paneLayout.volumePaneHeight;
      paneOffsets.set('volume', {
        top: currentTop,
        height: volumeHeight,
        yMin: 0,
        yMax: 0,
      });
      currentTop += volumeHeight;

      // Indicator panes
      for (const pane of paneLayout.indicatorPanes) {
        const paneHeight = chartHeight * pane.heightRatio;
        paneOffsets.set(pane.id, {
          top: currentTop,
          height: paneHeight,
          yMin: pane.yMin,
          yMax: pane.yMax,
        });
        currentTop += paneHeight;
      }
    }

    // Render each script's plots
    for (const [scriptId, scriptPlots] of plotsByScript) {
      // Check if this script is an overlay indicator
      const info = indicatorPaneInfo?.[scriptId];
      const isOverlay = info?.overlay !== false; // Default to overlay if unknown

      if (isOverlay || !paneLayout || paneLayout.indicatorPanes.length === 0) {
        // Render on main pane (existing behavior)
        for (const plot of scriptPlots) {
          switch (plot.type) {
            case 'plot':
              this.renderLinePlot(plot, bars, viewport);
              break;
            case 'plotbar':
            case 'plotcandle':
              this.renderOhlcPlotInLegacyMainPane(plot, bars, viewport);
              break;
            case 'hline':
              this.renderHline(plot, viewport);
              break;
            case 'bgcolor':
              this.renderBgcolor(plot, bars, viewport);
              break;
            case 'plotshape':
              this.renderPlotShape(plot, bars, viewport);
              break;
          }
        }
      } else {
        // Find the pane for this indicator
        const pane = paneLayout.indicatorPanes.find((p) => p.indicatorIds.includes(scriptId));

        if (pane) {
          const paneOffset = paneOffsets.get(pane.id);
          if (paneOffset) {
            // Y ranges are now computed by AutoScaleManager in TealchartWidget
            // and applied via ChartCore.setPaneYRanges() before rendering.

            // Render the indicator pane background and axis
            this.renderIndicatorPane(pane, paneOffset, viewport);

            // Render plots in this pane
            this.renderPlotsInPane(scriptPlots, bars, viewport, paneOffset);
          }
        }
      }
    }

    ctx.restore();
  }

  /**
   * Render a line plot series
   */
  private renderLinePlot(plot: PlotOutput, bars: Bar[], viewport: Viewport): void {
    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;
    const chartHeight = options.height - margins.top - margins.bottom;
    const volumeHeight = options.showVolume ? chartHeight * options.volumeHeight : 0;
    const priceHeight = chartHeight - volumeHeight;

    const { values, color, linewidth = 1, style = 'line' } = plot;

    // Handle histogram style differently
    if (style === 'histogram' || style === 'columns') {
      this.renderHistogramPlot(plot, bars, viewport);
      return;
    }

    // Get base color (first color if array, otherwise the string)
    const baseColor = Array.isArray(color) ? color[0] || '#2196F3' : color || '#2196F3';

    ctx.strokeStyle = baseColor;
    ctx.lineWidth = linewidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const isStepLine = style === 'stepline' || style === 'stepline_diamond';

    // Set line style
    if (isStepLine) {
      // Step line will be handled in the drawing loop
    } else if (style === 'cross' || style === 'circles') {
      // These are point markers, not lines
      this.renderPointMarkers(plot, bars, viewport, style);
      return;
    }

    // Draw the line
    ctx.beginPath();
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    for (let i = 0; i < bars.length && i < values.length; i++) {
      const bar = bars[i];
      const value = values[i];

      // Skip bars outside viewport
      if (bar.time < viewport.startTime || bar.time > viewport.endTime) {
        continue;
      }

      // Skip null/NaN values
      if (value === null || value === undefined || isNaN(value)) {
        // Break the line if we were drawing
        if (isDrawing) {
          ctx.stroke();
          ctx.beginPath();
          isDrawing = false;
        }
        continue;
      }

      const x = this.timeToX(bar.time, viewport, chartWidth);
      const y = this.priceToY(value, viewport, priceHeight);

      // Handle per-bar color if available
      if (Array.isArray(color) && color[i]) {
        // Stroke previous segment and start new with different color
        if (isDrawing) {
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(lastX, lastY);
        }
        ctx.strokeStyle = color[i] || baseColor;
      }

      if (!isDrawing) {
        ctx.moveTo(x, y);
        isDrawing = true;
      } else {
        if (isStepLine) {
          // Step line: horizontal then vertical
          ctx.lineTo(x, lastY);
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      lastX = x;
      lastY = y;
    }

    if (isDrawing) {
      ctx.stroke();
    }

    // Draw area fill if style is 'area' or 'areabr'
    if (style === 'area' || style === 'areabr') {
      this.renderAreaFill(plot, bars, viewport, style === 'areabr');
    }
  }

  /**
   * Render histogram/columns plot style
   */
  private renderHistogramPlot(plot: PlotOutput, bars: Bar[], viewport: Viewport): void {
    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;
    const chartHeight = options.height - margins.top - margins.bottom;
    const volumeHeight = options.showVolume ? chartHeight * options.volumeHeight : 0;
    const priceHeight = chartHeight - volumeHeight;

    const { values, color, linewidth: _linewidth = 1 } = plot;
    const baseColor = Array.isArray(color) ? color[0] || '#2196F3' : color || '#2196F3';

    // Calculate bar width
    const viewportTimeRange = viewport.endTime - viewport.startTime;
    let barInterval = viewportTimeRange / Math.max(bars.length, 1);
    if (bars.length >= 2) {
      barInterval = bars[1].time - bars[0].time;
    }
    const pixelsPerMs = chartWidth / viewportTimeRange;
    const slotWidth = barInterval * pixelsPerMs;
    const barWidth = Math.max(2, slotWidth * 0.6);

    // Zero line Y coordinate
    const zeroY = this.priceToY(0, viewport, priceHeight);

    for (let i = 0; i < bars.length && i < values.length; i++) {
      const bar = bars[i];
      const value = values[i];

      if (bar.time < viewport.startTime || bar.time > viewport.endTime) {
        continue;
      }

      if (value === null || value === undefined || isNaN(value)) {
        continue;
      }

      const x = this.timeToX(bar.time, viewport, chartWidth);
      const y = this.priceToY(value, viewport, priceHeight);

      // Use per-bar color if available
      const barColor = Array.isArray(color) && color[i] ? color[i] : baseColor;
      ctx.fillStyle = barColor as string;

      // Draw bar from zero line to value
      const barTop = Math.min(y, zeroY);
      const barHeight = Math.abs(y - zeroY);
      ctx.fillRect(x - barWidth / 2, barTop, barWidth, Math.max(1, barHeight));
    }
  }

  /**
   * Render point markers (cross or circle style)
   */
  private renderPointMarkers(plot: PlotOutput, bars: Bar[], viewport: Viewport, style: PlotStyle): void {
    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;
    const chartHeight = options.height - margins.top - margins.bottom;
    const volumeHeight = options.showVolume ? chartHeight * options.volumeHeight : 0;
    const priceHeight = chartHeight - volumeHeight;

    const { values, color, linewidth = 1 } = plot;
    const baseColor = Array.isArray(color) ? color[0] || '#2196F3' : color || '#2196F3';
    const markerSize = Math.max(3, linewidth * 2);

    for (let i = 0; i < bars.length && i < values.length; i++) {
      const bar = bars[i];
      const value = values[i];

      if (bar.time < viewport.startTime || bar.time > viewport.endTime) {
        continue;
      }

      if (value === null || value === undefined || isNaN(value)) {
        continue;
      }

      const x = this.timeToX(bar.time, viewport, chartWidth);
      const y = this.priceToY(value, viewport, priceHeight);
      const markerColor = Array.isArray(color) && color[i] ? color[i] : baseColor;

      ctx.strokeStyle = markerColor as string;
      ctx.fillStyle = markerColor as string;
      ctx.lineWidth = linewidth;

      if (style === 'cross') {
        // Draw X marker
        ctx.beginPath();
        ctx.moveTo(x - markerSize, y - markerSize);
        ctx.lineTo(x + markerSize, y + markerSize);
        ctx.moveTo(x + markerSize, y - markerSize);
        ctx.lineTo(x - markerSize, y + markerSize);
        ctx.stroke();
      } else {
        // Draw circle
        ctx.beginPath();
        ctx.arc(x, y, markerSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private getPerBarColor(
    color: string | (string | null)[] | undefined,
    barIndex: number,
    fallback: string,
  ): string {
    if (Array.isArray(color)) {
      return color[barIndex] || fallback;
    }
    return color || fallback;
  }

  private getSlotWidth(bars: Bar[], viewport: Viewport, chartWidth: number): number {
    const viewportTimeRange = viewport.endTime - viewport.startTime;
    const fallbackWidth = Math.max(this.options.minCandleWidth, 1);
    if (viewportTimeRange <= 0 || chartWidth <= 0) {
      return fallbackWidth;
    }
    let barInterval = viewportTimeRange / Math.max(bars.length, 1);
    if (bars.length >= 2) {
      barInterval = bars[1].time - bars[0].time;
    }
    const slotWidth = barInterval * (chartWidth / viewportTimeRange);
    return Number.isFinite(slotWidth) && slotWidth > 0 ? slotWidth : fallbackWidth;
  }

  private renderOhlcPlotInLegacyMainPane(plot: PlotOutput, bars: Bar[], viewport: Viewport): void {
    const { options, margins } = this;
    const chartWidth = options.width - margins.left;
    const chartHeight = options.height - margins.top - margins.bottom;
    const volumeHeight = options.showVolume ? chartHeight * options.volumeHeight : 0;
    const priceHeight = chartHeight - volumeHeight;

    this.renderOhlcPlot(plot, bars, viewport, chartWidth, (value) => this.priceToY(value, viewport, priceHeight));
  }

  private renderOhlcPlot(
    plot: PlotOutput,
    bars: Bar[],
    viewport: Viewport,
    chartWidth: number,
    valueToY: (value: number) => number,
  ): void {
    const { ctx } = this;
    const { openValues, highValues, lowValues, closeValues } = plot;
    if (!openValues || !highValues || !lowValues || !closeValues) return;

    const slotWidth = this.getSlotWidth(bars, viewport, chartWidth);
    const bodyWidth = Math.max(2, slotWidth * 0.6);
    const tickWidth = Math.max(3, bodyWidth * 0.45);
    const fallbackColor = Array.isArray(plot.color) ? plot.color.find(Boolean) || '#2196F3' : plot.color || '#2196F3';

    const scanEnd = Math.min(bars.length, openValues.length, highValues.length, lowValues.length, closeValues.length);
    for (let i = 0; i < scanEnd; i++) {
      const bar = bars[i];
      if (bar.time < viewport.startTime || bar.time > viewport.endTime) continue;

      const open = openValues[i];
      const high = highValues[i];
      const low = lowValues[i];
      const close = closeValues[i];
      if (
        open === null ||
        high === null ||
        low === null ||
        close === null ||
        isNaN(open) ||
        isNaN(high) ||
        isNaN(low) ||
        isNaN(close)
      ) {
        continue;
      }

      const x = this.timeToX(bar.time, viewport, chartWidth);
      const openY = valueToY(open);
      const highY = valueToY(high);
      const lowY = valueToY(low);
      const closeY = valueToY(close);
      const bodyColor = this.getPerBarColor(plot.color, i, fallbackColor);

      if (plot.type === 'plotbar') {
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.moveTo(x - tickWidth, openY);
        ctx.lineTo(x, openY);
        ctx.moveTo(x, closeY);
        ctx.lineTo(x + tickWidth, closeY);
        ctx.stroke();
        continue;
      }

      const wickColor = this.getPerBarColor(plot.wickColor, i, bodyColor);
      const borderColor = this.getPerBarColor(plot.borderColor, i, bodyColor);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));

      ctx.strokeStyle = wickColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      ctx.fillStyle = bodyColor;
      ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);

      ctx.strokeStyle = borderColor;
      ctx.strokeRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
    }
  }

  /**
   * Render area fill under/over a line
   */
  private renderAreaFill(plot: PlotOutput, bars: Bar[], viewport: Viewport, fillFromTop: boolean): void {
    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;
    const chartHeight = options.height - margins.top - margins.bottom;
    const volumeHeight = options.showVolume ? chartHeight * options.volumeHeight : 0;
    const priceHeight = chartHeight - volumeHeight;

    const { values, color } = plot;
    const baseColor = Array.isArray(color) ? color[0] || '#2196F3' : color || '#2196F3';

    ctx.fillStyle = baseColor;
    ctx.globalAlpha = 0.2;

    const baselineY = fillFromTop ? margins.top : margins.top + priceHeight;

    ctx.beginPath();
    let started = false;
    let firstX = 0;
    let lastX = 0;

    for (let i = 0; i < bars.length && i < values.length; i++) {
      const bar = bars[i];
      const value = values[i];

      if (bar.time < viewport.startTime || bar.time > viewport.endTime) {
        continue;
      }

      if (value === null || value === undefined || isNaN(value)) {
        continue;
      }

      const x = this.timeToX(bar.time, viewport, chartWidth);
      const y = this.priceToY(value, viewport, priceHeight);

      if (!started) {
        ctx.moveTo(x, baselineY);
        ctx.lineTo(x, y);
        firstX = x;
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
      lastX = x;
    }

    if (started) {
      ctx.lineTo(lastX, baselineY);
      ctx.lineTo(firstX, baselineY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Render horizontal line (hline)
   */
  private renderHline(plot: PlotOutput, viewport: Viewport): void {
    const { ctx, options, margins } = this;
    const chartHeight = options.height - margins.top - margins.bottom;
    const volumeHeight = options.showVolume ? chartHeight * options.volumeHeight : 0;
    const priceHeight = chartHeight - volumeHeight;

    const price = plot.price;
    if (price === undefined) return;

    // Skip if outside visible price range
    if (price < viewport.priceMin || price > viewport.priceMax) {
      return;
    }

    const y = this.priceToY(price, viewport, priceHeight);
    const color = Array.isArray(plot.color) ? plot.color[0] || '#787B86' : plot.color || '#787B86';

    ctx.strokeStyle = color;
    ctx.lineWidth = plot.linewidth || 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(margins.left, y);
    ctx.lineTo(options.width - margins.right, y);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  /**
   * Render background color regions
   */
  private renderBgcolor(plot: PlotOutput, bars: Bar[], viewport: Viewport): void {
    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;
    const chartHeight = options.height - margins.top - margins.bottom;

    const { values, color } = plot;

    // Calculate bar width
    const viewportTimeRange = viewport.endTime - viewport.startTime;
    let barInterval = viewportTimeRange / Math.max(bars.length, 1);
    if (bars.length >= 2) {
      barInterval = bars[1].time - bars[0].time;
    }
    const pixelsPerMs = chartWidth / viewportTimeRange;
    const slotWidth = barInterval * pixelsPerMs;

    for (let i = 0; i < bars.length && i < values.length; i++) {
      const bar = bars[i];
      const value = values[i];

      if (bar.time < viewport.startTime || bar.time > viewport.endTime) {
        continue;
      }

      // value is used as a boolean (non-null means draw background)
      if (value === null || value === undefined) {
        continue;
      }

      const x = this.timeToX(bar.time, viewport, chartWidth);
      const barColor =
        Array.isArray(color) && color[i]
          ? color[i]
          : (Array.isArray(color) ? color[0] : color) || 'rgba(33, 150, 243, 0.2)';

      ctx.fillStyle = barColor as string;
      ctx.fillRect(x - slotWidth / 2, margins.top, slotWidth, chartHeight);
    }
  }

  /**
   * Render shape markers (plotshape)
   */
  private renderPlotShape(plot: PlotOutput, bars: Bar[], viewport: Viewport): void {
    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;
    const chartHeight = options.height - margins.top - margins.bottom;
    const volumeHeight = options.showVolume ? chartHeight * options.volumeHeight : 0;
    const priceHeight = chartHeight - volumeHeight;

    const { values, color, location = 'abovebar', shape = 'circle', size = 'small' } = plot;
    const baseColor = Array.isArray(color) ? color[0] || '#2196F3' : color || '#2196F3';

    // Size mapping
    const sizeMap: Record<string, number> = {
      tiny: 4,
      small: 6,
      normal: 8,
      large: 12,
      huge: 16,
      auto: 8,
    };
    const markerSize = sizeMap[size || 'small'] || 6;

    for (let i = 0; i < bars.length && i < values.length; i++) {
      const bar = bars[i];
      const value = values[i];

      if (bar.time < viewport.startTime || bar.time > viewport.endTime) {
        continue;
      }

      // Skip null values (no shape at this bar)
      if (value === null || value === undefined) {
        continue;
      }

      const x = this.timeToX(bar.time, viewport, chartWidth);

      // Determine Y position based on location
      let y: number;
      switch (location) {
        case 'abovebar':
          y = this.priceToY(bar.high, viewport, priceHeight) - markerSize - 4;
          break;
        case 'belowbar':
          y = this.priceToY(bar.low, viewport, priceHeight) + markerSize + 4;
          break;
        case 'top':
          y = margins.top + markerSize + 4;
          break;
        case 'bottom':
          y = margins.top + priceHeight - markerSize - 4;
          break;
        case 'absolute':
          y = this.priceToY(value as number, viewport, priceHeight);
          break;
        default:
          y = this.priceToY(bar.close, viewport, priceHeight);
      }

      const shapeColor = Array.isArray(color) && color[i] ? color[i] : baseColor;
      ctx.fillStyle = shapeColor as string;
      ctx.strokeStyle = shapeColor as string;

      this.drawShape(x, y, shape || 'circle', markerSize);
    }
  }

  /**
   * Draw a shape at the specified position
   */
  private drawShape(x: number, y: number, shape: string, size: number): void {
    const { ctx } = this;

    switch (shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'square':
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
        break;

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(x, y - size / 2);
        ctx.lineTo(x + size / 2, y);
        ctx.lineTo(x, y + size / 2);
        ctx.lineTo(x - size / 2, y);
        ctx.closePath();
        ctx.fill();
        break;

      case 'triangleup':
        ctx.beginPath();
        ctx.moveTo(x, y - size / 2);
        ctx.lineTo(x + size / 2, y + size / 2);
        ctx.lineTo(x - size / 2, y + size / 2);
        ctx.closePath();
        ctx.fill();
        break;

      case 'triangledown':
        ctx.beginPath();
        ctx.moveTo(x, y + size / 2);
        ctx.lineTo(x + size / 2, y - size / 2);
        ctx.lineTo(x - size / 2, y - size / 2);
        ctx.closePath();
        ctx.fill();
        break;

      case 'cross':
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - size / 2, y);
        ctx.lineTo(x + size / 2, y);
        ctx.moveTo(x, y - size / 2);
        ctx.lineTo(x, y + size / 2);
        ctx.stroke();
        break;

      case 'xcross':
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - size / 2, y - size / 2);
        ctx.lineTo(x + size / 2, y + size / 2);
        ctx.moveTo(x + size / 2, y - size / 2);
        ctx.lineTo(x - size / 2, y + size / 2);
        ctx.stroke();
        break;

      default:
        // Default to circle
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
    }
  }

  /**
   * Convert Y coordinate to price
   */
  yToPrice(y: number, viewport: Viewport, priceHeight: number): number {
    const { margins } = this;
    const ratio = (y - margins.top) / priceHeight;
    return viewport.priceMax - ratio * (viewport.priceMax - viewport.priceMin);
  }

  /**
   * Convert X coordinate to time
   */
  xToTime(x: number, viewport: Viewport, chartWidth: number): number {
    const { margins } = this;
    const ratio = (x - margins.left) / chartWidth;
    return viewport.startTime + ratio * (viewport.endTime - viewport.startTime);
  }

  /**
   * Format price for crosshair label
   */
  private formatPrice(price: number, viewport: Viewport): string {
    // Use market precision if available, otherwise fall back to range-based calculation
    const { options } = this;
    if (options.pricePrecision && options.pricePrecision > 0) {
      const decimals = getDecimalPlacesFromPrecision(options.pricePrecision);
      return getNumberFormatter(decimals).format(price);
    }
    const range = viewport.priceMax - viewport.priceMin;
    const decimals = this.getDecimalPlaces(range / 10);
    return getNumberFormatter(decimals).format(price);
  }

  /**
   * Format time for crosshair label (more detailed than axis)
   */
  private formatCrosshairTime(time: number): string {
    const date = new Date(time);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  }

  /**
   * Convert price to Y coordinate (internal use)
   */
  private priceToY(price: number, viewport: Viewport, priceHeight: number): number {
    const { margins } = this;
    const ratio = (viewport.priceMax - price) / (viewport.priceMax - viewport.priceMin);
    return margins.top + ratio * priceHeight;
  }

  /**
   * Get the price chart height (excluding volume area)
   */
  getPriceHeight(): number {
    const { options, margins } = this;
    const chartHeight = options.height - margins.top - margins.bottom;
    const volumeHeight = options.showVolume ? chartHeight * options.volumeHeight : 0;
    return chartHeight - volumeHeight;
  }

  /**
   * Public method to convert price to Y coordinate
   * @deprecated Use publicPriceToYWithLayout for pane-aware coordinates
   */
  publicPriceToY(price: number, viewport: Viewport): number {
    return this.priceToY(price, viewport, this.getPriceHeight());
  }

  /**
   * Public method to convert Y coordinate to price
   * @deprecated Use publicYToPriceWithLayout for pane-aware coordinates
   */
  publicYToPrice(y: number, viewport: Viewport): number {
    return this.yToPrice(y, viewport, this.getPriceHeight());
  }

  /**
   * Convert price to Y coordinate using pane-based coordinate system
   * This matches the coordinate system used by canvas rendering (panes start at Y=0)
   */
  publicPriceToYWithLayout(price: number, viewport: Viewport, layout: UnifiedPaneLayout): number {
    const computedPanes = this.computePanesLayout(layout, this.options.height);
    const mainPane = computedPanes.find((p) => p.type === 'main');
    if (!mainPane) return 0;

    // Set Y range from viewport
    mainPane.yMin = viewport.priceMin;
    mainPane.yMax = viewport.priceMax;

    return this.valueToY(price, mainPane);
  }

  /**
   * Convert Y coordinate to price using pane-based coordinate system
   * This matches the coordinate system used by canvas rendering (panes start at Y=0)
   */
  publicYToPriceWithLayout(y: number, viewport: Viewport, layout: UnifiedPaneLayout): number {
    const computedPanes = this.computePanesLayout(layout, this.options.height);
    const mainPane = computedPanes.find((p) => p.type === 'main');
    if (!mainPane) return 0;

    // Set Y range from viewport
    mainPane.yMin = viewport.priceMin;
    mainPane.yMax = viewport.priceMax;

    return this.yToValue(y, mainPane);
  }

  /**
   * Convert X coordinate to time
   * Used for crosshair time display and event emission
   */
  publicXToTime(x: number, viewport: Viewport): number {
    const chartWidth = this.options.width - this.margins.left - this.margins.right;
    return this.xToTime(x, viewport, chartWidth);
  }

  /**
   * Public accessor for formatCrosshairTime — used by ChartCore crosshair overlay
   */
  formatCrosshairTimePublic(time: number): string {
    return this.formatCrosshairTime(time);
  }

  /**
   * Public accessor for font string — used by ChartCore crosshair overlay
   */
  getFont(): string {
    return this.font;
  }

  /**
   * Compute label bounds for price lines without rendering
   * Used by Konva layer for interactive elements
   * @deprecated Use computePriceLineLabelBoundsWithLayout for pane-aware coordinates
   */
  computePriceLineLabelBounds(priceLines: PriceLine[], viewport: Viewport): PriceLineLabelBounds[] {
    return this.calculatePriceLineLabelBounds(priceLines, viewport);
  }

  /**
   * Compute label bounds for price lines using pane-based coordinate system
   * This matches the coordinate system used by canvas rendering (panes start at Y=0)
   * Used by Konva layer for interactive elements
   */
  computePriceLineLabelBoundsWithLayout(
    priceLines: PriceLine[],
    viewport: Viewport,
    layout: UnifiedPaneLayout,
    plots?: PlotOutput[],
    _crosshair?: { y: number; visible: boolean; color: string },
  ): PriceLineLabelBounds[] {
    const { ctx, options } = this;

    // Compute pane positions (same as canvas rendering)
    const computedPanes = this.computePanesLayout(layout, options.height);
    const mainPane = computedPanes.find((p) => p.type === 'main');

    if (!mainPane) {
      // Fallback to legacy method
      return this.calculatePriceLineLabelBounds(priceLines, viewport);
    }

    // Update main pane Y range from viewport
    mainPane.yMin = viewport.priceMin;
    mainPane.yMax = viewport.priceMax;

    // Indicator pane Y ranges are now computed by AutoScaleManager in TealchartWidget
    // and applied via ChartCore.setPaneYRanges() / getUnifiedLayout() before rendering.
    // The panes already have correct yMin/yMax values set.

    // Calculate bounds using pane coordinate system
    const labelFont = `11px ${this.font}`;
    const bounds: PriceLineLabelBounds[] = priceLines.map((line) => {
      // Find the target pane (default to main if not specified)
      const targetPaneId = line.targetPaneId || 'main';
      const targetPane = computedPanes.find((p) => p.id === targetPaneId) || mainPane;

      // Use valueToY with the correct pane
      const originalY = this.valueToY(line.price, targetPane);
      const primaryWidth = getCachedTextWidth(ctx, line.label.primaryText, labelFont);
      // Check for secondary text or countdown (countdown renders as secondary text)
      const hasSecondaryText = line.label.secondaryText || line.countdownToTime;
      const secondaryWidth = line.label.secondaryText
        ? getCachedTextWidth(ctx, line.label.secondaryText, labelFont)
        : line.countdownToTime
          ? 40
          : 0;
      const width = Math.max(primaryWidth, secondaryWidth) + 12;
      const baseHeight = line.type === 'price' || !line.type ? 20 : 18;
      const height = hasSecondaryText ? baseHeight + 6 : baseHeight;

      return {
        lineId: line.id,
        price: line.price,
        originalY,
        adjustedY: originalY,
        width,
        height,
        color: line.color,
        label: line.label,
        lineStyle: line.lineStyle,
        type: line.type,
        chartLabel: line.chartLabel,
        lineLength: line.lineLength,
        extendLeft: line.extendLeft,
        lineWidth: line.lineWidth,
        floatingLabel: line.floatingLabel,
        priority: line.priority,
        renderLineOnCanvas: line.renderLineOnCanvas,
        countdownToTime: line.countdownToTime,
        draggable: line.draggable,
        targetPaneId: line.targetPaneId,
        // Position-specific fields for bracket TP/SL drag
        positionId: line.positionId,
        partialEnabled: line.partialEnabled,
        positionData: line.positionData,
        // Adapter callbacks carried through for direct invocation
        callbacks: line.callbacks,
      };
    });

    // Separate floating labels (they don't participate in collision detection)
    const floatingBounds = bounds.filter((b) => b.floatingLabel);
    const staticBounds = bounds.filter((b) => !b.floatingLabel);

    // Resolve collisions
    resolveLabelCollisions(staticBounds);

    // Sort by Y for rendering order
    staticBounds.sort((a, b) => a.adjustedY - b.adjustedY);

    const allBounds = [...staticBounds, ...floatingBounds];

    // Clamp adjustedY to keep labels within their target pane's visible bounds
    const visibleTop = this.margins.top;
    for (const bound of allBounds) {
      const targetPaneId = bound.targetPaneId || 'main';
      const targetPane = computedPanes.find((p) => p.id === targetPaneId) || mainPane;

      const labelTop = bound.adjustedY - bound.height / 2;
      const labelBottom = bound.adjustedY + bound.height / 2;

      // For main pane, respect top bar safe zone
      const paneTop = targetPane.type === 'main' ? visibleTop : targetPane.top;

      if (labelTop < paneTop) {
        bound.adjustedY = paneTop + bound.height / 2;
      }
      if (labelBottom > targetPane.bottom) {
        bound.adjustedY = targetPane.bottom - bound.height / 2;
      }
    }

    // Filter to visible area within each line's target pane
    return allBounds.filter((b) => {
      const targetPaneId = b.targetPaneId || 'main';
      const targetPane = computedPanes.find((p) => p.id === targetPaneId) || mainPane;
      return b.originalY >= targetPane.top && b.originalY <= targetPane.bottom;
    });
  }

  /**
   * Convert time to X coordinate
   */
  private timeToX(time: number, viewport: Viewport, chartWidth: number): number {
    const { margins } = this;
    const ratio = (time - viewport.startTime) / (viewport.endTime - viewport.startTime);
    return margins.left + ratio * chartWidth;
  }

  /**
   * Generate price markers that fit nicely in the available height
   * Ensures minimum pixel spacing between labels to avoid overlap
   */
  private generatePriceMarkers(viewport: Viewport, priceHeight: number): number[] {
    const minLabelSpacing = 24; // Minimum pixels between labels
    const maxLabels = Math.floor(priceHeight / minLabelSpacing);
    const minLabels = Math.max(4, Math.floor(maxLabels * 0.5)); // Target 50% of max

    const priceRange = viewport.priceMax - viewport.priceMin;
    if (priceRange <= 0) return [];

    // Try different "nice" spacings to find the densest one that fits
    const magnitude = Math.floor(Math.log10(priceRange));
    const spacings = [
      1 * Math.pow(10, magnitude - 2),
      2 * Math.pow(10, magnitude - 2),
      5 * Math.pow(10, magnitude - 2),
      1 * Math.pow(10, magnitude - 1),
      2 * Math.pow(10, magnitude - 1),
      5 * Math.pow(10, magnitude - 1),
      1 * Math.pow(10, magnitude),
      2 * Math.pow(10, magnitude),
      5 * Math.pow(10, magnitude),
      1 * Math.pow(10, magnitude + 1),
      2 * Math.pow(10, magnitude + 1),
    ].sort((a, b) => a - b);

    // Find the smallest spacing that doesn't exceed maxLabels
    for (const spacing of spacings) {
      // Start at the nearest "nice" value at or below priceMin
      const firstMarker = Math.floor(viewport.priceMin / spacing) * spacing;
      const markers: number[] = [];

      // Generate all markers from firstMarker up through priceMax
      for (let price = firstMarker; price <= viewport.priceMax + spacing * 0.01; price += spacing) {
        markers.push(price);
      }

      // Accept if within bounds, preferring denser grids
      if (markers.length >= minLabels && markers.length <= maxLabels) {
        return markers;
      }
    }

    // Fallback: find any spacing that works
    for (const spacing of [...spacings].reverse()) {
      const firstMarker = Math.floor(viewport.priceMin / spacing) * spacing;
      const markers: number[] = [];

      for (let price = firstMarker; price <= viewport.priceMax + spacing * 0.01; price += spacing) {
        markers.push(price);
      }

      if (markers.length <= maxLabels && markers.length >= 2) {
        return markers;
      }
    }

    // Ultimate fallback: evenly spaced within viewport
    const step = priceRange / Math.max(minLabels, 4);
    const markers: number[] = [];
    for (let price = viewport.priceMin; price <= viewport.priceMax; price += step) {
      markers.push(price);
    }
    return markers;
  }

  /**
   * Generate time markers that fit nicely in the available width
   * Returns markers with metadata for formatting
   * Supports any zoom level - from seconds to decades
   */
  private generateTimeMarkers(
    viewport: Viewport,
    chartWidth: number,
  ): Array<{ time: number; showMonthLabel: boolean; step: number }> {
    const minLabelSpacing = 70; // Minimum pixels between time labels
    const maxLabels = Math.max(2, Math.floor(chartWidth / minLabelSpacing));

    const timeRange = viewport.endTime - viewport.startTime;
    if (timeRange <= 0) return [];

    // Time intervals in ms (from small to large, covering seconds to decades)
    const intervals = [
      1000, // 1 second
      5000, // 5 seconds
      10000, // 10 seconds
      30000, // 30 seconds
      60000, // 1 minute
      300000, // 5 minutes
      600000, // 10 minutes
      900000, // 15 minutes
      1800000, // 30 minutes
      3600000, // 1 hour
      7200000, // 2 hours
      14400000, // 4 hours
      28800000, // 8 hours
      43200000, // 12 hours
      86400000, // 1 day
      172800000, // 2 days
      604800000, // 1 week
      1209600000, // 2 weeks
      2592000000, // ~1 month (30 days)
      5184000000, // ~2 months
      7776000000, // ~3 months (quarter)
      15552000000, // ~6 months
      31536000000, // ~1 year
      63072000000, // ~2 years
      157680000000, // ~5 years
      315360000000, // ~10 years
    ];

    // Find the smallest interval that doesn't exceed maxLabels
    let bestInterval = intervals[intervals.length - 1];
    for (const interval of intervals) {
      const count = Math.ceil(timeRange / interval);
      if (count <= maxLabels) {
        bestInterval = interval;
        break;
      }
    }

    // If still too many labels, calculate a custom larger interval
    let count = Math.ceil(timeRange / bestInterval);
    while (count > maxLabels) {
      bestInterval *= 2;
      count = Math.ceil(timeRange / bestInterval);
    }

    // Generate markers
    const startTime = Math.ceil(viewport.startTime / bestInterval) * bestInterval;
    const markers: Array<{ time: number; showMonthLabel: boolean; step: number }> = [];
    let lastMonth = -1;
    let lastYear = -1;

    for (let time = startTime; time <= viewport.endTime; time += bestInterval) {
      const date = new Date(time);
      const month = date.getMonth();
      const year = date.getFullYear();
      const showMonthLabel = month !== lastMonth || year !== lastYear;

      markers.push({ time, showMonthLabel, step: bestInterval });

      lastMonth = month;
      lastYear = year;
    }

    return markers;
  }

  /**
   * Calculate a "nice" step value for axis labels
   */
  private calculateNiceStep(range: number, targetSteps: number): number {
    const roughStep = range / targetSteps;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalized = roughStep / magnitude;

    let niceStep: number;
    if (normalized <= 1) niceStep = 1;
    else if (normalized <= 2) niceStep = 2;
    else if (normalized <= 5) niceStep = 5;
    else niceStep = 10;

    return niceStep * magnitude;
  }

  /**
   * Calculate nice time step for axis labels
   */
  private calculateNiceTimeStep(rangeMs: number, targetSteps: number): number {
    const roughStep = rangeMs / targetSteps;

    // Common time intervals in ms
    const intervals = [
      1000, // 1 second
      5000, // 5 seconds
      10000, // 10 seconds
      30000, // 30 seconds
      60000, // 1 minute
      300000, // 5 minutes
      600000, // 10 minutes
      900000, // 15 minutes
      1800000, // 30 minutes
      3600000, // 1 hour
      14400000, // 4 hours
      86400000, // 1 day
      604800000, // 1 week
    ];

    // Find closest interval
    for (const interval of intervals) {
      if (interval >= roughStep) {
        return interval;
      }
    }
    return intervals[intervals.length - 1];
  }

  /**
   * Format time label based on step size (TradingView style)
   * Adapts format based on zoom level - from HH:MM to just year
   */
  private formatTimeLabel(time: number, step: number, showMonthLabel = false): string {
    const date = new Date(time);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yearShort = date.getFullYear().toString().slice(-2);

    // Multi-year intervals: just show year
    if (step >= 31536000000) {
      // >= 1 year
      return date.getFullYear().toString();
    }

    // Month-level intervals: show "Mon 'YY"
    if (step >= 2592000000) {
      // >= ~1 month
      return `${months[date.getMonth()]} '${yearShort}`;
    }

    // Day-level intervals
    if (step >= 86400000) {
      // >= 1 day
      if (showMonthLabel) {
        return `${months[date.getMonth()]} '${yearShort}`;
      }
      return date.getDate().toString();
    }

    // Hour-level intervals
    if (step >= 3600000) {
      // >= 1 hour
      if (showMonthLabel) {
        return `${date.getDate()} ${months[date.getMonth()]}`;
      }
      return `${date.getHours()}:00`;
    }

    // Minute/second intervals
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  /**
   * Get appropriate decimal places for a number
   */
  private getDecimalPlaces(value: number): number {
    if (value >= 1) return 0;
    if (value >= 0.1) return 1;
    if (value >= 0.01) return 2;
    if (value >= 0.001) return 3;
    if (value >= 0.0001) return 4;
    return 5;
  }

  // =========================================================================
  // Unified Pane System - New pane-aware coordinate transforms
  // =========================================================================

  /**
   * Compute pixel positions for all panes from a UnifiedPaneLayout
   */
  computePanesLayout(layout: UnifiedPaneLayout, totalHeight: number): ComputedPane[] {
    // Main pane starts at 0 so candles can draw behind the transparent top bar
    // Available height is full height minus time axis at bottom
    const availableHeight = totalHeight - layout.timeAxisHeight;
    let currentTop = 0;

    return layout.panes.map((pane) => {
      const height = availableHeight * pane.heightRatio;
      const computed: ComputedPane = {
        ...pane,
        top: currentTop,
        height,
        bottom: currentTop + height,
      };
      currentTop += height;
      return computed;
    });
  }

  /**
   * Convert a value to Y coordinate within a computed pane
   * This is the unified coordinate transform for all pane types
   */
  valueToY(value: number, pane: ComputedPane): number {
    const range = pane.yMax - pane.yMin;
    if (range === 0) return pane.top + pane.height / 2;

    const ratio = (pane.yMax - value) / range;
    return pane.top + ratio * pane.height;
  }

  /**
   * Convert Y pixel position to value within a computed pane
   */
  yToValue(y: number, pane: ComputedPane): number {
    const ratio = (y - pane.top) / pane.height;
    return pane.yMax - ratio * (pane.yMax - pane.yMin);
  }

  /**
   * Find which pane contains a given Y coordinate
   */
  getPaneAtY(y: number, computedPanes: ComputedPane[]): ComputedPane | null {
    for (const pane of computedPanes) {
      if (y >= pane.top && y < pane.bottom) {
        return pane;
      }
    }
    return null;
  }

  /**
   * Render the unified pane layout - iterates through all panes and renders each
   */
  renderUnifiedPanes(
    bars: Bar[],
    viewport: Viewport,
    layout: UnifiedPaneLayout,
    priceLines?: PriceLine[],
    plots?: PlotOutput[],
    indicatorPaneInfo?: Record<string, IndicatorPaneInfo>,
    _crosshair?: CrosshairState,
    plotStyleOverrides?: Map<string, PlotStyleOverride>,
    precomputedPriceLineBounds?: PriceLineLabelBounds[],
    executionLines?: ExecutionLineRenderData[],
    drawings?: DrawingOutput[],
  ): void {
    const { ctx, options, margins } = this;

    // Compute pixel positions for all panes
    const computedPanes = this.computePanesLayout(layout, options.height);

    // Get the main pane and update its Y range from viewport
    const mainPane = computedPanes.find((p) => p.type === 'main');
    if (mainPane) {
      mainPane.yMin = viewport.priceMin;
      mainPane.yMax = viewport.priceMax;
    }

    // Indicator pane Y ranges are now computed by AutoScaleManager in TealchartWidget
    // and applied via ChartCore.setPaneYRanges() / getUnifiedLayout() before rendering.

    // Pre-calculate label bounds for each pane (filter lines by targetPaneId)
    const allPriceLines = priceLines ? [...priceLines] : [];
    const labelBoundsByPane = new Map<string, PriceLineLabelBounds[]>();
    if (precomputedPriceLineBounds && precomputedPriceLineBounds.length > 0) {
      for (const pane of computedPanes) {
        const paneBounds = precomputedPriceLineBounds.filter((bound) => (bound.targetPaneId || 'main') === pane.id);
        if (paneBounds.length > 0) {
          labelBoundsByPane.set(pane.id, paneBounds);
        }
      }
    } else if (allPriceLines.length > 0) {
      for (const pane of computedPanes) {
        // Filter lines targeting this pane (default to 'main' if not specified)
        const paneLines = allPriceLines.filter((line) => (line.targetPaneId || 'main') === pane.id);
        if (paneLines.length > 0) {
          const bounds = this.calculatePriceLineLabelBoundsForPane(paneLines, viewport, pane);
          labelBoundsByPane.set(pane.id, bounds);
        }
      }
    }

    // Render each pane with its specific price lines
    for (const pane of computedPanes) {
      const paneLabelBounds = labelBoundsByPane.get(pane.id) || [];
      this.renderPaneUnified(
        pane,
        bars,
        viewport,
        priceLines,
        executionLines,
        plots,
        indicatorPaneInfo,
        paneLabelBounds,
        plotStyleOverrides,
        drawings,
      );
    }

    // Render shared time axis at bottom
    this.drawTimeAxis(viewport);
  }

  /**
   * Render a single pane (dispatches based on type)
   */
  private renderPaneUnified(
    pane: ComputedPane,
    bars: Bar[],
    viewport: Viewport,
    priceLines?: PriceLine[],
    executionLines?: ExecutionLineRenderData[],
    plots?: PlotOutput[],
    indicatorPaneInfo?: Record<string, IndicatorPaneInfo>,
    labelBounds?: PriceLineLabelBounds[],
    plotStyleOverrides?: Map<string, PlotStyleOverride>,
    drawings?: DrawingOutput[],
  ): void {
    const { ctx, options, margins } = this;

    // Clip to pane bounds for indicator panes only
    // Main pane is NOT clipped so candles can render under the top bar (transparent overlay)
    ctx.save();
    if (pane.type !== 'main') {
      ctx.beginPath();
      ctx.rect(0, pane.top, options.width, pane.height);
      ctx.clip();
    }

    if (pane.type === 'main') {
      this.renderMainPaneContent(
        pane,
        bars,
        viewport,
        priceLines,
        executionLines,
        plots,
        indicatorPaneInfo,
        labelBounds,
        plotStyleOverrides,
        drawings,
      );
    } else {
      this.renderIndicatorPaneContent(pane, bars, viewport, plots, indicatorPaneInfo, labelBounds, plotStyleOverrides);
    }

    ctx.restore();
  }

  /**
   * Render main pane content (candles, volume overlay, price lines, overlay plots)
   */
  private renderMainPaneContent(
    pane: ComputedPane,
    bars: Bar[],
    viewport: Viewport,
    priceLines?: PriceLine[],
    executionLines?: ExecutionLineRenderData[],
    plots?: PlotOutput[],
    indicatorPaneInfo?: Record<string, IndicatorPaneInfo>,
    labelBounds?: PriceLineLabelBounds[],
    plotStyleOverrides?: Map<string, PlotStyleOverride>,
    drawings?: DrawingOutput[],
  ): void {
    const { ctx, options, margins } = this;

    // Draw grid for main pane
    this.renderPaneGrid(pane, viewport);

    // Jailbreak indicators: draw behind candles
    if (this.jailbreakManager && this.jailbreakManager.size > 0 && bars.length > 0) {
      const jailbreakArgs = this.buildJailbreakDrawArgs(bars, viewport, pane);
      if (jailbreakArgs) {
        this.jailbreakManager.drawBehindCandles(jailbreakArgs);
      }
    }

    // Draw candles (skip if a jailbreak indicator has hideCandles enabled)
    const hideCandles = this.jailbreakManager?.hasSettingEnabled('hideCandles') ?? false;
    if (!hideCandles) {
      this.drawCandlesInPane(bars, viewport, pane, plots);
    }

    // Draw volume overlay (bottom 10% of main pane)
    if (options.showVolume && !hideCandles) {
      this.drawVolumeInPane(bars, viewport, pane);
    }

    // Jailbreak indicators: draw after candles
    if (this.jailbreakManager && this.jailbreakManager.size > 0 && bars.length > 0) {
      const jailbreakArgs = this.buildJailbreakDrawArgs(bars, viewport, pane);
      if (jailbreakArgs) {
        this.jailbreakManager.drawAfterCandles(jailbreakArgs);
      }
    }

    // Draw overlay indicator plots (plots that share main pane Y-axis)
    if (plots && indicatorPaneInfo) {
      for (const plot of plots) {
        const scriptId = plot.scriptId ?? 'unknown';
        const info = indicatorPaneInfo[scriptId];
        if (info?.overlay !== false) {
          // This is an overlay - render it on the main pane
          this.renderPlotInPane(plot, bars, viewport, pane, plotStyleOverrides);
        }
      }
    }

    if (executionLines && executionLines.length > 0) {
      this.drawExecutionMarkersInPane(executionLines, viewport, pane);
    }

    if (drawings && drawings.length > 0) {
      const drawingPartition = partitionTealScriptDrawings(drawings);
      this.renderLineFillDrawings(drawingPartition, bars, viewport, pane);
      this.renderBoxDrawings(drawingPartition.boxes, bars, viewport, pane);
      this.renderLineDrawings(drawingPartition.lines, bars, viewport, pane);
      this.renderLabelDrawings(drawingPartition.labels, bars, viewport, pane);
    }

    // Draw Y-axis (price axis) for main pane
    this.renderPaneYAxis(pane, labelBounds);

    // Draw price lines on top
    if (labelBounds && labelBounds.length > 0) {
      this.drawPriceLinesInPane(labelBounds, viewport, pane);
    }
  }

  private renderBoxDrawings(
    boxes: BoxDrawingOutput[],
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
  ): void {
    if (boxes.length === 0) return;

    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;
    const minX = margins.left;
    const maxX = options.width - margins.right;

    ctx.save();
    ctx.beginPath();
    ctx.rect(margins.left, pane.top, options.width - margins.left - margins.right, pane.height);
    ctx.clip();

    for (const box of boxes) {
      const rect = this.resolveBoxDrawingRect(box, bars, viewport, pane, chartWidth, minX, maxX);
      if (!rect) continue;

      if (box.bgcolor) {
        ctx.fillStyle = box.bgcolor;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      }

      ctx.strokeStyle = box.borderColor ?? '#2962FF';
      ctx.lineWidth = Math.max(1, box.borderWidth);
      if (box.borderStyle === 'dashed') {
        ctx.setLineDash([6, 4]);
      } else if (box.borderStyle === 'dotted') {
        ctx.setLineDash([2, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

      if (box.text) {
        ctx.setLineDash([]);
        ctx.fillStyle = box.textColor ?? '#FFFFFF';
        ctx.font = `${this.fontSizeForDrawing(box.textSize)}px ${this.font}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(box.text, rect.x + 6, rect.y + 6);
      }
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  private resolveBoxDrawingRect(
    box: BoxDrawingOutput,
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
    chartWidth: number,
    minX: number,
    maxX: number,
  ): { x: number; y: number; width: number; height: number } | null {
    if (
      box.left === null
      || box.right === null
      || box.top === null
      || box.bottom === null
      || !Number.isFinite(box.left)
      || !Number.isFinite(box.right)
      || !Number.isFinite(box.top)
      || !Number.isFinite(box.bottom)
    ) {
      return null;
    }

    const leftTime = box.xloc === 'bar_time' ? box.left : this.barIndexToTime(box.left, bars);
    const rightTime = box.xloc === 'bar_time' ? box.right : this.barIndexToTime(box.right, bars);
    if (leftTime === null || rightTime === null) return null;

    let leftX = this.timeToX(leftTime, viewport, chartWidth);
    let rightX = this.timeToX(rightTime, viewport, chartWidth);
    if (box.extend === 'left' || box.extend === 'both') leftX = minX;
    if (box.extend === 'right' || box.extend === 'both') rightX = maxX;

    const topY = this.valueToY(box.top, pane);
    const bottomY = this.valueToY(box.bottom, pane);
    const x = Math.min(leftX, rightX);
    const y = Math.min(topY, bottomY);
    return {
      x,
      y,
      width: Math.abs(rightX - leftX),
      height: Math.abs(bottomY - topY),
    };
  }

  private fontSizeForDrawing(size: string): number {
    switch (size) {
      case 'tiny':
        return 9;
      case 'small':
        return 10;
      case 'large':
        return 14;
      case 'huge':
        return 18;
      default:
        return 12;
    }
  }

  private renderLineFillDrawings(
    drawingPartition: TealScriptDrawingPartition,
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
  ): void {
    const { linefills, linesById } = drawingPartition;
    if (linefills.length === 0) return;

    if (linesById.size === 0) return;

    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;
    const minX = margins.left;
    const maxX = options.width - margins.right;

    ctx.save();
    ctx.beginPath();
    ctx.rect(margins.left, pane.top, options.width - margins.left - margins.right, pane.height);
    ctx.clip();

    for (const linefill of linefills) {
      const line1 = linesById.get(linefill.line1);
      const line2 = linesById.get(linefill.line2);
      if (!line1 || !line2) continue;

      const line1Segment = this.resolveLineDrawingSegment(line1, bars, viewport, pane, chartWidth, minX, maxX);
      const line2Segment = this.resolveLineDrawingSegment(line2, bars, viewport, pane, chartWidth, minX, maxX);
      if (!line1Segment || !line2Segment) continue;

      ctx.fillStyle = linefill.color ?? 'rgba(41, 98, 255, 0.18)';
      ctx.beginPath();
      ctx.moveTo(line1Segment.start.x, line1Segment.start.y);
      ctx.lineTo(line1Segment.end.x, line1Segment.end.y);
      ctx.lineTo(line2Segment.end.x, line2Segment.end.y);
      ctx.lineTo(line2Segment.start.x, line2Segment.start.y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  private renderLineDrawings(
    lines: LineDrawingOutput[],
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
  ): void {
    if (lines.length === 0) return;

    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;
    const minX = margins.left;
    const maxX = options.width - margins.right;

    ctx.save();
    ctx.beginPath();
    ctx.rect(margins.left, pane.top, options.width - margins.left - margins.right, pane.height);
    ctx.clip();

    for (const line of lines) {
      const extended = this.resolveLineDrawingSegment(line, bars, viewport, pane, chartWidth, minX, maxX);
      if (!extended) continue;

      ctx.strokeStyle = line.color ?? '#2962FF';
      ctx.lineWidth = Math.max(1, line.width);
      if (line.style === 'dashed') {
        ctx.setLineDash([6, 4]);
      } else if (line.style === 'dotted') {
        ctx.setLineDash([2, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(extended.start.x, extended.start.y);
      ctx.lineTo(extended.end.x, extended.end.y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  private resolveLineDrawingSegment(
    line: LineDrawingOutput,
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
    chartWidth: number,
    minX: number,
    maxX: number,
  ): { start: { x: number; y: number }; end: { x: number; y: number } } | null {
    const start = this.resolveLineDrawingPoint(line.x1, line.y1, line.xloc, bars, viewport, pane, chartWidth);
    const end = this.resolveLineDrawingPoint(line.x2, line.y2, line.xloc, bars, viewport, pane, chartWidth);
    if (!start || !end) return null;
    return this.resolveExtendedLineSegment(start, end, line.extend, minX, maxX);
  }

  private resolveLineDrawingPoint(
    xValue: number | null,
    yValue: number | null,
    xloc: string,
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
    chartWidth: number,
  ): { x: number; y: number } | null {
    if (xValue === null || yValue === null || !Number.isFinite(xValue) || !Number.isFinite(yValue)) {
      return null;
    }

    const time = xloc === 'bar_time' ? xValue : this.barIndexToTime(xValue, bars);
    if (time === null) return null;

    const x = this.timeToX(time, viewport, chartWidth);
    const y = this.valueToY(yValue, pane);
    return { x, y };
  }

  private barIndexToTime(index: number, bars: Bar[]): number | null {
    if (bars.length === 0 || !Number.isFinite(index)) return null;

    const roundedIndex = Math.trunc(index);
    if (roundedIndex >= 0 && roundedIndex < bars.length) {
      return bars[roundedIndex]?.time ?? null;
    }

    const interval = bars.length > 1 ? bars[1]!.time - bars[0]!.time : 60_000;
    return bars[0]!.time + roundedIndex * interval;
  }

  private resolveExtendedLineSegment(
    start: { x: number; y: number },
    end: { x: number; y: number },
    extend: string,
    minX: number,
    maxX: number,
  ): { start: { x: number; y: number }; end: { x: number; y: number } } {
    if (start.x === end.x) {
      return { start, end };
    }

    const slope = (end.y - start.y) / (end.x - start.x);
    const yAt = (x: number): number => start.y + slope * (x - start.x);
    let nextStart = start;
    let nextEnd = end;

    if (extend === 'left' || extend === 'both') {
      nextStart = { x: minX, y: yAt(minX) };
    }
    if (extend === 'right' || extend === 'both') {
      nextEnd = { x: maxX, y: yAt(maxX) };
    }

    return { start: nextStart, end: nextEnd };
  }

  private renderLabelDrawings(
    labels: LabelDrawingOutput[],
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
  ): void {
    if (labels.length === 0) return;

    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;
    const font = `12px ${this.font}`;

    ctx.save();
    ctx.font = font;
    ctx.textBaseline = 'middle';

    for (const label of labels) {
      const position = this.resolveLabelDrawingPosition(label, bars, viewport, pane, chartWidth);
      if (!position) continue;

      const text = label.text ?? '';
      const paddingX = 8;
      const height = 22;
      const width = Math.max(18, getCachedTextWidth(ctx, text, font) + paddingX * 2);
      const radius = 4;
      const fillColor = label.color ?? '#1f2937';
      const textColor = label.textColor ?? '#FFFFFF';

      let x = position.x;
      let y = position.y;

      if (label.style.includes('right')) {
        x -= width;
      } else if (!label.style.includes('left')) {
        x -= width / 2;
      }

      if (label.style.includes('down') || label.yloc === 'abovebar') {
        y -= height + 6;
      } else if (label.style.includes('up') || label.yloc === 'belowbar') {
        y += 6;
      } else {
        y -= height / 2;
      }

      const minX = margins.left;
      const maxX = options.width - margins.right - width;
      const minY = pane.top;
      const maxY = pane.bottom - height;
      x = Math.min(maxX, Math.max(minX, x));
      y = Math.min(maxY, Math.max(minY, y));

      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      ctx.fill();

      ctx.fillStyle = textColor;
      ctx.textAlign = 'left';
      ctx.fillText(text, x + paddingX, y + height / 2);
    }

    ctx.restore();
  }

  private resolveLabelDrawingPosition(
    label: LabelDrawingOutput,
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
    chartWidth: number,
  ): { x: number; y: number } | null {
    const barIndex = Number.isFinite(label.barIndex) ? Math.trunc(label.barIndex) : -1;
    const xValue = label.x ?? barIndex;
    const xIndex = Number.isFinite(xValue) ? Math.trunc(xValue) : barIndex;
    const anchorIndex = label.xloc === 'bar_time' ? barIndex : xIndex;
    const bar = anchorIndex >= 0 && anchorIndex < bars.length ? bars[anchorIndex] : undefined;
    const time = label.xloc === 'bar_time'
      ? xValue
      : (xIndex >= 0 && xIndex < bars.length ? bars[xIndex].time : undefined);
    if (time === undefined || time < viewport.startTime || time > viewport.endTime) {
      return null;
    }

    const x = this.timeToX(time, viewport, chartWidth);
    let y: number;

    if (label.yloc === 'abovebar') {
      if (!bar) return null;
      y = this.valueToY(bar.high, pane) - 6;
    } else if (label.yloc === 'belowbar') {
      if (!bar) return null;
      y = this.valueToY(bar.low, pane) + 6;
    } else {
      if (label.y === null || !Number.isFinite(label.y)) return null;
      if (label.y < pane.yMin || label.y > pane.yMax) return null;
      y = this.valueToY(label.y, pane);
    }

    return { x, y };
  }

  /**
   * Draw execution markers (filled orders/trades) in the main pane.
   * Markers are anchored by candle time and price, matching TradingView's
   * createExecutionShape() semantics rather than horizontal price lines.
   */
  private drawExecutionMarkersInPane(
    executionLines: ExecutionLineRenderData[],
    viewport: Viewport,
    pane: ComputedPane,
  ): void {
    const { ctx, options, margins } = this;
    // Match candle rendering X-space, which extends under the price axis.
    // Using a narrower width here causes markers to drift proportionally when
    // the visible time range changes.
    const chartWidth = options.width - margins.left;
    if (chartWidth <= 0 || viewport.endTime <= viewport.startTime) {
      return;
    }

    for (const execution of executionLines) {
      const timeMs = execution.time < 1_000_000_000_000 ? execution.time * 1000 : execution.time;
      if (timeMs < viewport.startTime || timeMs > viewport.endTime) {
        continue;
      }
      if (execution.price < pane.yMin || execution.price > pane.yMax) {
        continue;
      }

      const ratio = (timeMs - viewport.startTime) / (viewport.endTime - viewport.startTime);
      const x = margins.left + ratio * chartWidth;
      const anchorY = this.valueToY(execution.price, pane);
      const isBuy = execution.direction === 'buy';
      const arrowHeight = Math.max(8, execution.arrowHeight || 20);
      const arrowSpacing = Math.max(0, execution.arrowSpacing || 0);
      const markerCenterY = anchorY + (isBuy ? arrowSpacing : -arrowSpacing);

      const tipY = isBuy ? markerCenterY - arrowHeight / 2 : markerCenterY + arrowHeight / 2;
      const tailY = isBuy ? markerCenterY + arrowHeight / 2 : markerCenterY - arrowHeight / 2;
      const headBaseY = isBuy ? markerCenterY - arrowHeight / 8 : markerCenterY + arrowHeight / 8;
      const headHalfWidth = Math.max(4, arrowHeight * 0.28);
      const stemHalfWidth = Math.max(1.5, arrowHeight * 0.09);

      ctx.save();
      ctx.fillStyle = execution.arrowColor;
      ctx.beginPath();
      ctx.moveTo(x, tipY);
      ctx.lineTo(x + headHalfWidth, headBaseY);
      ctx.lineTo(x + stemHalfWidth, headBaseY);
      ctx.lineTo(x + stemHalfWidth, tailY);
      ctx.lineTo(x - stemHalfWidth, tailY);
      ctx.lineTo(x - stemHalfWidth, headBaseY);
      ctx.lineTo(x - headHalfWidth, headBaseY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      if (!execution.text) {
        continue;
      }

      const labelOffset = arrowHeight / 2 + 10;
      const textY = isBuy ? markerCenterY + labelOffset : markerCenterY - labelOffset;
      const font = execution.font?.trim() ? execution.font : `11px ${this.font}`;

      ctx.save();
      ctx.fillStyle = execution.textColor || execution.arrowColor;
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = isBuy ? 'top' : 'bottom';
      ctx.fillText(execution.text, x, textY);
      ctx.restore();
    }
  }

  /**
   * Build IndicatorDrawArgs for jailbreak indicators from current render state.
   * Returns null if data is insufficient.
   */
  private buildJailbreakDrawArgs(
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
  ): Omit<import('./jailbreak/types').IndicatorDrawArgs, 'settings'> | null {
    const { ctx, options, margins } = this;
    const priceHeight = pane.height;
    // Use same extended width as drawCandlesInPane — goes under price axis
    const chartWidth = options.width - margins.left;

    const priceToCoord = (price: number): number => {
      const ratio = (pane.yMax - price) / (pane.yMax - pane.yMin);
      return pane.top + ratio * priceHeight;
    };
    const coordToPrice = (coord: number): number => {
      const ratio = (coord - pane.top) / priceHeight;
      return pane.yMax - ratio * (pane.yMax - pane.yMin);
    };
    const timeToX = (time: number): number => {
      const ratio = (time - viewport.startTime) / (viewport.endTime - viewport.startTime);
      return margins.left + ratio * chartWidth;
    };

    const candleCoords = computeCandleCoordinates(
      bars,
      viewport,
      chartWidth,
      priceToCoord,
      timeToX,
      options.minCandleWidth,
    );

    // Convert bar timestamps from ms to seconds for indicator compatibility
    const barsInSeconds: Bar[] = bars.map((b) => ({
      ...b,
      time: Math.floor(b.time / 1000),
    }));

    // Get native CanvasRenderingContext2D for jailbreak indicators
    // (they need full canvas API including createLinearGradient, drawImage etc.)
    const nativeCtx =
      'getNativeContext' in ctx
        ? ((ctx as any).getNativeContext() as CanvasRenderingContext2D)
        : (ctx as unknown as CanvasRenderingContext2D);

    return {
      ctx: nativeCtx,
      bars: barsInSeconds,
      candleCoords,
      exchange: options.exchange ?? '',
      symbol: options.symbol ?? '',
      resolutionString: options.resolutionString ?? '',
      chartWidth: options.width,
      chartHeight: options.height,
      priceToCoord,
      coordToPrice,
    };
  }

  /**
   * Render indicator pane content
   */
  private renderIndicatorPaneContent(
    pane: ComputedPane,
    bars: Bar[],
    viewport: Viewport,
    plots?: PlotOutput[],
    indicatorPaneInfo?: Record<string, IndicatorPaneInfo>,
    labelBounds?: PriceLineLabelBounds[],
    plotStyleOverrides?: Map<string, PlotStyleOverride>,
  ): void {
    const { ctx, options, margins } = this;

    // Draw pane background first (same as main chart for consistency)
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, pane.top, options.width, pane.height);

    // Draw pane separator at top
    ctx.strokeStyle = options.gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, pane.top);
    ctx.lineTo(options.width, pane.top);
    ctx.stroke();

    // Note: Indicator legend is now rendered as React overlay in ChartContainer
    // for proper hover/click interactions (eye, settings, trash buttons)

    // Draw grid for this pane
    this.renderPaneGrid(pane, viewport);

    // Get plots for this pane's indicators
    if (plots && pane.indicatorIds) {
      // Y ranges are now computed by AutoScaleManager and set via getUnifiedLayout()
      // before rendering. No inline auto-scale needed.

      // Render each plot that belongs to this pane
      for (const plot of plots) {
        const scriptId = plot.scriptId ?? 'unknown';
        if (pane.indicatorIds.includes(scriptId)) {
          this.renderPlotInPane(plot, bars, viewport, pane, plotStyleOverrides);
        }
      }
    }

    // Draw Y-axis for indicator pane
    this.renderPaneYAxis(pane, labelBounds);

    // Draw price lines on top
    if (labelBounds && labelBounds.length > 0) {
      this.drawPriceLinesInPane(labelBounds, viewport, pane);
    }
  }

  /**
   * Render grid lines within a pane
   */
  private renderPaneGrid(pane: ComputedPane, viewport: Viewport): void {
    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left - margins.right;

    ctx.strokeStyle = options.gridColor;
    ctx.lineWidth = 1;

    // Horizontal grid lines
    const gridLines = this.generatePaneGridLines(pane.yMin, pane.yMax, pane.height);
    for (const value of gridLines) {
      const y = this.valueToY(value, pane);
      if (y >= pane.top && y <= pane.bottom) {
        ctx.beginPath();
        ctx.moveTo(margins.left, y);
        ctx.lineTo(options.width, y); // Extend under Y-axis for transparency
        ctx.stroke();
      }
    }

    // Vertical grid lines (time intervals) - shared across all panes
    const timeMarkers = this.generateTimeMarkers(viewport, chartWidth);
    for (const { time } of timeMarkers) {
      const x = this.timeToX(time, viewport, chartWidth);
      ctx.beginPath();
      ctx.moveTo(x, pane.top);
      ctx.lineTo(x, pane.bottom);
      ctx.stroke();
    }
  }

  /**
   * Render Y-axis labels for a pane
   */
  private renderPaneYAxis(pane: ComputedPane, priceLineBounds?: PriceLineLabelBounds[]): void {
    const { ctx, options, margins } = this;

    const gridLines = this.generatePaneGridLines(pane.yMin, pane.yMax, pane.height);

    // Calculate decimals based on range
    const range = pane.yMax - pane.yMin;
    let decimals: number;
    if (pane.type === 'main' && options.pricePrecision && options.pricePrecision > 0) {
      decimals = getDecimalPlacesFromPrecision(options.pricePrecision);
    } else {
      decimals = range >= 10 ? 0 : range >= 1 ? 1 : range >= 0.01 ? 2 : 3;
    }
    const formatter = getNumberFormatter(decimals);

    ctx.fillStyle = options.textColor;
    ctx.font = `11px ${this.font}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const labelRightEdge = options.width - 4;
    // For main pane, labels should stay below the transparent top bar (safe zone)
    const visibleTop = pane.type === 'main' ? margins.top : pane.top;

    for (const value of gridLines) {
      const y = this.valueToY(value, pane);

      // Skip if outside visible bounds (respecting top bar safe zone for main pane)
      if (y < visibleTop || y > pane.bottom) continue;

      // Skip if would overlap with price line labels (main pane only)
      if (priceLineBounds) {
        const wouldOverlap = priceLineBounds.some((bound) => {
          const labelTop = bound.adjustedY - bound.height / 2;
          const labelBottom = bound.adjustedY + bound.height / 2;
          return y >= labelTop - 8 && y <= labelBottom + 8;
        });
        if (wouldOverlap) continue;
      }

      ctx.fillText(formatter.format(value), labelRightEdge, y);
    }
  }

  /**
   * Draw candles within a specific pane
   */
  private resolveBarColorOverride(plots: PlotOutput[] | undefined, barIndex: number): string | null {
    if (!plots) return null;

    let override: string | null = null;
    for (const plot of plots) {
      if (plot.type !== 'barcolor' || !Array.isArray(plot.color)) continue;
      const color = plot.color[barIndex];
      if (color) {
        override = color;
      }
    }
    return override;
  }

  private drawCandlesInPane(bars: Bar[], viewport: Viewport, pane: ComputedPane, plots?: PlotOutput[]): void {
    const { ctx, options, margins } = this;
    // Use extended width that goes under the price axis for transparency effect
    const chartWidth = options.width - margins.left;

    // Calculate candle width
    const viewportTimeRange = viewport.endTime - viewport.startTime;
    let barInterval = viewportTimeRange / bars.length;
    if (bars.length >= 2) {
      barInterval = bars[1].time - bars[0].time;
    }

    const pixelsPerMs = chartWidth / viewportTimeRange;
    const slotWidth = barInterval * pixelsPerMs;
    const spacingRatio = 0.2;
    const candleWidth = Math.max(options.minCandleWidth, slotWidth * (1 - spacingRatio));

    for (const [barIndex, bar] of bars.entries()) {
      if (bar.time < viewport.startTime || bar.time > viewport.endTime) continue;

      const x = this.timeToX(bar.time, viewport, chartWidth);
      const isUp = bar.close >= bar.open;
      const color = this.resolveBarColorOverride(plots, barIndex) ?? (isUp ? options.upColor : options.downColor);

      // Wick
      const highY = this.valueToY(bar.high, pane);
      const lowY = this.valueToY(bar.low, pane);

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const openY = this.valueToY(bar.open, pane);
      const closeY = this.valueToY(bar.close, pane);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));

      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    }
  }

  /**
   * Draw volume overlay within the main pane (bottom portion)
   */
  private drawVolumeInPane(bars: Bar[], viewport: Viewport, pane: ComputedPane): void {
    const { ctx, options, margins } = this;
    // Use extended width that goes under the price axis for transparency effect
    const chartWidth = options.width - margins.left;

    // Volume uses bottom 15% of main pane
    const volumeRatio = 0.15;
    const volumeHeight = pane.height * volumeRatio;
    const volumeTop = pane.bottom - volumeHeight;

    const maxVolume = Math.max(...bars.map((b) => b.volume));
    if (maxVolume === 0) return;

    // Calculate bar width
    const viewportTimeRange = viewport.endTime - viewport.startTime;
    let barInterval = viewportTimeRange / bars.length;
    if (bars.length >= 2) {
      barInterval = bars[1].time - bars[0].time;
    }

    const pixelsPerMs = chartWidth / viewportTimeRange;
    const slotWidth = barInterval * pixelsPerMs;
    const spacingRatio = 0.2;
    const barWidth = Math.max(options.minCandleWidth, slotWidth * (1 - spacingRatio));

    for (const bar of bars) {
      if (bar.time < viewport.startTime || bar.time > viewport.endTime) continue;

      const x = this.timeToX(bar.time, viewport, chartWidth);
      const isUp = bar.close >= bar.open;
      const color = isUp ? options.upColor : options.downColor;
      const barHeight = (bar.volume / maxVolume) * volumeHeight * 0.8;

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x - barWidth / 2, pane.bottom - barHeight, barWidth, barHeight);
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Convert LineStyle to canvas setLineDash pattern
   */
  private lineStyleToDashPattern(lineStyle: LineStyle): number[] {
    switch (lineStyle) {
      case 'dashed':
        return [6, 4];
      case 'dotted':
        return [2, 3];
      case 'solid':
      default:
        return [];
    }
  }

  /**
   * Render a single plot within a pane (used for both main and indicator panes)
   */
  private renderPlotInPane(
    plot: PlotOutput,
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
    plotStyleOverrides?: Map<string, PlotStyleOverride>,
  ): void {
    const { ctx, options, margins } = this;
    // Use extended width that goes under the price axis for transparency effect
    const chartWidth = options.width - margins.left;

    const { values, color, linewidth = 1, style = 'line' } = plot;

    if (plot.type === 'plotbar' || plot.type === 'plotcandle') {
      this.renderOhlcPlot(plot, bars, viewport, chartWidth, (value) => this.valueToY(value, pane));
      return;
    }

    // Handle histogram style
    if (style === 'histogram' || style === 'columns') {
      this.renderHistogramInPaneUnified(plot, bars, viewport, pane, plotStyleOverrides);
      return;
    }

    // Get base color from plot
    const plotBaseColor = Array.isArray(color) ? color[0] || '#2196F3' : color || '#2196F3';

    // Check for style overrides
    const override = plotStyleOverrides?.get(plot.id);
    const effectiveColor = override?.color ?? plotBaseColor;
    const effectiveLinewidth = override?.linewidth ?? linewidth;
    const effectiveLineStyle = override?.lineStyle ?? 'solid';
    const effectiveOpacity = override?.opacity ?? 100;

    // Apply opacity to color if needed
    let renderColor = effectiveColor;
    if (effectiveOpacity < 100) {
      const alphaHex = Math.round(effectiveOpacity * 2.55)
        .toString(16)
        .padStart(2, '0');
      // Handle colors with existing alpha (8 chars) or without (6 chars after #)
      if (renderColor.length === 9) {
        renderColor = renderColor.slice(0, 7) + alphaHex;
      } else if (renderColor.length === 7) {
        renderColor = renderColor + alphaHex;
      }
    }

    ctx.strokeStyle = renderColor;
    ctx.lineWidth = effectiveLinewidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(this.lineStyleToDashPattern(effectiveLineStyle));

    const isStepLine = style === 'stepline' || style === 'stepline_diamond';

    ctx.beginPath();
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    for (let i = 0; i < bars.length && i < values.length; i++) {
      const bar = bars[i];
      const value = values[i];

      if (bar.time < viewport.startTime || bar.time > viewport.endTime) continue;

      if (value === null || value === undefined || isNaN(value)) {
        if (isDrawing) {
          ctx.stroke();
          ctx.beginPath();
          isDrawing = false;
        }
        continue;
      }

      const x = this.timeToX(bar.time, viewport, chartWidth);
      const y = this.valueToY(value, pane);

      // Handle per-bar colors (only if no override is set)
      if (!override?.color && Array.isArray(color) && color[i]) {
        if (isDrawing) {
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(lastX, lastY);
        }
        let perBarColor = color[i] || plotBaseColor;
        if (effectiveOpacity < 100) {
          const alphaHex = Math.round(effectiveOpacity * 2.55)
            .toString(16)
            .padStart(2, '0');
          if (perBarColor.length === 9) {
            perBarColor = perBarColor.slice(0, 7) + alphaHex;
          } else if (perBarColor.length === 7) {
            perBarColor = perBarColor + alphaHex;
          }
        }
        ctx.strokeStyle = perBarColor;
      }

      if (!isDrawing) {
        ctx.moveTo(x, y);
        isDrawing = true;
      } else {
        if (isStepLine) {
          ctx.lineTo(x, lastY);
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      lastX = x;
      lastY = y;
    }

    if (isDrawing) {
      ctx.stroke();
    }

    // Reset line dash
    ctx.setLineDash([]);
  }

  /**
   * Render histogram in a pane (unified version)
   */
  private renderHistogramInPaneUnified(
    plot: PlotOutput,
    bars: Bar[],
    viewport: Viewport,
    pane: ComputedPane,
    plotStyleOverrides?: Map<string, PlotStyleOverride>,
  ): void {
    const { ctx, options, margins } = this;
    // Use extended width that goes under the price axis for transparency effect
    const chartWidth = options.width - margins.left;

    const { values, color, linewidth = 1 } = plot;
    const plotBaseColor = Array.isArray(color) ? color[0] || '#2196F3' : color || '#2196F3';

    // Check for style overrides
    const override = plotStyleOverrides?.get(plot.id);
    const effectiveColor = override?.color ?? plotBaseColor;
    const effectiveOpacity = override?.opacity ?? 100;

    // Calculate bar width
    const viewportTimeRange = viewport.endTime - viewport.startTime;
    let barInterval = viewportTimeRange / bars.length;
    if (bars.length >= 2) {
      barInterval = bars[1].time - bars[0].time;
    }

    const pixelsPerMs = chartWidth / viewportTimeRange;
    const slotWidth = barInterval * pixelsPerMs;
    const barWidth = Math.max(1, slotWidth * 0.6);

    const zeroY = this.valueToY(0, pane);

    for (let i = 0; i < bars.length && i < values.length; i++) {
      const bar = bars[i];
      const value = values[i];

      if (bar.time < viewport.startTime || bar.time > viewport.endTime) continue;
      if (value === null || value === undefined || isNaN(value)) continue;

      const x = this.timeToX(bar.time, viewport, chartWidth);
      const y = this.valueToY(value, pane);

      // Get color - prefer override, then per-bar color, then base color
      let barColor: string;
      if (override?.color) {
        barColor = override.color;
      } else if (Array.isArray(color) && color[i]) {
        barColor = color[i] || plotBaseColor;
      } else {
        barColor = effectiveColor;
      }

      // Apply opacity if needed
      if (effectiveOpacity < 100) {
        const alphaHex = Math.round(effectiveOpacity * 2.55)
          .toString(16)
          .padStart(2, '0');
        if (barColor.length === 9) {
          barColor = barColor.slice(0, 7) + alphaHex;
        } else if (barColor.length === 7) {
          barColor = barColor + alphaHex;
        }
      }

      ctx.fillStyle = barColor;
      if (value >= 0) {
        ctx.fillRect(x - barWidth / 2, y, barWidth, zeroY - y);
      } else {
        ctx.fillRect(x - barWidth / 2, zeroY, barWidth, y - zeroY);
      }
    }
  }

  /**
   * Calculate price line label bounds for a specific pane
   */
  private calculatePriceLineLabelBoundsForPane(
    priceLines: PriceLine[],
    viewport: Viewport,
    pane: ComputedPane,
  ): PriceLineLabelBounds[] {
    const { ctx, options, margins } = this;

    // Calculate initial bounds for each label
    const labelFont = `11px ${this.font}`;
    const bounds: PriceLineLabelBounds[] = priceLines.map((line) => {
      const originalY = this.valueToY(line.price, pane);
      const primaryWidth = getCachedTextWidth(ctx, line.label.primaryText, labelFont);
      // Check for secondary text or countdown (countdown renders as secondary text)
      const hasSecondaryText = line.label.secondaryText || line.countdownToTime;
      const secondaryWidth = line.label.secondaryText
        ? getCachedTextWidth(ctx, line.label.secondaryText, labelFont)
        : line.countdownToTime
          ? 40
          : 0;
      const width = Math.max(primaryWidth, secondaryWidth) + 12;
      // Height includes text + padding + border + extra margin for collision
      // Must match or exceed actual rendered height to prevent visual overlap
      const baseHeight = line.type === 'price' || !line.type ? 20 : 18;
      const height = hasSecondaryText ? baseHeight + 6 : baseHeight;

      return {
        lineId: line.id,
        price: line.price,
        originalY,
        adjustedY: originalY,
        width,
        height,
        color: line.color,
        label: line.label,
        lineStyle: line.lineStyle,
        type: line.type,
        chartLabel: line.chartLabel,
        lineLength: line.lineLength,
        extendLeft: line.extendLeft,
        lineWidth: line.lineWidth,
        floatingLabel: line.floatingLabel,
        priority: line.priority,
        renderLineOnCanvas: line.renderLineOnCanvas,
        countdownToTime: line.countdownToTime,
        draggable: line.draggable,
        // Position-specific fields for bracket TP/SL drag
        positionId: line.positionId,
        partialEnabled: line.partialEnabled,
        positionData: line.positionData,
        brackets: line.brackets,
      };
    });

    // Separate floating labels (they don't participate in collision detection)
    const floatingBounds = bounds.filter((b) => b.floatingLabel);
    const staticBounds = bounds.filter((b) => !b.floatingLabel);

    // Resolve collisions using cluster-based stacking (gap-free by construction)
    resolveLabelCollisions(staticBounds);

    // Sort by Y for rendering order
    staticBounds.sort((a, b) => a.adjustedY - b.adjustedY);

    const allBounds = [...staticBounds, ...floatingBounds];

    // Clamp adjustedY to keep labels within visible bounds
    // For main pane (top=0), labels should stay below the transparent top bar (margins.top)
    const visibleTop = pane.type === 'main' ? margins.top : pane.top;
    for (const bound of allBounds) {
      const labelTop = bound.adjustedY - bound.height / 2;
      const labelBottom = bound.adjustedY + bound.height / 2;

      // Clamp to stay within visible area (respecting top bar safe zone)
      if (labelTop < visibleTop) {
        bound.adjustedY = visibleTop + bound.height / 2;
      }
      if (labelBottom > pane.bottom) {
        bound.adjustedY = pane.bottom - bound.height / 2;
      }
    }

    // Filter to visible area (labels with original Y in top bar should still render, just clamped)
    return allBounds.filter((b) => b.originalY >= pane.top && b.originalY <= pane.bottom);
  }

  /**
   * Draw price lines within a specific pane
   */
  private drawPriceLinesInPane(bounds: PriceLineLabelBounds[], viewport: Viewport, pane: ComputedPane): void {
    for (const bound of bounds) {
      const lineType = bound.type || 'price';

      if (lineType === 'price') {
        this.drawSimplePriceLineInPane(bound, viewport, pane);
      } else if (lineType === 'order' || lineType === 'position') {
        // Order/position labels and controls are handled by PriceLineManager via Konva.
        // ChartCore filters these bounds out of the main canvas render path, so this is
        // effectively a fallback if order/position bounds are ever passed through again.
        this.drawTradingLineOnCanvas(bound, viewport, pane);
      } else {
        this.drawTradingLineInPane(bound, viewport, pane);
      }
    }
  }

  /**
   * Draw a simple price line within a pane
   */
  private drawSimplePriceLineInPane(bound: PriceLineLabelBounds, viewport: Viewport, pane: ComputedPane): void {
    const { ctx, options, margins } = this;

    const lineY = Math.max(pane.top, Math.min(pane.bottom, this.valueToY(bound.price, pane)));
    const color = bound.color;
    const labelCenterY = Math.max(pane.top, Math.min(pane.bottom, bound.adjustedY));

    // Label box position with padding from right edge (matches Konva PriceLineLayer)
    const labelX = options.width - bound.width - PRICE_AXIS_RIGHT_PADDING;
    const labelY = labelCenterY - bound.height / 2;

    // Draw horizontal line - stop before label with gap
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = bound.lineWidth || 1;
    if (bound.lineStyle === 'dashed') ctx.setLineDash([4, 4]);
    else if (bound.lineStyle === 'dotted') ctx.setLineDash([2, 2]);

    ctx.beginPath();
    ctx.moveTo(margins.left, lineY);
    ctx.lineTo(labelX - PRICE_AXIS_RIGHT_PADDING, lineY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // For lines with renderLineOnCanvas, skip connector and label
    // (Konva handles these for collision resolution with order/position labels)
    if (bound.renderLineOnCanvas) {
      return;
    }

    // Connector
    if (Math.abs(labelCenterY - lineY) > 2) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(labelX, lineY);
      ctx.lineTo(labelX, labelCenterY);
      ctx.stroke();
      ctx.restore();
    }

    // Label border
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, bound.width, bound.height, 2);
    ctx.stroke();

    // Label text
    ctx.fillStyle = bound.label.textColor || color;
    ctx.font = `11px ${this.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const secondaryText = bound.countdownToTime ? formatCountdown(bound.countdownToTime) : bound.label.secondaryText;

    if (secondaryText) {
      ctx.fillText(bound.label.primaryText, labelX + bound.width / 2, labelY + 7);
      ctx.fillText(secondaryText, labelX + bound.width / 2, labelY + 19);
    } else {
      ctx.fillText(bound.label.primaryText, labelX + bound.width / 2, labelCenterY);
    }
  }

  /**
   * Draw only the horizontal line for an order/position on canvas.
   * Labels and buttons are rendered by PriceLineManager on the Konva overlay.
   */
  private drawTradingLineOnCanvas(bound: PriceLineLabelBounds, _viewport: Viewport, pane: ComputedPane): void {
    const { ctx, options, margins } = this;

    const lineY = Math.max(pane.top, Math.min(pane.bottom, this.valueToY(bound.price, pane)));
    const color = bound.color;
    const lineWidth = bound.lineWidth || 1;
    const priceAxisLabelX = options.width - bound.width - PRICE_AXIS_RIGHT_PADDING;

    // Draw one continuous line as a fallback path.
    // In the current pipeline, interactive order/position lines are rendered by
    // PriceLineManager on the Konva overlay and are filtered out before canvas render.
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    if (bound.lineStyle === 'dashed') ctx.setLineDash([4, 4]);
    else if (bound.lineStyle === 'dotted') ctx.setLineDash([2, 2]);

    ctx.beginPath();
    ctx.moveTo(margins.left, lineY);
    ctx.lineTo(priceAxisLabelX - PRICE_AXIS_RIGHT_PADDING, lineY);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.restore();
  }

  /**
   * Draw trading line (order/position/liquidation) within a pane
   */
  private drawTradingLineInPane(bound: PriceLineLabelBounds, viewport: Viewport, pane: ComputedPane): void {
    const { ctx, options, margins } = this;

    const lineY = Math.max(pane.top, Math.min(pane.bottom, this.valueToY(bound.price, pane)));
    const color = bound.color;
    const lineWidth = bound.lineWidth || 1;
    const lineLength = bound.lineLength ?? 100;
    const extendLeft = bound.extendLeft ?? true;
    const labelCenterY = bound.adjustedY;

    // Calculate chart label dimensions
    const chartLabel = bound.chartLabel;
    let chartLabelWidth = 0;
    let chartLabelX = margins.left;
    const labelHeight = 18;

    if (chartLabel && chartLabel.segments.length > 0) {
      ctx.font = `11px ${this.font}`;
      for (const segment of chartLabel.segments) {
        const text = segment.textShort || segment.text;
        chartLabelWidth += ctx.measureText(text).width + 8; // padding only, no gap
      }
      for (const button of chartLabel.buttons || []) {
        chartLabelWidth += 16; // button width, no gap
      }

      // lineLength=100 means line extends full width, label at LEFT edge
      // lineLength=0 means no line extension, label at RIGHT edge (near price axis)
      const maxLabelX = options.width - margins.right - chartLabelWidth;
      const minLabelX = margins.left;
      chartLabelX = minLabelX + ((maxLabelX - minLabelX) * (100 - lineLength)) / 100;
    }

    // Draw line segments
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    if (bound.lineStyle === 'dashed') ctx.setLineDash([4, 4]);
    else if (bound.lineStyle === 'dotted') ctx.setLineDash([2, 2]);

    if (chartLabel && chartLabel.segments.length > 0) {
      const lineEndX = chartLabelX - 4;
      if (extendLeft) {
        ctx.beginPath();
        ctx.moveTo(margins.left, lineY);
        ctx.lineTo(lineEndX, lineY);
        ctx.stroke();
      }
    } else {
      const priceAxisLabelX = options.width - bound.width;
      ctx.beginPath();
      ctx.moveTo(margins.left, lineY);
      ctx.lineTo(priceAxisLabelX, lineY);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // Draw chart label if present
    if (chartLabel && chartLabel.segments.length > 0) {
      const chartLabelY = lineY - labelHeight / 2;
      let currentX = chartLabelX;

      // Calculate total item count for corner rounding
      const segmentCount = chartLabel.segments.length;
      const buttonCount = (chartLabel.buttons || []).length;

      // Draw segments with appropriate corner rounding
      chartLabel.segments.forEach((segment, index) => {
        const text = segment.textShort || segment.text;
        const textWidth = ctx.measureText(text).width + 8;
        const isFirst = index === 0;
        const isLast = index === segmentCount - 1 && buttonCount === 0;
        const corners = isFirst && isLast ? 'all' : isFirst ? 'left' : isLast ? 'right' : 'none';
        this.drawLabelBox(
          currentX,
          chartLabelY,
          textWidth,
          labelHeight,
          segment.backgroundColor,
          segment.borderColor,
          text,
          segment.textColor,
          corners,
        );
        currentX += textWidth; // No gap between segments
      });

      // Draw buttons with appropriate corner rounding (no gaps)
      const buttons = chartLabel.buttons || [];
      buttons.forEach((button, index) => {
        const isLastItem = index === buttonCount - 1;
        const corners: 'left' | 'right' | 'none' = isLastItem ? 'right' : 'none';
        if (button.type === 'cancel' || button.type === 'close') {
          this.drawCancelButton(
            currentX,
            chartLabelY,
            16,
            labelHeight,
            button.backgroundColor,
            button.borderColor,
            button.iconColor,
            corners,
          );
        } else if (button.type === 'reverse') {
          this.drawIconButton(
            currentX,
            chartLabelY,
            16,
            labelHeight,
            button.backgroundColor,
            button.borderColor,
            button.icon,
            button.iconColor,
            corners,
          );
        }
        currentX += 16; // No gap between buttons
      });

      // Line to price axis label
      const chartLabelRightX = currentX;
      const priceAxisLabelX = options.width - bound.width;
      if (chartLabelRightX < priceAxisLabelX) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        if (bound.lineStyle === 'dashed') ctx.setLineDash([4, 4]);
        else if (bound.lineStyle === 'dotted') ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(chartLabelRightX + 4, lineY);
        ctx.lineTo(priceAxisLabelX, lineY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    // Price axis label
    const priceAxisLabelX = options.width - bound.width;
    const priceAxisLabelY = labelCenterY - bound.height / 2;

    // Connector
    if (Math.abs(labelCenterY - lineY) > 2) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(priceAxisLabelX, lineY);
      ctx.lineTo(priceAxisLabelX, labelCenterY);
      ctx.stroke();
      ctx.restore();
    }

    // Filled label
    const bgColor = bound.label.backgroundColor || color;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(priceAxisLabelX, priceAxisLabelY, bound.width, bound.height, 2);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(priceAxisLabelX, priceAxisLabelY, bound.width, bound.height, 2);
    ctx.stroke();

    ctx.fillStyle = bound.label.textColor || '#ffffff';
    ctx.font = `11px ${this.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (bound.label.secondaryText) {
      ctx.fillText(bound.label.primaryText, priceAxisLabelX + bound.width / 2, priceAxisLabelY + 7);
      ctx.fillText(bound.label.secondaryText, priceAxisLabelX + bound.width / 2, priceAxisLabelY + 19);
    } else {
      ctx.fillText(bound.label.primaryText, priceAxisLabelX + bound.width / 2, labelCenterY);
    }
  }

  // =========================================================================
  // Multi-Pane Rendering (for non-overlay indicators like RSI, MACD)
  // =========================================================================

  /**
   * Render an indicator pane (background, Y-axis, separator)
   */
  renderIndicatorPane(pane: IndicatorPane, paneOffset: PaneOffset, _viewport: Viewport): void {
    const { ctx, options, margins } = this;

    // Note: Do NOT call ctx.scale() here - parent renderPlots() already did
    ctx.save();

    // Draw pane background (same as main chart for consistency)
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, paneOffset.top, options.width, paneOffset.height);

    // Draw pane separator line at top
    ctx.strokeStyle = options.gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, paneOffset.top);
    ctx.lineTo(options.width, paneOffset.top);
    ctx.stroke();

    // Draw horizontal grid lines in the pane
    const gridLines = this.generatePaneGridLines(paneOffset.yMin, paneOffset.yMax, paneOffset.height);
    ctx.strokeStyle = options.gridColor;
    ctx.lineWidth = 1;

    for (const value of gridLines) {
      const y = this.valueToPaneY(value, paneOffset);
      ctx.beginPath();
      ctx.moveTo(margins.left, y);
      ctx.lineTo(options.width, y);
      ctx.stroke();
    }

    // Draw Y-axis labels for this pane
    ctx.fillStyle = options.textColor;
    ctx.font = `10px ${this.font}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const decimals = paneOffset.yMax - paneOffset.yMin >= 10 ? 0 : paneOffset.yMax - paneOffset.yMin >= 1 ? 1 : 2;
    const formatter = getNumberFormatter(decimals);

    for (const value of gridLines) {
      const y = this.valueToPaneY(value, paneOffset);
      // Only draw if within pane bounds
      if (y >= paneOffset.top && y <= paneOffset.top + paneOffset.height) {
        ctx.fillText(formatter.format(value), options.width - 4, y);
      }
    }

    ctx.restore();
  }

  /**
   * Render plots into a specific indicator pane
   */
  renderPlotsInPane(plots: PlotOutput[], bars: Bar[], viewport: Viewport, paneOffset: PaneOffset): void {
    if (plots.length === 0 || bars.length === 0) return;

    const { ctx, options, margins } = this;

    // Note: Do NOT call ctx.scale() here - parent renderPlots() already did
    ctx.save();

    // Clip to pane bounds
    ctx.beginPath();
    ctx.rect(margins.left, paneOffset.top, options.width - margins.left, paneOffset.height);
    ctx.clip();

    for (const plot of plots) {
      switch (plot.type) {
        case 'plot':
          this.renderLinePlotInPane(plot, bars, viewport, paneOffset);
          break;
        case 'plotbar':
        case 'plotcandle':
          this.renderOhlcPlot(plot, bars, viewport, options.width - margins.left, (value) =>
            this.valueToPaneY(value, paneOffset),
          );
          break;
        case 'hline':
          this.renderHlineInPane(plot, paneOffset);
          break;
        // bgcolor and plotshape could be added later for pane support
      }
    }

    ctx.restore();
  }

  /**
   * Render a line plot in a specific pane
   */
  private renderLinePlotInPane(plot: PlotOutput, bars: Bar[], viewport: Viewport, paneOffset: PaneOffset): void {
    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;

    const { values, color, linewidth = 1, style = 'line' } = plot;

    // Handle histogram style
    if (style === 'histogram' || style === 'columns') {
      this.renderHistogramInPane(plot, bars, viewport, paneOffset);
      return;
    }

    const baseColor = Array.isArray(color) ? color[0] || '#2196F3' : color || '#2196F3';

    ctx.strokeStyle = baseColor;
    ctx.lineWidth = linewidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const isStepLine = style === 'stepline' || style === 'stepline_diamond';

    ctx.beginPath();
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    for (let i = 0; i < bars.length && i < values.length; i++) {
      const bar = bars[i];
      const value = values[i];

      if (bar.time < viewport.startTime || bar.time > viewport.endTime) {
        continue;
      }

      if (value === null || value === undefined || isNaN(value)) {
        if (isDrawing) {
          ctx.stroke();
          ctx.beginPath();
          isDrawing = false;
        }
        continue;
      }

      const x = this.timeToX(bar.time, viewport, chartWidth);
      const y = this.valueToPaneY(value, paneOffset);

      if (Array.isArray(color) && color[i]) {
        if (isDrawing) {
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(lastX, lastY);
        }
        ctx.strokeStyle = color[i] || baseColor;
      }

      if (!isDrawing) {
        ctx.moveTo(x, y);
        isDrawing = true;
      } else {
        if (isStepLine) {
          ctx.lineTo(x, lastY);
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      lastX = x;
      lastY = y;
    }

    if (isDrawing) {
      ctx.stroke();
    }
  }

  /**
   * Render histogram in a specific pane
   */
  private renderHistogramInPane(plot: PlotOutput, bars: Bar[], viewport: Viewport, paneOffset: PaneOffset): void {
    const { ctx, options, margins } = this;
    const chartWidth = options.width - margins.left;

    const { values, color } = plot;
    const baseColor = Array.isArray(color) ? color[0] || '#2196F3' : color || '#2196F3';

    // Calculate bar width
    const viewportTimeRange = viewport.endTime - viewport.startTime;
    let barInterval = viewportTimeRange / Math.max(bars.length, 1);
    if (bars.length >= 2) {
      barInterval = bars[1].time - bars[0].time;
    }
    const pixelsPerMs = chartWidth / viewportTimeRange;
    const slotWidth = barInterval * pixelsPerMs;
    const barWidth = Math.max(2, slotWidth * 0.6);

    // Zero line Y coordinate in pane
    const zeroY = this.valueToPaneY(0, paneOffset);

    for (let i = 0; i < bars.length && i < values.length; i++) {
      const bar = bars[i];
      const value = values[i];

      if (bar.time < viewport.startTime || bar.time > viewport.endTime) {
        continue;
      }

      if (value === null || value === undefined || isNaN(value)) {
        continue;
      }

      const x = this.timeToX(bar.time, viewport, chartWidth);
      const y = this.valueToPaneY(value, paneOffset);

      const barColor = Array.isArray(color) && color[i] ? color[i] : baseColor;
      ctx.fillStyle = barColor as string;

      const barTop = Math.min(y, zeroY);
      const barHeight = Math.abs(y - zeroY);
      ctx.fillRect(x - barWidth / 2, barTop, barWidth, Math.max(1, barHeight));
    }
  }

  /**
   * Render hline in a specific pane
   */
  private renderHlineInPane(plot: PlotOutput, paneOffset: PaneOffset): void {
    const { ctx, options, margins } = this;

    const price = plot.price;
    if (price === undefined) return;

    // Skip if outside pane range
    if (price < paneOffset.yMin || price > paneOffset.yMax) {
      return;
    }

    const y = this.valueToPaneY(price, paneOffset);
    const color = Array.isArray(plot.color) ? plot.color[0] || '#787B86' : plot.color || '#787B86';

    ctx.strokeStyle = color;
    ctx.lineWidth = plot.linewidth || 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(margins.left, y);
    ctx.lineTo(options.width - margins.right, y);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  /**
   * Convert a value to Y coordinate within a pane
   */
  private valueToPaneY(value: number, paneOffset: PaneOffset): number {
    const range = paneOffset.yMax - paneOffset.yMin;
    if (range === 0) return paneOffset.top + paneOffset.height / 2;

    const ratio = (paneOffset.yMax - value) / range;
    return paneOffset.top + ratio * paneOffset.height;
  }

  /**
   * Generate nice grid line values for a pane
   */
  private generatePaneGridLines(yMin: number, yMax: number, height: number): number[] {
    const range = yMax - yMin;
    if (range <= 0) return [];

    const targetLines = Math.max(2, Math.floor(height / 30)); // ~30px per grid line

    // Find nice step
    const roughStep = range / targetLines;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalized = roughStep / magnitude;

    let niceStep: number;
    if (normalized <= 1) niceStep = 1 * magnitude;
    else if (normalized <= 2) niceStep = 2 * magnitude;
    else if (normalized <= 5) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;

    const lines: number[] = [];
    const firstLine = Math.ceil(yMin / niceStep) * niceStep;

    for (let value = firstLine; value <= yMax; value += niceStep) {
      lines.push(value);
    }

    return lines;
  }

  /**
   * Calculate Y-axis range for indicator values (auto-scale)
   */
  static calculateIndicatorRange(values: (number | null)[], padding = 0.1): { min: number; max: number } {
    const validValues = values.filter((v): v is number => v !== null && !isNaN(v));
    if (validValues.length === 0) {
      return { min: 0, max: 100 };
    }

    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const range = max - min;
    const pad = range * padding;

    return {
      min: min - pad,
      max: max + pad,
    };
  }

  /**
   * Default number of visible bars for consistent candle width across timeframes
   * This ensures switching between 1m, 5m, 1h, etc. shows similar candle widths
   */
  static readonly DEFAULT_VISIBLE_BARS = 100;

  /**
   * Calculate viewport from bars (auto-fit)
   * Shows a fixed number of recent bars for consistent candle width across timeframes
   * Plus right padding (space after last candle for live price movement)
   */
  static calculateViewport(bars: Bar[], padding = 0.05): Viewport {
    if (bars.length === 0) {
      const now = Date.now();
      return {
        startTime: now - 3600000,
        endTime: now,
        priceMin: 0,
        priceMax: 100,
      };
    }

    // Show a fixed number of bars for consistent candle width across all timeframes
    const visibleBarCount = Math.min(bars.length, TealchartRenderer.DEFAULT_VISIBLE_BARS);
    const visibleBars = bars.slice(-visibleBarCount);

    const times = visibleBars.map((b) => b.time);
    const prices = visibleBars.flatMap((b) => [b.high, b.low]);

    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const priceRange = maxPrice - minPrice;
    const pricePadding = priceRange * padding;

    // Calculate a "nice" grid spacing for this price range
    const magnitude = Math.floor(Math.log10(priceRange));
    const niceSpacings = [1, 2, 5, 10, 20, 50, 100, 200, 500].map((n) => n * Math.pow(10, magnitude - 2));
    const targetGridLines = 6;
    let gridSpacing =
      niceSpacings.find((s) => priceRange / s <= targetGridLines) || niceSpacings[niceSpacings.length - 1];

    // Snap priceMin/priceMax to grid values for clean edge labels
    const rawPriceMin = minPrice - pricePadding;
    const rawPriceMax = maxPrice + pricePadding;
    const snappedPriceMin = Math.floor(rawPriceMin / gridSpacing) * gridSpacing;
    const snappedPriceMax = Math.ceil(rawPriceMax / gridSpacing) * gridSpacing;

    // Calculate time range for visible bars
    const timeRange = maxTime - minTime;

    // Add right padding: 15% of visible range as empty space after last candle
    const rightPadding = timeRange * 0.15;

    // No left margin on initial load - start exactly at first visible bar
    // User can pan left to see more historical data
    return {
      startTime: minTime,
      endTime: maxTime + rightPadding,
      priceMin: snappedPriceMin,
      priceMax: snappedPriceMax,
    };
  }
}
