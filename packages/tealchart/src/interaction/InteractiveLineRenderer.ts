/**
 * InteractiveLineRenderer - Web HTML overlay renderer for order/position line labels
 *
 * Creates/updates/removes positioned HTML divs for interactive labels.
 * Uses DomManager for lifecycle management and setPointerCapture for drag.
 */

import type { ChartLabelButton, ChartMargins, PendingOrderUpdate, PriceLineLabelBounds } from '../types';

import { PRICE_AXIS_RIGHT_PADDING } from '../types';
import { DomManager } from '../ui/DomManager';
import { InteractiveLineState } from './InteractiveLineState';

import './InteractiveLineRenderer.css';

// ============================================================================
// Types
// ============================================================================

export interface InteractiveLineRendererOptions {
  /** Chart margins */
  margins: ChartMargins;
  /** Convert Y coordinate to price */
  yToPrice: (y: number) => number;
  /** Convert price to Y coordinate */
  priceToY: (price: number) => number;
  /** Chart width */
  width: number;
  /** Chart height */
  height: number;

  // Callbacks
  onOrderMove?: (orderId: string, newPrice: number) => void;
  onOrderCancel?: (orderId: string) => void;
  onPositionClose?: (positionId: string) => void;
  onPositionReverse?: (positionId: string) => void;
  onTPDragEnd?: (positionId: string, price: number, partialPercent?: number) => void;
  onSLDragEnd?: (positionId: string, price: number, partialPercent?: number) => void;
  onTPMove?: (
    positionId: string,
    price: number,
    partialPercent: number,
    dragStartX: number,
    dragCurrentX: number,
  ) => void;
  onSLMove?: (
    positionId: string,
    price: number,
    partialPercent: number,
    dragStartX: number,
    dragCurrentX: number,
  ) => void;
  onTPSLDragCancel?: () => void;
  onTPClick?: (positionId: string) => void;
  onSLClick?: (positionId: string) => void;
  onCursorChange?: (cursor: 'default' | 'pointer' | 'grab' | 'grabbing') => void;
  /** Format price for display (uses chart's precision settings) */
  formatPrice?: (price: number) => string;
}

interface CrosshairLabelData {
  x: number;
  y: number;
  visible: boolean;
  color: string;
}

// ============================================================================
// Constants
// ============================================================================

const LABEL_HEIGHT = 18;
const DRAG_THRESHOLD = 5; // Pixels movement to distinguish drag from tap
const TP_SL_GAP = 6; // Gap before TP/SL buttons

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a countdown to a target timestamp.
 */
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

/**
 * Calculate magnet percentage for partial TP/SL
 */
function calculatePartialPercent(startX: number, currentX: number): number {
  const deltaX = Math.abs(currentX - startX);
  if (deltaX <= 27) return 100;
  if (deltaX <= 82) return 75;
  if (deltaX <= 137) return 50;
  if (deltaX <= 192) return 25;
  return 10;
}

// ============================================================================
// InteractiveLineRenderer
// ============================================================================

export class InteractiveLineRenderer {
  private container: HTMLElement;
  private lineContainer: HTMLDivElement;
  private options: InteractiveLineRendererOptions;
  private state: InteractiveLineState;
  private dom: DomManager;

  // Cached element references by lineId for efficient updates
  private labelElements = new Map<string, HTMLDivElement>();
  private priceAxisElements = new Map<string, HTMLDivElement>();
  private connectorElements = new Map<string, HTMLDivElement>();
  private countdownElements = new Map<string, { el: HTMLSpanElement; targetTime: number }[]>();

  // Crosshair elements
  private crosshairVLine: HTMLDivElement | null = null;
  private crosshairLabel: HTMLDivElement | null = null;

  // Countdown timer
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  // Last signature for dirty checking
  private lastSignature = '';
  private lastCrosshairVisible = false;

  // Pending orders
  private pendingOrders = new Map<string, PendingOrderUpdate>();

  // TP/SL drag state (separate from order drag)
  private tpslDrag: {
    lineId: string;
    buttonType: 'tp' | 'sl';
    startY: number;
    startX: number;
    positionId: string;
    partialEnabled: boolean;
  } | null = null;

