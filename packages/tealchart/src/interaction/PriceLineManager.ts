/**
 * PriceLineManager - Vanilla Konva class for rendering price lines
 *
 * Handles rendering and interaction for:
 * - Order lines (draggable)
 * - Position lines with TP/SL buttons
 * - Crosshair horizontal/vertical lines
 * - Price axis labels
 */
import type { ChartMargins, PendingOrderUpdate, PriceLineLabelBounds } from '../types';

import Konva from 'konva';

import { PRICE_AXIS_RIGHT_PADDING } from '../types';

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
  /** Preview callback for TP drag */
  onTPMovePreview?: (
    positionId: string,
    price: number,
    partialPercent: number,
    dragStartX: number,
    dragCurrentX: number,
  ) => void;
  /** Preview callback for SL drag */
  onSLMovePreview?: (
    positionId: string,
    price: number,
    partialPercent: number,
    dragStartX: number,
    dragCurrentX: number,
  ) => void;
  /** Called when any TP/SL drag ends */
  onTPSLDragEnd?: () => void;
  /** Called when any TP/SL drag is cancelled */
  onTPSLDragCancel?: () => void;
  /** Callback when cursor should change */
  onCursorChange?: (cursor: 'crosshair' | 'pointer' | 'grab' | 'grabbing') => void;
  /** Callback when context menu button is clicked */
  onContextMenuButtonClick?: (price: number, screenX: number, screenY: number) => void;
  /** Font family for Konva label rendering */
  fontFamily?: string;
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
const DRAG_THRESHOLD = 5;
const SEGMENT_HORIZONTAL_PADDING = 8;

interface CachedLineContentRefs {
  priceAxisRect?: Konva.Rect;
  priceAxisPrimaryText?: Konva.Text;
  priceAxisSecondaryText?: Konva.Text;
  segmentRects?: Konva.Rect[];
  segmentTexts?: Konva.Text[];
  buttonRects?: Konva.Rect[];
  buttonTexts?: Array<Konva.Text | undefined>;
  buttonIcons?: Array<Konva.Shape[] | undefined>;
}

interface CountdownTextNodeRef {
  text: Konva.Text;
  targetTime: number;
}

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

let textMeasureContext: CanvasRenderingContext2D | null = null;

function resolveFontFamily(fontFamily?: string): string {
  const trimmed = fontFamily?.trim();
  if (!trimmed || trimmed === 'inherit' || trimmed.includes('var(')) {
    return 'sans-serif';
  }
  return trimmed;
}

function measureLabelTextWidth(text: string, fontSize = 11, fontFamily = 'sans-serif', fontStyle = ''): number {
  if (typeof document === 'undefined') {
    return text.length * 6;
  }

  if (!textMeasureContext) {
    textMeasureContext = document.createElement('canvas').getContext('2d');
  }

  if (!textMeasureContext) {
    return text.length * 6;
  }

  textMeasureContext.font = `${fontStyle ? `${fontStyle} ` : ''}${fontSize}px ${fontFamily}`;
  return textMeasureContext.measureText(text).width;
}

function getSegmentWidth(text: string, fontFamily: string): number {
  return Math.ceil(measureLabelTextWidth(text, 11, fontFamily)) + SEGMENT_HORIZONTAL_PADDING;
}

