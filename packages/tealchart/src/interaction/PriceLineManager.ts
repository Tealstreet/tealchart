/**
 * PriceLineManager - Vanilla Konva class for rendering price lines
 *
 * Handles rendering and interaction for:
 * - Order lines (draggable)
 * - Position lines with TP/SL buttons
 * - Crosshair horizontal/vertical lines
 * - Price axis labels
 */

import Konva from 'konva';
import {
  PRICE_AXIS_RIGHT_PADDING,
  type PriceLineLabelBounds,
  type ChartMargins,
  type PendingOrderUpdate,
} from '../types';

// ============================================================================
// Types
// ============================================================================

export interface PriceLineManagerOptions {
  /** Konva layer to render on */
  layer: Konva.Layer;
  /** Chart dimensions */
  width: number;
  height: number;
  /** Chart margins */
  margins: ChartMargins;
  /** Convert Y coordinate to price */
  yToPrice: (y: number) => number;
  /** Convert price to Y coordinate */
  priceToY: (price: number) => number;
  /** Callback when order is moved via drag (final) */
  onOrderMove?: (orderId: string, newPrice: number) => void;
  /** Callback when order cancel button is clicked */
  onOrderCancel?: (orderId: string) => void;
  /** Callback when position close button is clicked */
  onPositionClose?: (positionId: string) => void;
  /** Callback when position reverse button is clicked */
  onPositionReverse?: (positionId: string) => void;
  /** Callback when TP button drag ends */
  onTPDragEnd?: (positionId: string, price: number, partialPercent?: number) => void;
  /** Callback when SL button drag ends */
  onSLDragEnd?: (positionId: string, price: number, partialPercent?: number) => void;
  /** Callback when TP button is clicked (without drag) */
  onTPClick?: (positionId: string) => void;
  /** Callback when SL button is clicked (without drag) */
  onSLClick?: (positionId: string) => void;
  /** Callback when cursor should change */
  onCursorChange?: (cursor: 'default' | 'pointer' | 'grab' | 'grabbing') => void;
  /** Callback when context menu button is clicked */
  onContextMenuButtonClick?: (price: number, screenX: number, screenY: number) => void;
}

export interface CrosshairState {
  x: number;
  y: number;
  visible: boolean;
  color: string;
}

// ============================================================================
// Constants
// ============================================================================

const TOUCH_TARGET_HEIGHT = 44; // Minimum 44px for touch-friendly hit area
const LABEL_HEIGHT = 18;

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
// PriceLineManager Class
// ============================================================================

export class PriceLineManager {
  private layer: Konva.Layer;
  private options: PriceLineManagerOptions;

  // Main container group
  private group: Konva.Group;

  // Crosshair elements
  private crosshairVertical: Konva.Line | null = null;
  private crosshairHorizontal: Konva.Line | null = null;
  private contextMenuButton: Konva.Group | null = null;

  // Current state
  private labelBounds: PriceLineLabelBounds[] = [];
  private pendingOrders: Map<string, PendingOrderUpdate> = new Map();
  private crosshair: CrosshairState = { x: 0, y: 0, visible: false, color: '#787b86' };

  // Drag state
  private activeDrag: {
    node: Konva.Rect;
    lineId: string;
    originalY: number;
    originalPrice: number;
    onCancel?: () => void;
  } | null = null;
  private dragCancelled = false;

  // Countdown timer
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  // Map of lineId -> countdown Konva.Text nodes for efficient text-only updates
  private countdownTextNodes: Map<string, { text: Konva.Text; targetTime: number }[]> = new Map();

  // Cached element groups by lineId for efficient updates
  private cachedLineGroups: Map<string, Konva.Group> = new Map();
  private lastLabelBoundsSignature: string = '';
  private needsFullRebuild: boolean = true;
  private lastCrosshairLabel: string = ''; // Track crosshair label to detect pane changes