  constructor(container: HTMLElement, options: InteractiveLineRendererOptions) {
    this.container = container;
    this.options = options;
    this.dom = new DomManager();
    this.state = new InteractiveLineState();

    // Create overlay container
    this.lineContainer = this.dom.div({
      className: 'tc-line-container',
    });
    this.container.appendChild(this.lineContainer);

    // ESC key handler for drag cancel
    this.dom.on(
      document,
      'keydown',
      ((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (this.state.isDragging()) {
            const dragLineId = this.state.getDragLineId();
            this.state.cancelDrag();
            // Clean up drag UI
            if (this.dragLine) {
              this.dragLine.remove();
              this.dragLine = null;
            }
            if (dragLineId) {
              const labelEl = this.labelElements.get(dragLineId);
              labelEl?.classList.remove('tc-dragging');
            }
            this.options.onCursorChange?.('default');
            this.lastSignature = '';
          }
          if (this.tpslDrag) {
            this.tpslDrag = null;
            this.options.onCursorChange?.('default');
            this.options.onTPSLDragCancel?.();
          }
        }
      }) as EventListener,
      { capture: true },
    );
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Full update — create/remove/reposition label divs
   */
  update(
    labelBounds: PriceLineLabelBounds[],
    pendingOrders: Map<string, PendingOrderUpdate> = new Map(),
    crosshair?: CrosshairLabelData,
  ): void {
    this.pendingOrders = pendingOrders;

    const newSignature = this.computeSignature(labelBounds);
    const structureChanged = newSignature !== this.lastSignature;

    // Track crosshair visibility changes (not text — text updates in-place)
    const crosshairBound = labelBounds.find((b) => b.type === 'crosshair');
    const crosshairVisible = !!crosshairBound;
    const crosshairVisibilityChanged = crosshairVisible !== this.lastCrosshairVisible;
    this.lastCrosshairVisible = crosshairVisible;

    // During drag, never rebuild (it would destroy the captured pointer element).
    // Only update positions for non-dragged lines. Hide crosshair during drag.
    if (this.isDragging()) {
      if (this.crosshairLabel) {
        this.crosshairLabel.style.display = 'none';
      }
      this.updatePositions(labelBounds, crosshair);
      return;
    }
    // Restore crosshair visibility after drag ends
    if (this.crosshairLabel) {
      this.crosshairLabel.style.display = '';
    }

    if (structureChanged || crosshairVisibilityChanged) {
      this.lastSignature = newSignature;
      this.rebuild(labelBounds, crosshair);
    } else {
      this.updatePositions(labelBounds, crosshair);
    }
  }

  /**
   * Force a full rebuild on next update (e.g. after pending order cleanup)
   */
  forceRebuild(): void {
    this.lastSignature = '';
  }

  /**
   * Update dimensions
   */
  setDimensions(width: number, height: number, margins: ChartMargins): void {
    this.options.width = width;
    this.options.height = height;
    this.options.margins = margins;
    this.lastSignature = ''; // Force rebuild
  }

  /**
   * Update coordinate conversion functions
   */
  setCoordinateFunctions(yToPrice: (y: number) => number, priceToY: (price: number) => number): void {
    this.options.yToPrice = yToPrice;
    this.options.priceToY = priceToY;
  }