function getOrderedButtons(buttons: NonNullable<PriceLineLabelBounds['chartLabel']>['buttons'] = []) {
  const inlineButtons = buttons.filter((button) => button.type !== 'tp' && button.type !== 'sl');
  const tpslButtons = buttons.filter((button) => button.type === 'tp' || button.type === 'sl');
  return {
    inlineButtons,
    tpslButtons,
    orderedButtons: [...inlineButtons, ...tpslButtons],
  };
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

  // Current state
  private labelBounds: PriceLineLabelBounds[] = [];
  private pendingOrders: Map<string, PendingOrderUpdate> = new Map();
  private crosshair: CrosshairState = { x: 0, y: 0, visible: false, color: '#787b86' };

  // Drag state
  private activeDrag: {
    node: Konva.Rect;
    group?: Konva.Group;
    type: 'order' | 'tpsl';
    lineId: string;
    positionId?: string;
    buttonType?: 'tp' | 'sl';
    originalY: number;
    originalX?: number;
    originalGroupY?: number;
    originalAbsoluteY?: number;
    originalPrice: number;
    startCenterX?: number;
    partialEnabled?: boolean;
    onCancel?: () => void;
  } | null = null;
  private dragCancelled = false;

  // Countdown timer
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  // Map of lineId -> countdown Konva.Text nodes for efficient text-only updates
  private countdownTextNodes: Map<string, CountdownTextNodeRef[]> = new Map();

  // Cached element groups by lineId for efficient updates
  private cachedLineGroups: Map<string, Konva.Group> = new Map();
  private lastLabelBoundsSignature: string = '';
  private needsFullRebuild: boolean = true;

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
    crosshair?: CrosshairState,
  ): void {
    // Check if we need a full rebuild or can do incremental update
    const newSignature = this.computeSignature(labelBounds);
    const structureChanged = newSignature !== this.lastLabelBoundsSignature;

    this.labelBounds = labelBounds;
    this.pendingOrders = pendingOrders;

    if (crosshair) {
      this.crosshair = crosshair;
    }

    if (structureChanged || this.needsFullRebuild) {
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
   * Excludes position-only properties
   */
  private computeSignature(bounds: PriceLineLabelBounds[]): string {
    // Only include properties that require element rebuild when changed
    // Exclude: price, originalY, adjustedY (handled by position updates)
    return bounds
      .map(
        (b) => {
          const segmentSignature =
            b.chartLabel?.segments
              ?.map((segment) =>
                [
                  segment.text,
                  segment.textShort ?? '',
                  segment.textColor,
                  segment.backgroundColor,
                  segment.borderColor,
                ].join('~'),
              )
              .join('|') ?? '';
          const buttonSignature =
            b.chartLabel?.buttons
              ?.map((button) => [button.type, button.backgroundColor, button.borderColor, button.iconColor].join('~'))
              .join('|') ?? '';
          return [
            b.lineId,
            b.type,
            b.color,
            b.lineStyle,
            b.draggable ? '1' : '0',
            b.width,
            b.height,
            b.lineLength ?? '',
            b.countdownToTime !== undefined ? '1' : '0',
            b.label?.primaryText ?? '',
            b.label?.secondaryText ?? '',
            b.label?.backgroundColor ?? '',
            b.label?.textColor ?? '',
            segmentSignature,
            buttonSignature,
          ].join('|');
        },
      )
      .sort()
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
        const newY = priceToY(bound.price);

        // Update the group's Y position
        // We store the lineY as a custom attribute
        const oldLineY = cachedGroup.getAttr('lineY') ?? 0;
        const deltaY = newY - oldLineY;

        if (Math.abs(deltaY) > 0.1) {
          cachedGroup.y(cachedGroup.y() + deltaY);
          cachedGroup.setAttr('lineY', newY);
        }

        cachedGroup.opacity(this.pendingOrders.has(bound.lineId) ? 0.5 : 1);
        this.setCurrentBound(cachedGroup, bound);
        this.updateLineContent(cachedGroup, bound);
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

  isDragging(): boolean {
    return this.activeDrag !== null;
  }

  getDragType(): 'order' | 'tpsl' | null {
    return this.activeDrag?.type ?? null;
  }

  getDragLineId(): string | null {
    return this.activeDrag?.lineId ?? null;
  }

  setFontFamily(fontFamily?: string): void {
    const nextFontFamily = resolveFontFamily(fontFamily);
    if (nextFontFamily === this.getTextFontFamily()) return;
    this.options.fontFamily = nextFontFamily;
    this.needsFullRebuild = true;
    this.render();
  }

  private getTextFontFamily(): string {
    return resolveFontFamily(this.options.fontFamily);
  }

  private setCurrentBound(group: Konva.Group, bound: PriceLineLabelBounds): void {
    group.setAttr('boundData', bound);
    this.syncCountdownTargets(bound);
  }

  private getCurrentBound(group: Konva.Group, fallback: PriceLineLabelBounds): PriceLineLabelBounds {
    return (group.getAttr('boundData') as PriceLineLabelBounds | undefined) ?? fallback;
  }

  private syncCountdownTargets(bound: PriceLineLabelBounds): void {
    if (bound.countdownToTime === undefined) return;
    const refs = this.countdownTextNodes.get(bound.lineId);
    if (!refs) return;
    for (const ref of refs) {
      ref.targetTime = bound.countdownToTime;
    }
  }

  private updateLineContent(group: Konva.Group, bound: PriceLineLabelBounds): void {
    const refs = group.getAttr('contentRefs') as CachedLineContentRefs | undefined;
    if (!refs) return;

    if (bound.type !== 'price') {
      refs.priceAxisRect?.fill(bound.label.backgroundColor || bound.color);
    }
    refs.priceAxisRect?.stroke(bound.color);

    refs.priceAxisPrimaryText?.text(bound.label.primaryText);
    refs.priceAxisPrimaryText?.fill(bound.label.textColor || (bound.type === 'price' ? bound.color : '#ffffff'));

    if (refs.priceAxisSecondaryText) {
      if (bound.countdownToTime !== undefined) {
        refs.priceAxisSecondaryText.text(formatCountdown(bound.countdownToTime));
      } else {
        refs.priceAxisSecondaryText.text(bound.label.secondaryText || '');
      }
      refs.priceAxisSecondaryText.fill(bound.label.textColor || (bound.type === 'price' ? bound.color : '#ffffff'));
    }

    const useNarrowText = this.options.width < 400;
    bound.chartLabel?.segments.forEach((segment, index) => {
      const text = useNarrowText && segment.textShort ? segment.textShort : segment.text;
      refs.segmentRects?.[index]?.fill(segment.backgroundColor);
      refs.segmentRects?.[index]?.stroke(segment.borderColor);
      refs.segmentTexts?.[index]?.text(text);
      refs.segmentTexts?.[index]?.fill(segment.textColor);
    });

    const { orderedButtons } = getOrderedButtons(bound.chartLabel?.buttons || []);
    orderedButtons.forEach((button, index) => {
      refs.buttonRects?.[index]?.fill(button.backgroundColor);
      refs.buttonRects?.[index]?.stroke(button.borderColor);
      refs.buttonTexts?.[index]?.fill(button.iconColor);
      refs.buttonIcons?.[index]?.forEach((icon) => icon.stroke(button.iconColor));
    });
  }

  /**
   * Dispose and clean up
   */
  dispose(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    document.removeEventListener('keydown', this.handleKeyDown, true);
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

    for (const [, nodes] of this.countdownTextNodes) {
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
    this.countdownTextNodes.clear(); // Clear countdown text node references
    this.crosshairVertical = null;
    this.crosshairHorizontal = null;

    const { width, margins, priceToY } = this.options;

    // Check if we need countdown timer
    const hasCountdown = this.labelBounds.some((b) => b.countdownToTime !== undefined);
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
    const nonFloating = this.labelBounds.filter((b) => !b.floatingLabel);
    const floating = this.labelBounds.filter((b) => b.floatingLabel);

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
    const lineY = priceToY(bound.price);
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
    const lineDash = bound.lineStyle === 'dashed' ? [4, 4] : bound.lineStyle === 'dotted' ? [2, 2] : [];

    // Create group for this price line
    const lineGroup = new Konva.Group({ opacity });
    lineGroup.setAttr('lineY', lineY); // Store for fast position updates
    this.setCurrentBound(lineGroup, bound);
    this.group.add(lineGroup);
    this.cachedLineGroups.set(bound.lineId, lineGroup);

    if (lineType === 'price') {
      // Simple price line
      const lineEndX = priceAxisLabelX;

      // Skip line if rendered on canvas
      if (!bound.renderLineOnCanvas) {
        lineGroup.add(
          new Konva.Line({
            points: [margins.left, lineY, lineEndX, lineY],
            stroke: bound.color,
            strokeWidth: bound.lineWidth || 1,
            dash: lineDash,
          }),
        );
      }

      // Connector line if offset
      if (Math.abs(labelCenterY - lineY) > 2) {
        lineGroup.add(
          new Konva.Line({
            points: [priceAxisLabelX, lineY, priceAxisLabelX, labelCenterY],
            stroke: bound.color,
            strokeWidth: 1,
            opacity: 0.5,
          }),
        );
      }

      // Price axis label
      this.renderPriceAxisLabel(lineGroup, bound, priceAxisLabelX, priceAxisLabelY);
    } else {
      // Trading line (order/position) with chart label
      this.renderTradingLine(lineGroup, bound, lineY, labelCenterY, priceAxisLabelX, priceAxisLabelY, lineDash);
    }
  }

  private renderPriceAxisLabel(group: Konva.Group, bound: PriceLineLabelBounds, x: number, y: number): void {
    const secondaryText = bound.countdownToTime ? formatCountdown(bound.countdownToTime) : bound.label.secondaryText;
    const refs = (group.getAttr('contentRefs') as CachedLineContentRefs | undefined) || {};
    const fontFamily = this.getTextFontFamily();

    // Border-only label
    const priceAxisRect = new Konva.Rect({
      x,
      y,
      width: bound.width,
      height: bound.height,
      stroke: bound.color,
      strokeWidth: 1,
      cornerRadius: 2,
      listening: false,
    });
    group.add(priceAxisRect);
    refs.priceAxisRect = priceAxisRect;

    if (secondaryText) {
      // Two-line label
      const primaryTextNode = new Konva.Text({
        x,
        y: y + 1,
        width: bound.width,
        height: bound.height / 2,
        text: bound.label.primaryText,
        fontSize: 11,
        fontFamily,
        fill: bound.label.textColor || bound.color,
        align: 'center',
        verticalAlign: 'middle',
        listening: false,
      });
      group.add(primaryTextNode);
      refs.priceAxisPrimaryText = primaryTextNode;
      const secondaryTextNode = new Konva.Text({
        x,
        y: y + bound.height / 2 - 1,
        width: bound.width,
        height: bound.height / 2,
        text: secondaryText,
        fontSize: 11,
        fontFamily,
        fill: bound.label.textColor || bound.color,
        align: 'center',
        verticalAlign: 'middle',
        listening: false,
      });
      group.add(secondaryTextNode);
      refs.priceAxisSecondaryText = secondaryTextNode;

      // Store reference for efficient countdown updates
      if (bound.countdownToTime !== undefined) {
        const existing = this.countdownTextNodes.get(bound.lineId) || [];
        existing.push({ text: secondaryTextNode, targetTime: bound.countdownToTime });
        this.countdownTextNodes.set(bound.lineId, existing);
      }
    } else {
      const primaryTextNode = new Konva.Text({
        x,
        y,
        width: bound.width,
        height: bound.height,
        text: bound.label.primaryText,
        fontSize: 11,
        fontFamily,
        fill: bound.label.textColor || bound.color,
        align: 'center',
        verticalAlign: 'middle',
        listening: false,
      });
      group.add(primaryTextNode);
      refs.priceAxisPrimaryText = primaryTextNode;
    }

    group.setAttr('contentRefs', refs);
  }

  private renderTradingLine(
    group: Konva.Group,
    bound: PriceLineLabelBounds,
    lineY: number,
    labelCenterY: number,
    priceAxisLabelX: number,
    priceAxisLabelY: number,
    lineDash: number[],
  ): void {
    const { width, margins, yToPrice, priceToY } = this.options;
    const fontFamily = this.getTextFontFamily();
    const chartLabel = bound.chartLabel;
    const isDraggable = bound.draggable ?? false;

    // Calculate chart label dimensions
    let chartLabelWidth = 0;
    let segmentsWidth = 0;
    let chartLabelX = margins.left;
    const useNarrowText = width < 400;
    const buttons = chartLabel?.buttons || [];
    const { tpslButtons, orderedButtons } = getOrderedButtons(buttons);
    const tpslGap = tpslButtons.length > 0 ? 6 : 0;

    if (chartLabel && chartLabel.segments.length > 0) {
      for (const segment of chartLabel.segments) {
        const text = useNarrowText && segment.textShort ? segment.textShort : segment.text;
        segmentsWidth += getSegmentWidth(text, fontFamily);
      }
      chartLabelWidth = segmentsWidth + tpslGap;
      for (const button of orderedButtons) {
        chartLabelWidth += button.type === 'tp' || button.type === 'sl' ? 24 : 16;
      }

      const lineLength = bound.lineLength ?? 100;
      const maxLabelX = width - margins.right - chartLabelWidth;
      const minLabelX = margins.left;
      chartLabelX = minLabelX + ((maxLabelX - minLabelX) * (100 - lineLength)) / 100;
    }

    // Left line segment
    if (chartLabel && chartLabel.segments.length > 0 && bound.extendLeft !== false) {
      group.add(
        new Konva.Line({
          points: [margins.left, lineY, chartLabelX - 1, lineY],
          stroke: bound.color,
          strokeWidth: bound.lineWidth || 1,
          dash: lineDash,
        }),
      );
    }

    // Right line segment (from end of segments to price axis)
    if (chartLabel && chartLabel.segments.length > 0) {
      group.add(
        new Konva.Line({
          points: [chartLabelX + segmentsWidth + 2, lineY, priceAxisLabelX - PRICE_AXIS_RIGHT_PADDING, lineY],
          stroke: bound.color,
          strokeWidth: bound.lineWidth || 1,
          dash: lineDash,
        }),
      );
    }

    // Invisible drag handle for segments
    if (isDraggable && chartLabel && chartLabel.segments.length > 0 && segmentsWidth > 0) {
      const dragRectX = chartLabelX - 2;
      const dragRect = new Konva.Rect({
        x: dragRectX,
        y: lineY - TOUCH_TARGET_HEIGHT / 2,
        width: segmentsWidth + 4,
        height: TOUCH_TARGET_HEIGHT,
        // Use rgba with very low alpha for hit detection - 'transparent' may not work in all cases
        fill: 'rgba(0, 0, 0, 0.01)',
        draggable: true,
        listening: true, // Explicitly enable listening
      });
      dragRect.dragDistance(0);

      let dragStartY = 0;

      dragRect.on('mousedown touchstart', () => {
        if (!this.activeDrag) {
          dragRect.startDrag();
        }
      });

      dragRect.on('dragstart', () => {
        dragStartY = dragRect.y();
        this.activeDrag = {
          node: dragRect,
          group,
          type: 'order',
          lineId: bound.lineId,
          originalY: lineY,
          originalGroupY: group.y(),
          originalAbsoluteY: dragRect.getAbsolutePosition().y + TOUCH_TARGET_HEIGHT / 2,
          originalPrice: bound.price,
        };
        this.dragCancelled = false;
        this.options.onCursorChange?.('grabbing');
      });

      dragRect.on('dragmove', () => {
        // Constrain to vertical only
        dragRect.x(dragRectX);
        const activeDrag = this.activeDrag;
        if (!activeDrag || activeDrag.type !== 'order' || activeDrag.node !== dragRect || !activeDrag.group) return;

        const currentAbsoluteY = dragRect.getAbsolutePosition().y + TOUCH_TARGET_HEIGHT / 2;
        const deltaY = currentAbsoluteY - (activeDrag.originalAbsoluteY ?? activeDrag.originalY);
        activeDrag.group.y((activeDrag.originalGroupY ?? 0) + deltaY);
        activeDrag.group.setAttr('lineY', activeDrag.originalY + deltaY);
        dragRect.y(dragStartY);
        this.layer.batchDraw();
      });

      dragRect.on('dragend', () => {
        const activeDrag = this.activeDrag;
        const finalY =
          (activeDrag?.group?.getAttr('lineY') as number | undefined) ??
          dragRect.getAbsolutePosition().y + TOUCH_TARGET_HEIGHT / 2;
        const finalPrice = yToPrice(finalY);
        const currentBound = this.getCurrentBound(group, bound);

        dragRect.y(dragStartY);

        if (!this.dragCancelled && Math.abs(finalY - lineY) > 1) {
          this.options.onOrderMove?.(currentBound.lineId, finalPrice);
        } else if (activeDrag?.group) {
          activeDrag.group.y(activeDrag.originalGroupY ?? 0);
          activeDrag.group.setAttr('lineY', activeDrag.originalY);
        }
        this.dragCancelled = false;
        this.activeDrag = null;
        this.layer.batchDraw();
        // Reset to crosshair - the mouse position may have changed during drag
        // and the rect position was reset, so we can't assume mouse is still over it
        this.options.onCursorChange?.('crosshair');
      });

      dragRect.on('mouseenter', () => this.options.onCursorChange?.('grab'));
      dragRect.on('mouseleave', () => {
        if (!this.activeDrag) {
          this.options.onCursorChange?.('crosshair');
        }
      });

      group.add(dragRect);
    }

    // Render chart label segments
    if (chartLabel && chartLabel.segments.length > 0) {
      let currentX = chartLabelX;
      const segmentGroup = new Konva.Group({ listening: false });
      const refs = (group.getAttr('contentRefs') as CachedLineContentRefs | undefined) || {};
      refs.segmentRects = [];
      refs.segmentTexts = [];

      for (let i = 0; i < chartLabel.segments.length; i++) {
        const segment = chartLabel.segments[i];
        const text = useNarrowText && segment.textShort ? segment.textShort : segment.text;
        const textWidth = getSegmentWidth(text, fontFamily);
        const isFirst = i === 0;
        const isLast = i === chartLabel.segments.length - 1;

        const segmentRect = new Konva.Rect({
          x: currentX,
          y: lineY - LABEL_HEIGHT / 2,
          width: textWidth,
          height: LABEL_HEIGHT,
          fill: segment.backgroundColor,
          stroke: segment.borderColor,
          strokeWidth: 1,
          cornerRadius: isFirst && isLast ? 2 : isFirst ? [2, 0, 0, 2] : isLast ? [0, 2, 2, 0] : 0,
        });
        const segmentText = new Konva.Text({
          x: currentX,
          y: lineY - LABEL_HEIGHT / 2,
          width: textWidth,
          height: LABEL_HEIGHT,
          text,
          fontSize: 11,
          fontFamily,
          fill: segment.textColor,
          align: 'center',
          verticalAlign: 'middle',
        });
        segmentGroup.add(segmentRect);
        segmentGroup.add(segmentText);
        refs.segmentRects.push(segmentRect);
        refs.segmentTexts.push(segmentText);

        currentX += textWidth;
      }

      group.add(segmentGroup);

      refs.buttonRects = [];
      refs.buttonTexts = [];
      refs.buttonIcons = [];

      for (let i = 0; i < orderedButtons.length; i++) {
        const button = orderedButtons[i];
        const isTPSL = button.type === 'tp' || button.type === 'sl';
        const buttonWidth = isTPSL ? 24 : 16;
        const prevButton = orderedButtons[i - 1];
        const nextButton = orderedButtons[i + 1];
        const startsTPSLGroup = isTPSL && prevButton && prevButton.type !== 'tp' && prevButton.type !== 'sl';
        const isFirstInline = !isTPSL && (!prevButton || prevButton.type === 'tp' || prevButton.type === 'sl');
        const isLastInline = !isTPSL && (!nextButton || nextButton.type === 'tp' || nextButton.type === 'sl');
        const isFirstTPSL = isTPSL && (!prevButton || prevButton.type !== 'tp' && prevButton.type !== 'sl');
        const isLastTPSL = isTPSL && (!nextButton || nextButton.type !== 'tp' && nextButton.type !== 'sl');

        if (startsTPSLGroup || (i === 0 && isTPSL && tpslGap > 0)) {
          currentX += tpslGap;
        }

        const buttonGroup = new Konva.Group();
        const buttonRect = new Konva.Rect({
          x: currentX,
          y: lineY - LABEL_HEIGHT / 2,
          width: buttonWidth,
          height: LABEL_HEIGHT,
          fill: button.backgroundColor,
          stroke: button.borderColor,
          strokeWidth: 1,
          listening: !isTPSL,
          cornerRadius: isTPSL
            ? isFirstTPSL && isLastTPSL
              ? 2
              : isFirstTPSL
                ? [2, 0, 0, 2]
                : isLastTPSL
                  ? [0, 2, 2, 0]
                  : 0
            : isLastInline
              ? [0, 2, 2, 0]
              : 0,
        });

        buttonGroup.add(buttonRect);
        refs.buttonRects.push(buttonRect);

        if (button.type === 'tp' || button.type === 'sl') {
          const buttonText = new Konva.Text({
            x: currentX,
            y: lineY - LABEL_HEIGHT / 2,
            width: buttonWidth,
            height: LABEL_HEIGHT,
            text: button.type === 'tp' ? 'TP' : 'SL',
            fontSize: 10,
            fontFamily,
            fontStyle: 'bold',
            fill: button.iconColor,
            align: 'center',
            verticalAlign: 'middle',
            listening: false,
          });
          buttonGroup.add(buttonText);
          refs.buttonTexts.push(buttonText);

          const hitRect = new Konva.Rect({
            x: currentX,
            y: lineY - LABEL_HEIGHT / 2,
            width: buttonWidth,
            height: LABEL_HEIGHT,
            fill: 'rgba(0, 0, 0, 0.01)',
            draggable: true,
            listening: true,
          });
          hitRect.dragDistance(0);
          const buttonType = button.type;
          const originalX = currentX;
          const originalY = lineY - LABEL_HEIGHT / 2;
          const startCenterX = originalX + buttonWidth / 2;

          hitRect.on('mousedown touchstart', () => {
            if (!this.activeDrag) {
              hitRect.startDrag();
            }
          });

          hitRect.on('dragstart', () => {
            const currentBound = this.getCurrentBound(group, bound);
            this.activeDrag = {
              node: hitRect,
              type: 'tpsl',
              lineId: currentBound.lineId,
              positionId: currentBound.positionId || currentBound.lineId,
              buttonType,
              originalX,
              originalY,
              originalPrice: currentBound.price,
              startCenterX,
              partialEnabled: currentBound.partialEnabled ?? false,
              onCancel: () => {
                this.options.onTPSLDragCancel?.();
              },
            };
            this.dragCancelled = false;
            this.options.onCursorChange?.('grabbing');
          });

          hitRect.on('dragmove', () => {
            const activeDrag = this.activeDrag;
            if (!activeDrag || activeDrag.type !== 'tpsl' || activeDrag.node !== hitRect) return;

            const currentCenterX = hitRect.x() + buttonWidth / 2;
            const currentCenterY = hitRect.y() + LABEL_HEIGHT / 2;
            const price = yToPrice(currentCenterY);
            const currentBound = this.getCurrentBound(group, bound);
            const partialPercent = activeDrag.partialEnabled
              ? calculatePartialPercent(activeDrag.startCenterX || startCenterX, currentCenterX)
              : 100;

            if (buttonType === 'tp') {
              currentBound.callbacks?.onTPMove?.(price, partialPercent);
              this.options.onTPMovePreview?.(
                activeDrag.positionId || currentBound.lineId,
                price,
                partialPercent,
                activeDrag.startCenterX || startCenterX,
                currentCenterX,
              );
            } else {
              currentBound.callbacks?.onSLMove?.(price, partialPercent);
              this.options.onSLMovePreview?.(
                activeDrag.positionId || currentBound.lineId,
                price,
                partialPercent,
                activeDrag.startCenterX || startCenterX,
                currentCenterX,
              );
            }
          });

          hitRect.on('dragend', () => {
            const activeDrag = this.activeDrag;
            if (!activeDrag || activeDrag.type !== 'tpsl' || activeDrag.node !== hitRect) return;

            const currentCenterX = hitRect.x() + buttonWidth / 2;
            const currentCenterY = hitRect.y() + LABEL_HEIGHT / 2;
            const deltaX = Math.abs(currentCenterX - (activeDrag.startCenterX || startCenterX));
            const deltaY = Math.abs(currentCenterY - (activeDrag.originalY + LABEL_HEIGHT / 2));
            const price = yToPrice(currentCenterY);
            const currentBound = this.getCurrentBound(group, bound);
            const partialPercent = activeDrag.partialEnabled
              ? calculatePartialPercent(activeDrag.startCenterX || startCenterX, currentCenterX)
              : undefined;

            hitRect.x(activeDrag.originalX || originalX);
            hitRect.y(activeDrag.originalY);
            this.activeDrag = null;

            if (!this.dragCancelled && (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD)) {
              if (buttonType === 'tp') {
                currentBound.callbacks?.onTPMoveEnd?.(price, partialPercent);
              } else {
                currentBound.callbacks?.onSLMoveEnd?.(price, partialPercent);
              }
              this.options.onTPSLDragEnd?.();
            } else if (!this.dragCancelled) {
              if (buttonType === 'tp') {
                currentBound.callbacks?.onTPClick?.();
                this.options.onTPClick?.(activeDrag.positionId || currentBound.lineId);
              } else {
                currentBound.callbacks?.onSLClick?.();
                this.options.onSLClick?.(activeDrag.positionId || currentBound.lineId);
              }
              this.options.onTPSLDragCancel?.();
            }

            this.dragCancelled = false;
            this.options.onCursorChange?.('crosshair');
          });

          hitRect.on('mouseenter', () => this.options.onCursorChange?.('pointer'));
          hitRect.on('mouseleave', () => {
            if (!this.activeDrag) {
              this.options.onCursorChange?.('crosshair');
            }
          });

          buttonGroup.add(hitRect);
          refs.buttonIcons.push(undefined);
        } else if (button.type === 'cancel' || button.type === 'close') {
          // X icon
          const iconLine1 = new Konva.Line({
            points: [currentX + 5, lineY - 4, currentX + 11, lineY + 4],
            stroke: button.iconColor,
            strokeWidth: 1.5,
            listening: false,
          });
          const iconLine2 = new Konva.Line({
            points: [currentX + 11, lineY - 4, currentX + 5, lineY + 4],
            stroke: button.iconColor,
            strokeWidth: 1.5,
            listening: false,
          });
          buttonGroup.add(iconLine1);
          buttonGroup.add(iconLine2);
          refs.buttonIcons.push([iconLine1, iconLine2]);
          refs.buttonTexts.push(undefined);

          const hitRect = new Konva.Rect({
            x: currentX - 2,
            y: lineY - TOUCH_TARGET_HEIGHT / 2,
            width: buttonWidth + 4,
            height: TOUCH_TARGET_HEIGHT,
            fill: 'rgba(0, 0, 0, 0.01)',
            listening: true,
          });

          hitRect.on('mousedown touchstart', (e) => {
            e.cancelBubble = true;
            if (button.type === 'cancel') {
              this.options.onOrderCancel?.(bound.lineId);
            } else {
              this.options.onPositionClose?.(bound.lineId);
            }
            this.options.onCursorChange?.('crosshair');
          });
          hitRect.on('mouseenter', () => this.options.onCursorChange?.('pointer'));
          hitRect.on('mouseleave', () => this.options.onCursorChange?.('crosshair'));
          buttonGroup.add(hitRect);
        } else if (button.type === 'reverse') {
          const reverseIcon = new Konva.Text({
            x: currentX,
            y: lineY - LABEL_HEIGHT / 2,
            width: buttonWidth,
            height: LABEL_HEIGHT,
            text: '\u21c4',
            fontSize: 11,
            fontFamily,
            fill: button.iconColor,
            align: 'center',
            verticalAlign: 'middle',
            listening: false,
          });
          buttonGroup.add(reverseIcon);
          refs.buttonTexts.push(reverseIcon);
          refs.buttonIcons.push(undefined);

          const hitRect = new Konva.Rect({
            x: currentX - 2,
            y: lineY - TOUCH_TARGET_HEIGHT / 2,
            width: buttonWidth + 4,
            height: TOUCH_TARGET_HEIGHT,
            fill: 'rgba(0, 0, 0, 0.01)',
            listening: true,
          });

          hitRect.on('mousedown touchstart', (e) => {
            e.cancelBubble = true;
            this.options.onPositionReverse?.(bound.lineId);
            this.options.onCursorChange?.('crosshair');
          });
          hitRect.on('mouseenter', () => this.options.onCursorChange?.('pointer'));
          hitRect.on('mouseleave', () => this.options.onCursorChange?.('crosshair'));
          buttonGroup.add(hitRect);
        } else {
          refs.buttonTexts.push(undefined);
          refs.buttonIcons.push(undefined);
        }

        group.add(buttonGroup);
        currentX += buttonWidth;
        if (button.type === 'tp' && nextButton?.type === 'sl') currentX += 1;
      }

      group.setAttr('contentRefs', refs);
    }

    // Line all the way across if no chart label
    if (!chartLabel || chartLabel.segments.length === 0) {
      group.add(
        new Konva.Line({
          points: [margins.left, lineY, priceAxisLabelX - PRICE_AXIS_RIGHT_PADDING, lineY],
          stroke: bound.color,
          strokeWidth: bound.lineWidth || 1,
          dash: lineDash,
        }),
      );
    }

    // Connector line if offset
    if (Math.abs(labelCenterY - lineY) > 2) {
      group.add(
        new Konva.Line({
          points: [priceAxisLabelX, lineY, priceAxisLabelX, labelCenterY],
          stroke: bound.color,
          strokeWidth: 1,
          opacity: 0.5,
        }),
      );
    }

    // Price axis label (filled for trading lines)
    const secondaryText = bound.countdownToTime ? formatCountdown(bound.countdownToTime) : bound.label.secondaryText;

    const refs = (group.getAttr('contentRefs') as CachedLineContentRefs | undefined) || {};
    const priceAxisRect = new Konva.Rect({
      x: priceAxisLabelX,
      y: priceAxisLabelY,
      width: bound.width,
      height: bound.height,
      fill: bound.label.backgroundColor || bound.color,
      stroke: bound.color,
      strokeWidth: 1,
      cornerRadius: 2,
      listening: false,
    });
    group.add(priceAxisRect);
    refs.priceAxisRect = priceAxisRect;

    if (secondaryText) {
      const fontFamily = this.getTextFontFamily();
      const primaryTextNode = new Konva.Text({
        x: priceAxisLabelX,
        y: priceAxisLabelY + 1,
        width: bound.width,
        height: bound.height / 2,
        text: bound.label.primaryText,
        fontSize: 11,
        fontFamily,
        fill: bound.label.textColor || '#ffffff',
        align: 'center',
        verticalAlign: 'middle',
        listening: false,
      });
      group.add(primaryTextNode);
      refs.priceAxisPrimaryText = primaryTextNode;
      const tradingSecondaryTextNode = new Konva.Text({
        x: priceAxisLabelX,
        y: priceAxisLabelY + bound.height / 2 - 1,
        width: bound.width,
        height: bound.height / 2,
        text: secondaryText,
        fontSize: 11,
        fontFamily,
        fill: bound.label.textColor || '#ffffff',
        align: 'center',
        verticalAlign: 'middle',
        listening: false,
      });
      group.add(tradingSecondaryTextNode);
      refs.priceAxisSecondaryText = tradingSecondaryTextNode;

      // Store reference for efficient countdown updates
      if (bound.countdownToTime !== undefined) {
        const existing = this.countdownTextNodes.get(bound.lineId) || [];
        existing.push({ text: tradingSecondaryTextNode, targetTime: bound.countdownToTime });
        this.countdownTextNodes.set(bound.lineId, existing);
      }
    } else {
      const fontFamily = this.getTextFontFamily();
      const primaryTextNode = new Konva.Text({
        x: priceAxisLabelX,
        y: priceAxisLabelY,
        width: bound.width,
        height: bound.height,
        text: bound.label.primaryText,
        fontSize: 11,
        fontFamily,
        fill: bound.label.textColor || '#ffffff',
        align: 'center',
        verticalAlign: 'middle',
        listening: false,
      });
      group.add(primaryTextNode);
      refs.priceAxisPrimaryText = primaryTextNode;
    }

    group.setAttr('contentRefs', refs);
  }

  // ============================================================================
  // Private: Crosshair
  // ============================================================================

  private updateCrosshair(): void {
    const { height } = this.options;

    // Remove old crosshair lines (recreated each frame — lightweight, no interactions)
    this.crosshairVertical?.destroy();
    this.crosshairHorizontal?.destroy();
    this.crosshairVertical = null;
    this.crosshairHorizontal = null;

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
    // Context menu "+" button is drawn by ChartCore on the crosshair canvas (not Konva)
  }

  // ============================================================================
  // Private: Keyboard Handler
  // ============================================================================

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.activeDrag) {
      const activeDrag = this.activeDrag;
      this.dragCancelled = true;
      activeDrag.node.stopDrag();
      if (activeDrag.type === 'order') {
        if (activeDrag.group) {
          activeDrag.group.y(activeDrag.originalGroupY ?? 0);
          activeDrag.group.setAttr('lineY', activeDrag.originalY);
        }
        activeDrag.node.y(activeDrag.originalY - TOUCH_TARGET_HEIGHT / 2);
      } else {
        if (activeDrag.originalX !== undefined) {
          activeDrag.node.x(activeDrag.originalX);
        }
        activeDrag.node.y(activeDrag.originalY);
      }
      activeDrag.onCancel?.();
      this.activeDrag = null;
      this.layer.batchDraw();
      this.options.onCursorChange?.('crosshair');
    }
  };

  private setupKeyboardHandler(): void {
    document.addEventListener('keydown', this.handleKeyDown, true);
  }
}