  constructor(options: PriceLineManagerOptions) {
    this.layer = options.layer;
    this.options = options;

    // Create main container group
    this.group = new Konva.Group();
    this.layer.add(this.group);

    // Setup escape key handler
    this.setupKeyboardHandler();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Update the price line data
   */
  update(
    labelBounds: PriceLineLabelBounds[],
    pendingOrders: Map<string, PendingOrderUpdate> = new Map(),
    crosshair?: CrosshairState
  ): void {
    // Check if we need a full rebuild or can do incremental update
    const newSignature = this.computeSignature(labelBounds);
    const structureChanged = newSignature !== this.lastLabelBoundsSignature;

    this.labelBounds = labelBounds;
    this.pendingOrders = pendingOrders;

    // Track crosshair visibility changes to force rebuild (since crosshair is excluded from signature)
    const crosshairVisibilityChanged = crosshair && crosshair.visible !== this.crosshair.visible;

    // Track crosshair label changes to detect pane transitions
    // When cursor moves between panes, the label value changes even if visibility stays the same
    const crosshairBound = labelBounds.find(b => b.type === 'crosshair');
    const currentCrosshairLabel = crosshairBound?.label?.primaryText ?? '';
    const crosshairLabelChanged = currentCrosshairLabel !== this.lastCrosshairLabel;
    this.lastCrosshairLabel = currentCrosshairLabel;

    if (crosshair) {
      this.crosshair = crosshair;
    }

    if (structureChanged || this.needsFullRebuild || crosshairVisibilityChanged || crosshairLabelChanged) {
      this.lastLabelBoundsSignature = newSignature;
      this.needsFullRebuild = false;
      this.render();
    } else {
      // Fast path: only update positions via priceToY transform
      this.updatePositions();
    }
  }

  /**
   * Compute a signature for the label bounds structure
   * If this changes, we need a full rebuild
   * Excludes crosshair (handled separately) and position-only properties
   */
  private computeSignature(bounds: PriceLineLabelBounds[]): string {
    // Only include non-crosshair bounds and properties that require element rebuild when changed
    // Exclude: price, originalY, adjustedY (handled by position updates)
    // Exclude: crosshair (handled separately in updateCrosshair)
    return bounds
      .filter(b => b.type !== 'crosshair')
      .map(b => `${b.lineId}|${b.type}|${b.color}|${b.lineStyle}|${b.draggable}|${b.chartLabel?.segments.length ?? 0}|${b.chartLabel?.buttons.length ?? 0}`)
      .join(';');
  }

  /**
   * Fast position update - only updates Y positions without recreating elements
   */
  private updatePositions(): void {
    const { priceToY } = this.options;

    for (const bound of this.labelBounds) {
      const cachedGroup = this.cachedLineGroups.get(bound.lineId);
      if (cachedGroup) {
        const newY = bound.type === 'crosshair' ? bound.adjustedY : priceToY(bound.price);
        const collisionOffset = bound.adjustedY - bound.originalY;

        // Update the group's Y position
        // We store the lineY as a custom attribute
        const oldLineY = cachedGroup.getAttr('lineY') ?? 0;
        const deltaY = newY - oldLineY;

        if (Math.abs(deltaY) > 0.1) {
          cachedGroup.y(cachedGroup.y() + deltaY);
          cachedGroup.setAttr('lineY', newY);
        }
      }
    }

    // Update crosshair
    this.updateCrosshair();

    this.layer.batchDraw();
  }

  /**
   * Update dimensions
   */
  setDimensions(width: number, height: number, margins: ChartMargins): void {
    this.options.width = width;
    this.options.height = height;
    this.options.margins = margins;
    this.needsFullRebuild = true;
    this.render();
  }

  /**
   * Update crosshair state
   */
  setCrosshair(crosshair: CrosshairState): void {
    this.crosshair = crosshair;
    this.updateCrosshair();
  }

  /**
   * Dispose and clean up
   */
  dispose(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    document.removeEventListener('keydown', this.handleKeyDown);
    this.group.destroy();
  }

  // ============================================================================
  // Private: Countdown Updates
  // ============================================================================

  /**
   * Efficiently update only countdown text nodes without rebuilding the entire layer.
   * This is called every 1000ms by the countdown timer.
   */
  private updateCountdownTexts(): void {
    let hasUpdates = false;

    for (const [lineId, nodes] of this.countdownTextNodes) {
      for (const { text, targetTime } of nodes) {
        const newText = formatCountdown(targetTime);
        if (text.text() !== newText) {
          text.text(newText);
          hasUpdates = true;
        }
      }
    }

    // Only redraw if there were actual changes
    if (hasUpdates) {
      this.layer.batchDraw();
    }
  }

  // ============================================================================
  // Private: Render
  // ============================================================================

  private render(): void {
    // Clear existing elements and cache
    this.group.destroyChildren();
    this.cachedLineGroups.clear();
    this.countdownTextNodes.clear();  // Clear countdown text node references

    const { width, margins, priceToY } = this.options;

    // Check if we need countdown timer
    const hasCountdown = this.labelBounds.some(b => b.countdownToTime !== undefined);
    if (hasCountdown && !this.countdownTimer) {
      // Use lightweight text-only update instead of full rebuild
      this.countdownTimer = setInterval(() => {
        this.updateCountdownTexts();
      }, 1000);
    } else if (!hasCountdown && this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    // Separate floating and non-floating labels
    const nonFloating = this.labelBounds.filter(b => !b.floatingLabel);
    const floating = this.labelBounds.filter(b => b.floatingLabel && (b.type !== 'crosshair' || this.crosshair.visible));

    // Render non-floating first (underneath)
    for (const bound of nonFloating) {
      this.renderPriceLine(bound);
    }

    // Render floating on top
    for (const bound of floating) {
      this.renderPriceLine(bound);
    }

    // Render crosshair vertical line
    this.updateCrosshair();

    this.layer.batchDraw();
  }

  private renderPriceLine(bound: PriceLineLabelBounds): void {
    const { width, height, margins, priceToY, yToPrice } = this.options;
    const lineY = bound.type === 'crosshair' ? bound.adjustedY : priceToY(bound.price);
    const lineType = bound.type || 'price';
    const isPending = this.pendingOrders.has(bound.lineId);
    const opacity = isPending ? 0.5 : 1;

    // Collision offset for label
    const collisionOffset = bound.adjustedY - bound.originalY;
    const labelCenterY = lineY + collisionOffset;

    // Price axis label position
    const priceAxisLabelX = width - bound.width - PRICE_AXIS_RIGHT_PADDING;
    const priceAxisLabelY = labelCenterY - bound.height / 2;

    // Line dash pattern
    const lineDash = bound.lineStyle === 'dashed'
      ? [4, 4]
      : bound.lineStyle === 'dotted'
        ? [2, 2]
        : [];

    // Create group for this price line
    const lineGroup = new Konva.Group({ opacity });
    lineGroup.setAttr('lineY', lineY); // Store for fast position updates
    this.group.add(lineGroup);
    this.cachedLineGroups.set(bound.lineId, lineGroup);

    if (lineType === 'price' || lineType === 'crosshair') {
      // Simple price line
      const lineEndX = (lineType === 'crosshair' && this.options.onContextMenuButtonClick)
        ? width - margins.right - 18
        : priceAxisLabelX;

      // Skip line if rendered on canvas
      if (!bound.renderLineOnCanvas) {
        lineGroup.add(new Konva.Line({
          points: [margins.left, lineY, lineEndX, lineY],
          stroke: bound.color,
          strokeWidth: bound.lineWidth || 1,
          dash: lineDash,
        }));
      }

      // Connector line if offset
      if (Math.abs(labelCenterY - lineY) > 2) {
        lineGroup.add(new Konva.Line({
          points: [priceAxisLabelX, lineY, priceAxisLabelX, labelCenterY],
          stroke: bound.color,
          strokeWidth: 1,
          opacity: 0.5,
        }));
      }

      // Price axis label
      this.renderPriceAxisLabel(lineGroup, bound, priceAxisLabelX, priceAxisLabelY, lineType === 'crosshair');

    } else {
      // Trading line (order/position) with chart label
      this.renderTradingLine(lineGroup, bound, lineY, labelCenterY, priceAxisLabelX, priceAxisLabelY, lineDash);
    }
  }

  private renderPriceAxisLabel(
    group: Konva.Group,
    bound: PriceLineLabelBounds,
    x: number,
    y: number,
    isCrosshair: boolean
  ): void {
    const secondaryText = bound.countdownToTime
      ? formatCountdown(bound.countdownToTime)
      : bound.label.secondaryText;

    if (isCrosshair) {
      // Filled label for crosshair
      group.add(new Konva.Rect({
        x,
        y,
        width: bound.width,
        height: bound.height,
        fill: bound.label.backgroundColor || bound.color,
        cornerRadius: 2,
      }));
      group.add(new Konva.Text({
        x,
        y,
        width: bound.width,
        height: bound.height,
        text: bound.label.primaryText,
        fontSize: 11,
        fontFamily: 'sans-serif',
        fill: bound.label.textColor || '#000000',
        align: 'center',
        verticalAlign: 'middle',
      }));
    } else {
      // Border-only label
      group.add(new Konva.Rect({
        x,
        y,
        width: bound.width,
        height: bound.height,
        stroke: bound.color,
        strokeWidth: 1,
        cornerRadius: 2,
      }));

      if (secondaryText) {
        // Two-line label
        group.add(new Konva.Text({
          x,
          y: y + 1,
          width: bound.width,
          height: bound.height / 2,
          text: bound.label.primaryText,
          fontSize: 11,
          fontFamily: 'sans-serif',
          fill: bound.label.textColor || bound.color,
          align: 'center',
          verticalAlign: 'middle',
        }));
        const secondaryTextNode = new Konva.Text({
          x,
          y: y + bound.height / 2 - 1,
          width: bound.width,
          height: bound.height / 2,
          text: secondaryText,
          fontSize: 11,
          fontFamily: 'sans-serif',
          fill: bound.label.textColor || bound.color,
          align: 'center',
          verticalAlign: 'middle',
        });
        group.add(secondaryTextNode);

        // Store reference for efficient countdown updates
        if (bound.countdownToTime !== undefined) {
          const existing = this.countdownTextNodes.get(bound.lineId) || [];
          existing.push({ text: secondaryTextNode, targetTime: bound.countdownToTime });
          this.countdownTextNodes.set(bound.lineId, existing);
        }
      } else {
        group.add(new Konva.Text({
          x,
          y,
          width: bound.width,
          height: bound.height,
          text: bound.label.primaryText,
          fontSize: 11,
          fontFamily: 'sans-serif',
          fill: bound.label.textColor || bound.color,
          align: 'center',
          verticalAlign: 'middle',
        }));
      }
    }
  }

  private renderTradingLine(
    group: Konva.Group,
    bound: PriceLineLabelBounds,
    lineY: number,
    labelCenterY: number,
    priceAxisLabelX: number,
    priceAxisLabelY: number,
    lineDash: number[]
  ): void {
    const { width, margins, yToPrice, priceToY } = this.options;
    const chartLabel = bound.chartLabel;
    const isDraggable = bound.draggable ?? false;

    // Calculate chart label dimensions
    let chartLabelWidth = 0;
    let segmentsWidth = 0;
    let chartLabelX = margins.left;
    const useNarrowText = width < 400;
    const buttons = chartLabel?.buttons || [];
    const hasTPSLButtons = buttons.length > 0 && (buttons[0].type === 'tp' || buttons[0].type === 'sl');
    const tpslGap = hasTPSLButtons ? 6 : 0;

    if (chartLabel && chartLabel.segments.length > 0) {
      for (const segment of chartLabel.segments) {
        const text = useNarrowText && segment.textShort ? segment.textShort : segment.text;
        segmentsWidth += text.length * 6 + 8;
      }
      chartLabelWidth = segmentsWidth + tpslGap;
      for (const button of buttons) {
        chartLabelWidth += (button.type === 'tp' || button.type === 'sl') ? 24 : 16;
      }

      const lineLength = bound.lineLength ?? 100;
      const maxLabelX = width - margins.right - chartLabelWidth;
      const minLabelX = margins.left;
      chartLabelX = minLabelX + ((maxLabelX - minLabelX) * (100 - lineLength) / 100);
    }

    // Left line segment
    if (chartLabel && chartLabel.segments.length > 0 && bound.extendLeft !== false) {
      group.add(new Konva.Line({
        points: [margins.left, lineY, chartLabelX - 1, lineY],
        stroke: bound.color,
        strokeWidth: bound.lineWidth || 1,
        dash: lineDash,
      }));
    }

    // Right line segment (from end of segments to price axis)
    if (chartLabel && chartLabel.segments.length > 0) {
      group.add(new Konva.Line({
        points: [chartLabelX + segmentsWidth + 2, lineY, priceAxisLabelX - PRICE_AXIS_RIGHT_PADDING, lineY],
        stroke: bound.color,
        strokeWidth: bound.lineWidth || 1,
        dash: lineDash,
      }));
    }

    // Invisible drag handle for segments
    if (isDraggable && chartLabel && chartLabel.segments.length > 0 && segmentsWidth > 0) {
      const dragRect = new Konva.Rect({
        x: chartLabelX,
        y: lineY - TOUCH_TARGET_HEIGHT / 2,
        width: segmentsWidth,
        height: TOUCH_TARGET_HEIGHT,
        // Use rgba with very low alpha for hit detection - 'transparent' may not work in all cases
        fill: 'rgba(0, 0, 0, 0.01)',
        draggable: true,
        listening: true, // Explicitly enable listening
      });

      let dragStartY = 0;

      dragRect.on('dragstart', () => {
        dragStartY = dragRect.y();
        this.activeDrag = {
          node: dragRect,
          lineId: bound.lineId,
          originalY: lineY,
          originalPrice: bound.price,
        };
        this.dragCancelled = false;
        this.options.onCursorChange?.('grabbing');
      });

      dragRect.on('dragmove', () => {
        // Constrain to vertical only
        dragRect.x(chartLabelX);
      });

      dragRect.on('dragend', () => {
        const finalY = dragRect.y() + TOUCH_TARGET_HEIGHT / 2;
        const finalPrice = yToPrice(finalY);

        dragRect.y(dragStartY);
        this.activeDrag = null;

        if (!this.dragCancelled && Math.abs(finalY - lineY) > 1) {
          this.options.onOrderMove?.(bound.lineId, finalPrice);
        }
        this.dragCancelled = false;
        // Reset to default/crosshair - the mouse position may have changed during drag
        // and the rect position was reset, so we can't assume mouse is still over it
        this.options.onCursorChange?.('default');
      });

      dragRect.on('mouseenter', () => this.options.onCursorChange?.('grab'));
      dragRect.on('mouseleave', () => {
        if (!this.activeDrag) {
          this.options.onCursorChange?.('default');
        }
      });

      group.add(dragRect);
    }

    // Render chart label segments
    if (chartLabel && chartLabel.segments.length > 0) {
      let currentX = chartLabelX;
      const segmentGroup = new Konva.Group({ listening: false });

      for (let i = 0; i < chartLabel.segments.length; i++) {
        const segment = chartLabel.segments[i];
        const text = useNarrowText && segment.textShort ? segment.textShort : segment.text;
        const textWidth = text.length * 6 + 8;
        const isFirst = i === 0;
        const isLast = i === chartLabel.segments.length - 1;

        segmentGroup.add(new Konva.Rect({
          x: currentX,
          y: lineY - LABEL_HEIGHT / 2,
          width: textWidth,
          height: LABEL_HEIGHT,
          fill: segment.backgroundColor,
          stroke: segment.borderColor,
          strokeWidth: 1,
          cornerRadius: isFirst && isLast ? 2 : isFirst ? [2, 0, 0, 2] : isLast ? [0, 2, 2, 0] : 0,
        }));

        segmentGroup.add(new Konva.Text({
          x: currentX,
          y: lineY - LABEL_HEIGHT / 2,
          width: textWidth,
          height: LABEL_HEIGHT,
          text,
          fontSize: 11,
          fontFamily: 'sans-serif',
          fill: segment.textColor,
          align: 'center',
          verticalAlign: 'middle',
        }));

        currentX += textWidth;
      }

      group.add(segmentGroup);

      // Render buttons
      if (hasTPSLButtons) {
        currentX += tpslGap;
      }

      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        const isTPSL = button.type === 'tp' || button.type === 'sl';
        const buttonWidth = isTPSL ? 24 : 16;

        const buttonGroup = new Konva.Group();

        buttonGroup.add(new Konva.Rect({
          x: currentX,
          y: lineY - LABEL_HEIGHT / 2,
          width: buttonWidth,
          height: LABEL_HEIGHT,
          fill: button.backgroundColor,
          stroke: button.borderColor,
          strokeWidth: 1,
          cornerRadius: button.type === 'tp' ? [2, 0, 0, 2] : button.type === 'sl' ? [0, 2, 2, 0] : 2,
        }));

        if (button.type === 'tp' || button.type === 'sl') {
          buttonGroup.add(new Konva.Text({
            x: currentX,
            y: lineY - LABEL_HEIGHT / 2,
            width: buttonWidth,
            height: LABEL_HEIGHT,
            text: button.type === 'tp' ? 'TP' : 'SL',
            fontSize: 10,
            fontFamily: 'sans-serif',
            fontStyle: 'bold',
            fill: button.iconColor,
            align: 'center',
            verticalAlign: 'middle',
          }));

          // TP/SL button click handler
          const btnX = currentX;
          buttonGroup.on('click tap', () => {
            if (button.type === 'tp') {
              this.options.onTPClick?.(bound.lineId);
            } else {
              this.options.onSLClick?.(bound.lineId);
            }
          });
          buttonGroup.on('mouseenter', () => this.options.onCursorChange?.('pointer'));
          buttonGroup.on('mouseleave', () => this.options.onCursorChange?.('default'));

        } else if (button.type === 'cancel' || button.type === 'close') {
          // X icon
          buttonGroup.add(new Konva.Line({
            points: [currentX + 5, lineY - 4, currentX + 11, lineY + 4],
            stroke: button.iconColor,
            strokeWidth: 1.5,
            listening: false,
          }));
          buttonGroup.add(new Konva.Line({
            points: [currentX + 11, lineY - 4, currentX + 5, lineY + 4],
            stroke: button.iconColor,
            strokeWidth: 1.5,
            listening: false,
          }));

          buttonGroup.on('click tap', () => {
            if (button.type === 'cancel') {
              this.options.onOrderCancel?.(bound.lineId);
            } else {
              this.options.onPositionClose?.(bound.lineId);
            }
          });
          buttonGroup.on('mouseenter', () => this.options.onCursorChange?.('pointer'));
          buttonGroup.on('mouseleave', () => this.options.onCursorChange?.('default'));

        } else if (button.type === 'reverse') {
          buttonGroup.add(new Konva.Text({
            x: currentX,
            y: lineY - LABEL_HEIGHT / 2,
            width: buttonWidth,
            height: LABEL_HEIGHT,
            text: '\u21c4',
            fontSize: 11,
            fontFamily: 'sans-serif',
            fill: button.iconColor,
            align: 'center',
            verticalAlign: 'middle',
            listening: false,
          }));

          buttonGroup.on('click tap', () => {
            this.options.onPositionReverse?.(bound.lineId);
          });
          buttonGroup.on('mouseenter', () => this.options.onCursorChange?.('pointer'));
          buttonGroup.on('mouseleave', () => this.options.onCursorChange?.('default'));
        }

        group.add(buttonGroup);
        currentX += buttonWidth;
        if (button.type === 'tp') currentX += 1;
      }
    }

    // Line all the way across if no chart label
    if (!chartLabel || chartLabel.segments.length === 0) {
      group.add(new Konva.Line({
        points: [margins.left, lineY, priceAxisLabelX - PRICE_AXIS_RIGHT_PADDING, lineY],
        stroke: bound.color,
        strokeWidth: bound.lineWidth || 1,
        dash: lineDash,
      }));
    }

    // Connector line if offset
    if (Math.abs(labelCenterY - lineY) > 2) {
      group.add(new Konva.Line({
        points: [priceAxisLabelX, lineY, priceAxisLabelX, labelCenterY],
        stroke: bound.color,
        strokeWidth: 1,
        opacity: 0.5,
      }));
    }

    // Price axis label (filled for trading lines)
    const secondaryText = bound.countdownToTime
      ? formatCountdown(bound.countdownToTime)
      : bound.label.secondaryText;

    group.add(new Konva.Rect({
      x: priceAxisLabelX,
      y: priceAxisLabelY,
      width: bound.width,
      height: bound.height,
      fill: bound.label.backgroundColor || bound.color,
      stroke: bound.color,
      strokeWidth: 1,
      cornerRadius: 2,
    }));

    if (secondaryText) {
      group.add(new Konva.Text({
        x: priceAxisLabelX,
        y: priceAxisLabelY + 1,
        width: bound.width,
        height: bound.height / 2,
        text: bound.label.primaryText,
        fontSize: 11,
        fontFamily: 'sans-serif',
        fill: bound.label.textColor || '#ffffff',
        align: 'center',
        verticalAlign: 'middle',
      }));
      const tradingSecondaryTextNode = new Konva.Text({
        x: priceAxisLabelX,
        y: priceAxisLabelY + bound.height / 2 - 1,
        width: bound.width,
        height: bound.height / 2,
        text: secondaryText,
        fontSize: 11,
        fontFamily: 'sans-serif',
        fill: bound.label.textColor || '#ffffff',
        align: 'center',
        verticalAlign: 'middle',
      });
      group.add(tradingSecondaryTextNode);

      // Store reference for efficient countdown updates
      if (bound.countdownToTime !== undefined) {
        const existing = this.countdownTextNodes.get(bound.lineId) || [];
        existing.push({ text: tradingSecondaryTextNode, targetTime: bound.countdownToTime });
        this.countdownTextNodes.set(bound.lineId, existing);
      }
    } else {
      group.add(new Konva.Text({
        x: priceAxisLabelX,
        y: priceAxisLabelY,
        width: bound.width,
        height: bound.height,
        text: bound.label.primaryText,
        fontSize: 11,
        fontFamily: 'sans-serif',
        fill: bound.label.textColor || '#ffffff',
        align: 'center',
        verticalAlign: 'middle',
      }));
    }
  }

  // ============================================================================
  // Private: Crosshair
  // ============================================================================

  private updateCrosshair(): void {
    const { width, height, margins, yToPrice } = this.options;

    // Remove old crosshair elements
    this.crosshairVertical?.destroy();
    this.crosshairHorizontal?.destroy();
    this.contextMenuButton?.destroy();
    this.crosshairVertical = null;
    this.crosshairHorizontal = null;
    this.contextMenuButton = null;

    if (!this.crosshair.visible) return;

    // Vertical line (on Konva layer)
    this.crosshairVertical = new Konva.Line({
      points: [this.crosshair.x, 0, this.crosshair.x, height],
      stroke: this.crosshair.color,
      strokeWidth: 1,
      dash: [4, 4],
      listening: false,
    });
    this.group.add(this.crosshairVertical);

    // Note: Horizontal crosshair line is drawn on canvas (renderLineOnCanvas: true)
    // Label is rendered by Konva through the price line system (floatingLabel: true)

    // Context menu "+" button
    if (this.options.onContextMenuButtonClick) {
      this.contextMenuButton = new Konva.Group({
        x: width - margins.right - 10,
        y: this.crosshair.y,
      });

      const circle = new Konva.Circle({
        radius: 8,
        stroke: this.crosshair.color,
        strokeWidth: 1,
        fill: 'rgba(0,0,0,0.01)',
      });

      const hLine = new Konva.Line({
        points: [-4, 0, 4, 0],
        stroke: this.crosshair.color,
        strokeWidth: 1.5,
        listening: false,
      });

      const vLine = new Konva.Line({
        points: [0, -4, 0, 4],
        stroke: this.crosshair.color,
        strokeWidth: 1.5,
        listening: false,
      });

      this.contextMenuButton.add(circle, hLine, vLine);

      this.contextMenuButton.on('click tap', (e) => {
        const price = yToPrice(this.crosshair.y);
        const evt = e.evt as MouseEvent | TouchEvent;
        let clientX = 0, clientY = 0;
        if ('clientX' in evt) {
          clientX = evt.clientX;
          clientY = evt.clientY;
        } else if ('changedTouches' in evt && evt.changedTouches[0]) {
          clientX = evt.changedTouches[0].clientX;
          clientY = evt.changedTouches[0].clientY;
        }
        this.options.onContextMenuButtonClick?.(price, clientX, clientY);
      });

      this.contextMenuButton.on('mouseenter', () => {
        const container = this.layer.getStage()?.container();
        if (container) container.style.cursor = 'pointer';
      });

      this.contextMenuButton.on('mouseleave', () => {
        const container = this.layer.getStage()?.container();
        if (container) container.style.cursor = '';
      });

      this.group.add(this.contextMenuButton);
    }
  }

  // ============================================================================
  // Private: Keyboard Handler
  // ============================================================================

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.activeDrag) {
      this.dragCancelled = true;
      this.activeDrag.node.stopDrag();
      this.activeDrag.node.y(this.activeDrag.originalY - TOUCH_TARGET_HEIGHT / 2);
      this.activeDrag.onCancel?.();
      this.activeDrag = null;
      this.options.onCursorChange?.('default');
    }
  };

  private setupKeyboardHandler(): void {
    document.addEventListener('keydown', this.handleKeyDown, true);
  }
}