  /**
   * Check if a point is over an interactive element
   */
  isOverInteractiveElement(x: number, y: number): boolean {
    const el = document.elementFromPoint(x, y);
    if (!el) return false;

    // Check if the element or any parent has data-interactive="true"
    let current: Element | null = el;
    while (current && current !== this.lineContainer) {
      if ((current as HTMLElement).dataset?.interactive === 'true') {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  /**
   * Whether a drag is currently active
   */
  isDragging(): boolean {
    return this.state.isDragging() || this.tpslDrag !== null;
  }

  /**
   * Get the InteractiveLineState
   */
  getState(): InteractiveLineState {
    return this.state;
  }

  /**
   * Dispose and clean up
   */
  dispose(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.state.dispose();
    this.dom.dispose();
    this.labelElements.clear();
    this.priceAxisElements.clear();
    this.connectorElements.clear();
    this.countdownElements.clear();
    this.crosshairVLine = null;
    this.crosshairLabel = null;
  }

  // ==========================================================================
  // Private: Signature / dirty checking
  // ==========================================================================

  private computeSignature(bounds: PriceLineLabelBounds[]): string {
    // Structural signature — properties that require DOM element rebuild.
    // Includes bucketed text length so large text changes (e.g., "Creating..." → "Limit [+$1,234]")
    // trigger a rebuild for correct label X positioning. Bucketed to nearest 3 chars
    // to avoid rebuilds on minor text fluctuations.
    return bounds
      .filter((b) => b.type !== 'crosshair')
      .map((b) => {
        const textLen = b.chartLabel?.segments.reduce((sum, s) => sum + (s.text?.length || 0), 0) || 0;
        return `${b.lineId}|${b.type}|${b.color}|${b.lineStyle}|${b.draggable}|${b.chartLabel?.segments.length ?? 0}|${b.chartLabel?.buttons?.length ?? 0}|${Math.round(textLen / 3)}`;
      })
      .sort()
      .join(';');
  }

  // ==========================================================================
  // Private: Full rebuild
  // ==========================================================================

  private rebuild(bounds: PriceLineLabelBounds[], crosshair?: CrosshairLabelData): void {
    // Clear all existing elements
    this.lineContainer.innerHTML = '';
    this.labelElements.clear();
    this.priceAxisElements.clear();
    this.connectorElements.clear();
    this.countdownElements.clear();
    this.crosshairVLine = null;
    this.crosshairLabel = null;

    // Manage countdown timer
    const hasCountdown = bounds.some((b) => b.countdownToTime !== undefined);
    if (hasCountdown && !this.countdownTimer) {
      this.countdownTimer = setInterval(() => this.updateCountdownTexts(), 1000);
    } else if (!hasCountdown && this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    // Separate floating and non-floating
    const nonFloating = bounds.filter((b) => !b.floatingLabel);
    const floating = bounds.filter((b) => b.floatingLabel && (b.type !== 'crosshair' || crosshair?.visible));

    // Render non-floating first
    for (const bound of nonFloating) {
      this.renderBound(bound);
    }

    // Render floating on top
    for (const bound of floating) {
      this.renderBound(bound);
    }

    // Render crosshair vertical line
    this.updateCrosshairVLine(crosshair);
  }

  // ==========================================================================
  // Private: Position-only update (fast path)
  // ==========================================================================

  private updatePositions(bounds: PriceLineLabelBounds[], crosshair?: CrosshairLabelData): void {
    const { priceToY, width } = this.options;
    const dragLineId = this.state.getDragLineId();

    for (const bound of bounds) {
      // Skip the line being dragged — user controls its position via pointer events
      if (dragLineId && bound.lineId === dragLineId) continue;

      const lineType = bound.type || 'price';
      const lineY = lineType === 'crosshair' ? bound.adjustedY : priceToY(bound.price);
      const collisionOffset = bound.adjustedY - bound.originalY;
      const labelCenterY = lineY + collisionOffset;

      // Update chart label position
      const labelEl = this.labelElements.get(bound.lineId);
      if (labelEl) {
        labelEl.style.top = `${lineY - LABEL_HEIGHT / 2}px`;
      }

      // Update price axis label position and text
      const priceAxisEl = this.priceAxisElements.get(bound.lineId);
      if (priceAxisEl) {
        const priceAxisLabelX = width - bound.width - PRICE_AXIS_RIGHT_PADDING;
        const priceAxisLabelY = labelCenterY - bound.height / 2;
        priceAxisEl.style.top = `${priceAxisLabelY}px`;
        priceAxisEl.style.left = `${priceAxisLabelX}px`;
        // Update text content in-place (avoids rebuild on price tick)
        const primarySpan = priceAxisEl.querySelector('span');
        if (primarySpan) {
          if (primarySpan.textContent !== bound.label.primaryText) {
            primarySpan.textContent = bound.label.primaryText;
          }
        } else if (priceAxisEl.textContent !== bound.label.primaryText) {
          priceAxisEl.textContent = bound.label.primaryText;
        }
      }

      // Reconcile chart label segments — text + colors in-place
      if (labelEl && bound.chartLabel?.segments) {
        const useNarrow = this.options.width < 400;
        const segmentEls = labelEl.querySelectorAll('.tc-segment');
        for (let i = 0; i < bound.chartLabel.segments.length && i < segmentEls.length; i++) {
          const seg = bound.chartLabel.segments[i];
          const el = segmentEls[i] as HTMLElement;
          const text = useNarrow && seg.textShort ? seg.textShort : seg.text;
          if (el.textContent !== text) el.textContent = text;
          if (el.style.backgroundColor !== seg.backgroundColor) el.style.backgroundColor = seg.backgroundColor;
          if (el.style.color !== seg.textColor) el.style.color = seg.textColor;
          if (el.style.borderColor !== seg.borderColor) el.style.borderColor = seg.borderColor;
        }
      }

      // Reconcile price axis label colors
      if (priceAxisEl && bound.label) {
        const bgColor = bound.label.backgroundColor || bound.color;
        if (priceAxisEl.style.backgroundColor !== bgColor) priceAxisEl.style.backgroundColor = bgColor;
        if (priceAxisEl.style.borderColor !== bound.color) priceAxisEl.style.borderColor = bound.color;
      }

      // Update connector
      const connectorEl = this.connectorElements.get(bound.lineId);
      if (connectorEl) {
        if (Math.abs(labelCenterY - lineY) > 2) {
          const priceAxisLabelX = width - bound.width - PRICE_AXIS_RIGHT_PADDING;
          const top = Math.min(lineY, labelCenterY);
          const height = Math.abs(labelCenterY - lineY);
          connectorEl.style.top = `${top}px`;
          connectorEl.style.left = `${priceAxisLabelX}px`;
          connectorEl.style.height = `${height}px`;
          connectorEl.style.display = 'block';
        } else {
          connectorEl.style.display = 'none';
        }
      }
    }

    // Update crosshair label text + position in-place (no rebuild)
    const crosshairBound = bounds.find((b) => b.type === 'crosshair');
    if (this.crosshairLabel && crosshairBound) {
      const crosshairY = crosshairBound.adjustedY;
      const labelX = this.options.width - crosshairBound.width;
      const labelY = crosshairY - crosshairBound.height / 2;
      this.crosshairLabel.style.transform = `translate(${labelX}px, ${labelY}px)`;
      const primarySpan = this.crosshairLabel.querySelector('span');
      if (primarySpan && primarySpan.textContent !== crosshairBound.label.primaryText) {
        primarySpan.textContent = crosshairBound.label.primaryText;
      } else if (!primarySpan && this.crosshairLabel.textContent !== crosshairBound.label.primaryText) {
        this.crosshairLabel.textContent = crosshairBound.label.primaryText;
      }
    }

    this.updateCrosshairVLine(crosshair);
  }

  // ==========================================================================
  // Private: Render individual bound
  // ==========================================================================

  private renderBound(bound: PriceLineLabelBounds): void {
    const lineType = bound.type || 'price';

    if (lineType === 'crosshair') {
      this.renderCrosshairLabel(bound);
    } else if (lineType === 'order' || lineType === 'position') {
      this.renderTradingLabel(bound);
    } else {
      // Simple price line — render price axis label only (line drawn on canvas)
      this.renderPriceAxisLabel(bound);
    }
  }

  // ==========================================================================
  // Private: Crosshair label
  // ==========================================================================

  private renderCrosshairLabel(bound: PriceLineLabelBounds): void {
    const { width } = this.options;
    const labelCenterY = bound.adjustedY;
    const labelX = width - bound.width;
    const labelY = labelCenterY - bound.height / 2;

    const label = document.createElement('div');
    label.className = 'tc-crosshair-label';
    label.style.transform = `translate(${labelX}px, ${labelY}px)`;
    label.style.width = `${bound.width}px`;
    label.style.height = `${bound.height}px`;
    label.style.backgroundColor = bound.label.backgroundColor || bound.color;
    label.style.color = bound.label.textColor || '#000000';
    label.textContent = bound.label.primaryText;

    this.lineContainer.appendChild(label);
    this.crosshairLabel = label;
    this.priceAxisElements.set(bound.lineId, label);
  }

  // ==========================================================================
  // Private: Price axis label (simple price lines)
  // ==========================================================================

  private renderPriceAxisLabel(bound: PriceLineLabelBounds): void {
    const { width } = this.options;
    const { priceToY } = this.options;

    const lineY = priceToY(bound.price);
    const collisionOffset = bound.adjustedY - bound.originalY;
    const labelCenterY = lineY + collisionOffset;
    const priceAxisLabelX = width - bound.width - PRICE_AXIS_RIGHT_PADDING;
    const priceAxisLabelY = labelCenterY - bound.height / 2;

    const secondaryText = bound.countdownToTime ? formatCountdown(bound.countdownToTime) : bound.label.secondaryText;

    // Use filled style for lines with background color or countdown (e.g. last-trade)
    const isFilled = !!bound.label.backgroundColor || bound.countdownToTime !== undefined;

    const label = document.createElement('div');
    label.className = isFilled
      ? 'tc-price-axis-label tc-price-axis-label-filled'
      : 'tc-price-axis-label tc-price-axis-label-border';
    label.style.left = `${priceAxisLabelX}px`;
    label.style.top = `${priceAxisLabelY}px`;
    label.style.width = `${bound.width}px`;
    label.style.height = `${bound.height}px`;
    if (isFilled) {
      label.style.backgroundColor = bound.label.backgroundColor || bound.color;
      label.style.borderColor = bound.color;
      label.style.color = bound.label.textColor || '#ffffff';
    } else {
      label.style.borderColor = bound.color;
      label.style.color = bound.label.textColor || bound.color;
    }

    if (secondaryText) {
      const primarySpan = document.createElement('span');
      primarySpan.textContent = bound.label.primaryText;
      primarySpan.style.lineHeight = '1';
      label.appendChild(primarySpan);

      const secondarySpan = document.createElement('span');
      secondarySpan.textContent = secondaryText;
      secondarySpan.style.lineHeight = '1';
      label.appendChild(secondarySpan);

      if (bound.countdownToTime !== undefined) {
        const existing = this.countdownElements.get(bound.lineId) || [];
        existing.push({ el: secondarySpan, targetTime: bound.countdownToTime });
        this.countdownElements.set(bound.lineId, existing);
      }
    } else {
      label.textContent = bound.label.primaryText;
    }

    // Connector line
    this.renderConnector(bound, lineY, labelCenterY, priceAxisLabelX);

    this.lineContainer.appendChild(label);
    this.priceAxisElements.set(bound.lineId, label);
  }

  // ==========================================================================
  // Private: Trading line label (order/position)
  // ==========================================================================

  private renderTradingLabel(bound: PriceLineLabelBounds): void {
    const { width, margins, priceToY } = this.options;
    const chartLabel = bound.chartLabel;
    const isDraggable = bound.draggable ?? false;
    const isPending = this.pendingOrders.has(bound.lineId);

    const lineY = priceToY(bound.price);
    const collisionOffset = bound.adjustedY - bound.originalY;
    const labelCenterY = lineY + collisionOffset;
    const priceAxisLabelX = width - bound.width - PRICE_AXIS_RIGHT_PADDING;
    const priceAxisLabelY = labelCenterY - bound.height / 2;

    // Calculate chart label X position
    let chartLabelX = margins.left;
    const useNarrowText = width < 400;
    const buttons = chartLabel?.buttons || [];
    const hasTPSLButtons = buttons.length > 0 && (buttons[0].type === 'tp' || buttons[0].type === 'sl');

    if (chartLabel && chartLabel.segments.length > 0) {
      const lineLength = bound.lineLength ?? 100;
      if (lineLength < 100) {
        // For non-full-width lines, estimate label width for X positioning
        // (actual sizing is handled by CSS — this is just for initial placement)
        let estimatedWidth = 0;
        for (const segment of chartLabel.segments) {
          const text = useNarrowText && segment.textShort ? segment.textShort : segment.text;
          estimatedWidth += text.length * 7 + 14; // rough char width + padding
        }
        estimatedWidth += hasTPSLButtons ? TP_SL_GAP : 0;
        for (const button of buttons) {
          estimatedWidth += button.type === 'tp' || button.type === 'sl' ? 24 : 16;
        }
        const maxLabelX = width - margins.right - estimatedWidth;
        chartLabelX = margins.left + ((maxLabelX - margins.left) * (100 - lineLength)) / 100;
      }
    }

    // Create the chart label div
    if (chartLabel && chartLabel.segments.length > 0) {
      const labelDiv = document.createElement('div');
      labelDiv.className = 'tc-line-label';
      if (isPending) labelDiv.classList.add('tc-pending');
      labelDiv.dataset.interactive = 'true';
      labelDiv.dataset.lineId = bound.lineId;
      labelDiv.dataset.draggable = String(isDraggable);
      labelDiv.style.left = `${chartLabelX}px`;
      labelDiv.style.top = `${lineY - LABEL_HEIGHT / 2}px`;

      // Render segments — no explicit width; CSS padding handles sizing
      for (let i = 0; i < chartLabel.segments.length; i++) {
        const segment = chartLabel.segments[i];
        const text = useNarrowText && segment.textShort ? segment.textShort : segment.text;
        const isFirst = i === 0;
        const isLast = i === chartLabel.segments.length - 1;
        const hasButtons = (chartLabel.buttons?.length ?? 0) > 0 || hasTPSLButtons;
        // Last segment shares edge with buttons — no right rounding
        const isVisuallyLast = isLast && !hasButtons;

        const segEl = document.createElement('span');
        segEl.className = 'tc-segment';
        if (isFirst && isVisuallyLast) segEl.classList.add('tc-segment-only');
        else if (isFirst) segEl.classList.add('tc-segment-first');
        else if (isVisuallyLast) segEl.classList.add('tc-segment-last');

        segEl.style.backgroundColor = segment.backgroundColor;
        segEl.style.color = segment.textColor;
        segEl.style.borderWidth = '1px';
        segEl.style.borderStyle = 'solid';
        segEl.style.borderColor = segment.borderColor;
        segEl.textContent = text;

        labelDiv.appendChild(segEl);
      }

      // TP/SL gap
      if (hasTPSLButtons) {
        const gap = document.createElement('span');
        gap.className = 'tc-tpsl-gap';
        labelDiv.appendChild(gap);
      }

      // Render buttons
      for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        this.renderButton(labelDiv, btn, bound);
      }

      // Wire drag for order lines
      if (isDraggable) {
        this.wireDrag(labelDiv, bound);
      }

      this.lineContainer.appendChild(labelDiv);
      this.labelElements.set(bound.lineId, labelDiv);
    }

    // Price axis label (filled for trading lines)
    this.renderTradingPriceAxisLabel(bound, priceAxisLabelX, priceAxisLabelY);

    // Connector
    this.renderConnector(bound, lineY, labelCenterY, priceAxisLabelX);
  }

  // ==========================================================================
  // Private: Render button
  // ==========================================================================

  private renderButton(parent: HTMLDivElement, btn: ChartLabelButton, bound: PriceLineLabelBounds): void {
    const buttonEl = document.createElement('button');
    buttonEl.className = `tc-btn tc-btn-${btn.type}`;
    buttonEl.dataset.interactive = 'true';
    buttonEl.style.backgroundColor = btn.backgroundColor;
    buttonEl.style.color = btn.iconColor;
    buttonEl.style.borderWidth = '1px';
    buttonEl.style.borderStyle = 'solid';
    buttonEl.style.borderColor = btn.borderColor;
    if (btn.tooltip) buttonEl.title = btn.tooltip;

    if (btn.type === 'tp' || btn.type === 'sl') {
      buttonEl.textContent = btn.type === 'tp' ? 'TP' : 'SL';
      this.wireTPSLButton(buttonEl, btn.type, bound);
    } else if (btn.type === 'cancel') {
      buttonEl.textContent = '\u00d7'; // ×
      buttonEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.options.onOrderCancel?.(bound.lineId);
      });
      buttonEl.addEventListener('mouseenter', () => this.options.onCursorChange?.('pointer'));
      buttonEl.addEventListener('mouseleave', () => {
        // Restore to parent label's cursor — 'grab' for draggable, 'default' otherwise
        if (!this.state.isDragging()) {
          this.options.onCursorChange?.(bound.draggable ? 'grab' : 'default');
        }
      });
    } else if (btn.type === 'close') {
      buttonEl.textContent = '\u00d7'; // ×
      buttonEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.options.onPositionClose?.(bound.lineId);
      });
      buttonEl.addEventListener('mouseenter', () => this.options.onCursorChange?.('pointer'));
      buttonEl.addEventListener('mouseleave', () => {
        // Restore to parent label's cursor — 'grab' for draggable, 'default' otherwise
        if (!this.state.isDragging()) {
          this.options.onCursorChange?.(bound.draggable ? 'grab' : 'default');
        }
      });
    } else if (btn.type === 'reverse') {
      buttonEl.textContent = '\u21c4'; // ⇄
      buttonEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.options.onPositionReverse?.(bound.lineId);
      });
      buttonEl.addEventListener('mouseenter', () => this.options.onCursorChange?.('pointer'));
      buttonEl.addEventListener('mouseleave', () => {
        // Restore to parent label's cursor — 'grab' for draggable, 'default' otherwise
        if (!this.state.isDragging()) {
          this.options.onCursorChange?.(bound.draggable ? 'grab' : 'default');
        }
      });
    }

    parent.appendChild(buttonEl);
  }

  // ==========================================================================
  // Private: TP/SL button with drag detection
  // ==========================================================================

  private wireTPSLButton(buttonEl: HTMLButtonElement, type: 'tp' | 'sl', bound: PriceLineLabelBounds): void {
    let startX = 0;
    let startY = 0;
    let isDragStarted = false;
    let cachedRect: DOMRect;

    const onPointerDown = (e: PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      cachedRect = this.container.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      isDragStarted = false;
      buttonEl.setPointerCapture(e.pointerId);

      this.tpslDrag = {
        lineId: bound.lineId,
        buttonType: type,
        startY: e.clientY,
        startX: e.clientX,
        positionId: bound.positionId || bound.lineId,
        partialEnabled: bound.partialEnabled ?? false,
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.tpslDrag || this.tpslDrag.lineId !== bound.lineId || this.tpslDrag.buttonType !== type) return;

      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = Math.abs(e.clientY - startY);

      if (!isDragStarted && (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD)) {
        isDragStarted = true;
        this.options.onCursorChange?.('grabbing');
      }

      if (isDragStarted) {
        const localY = e.clientY - cachedRect.top;
        const price = this.options.yToPrice(localY);
        const partialPercent = this.tpslDrag.partialEnabled ? calculatePartialPercent(startX, e.clientX) : 100;
        const localStartX = startX - cachedRect.left;
        const localCurrentX = e.clientX - cachedRect.left;
        if (type === 'tp') {
          this.options.onTPMove?.(this.tpslDrag.positionId, price, partialPercent, localStartX, localCurrentX);
        } else {
          this.options.onSLMove?.(this.tpslDrag.positionId, price, partialPercent, localStartX, localCurrentX);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!this.tpslDrag || this.tpslDrag.lineId !== bound.lineId || this.tpslDrag.buttonType !== type) return;

      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = Math.abs(e.clientY - startY);

      if (!isDragStarted || (deltaX < DRAG_THRESHOLD && deltaY < DRAG_THRESHOLD)) {
        // Tap — fire click callback
        if (type === 'tp') {
          this.options.onTPClick?.(bound.positionId || bound.lineId);
        } else {
          this.options.onSLClick?.(bound.positionId || bound.lineId);
        }
      } else {
        // Drag end — compute price from Y
        const localY = e.clientY - cachedRect.top;
        const price = this.options.yToPrice(localY);
        const partialPercent = this.tpslDrag.partialEnabled ? calculatePartialPercent(startX, e.clientX) : undefined;

        if (type === 'tp') {
          this.options.onTPDragEnd?.(bound.positionId || bound.lineId, price, partialPercent);
        } else {
          this.options.onSLDragEnd?.(bound.positionId || bound.lineId, price, partialPercent);
        }
      }

      this.tpslDrag = null;
      this.options.onCursorChange?.('default');
    };

    const onPointerCancel = () => {
      if (this.tpslDrag) {
        this.tpslDrag = null;
        this.options.onCursorChange?.('default');
        this.options.onTPSLDragCancel?.();
      }
    };

    buttonEl.addEventListener('pointerdown', onPointerDown);
    buttonEl.addEventListener('pointermove', onPointerMove);
    buttonEl.addEventListener('pointerup', onPointerUp);
    buttonEl.addEventListener('pointercancel', onPointerCancel);
    buttonEl.addEventListener('lostpointercapture', onPointerCancel);
    buttonEl.addEventListener('mouseenter', () => this.options.onCursorChange?.('pointer'));
    buttonEl.addEventListener('mouseleave', () => {
      if (!this.tpslDrag) {
        this.options.onCursorChange?.(bound.draggable ? 'grab' : 'default');
      }
    });
  }

  // ==========================================================================
  // Private: Order drag via setPointerCapture
  // ==========================================================================

  // HTML line element shown during drag (replaces the canvas line which can't move mid-frame)
  private dragLine: HTMLDivElement | null = null;

  private wireDrag(labelDiv: HTMLDivElement, bound: PriceLineLabelBounds): void {
    const onPointerDown = (e: PointerEvent) => {
      // Don't start drag if click was on a button
      if ((e.target as HTMLElement).closest('.tc-btn')) return;

      e.preventDefault();
      this.state.startDrag(bound.lineId, e.clientY, bound.price, (y) => {
        const rect = this.container.getBoundingClientRect();
        return this.options.yToPrice(y - rect.top);
      });
      labelDiv.setPointerCapture(e.pointerId);
      labelDiv.classList.add('tc-dragging');
      this.options.onCursorChange?.('grabbing');

      // Create HTML drag line to replace the canvas line during drag
      const lineY = this.options.priceToY(bound.price);
      this.dragLine = document.createElement('div');
      this.dragLine.className = 'tc-drag-line';
      this.dragLine.style.cssText = `
        position: absolute; left: ${this.options.margins.left}px;
        width: ${this.options.width - this.options.margins.left - this.options.margins.right}px;
        top: ${lineY}px; height: 0; pointer-events: none;
        border-top: 1px ${bound.lineStyle || 'dashed'} ${bound.color || '#888'};
      `;
      this.lineContainer.appendChild(this.dragLine);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.state.isDragging() || this.state.getDragLineId() !== bound.lineId) return;

      const { currentPrice } = this.state.updateDrag(e.clientY);
      const newY = this.options.priceToY(currentPrice);
      labelDiv.style.top = `${newY - LABEL_HEIGHT / 2}px`;

      // Move the HTML drag line with the label
      if (this.dragLine) {
        this.dragLine.style.top = `${newY}px`;
      }

      // Update price axis label position and text
      const priceAxisEl = this.priceAxisElements.get(bound.lineId);
      if (priceAxisEl) {
        priceAxisEl.style.top = `${newY - bound.height / 2}px`;
        // Update the price text to show current drag price
        const priceText = this.options.formatPrice?.(currentPrice) ?? currentPrice.toFixed(2);
        const primarySpan = priceAxisEl.querySelector('span');
        if (primarySpan) {
          primarySpan.textContent = priceText;
        } else {
          priceAxisEl.textContent = priceText;
        }
      }
    };

    const onPointerUp = () => {
      if (!this.state.isDragging() || this.state.getDragLineId() !== bound.lineId) return;

      const result = this.state.endDrag();
      labelDiv.classList.remove('tc-dragging');
      this.options.onCursorChange?.('default');

      // Remove the HTML drag line
      if (this.dragLine) {
        this.dragLine.remove();
        this.dragLine = null;
      }

      if (result && Math.abs(result.finalPrice - bound.price) > 0) {
        this.options.onOrderMove?.(result.lineId, result.finalPrice);
      }
    };

    const onPointerCancel = () => {
      if (!this.state.isDragging() || this.state.getDragLineId() !== bound.lineId) return;
      this.state.cancelDrag();
      labelDiv.classList.remove('tc-dragging');
      if (this.dragLine) {
        this.dragLine.remove();
        this.dragLine = null;
      }
      this.options.onCursorChange?.('default');
      this.lastSignature = '';
    };

    labelDiv.addEventListener('pointerdown', onPointerDown);
    labelDiv.addEventListener('pointermove', onPointerMove);
    labelDiv.addEventListener('pointerup', onPointerUp);
    labelDiv.addEventListener('pointercancel', onPointerCancel);
    labelDiv.addEventListener('lostpointercapture', onPointerCancel);

    // Cursor feedback
    labelDiv.addEventListener('mouseenter', () => {
      if (!this.state.isDragging()) this.options.onCursorChange?.('grab');
    });
    labelDiv.addEventListener('mouseleave', () => {
      if (!this.state.isDragging()) this.options.onCursorChange?.('default');
    });
  }

  // ==========================================================================
  // Private: Trading price axis label (filled)
  // ==========================================================================

  private renderTradingPriceAxisLabel(
    bound: PriceLineLabelBounds,
    priceAxisLabelX: number,
    priceAxisLabelY: number,
  ): void {
    const secondaryText = bound.countdownToTime ? formatCountdown(bound.countdownToTime) : bound.label.secondaryText;

    const label = document.createElement('div');
    label.className = 'tc-price-axis-label tc-price-axis-label-filled';
    label.style.left = `${priceAxisLabelX}px`;
    label.style.top = `${priceAxisLabelY}px`;
    label.style.width = `${bound.width}px`;
    label.style.height = `${bound.height}px`;
    label.style.backgroundColor = bound.label.backgroundColor || bound.color;
    label.style.borderWidth = '1px';
    label.style.borderStyle = 'solid';
    label.style.borderColor = bound.color;
    label.style.borderRadius = '2px';
    label.style.color = bound.label.textColor || '#ffffff';

    if (secondaryText) {
      const primarySpan = document.createElement('span');
      primarySpan.textContent = bound.label.primaryText;
      primarySpan.style.lineHeight = '1';
      label.appendChild(primarySpan);

      const secondarySpan = document.createElement('span');
      secondarySpan.textContent = secondaryText;
      secondarySpan.style.lineHeight = '1';
      label.appendChild(secondarySpan);

      if (bound.countdownToTime !== undefined) {
        const existing = this.countdownElements.get(bound.lineId) || [];
        existing.push({ el: secondarySpan, targetTime: bound.countdownToTime });
        this.countdownElements.set(bound.lineId, existing);
      }
    } else {
      label.textContent = bound.label.primaryText;
    }

    this.lineContainer.appendChild(label);
    this.priceAxisElements.set(bound.lineId, label);
  }

  // ==========================================================================
  // Private: Connector line
  // ==========================================================================

  private renderConnector(
    bound: PriceLineLabelBounds,
    lineY: number,
    labelCenterY: number,
    priceAxisLabelX: number,
  ): void {
    if (Math.abs(labelCenterY - lineY) <= 2) return;

    const top = Math.min(lineY, labelCenterY);
    const height = Math.abs(labelCenterY - lineY);

    const connector = document.createElement('div');
    connector.className = 'tc-connector';
    connector.style.left = `${priceAxisLabelX}px`;
    connector.style.top = `${top}px`;
    connector.style.height = `${height}px`;
    connector.style.backgroundColor = bound.color;

    this.lineContainer.appendChild(connector);
    this.connectorElements.set(bound.lineId, connector);
  }

  // ==========================================================================
  // Private: Crosshair vertical line
  // ==========================================================================

  private updateCrosshairVLine(_crosshair?: CrosshairLabelData): void {
    // Crosshair vertical line is now drawn on the canvas overlay (ChartCore.renderCrosshairOverlay).
    // No HTML element needed — eliminates DOM mutations on every frame.
    if (this.crosshairVLine) {
      this.crosshairVLine.remove();
      this.crosshairVLine = null;
    }
  }

  // ==========================================================================
  // Private: Countdown text updates
  // ==========================================================================

  private updateCountdownTexts(): void {
    for (const [, nodes] of this.countdownElements) {
      for (const { el, targetTime } of nodes) {
        const newText = formatCountdown(targetTime);
        if (el.textContent !== newText) {
          el.textContent = newText;
        }
      }
    }
  }
}
