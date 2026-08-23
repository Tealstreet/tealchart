/**
 * PriceLineManager - Vanilla Konva class for rendering price lines
 *
 * Handles rendering and interaction for:
 * - Order lines (draggable)
 * - Position lines with TP/SL buttons
 * - Crosshair horizontal/vertical lines
 * - Price axis labels
 */
import type { ChartMargins, PriceLineLabelBounds } from '../types';

import Konva from 'konva';

import { TRADE_LINE_ACCENT_RAIL_WIDTH, TRADE_LINE_DOTTED_DASH_PATTERN } from '../constants';
import { PRICE_AXIS_RIGHT_PADDING } from '../types';
import { resolvePriceAxisTagStyle } from '../utils/priceAxisTagStyle';
import { splitTradeLineButtonsForDisplay } from '../utils/tradeLineLabel';
import { calculatePartialBracketPercent } from './partialBrackets';

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
  /** Callback while order is being dragged */
  onOrderMoving?: (orderId: string, newPrice: number) => void;
  /** Callback when order cancel button is clicked */
  onOrderCancel?: (orderId: string) => void;
  /** Callback when position close button is clicked */
  onPositionClose?: (positionId: string) => void;
  /** Callback when position reverse button is clicked */
  onPositionReverse?: (positionId: string) => void;
  /** Callback when TP button drag ends */
  onTPDragEnd?: (bound: PriceLineLabelBounds, price: number, partialPercent?: number) => void;
  /** Callback when SL button drag ends */
  onSLDragEnd?: (bound: PriceLineLabelBounds, price: number, partialPercent?: number) => void;
  /** Callback when TP button is clicked (without drag) */
  onTPClick?: (bound: PriceLineLabelBounds) => void;
  /** Callback when SL button is clicked (without drag) */
  onSLClick?: (bound: PriceLineLabelBounds) => void;
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
  /** Minimum X for trading labels and line segments, including overlaid chrome such as the left drawing rail. */
  chartLabelMinX?: number;
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
const PRICE_AXIS_LABEL_TEXT_PADDING_X = 6;
const DRAG_THRESHOLD = 5;
const SEGMENT_HORIZONTAL_PADDING = 14;
const ACTION_ICON_STROKE_WIDTH = 2;

interface CachedLineContentRefs {
  priceAxisRect?: Konva.Rect;
  priceAxisPrimaryText?: Konva.Text;
  priceAxisSecondaryText?: Konva.Text;
  segmentRects?: Konva.Rect[];
  segmentAccents?: Array<Konva.Rect | undefined>;
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

function createCloseIcon(x: number, centerY: number, width: number, color: string): Konva.Line[] {
  const centerX = x + width / 2;
  const radius = 4;
  const common = {
    stroke: color,
    strokeWidth: ACTION_ICON_STROKE_WIDTH,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    listening: false,
  };

  return [
    new Konva.Line({
      ...common,
      points: [centerX - radius, centerY - radius, centerX + radius, centerY + radius],
    }),
    new Konva.Line({
      ...common,
      points: [centerX + radius, centerY - radius, centerX - radius, centerY + radius],
    }),
  ];
}

function createCheckIcon(x: number, centerY: number, width: number, color: string): Konva.Line[] {
  const centerX = x + width / 2;
  return [
    new Konva.Line({
      points: [centerX - 5, centerY, centerX - 2, centerY + 3, centerX + 5, centerY - 4],
      stroke: color,
      strokeWidth: ACTION_ICON_STROKE_WIDTH,
      lineCap: 'round',
      lineJoin: 'round',
      listening: false,
    }),
  ];
}

function createReverseIcon(x: number, centerY: number, width: number, color: string): Konva.Arrow[] {
  const left = x + 4;
  const right = x + width - 4;
  const common = {
    stroke: color,
    fill: color,
    strokeWidth: ACTION_ICON_STROKE_WIDTH,
    pointerLength: 3,
    pointerWidth: 3,
    listening: false,
  };

  return [
    new Konva.Arrow({
      ...common,
      points: [left, centerY - 3, right, centerY - 3],
    }),
    new Konva.Arrow({
      ...common,
      points: [right, centerY + 3, left, centerY + 3],
    }),
  ];
}

function getTradingLineMinX(options: PriceLineManagerOptions): number {
  return Math.max(options.margins.left, options.chartLabelMinX ?? options.margins.left);
}

function getPillCornerRadius(isFirst: boolean, isLast: boolean): number | [number, number, number, number] {
  if (isFirst && isLast) return 2;
  if (isFirst) return [2, 0, 0, 2];
  if (isLast) return [0, 2, 2, 0];
  return 0;
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
    crosshair?: CrosshairState,
  ): void {
    // Check if we need a full rebuild or can do incremental update
    const newSignature = this.computeSignature(labelBounds);
    const structureChanged = newSignature !== this.lastLabelBoundsSignature;

    this.labelBounds = labelBounds;

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
      .map((b) => {
        const segmentSignature =
          b.chartLabel?.segments
            ?.map((segment) =>
              [
                segment.text,
                segment.textShort ?? '',
                segment.textColor,
                segment.backgroundColor,
                segment.borderColor,
                // Presence only: the rail's color is repainted on the fast path,
                // but gaining or losing one needs the node rebuilt.
                segment.accentColor ? '1' : '0',
              ].join('~'),
            )
            .join('|') ?? '';
        const buttonSignature =
          b.chartLabel?.buttons
            ?.map((button) =>
              [button.type, button.icon, button.backgroundColor, button.borderColor, button.iconColor].join('~'),
            )
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
          b.lineLengthUnit ?? '',
          b.countdownToTime !== undefined ? '1' : '0',
          b.label?.primaryText ?? '',
          b.label?.secondaryText ?? '',
          b.label?.backgroundColor ?? '',
          b.label?.textColor ?? '',
          b.label?.filled ? '1' : '0',
          segmentSignature,
          buttonSignature,
        ].join('|');
      })
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

        cachedGroup.opacity(bound.actionState?.isAwaitingCallback ? 0.5 : 1);
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

  setChartLabelMinX(chartLabelMinX: number | undefined): void {
    if (this.options.chartLabelMinX === chartLabelMinX) return;
    this.options.chartLabelMinX = chartLabelMinX;
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

    // Unfilled keeps the dark backing rather than going transparent, so the
    // grid cannot read straight through a tag that overlaps it.
    const tagStyle = resolvePriceAxisTagStyle({ type: bound.type, label: bound.label, color: bound.color });
    refs.priceAxisRect?.fill(tagStyle.backgroundColor);
    refs.priceAxisRect?.fillEnabled(true);
    refs.priceAxisRect?.stroke(tagStyle.borderColor);

    refs.priceAxisPrimaryText?.text(bound.label.primaryText);
    refs.priceAxisPrimaryText?.fill(tagStyle.textColor);

    if (refs.priceAxisSecondaryText) {
      if (bound.countdownToTime !== undefined) {
        refs.priceAxisSecondaryText.text(formatCountdown(bound.countdownToTime));
      } else {
        refs.priceAxisSecondaryText.text(bound.label.secondaryText || '');
      }
      refs.priceAxisSecondaryText.fill(tagStyle.textColor);
    }

    const useNarrowText = this.options.width < 400;
    bound.chartLabel?.segments.forEach((segment, index) => {
      const text = useNarrowText && segment.textShort ? segment.textShort : segment.text;
      refs.segmentRects?.[index]?.fill(segment.backgroundColor);
      refs.segmentRects?.[index]?.stroke(segment.borderColor);
      if (segment.accentColor) refs.segmentAccents?.[index]?.fill(segment.accentColor);
      refs.segmentTexts?.[index]?.text(text);
      refs.segmentTexts?.[index]?.fill(segment.textColor);
    });

    const { orderedButtons } = splitTradeLineButtonsForDisplay(bound.chartLabel?.buttons || []);
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
    const { width, margins, priceToY } = this.options;
    const lineY = priceToY(bound.price);
    const lineType = bound.type || 'price';
    const opacity = bound.actionState?.isAwaitingCallback ? 0.5 : 1;

    // Collision offset for label
    const collisionOffset = bound.adjustedY - bound.originalY;
    const labelCenterY = lineY + collisionOffset;

    // Price axis label position
    const priceAxisLabelX = width - bound.width - PRICE_AXIS_RIGHT_PADDING;
    const priceAxisLabelY = labelCenterY - bound.height / 2;

    // Line dash pattern
    const lineDash = bound.lineStyle === 'dashed' ? [4, 4] : bound.lineStyle === 'dotted' ? TRADE_LINE_DOTTED_DASH_PATTERN : [];

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

    // Unfilled keeps the dark backing rather than going transparent, matching
    // updateLineContent - creating the node with the old filled-only rule is
    // what made the tag flicker between the two every time it was rebuilt.
    const tagStyle = resolvePriceAxisTagStyle({ type: bound.type, label: bound.label, color: bound.color });
    const priceAxisRect = new Konva.Rect({
      x,
      y,
      width: bound.width,
      height: bound.height,
      fill: tagStyle.backgroundColor,
      stroke: tagStyle.borderColor,
      strokeWidth: 1,
      cornerRadius: 2,
      listening: false,
    });
    group.add(priceAxisRect);
    refs.priceAxisRect = priceAxisRect;

    if (secondaryText) {
      // Two-line label
      const primaryTextNode = new Konva.Text({
        x: x + PRICE_AXIS_LABEL_TEXT_PADDING_X,
        y: y + 1,
        width: Math.max(0, bound.width - PRICE_AXIS_LABEL_TEXT_PADDING_X * 2),
        height: bound.height / 2,
        text: bound.label.primaryText,
        fontSize: 11,
        fontFamily,
        fill: tagStyle.textColor,
        align: 'right',
        verticalAlign: 'middle',
        listening: false,
      });
      group.add(primaryTextNode);
      refs.priceAxisPrimaryText = primaryTextNode;
      const secondaryTextNode = new Konva.Text({
        x: x + PRICE_AXIS_LABEL_TEXT_PADDING_X,
        y: y + bound.height / 2 - 1,
        width: Math.max(0, bound.width - PRICE_AXIS_LABEL_TEXT_PADDING_X * 2),
        height: bound.height / 2,
        text: secondaryText,
        fontSize: 11,
        fontFamily,
        fill: tagStyle.textColor,
        align: 'right',
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
        x: x + PRICE_AXIS_LABEL_TEXT_PADDING_X,
        y,
        width: Math.max(0, bound.width - PRICE_AXIS_LABEL_TEXT_PADDING_X * 2),
        height: bound.height,
        text: bound.label.primaryText,
        fontSize: 11,
        fontFamily,
        fill: tagStyle.textColor,
        align: 'right',
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
    const { width, margins, yToPrice } = this.options;
    const fontFamily = this.getTextFontFamily();
    const chartLabel = bound.chartLabel;
    const isDraggable = bound.draggable ?? false;

    // Calculate chart label dimensions
    let chartLabelWidth = 0;
    let segmentsWidth = 0;
    const lineStartX = getTradingLineMinX(this.options);
    let chartLabelX = lineStartX;
    const useNarrowText = width < 400;
    const buttons = chartLabel?.buttons || [];
    const { inlineButtons, tpslButtons, orderedButtons } = splitTradeLineButtonsForDisplay(buttons);
    const hasInlineButtons = inlineButtons.length > 0;
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
      const lineLengthUnit = bound.lineLengthUnit ?? 'percentage';
      const maxLabelX = width - margins.right - chartLabelWidth;
      const minLabelX = lineStartX;
      chartLabelX =
        lineLengthUnit === 'pixel'
          ? maxLabelX - Math.max(0, lineLength)
          : minLabelX + ((maxLabelX - minLabelX) * (100 - lineLength)) / 100;
      chartLabelX = Math.max(minLabelX, Math.min(maxLabelX, chartLabelX));
    }

    // Left line segment
    if (chartLabel && chartLabel.segments.length > 0 && bound.extendLeft !== false) {
      if (chartLabelX - 1 > lineStartX) {
        group.add(
          new Konva.Line({
            points: [lineStartX, lineY, chartLabelX - 1, lineY],
            stroke: bound.color,
            strokeWidth: bound.lineWidth || 1,
            dash: lineDash,
          }),
        );
      }
    }

    // Right line segment (from end of full chart label to price axis)
    if (chartLabel && chartLabel.segments.length > 0) {
      const rightLineStartX = chartLabelX + chartLabelWidth + 2;
      const rightLineEndX = priceAxisLabelX - PRICE_AXIS_RIGHT_PADDING;
      if (rightLineEndX > rightLineStartX) {
        group.add(
          new Konva.Line({
            points: [rightLineStartX, lineY, rightLineEndX, lineY],
            stroke: bound.color,
            strokeWidth: bound.lineWidth || 1,
            dash: lineDash,
          }),
        );
      }
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
      dragRect.setAttr('tealchartCursor', 'pointer');
      dragRect.dragDistance(0);

      let dragStartY = 0;

      // Only a round trip still in the air blocks a drag. Blocking on the whole
      // pending window meant a confirmation that never matched - a host that
      // retires the adapter on an amend, a venue that echoes a different shape -
      // left the line un-draggable until the action timed out.
      dragRect.on('mousedown touchstart', () => {
        const currentBound = this.getCurrentBound(group, bound);
        if (currentBound.actionState?.isAwaitingCallback) return;
        if (!this.activeDrag) {
          dragRect.startDrag();
        }
      });

      dragRect.on('dragstart', () => {
        const currentBound = this.getCurrentBound(group, bound);
        if (currentBound.actionState?.isAwaitingCallback) {
          this.dragCancelled = true;
          dragRect.stopDrag();
          return;
        }
        dragStartY = dragRect.y();
        this.activeDrag = {
          node: dragRect,
          group,
          type: 'order',
          lineId: currentBound.lineId,
          originalY: lineY,
          originalGroupY: group.y(),
          originalAbsoluteY: dragRect.getAbsolutePosition().y + TOUCH_TARGET_HEIGHT / 2,
          originalPrice: currentBound.price,
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
        const movingY = activeDrag.originalY + deltaY;
        activeDrag.group.setAttr('lineY', movingY);
        dragRect.y(dragStartY);
        const currentBound = this.getCurrentBound(activeDrag.group, bound);
        this.options.onOrderMoving?.(currentBound.lineId, yToPrice(movingY));
        this.layer.batchDraw();
      });

      dragRect.on('dragend', () => {
        const activeDrag = this.activeDrag;
        if (!activeDrag || activeDrag.type !== 'order' || activeDrag.node !== dragRect || !activeDrag.group) {
          dragRect.y(dragStartY);
          this.dragCancelled = false;
          this.options.onCursorChange?.('crosshair');
          return;
        }
        const finalY =
          (activeDrag.group.getAttr('lineY') as number | undefined) ??
          dragRect.getAbsolutePosition().y + TOUCH_TARGET_HEIGHT / 2;
        const finalPrice = yToPrice(finalY);
        const currentBound = this.getCurrentBound(activeDrag.group, bound);

        dragRect.y(dragStartY);

        if (!this.dragCancelled && Math.abs(finalY - lineY) > 1) {
          // Dragging translates the whole group for smooth motion. The next
          // data-driven update must rebuild against the final price geometry
          // instead of reusing that temporary group transform.
          this.needsFullRebuild = true;
          this.options.onOrderMove?.(currentBound.lineId, finalPrice);
        } else {
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

      dragRect.on('mouseenter', () => this.options.onCursorChange?.('pointer'));
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
      refs.segmentAccents = [];
      refs.segmentTexts = [];

      for (let i = 0; i < chartLabel.segments.length; i++) {
        const segment = chartLabel.segments[i];
        const text = useNarrowText && segment.textShort ? segment.textShort : segment.text;
        const textWidth = getSegmentWidth(text, fontFamily);
        const isFirst = i === 0;
        const isLast = i === chartLabel.segments.length - 1;
        const isLastInMainPill = isLast && !hasInlineButtons;

        const segmentRect = new Konva.Rect({
          x: currentX,
          y: lineY - LABEL_HEIGHT / 2,
          width: textWidth,
          height: LABEL_HEIGHT,
          fill: segment.backgroundColor,
          stroke: segment.borderColor,
          strokeWidth: 1,
          cornerRadius: getPillCornerRadius(isFirst, isLastInMainPill),
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
        // Inset by half the stroke so the rail sits inside the hairline rather
        // than painting over its inner half.
        const accentRect = segment.accentColor
          ? new Konva.Rect({
              x: currentX + 0.5,
              y: lineY - LABEL_HEIGHT / 2 + 0.5,
              width: TRADE_LINE_ACCENT_RAIL_WIDTH,
              height: LABEL_HEIGHT - 1,
              fill: segment.accentColor,
              cornerRadius: isFirst ? [2, 0, 0, 2] : 0,
              listening: false,
            })
          : undefined;

        segmentGroup.add(segmentRect);
        if (accentRect) segmentGroup.add(accentRect);
        segmentGroup.add(segmentText);
        refs.segmentRects.push(segmentRect);
        refs.segmentAccents.push(accentRect);
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
        const isFirstTPSL = isTPSL && (!prevButton || (prevButton.type !== 'tp' && prevButton.type !== 'sl'));
        const isLastTPSL = isTPSL && (!nextButton || (nextButton.type !== 'tp' && nextButton.type !== 'sl'));
        const isFirstInlinePill = isFirstInline && chartLabel.segments.length === 0;

        if (startsTPSLGroup || (i === 0 && isTPSL && tpslGap > 0)) {
          // Bridge the gap so the bracket pill reads as part of the same label
          // rather than a chip floating beside it.
          segmentGroup.add(
            new Konva.Line({
              points: [currentX, lineY, currentX + tpslGap, lineY],
              stroke: bound.color,
              strokeWidth: 1,
              listening: false,
            }),
          );
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
            ? getPillCornerRadius(isFirstTPSL, isLastTPSL)
            : getPillCornerRadius(isFirstInlinePill, isLastInline),
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
          hitRect.setAttr('tealchartCursor', 'pointer');
          hitRect.dragDistance(0);
          const buttonType = button.type;
          const originalX = currentX;
          const originalY = lineY - LABEL_HEIGHT / 2;
          const startCenterX = originalX + buttonWidth / 2;

          hitRect.on('mousedown touchstart', () => {
            const currentBound = this.getCurrentBound(group, bound);
            if (currentBound.actionState?.isAwaitingCallback) return;
            if (!this.activeDrag) {
              hitRect.startDrag();
            }
          });

          hitRect.on('dragstart', () => {
            const currentBound = this.getCurrentBound(group, bound);
            if (currentBound.actionState?.isAwaitingCallback) {
              this.dragCancelled = true;
              hitRect.stopDrag();
              return;
            }
            const startPosition = hitRect.getAbsolutePosition();
            this.activeDrag = {
              node: hitRect,
              type: 'tpsl',
              lineId: currentBound.lineId,
              positionId: currentBound.lineId,
              buttonType,
              originalX,
              originalY,
              originalPrice: currentBound.price,
              originalAbsoluteY: startPosition.y + LABEL_HEIGHT / 2,
              startCenterX: startPosition.x + buttonWidth / 2,
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

            const currentPosition = hitRect.getAbsolutePosition();
            const currentCenterX = currentPosition.x + buttonWidth / 2;
            const currentCenterY = currentPosition.y + LABEL_HEIGHT / 2;
            const price = yToPrice(currentCenterY);
            const currentBound = this.getCurrentBound(group, bound);
            const partialPercent = activeDrag.partialEnabled
              ? calculatePartialBracketPercent(activeDrag.startCenterX ?? startCenterX, currentCenterX)
              : 100;

            if (buttonType === 'tp') {
              currentBound.callbacks?.onTPMove?.(price, partialPercent);
              this.options.onTPMovePreview?.(
                currentBound.lineId,
                price,
                partialPercent,
                activeDrag.startCenterX ?? startCenterX,
                currentCenterX,
              );
            } else {
              currentBound.callbacks?.onSLMove?.(price, partialPercent);
              this.options.onSLMovePreview?.(
                currentBound.lineId,
                price,
                partialPercent,
                activeDrag.startCenterX ?? startCenterX,
                currentCenterX,
              );
            }
          });

          hitRect.on('dragend', () => {
            const activeDrag = this.activeDrag;
            if (!activeDrag || activeDrag.type !== 'tpsl' || activeDrag.node !== hitRect) {
              hitRect.x(originalX);
              hitRect.y(originalY);
              this.dragCancelled = false;
              this.options.onCursorChange?.('crosshair');
              return;
            }

            const currentPosition = hitRect.getAbsolutePosition();
            const currentCenterX = currentPosition.x + buttonWidth / 2;
            const currentCenterY = currentPosition.y + LABEL_HEIGHT / 2;
            const deltaX = Math.abs(currentCenterX - (activeDrag.startCenterX ?? startCenterX));
            const deltaY = Math.abs(
              currentCenterY - (activeDrag.originalAbsoluteY ?? activeDrag.originalY + LABEL_HEIGHT / 2),
            );
            const price = yToPrice(currentCenterY);
            const currentBound = this.getCurrentBound(group, bound);
            const partialPercent = activeDrag.partialEnabled
              ? calculatePartialBracketPercent(activeDrag.startCenterX ?? startCenterX, currentCenterX)
              : undefined;

            hitRect.x(activeDrag.originalX ?? originalX);
            hitRect.y(activeDrag.originalY);
            this.activeDrag = null;

            if (!this.dragCancelled && (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD)) {
              if (buttonType === 'tp') {
                this.options.onTPDragEnd?.(currentBound, price, partialPercent);
              } else {
                this.options.onSLDragEnd?.(currentBound, price, partialPercent);
              }
              this.options.onTPSLDragEnd?.();
            } else if (!this.dragCancelled && !currentBound.actionState?.isPending) {
              // The click shares this hit rect with the drag, but not its rule:
              // a drag supersedes an unconfirmed action, a click would simply
              // submit the same one twice.
              if (buttonType === 'tp') {
                this.options.onTPClick?.(currentBound);
              } else {
                this.options.onSLClick?.(currentBound);
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
          const icons = button.icon === '✓'
            ? createCheckIcon(currentX, lineY, buttonWidth, button.iconColor)
            : createCloseIcon(currentX, lineY, buttonWidth, button.iconColor);
          icons.forEach((icon) => buttonGroup.add(icon));
          refs.buttonTexts.push(undefined);
          refs.buttonIcons.push(icons);

          const hitRect = new Konva.Rect({
            x: currentX - 2,
            y: lineY - TOUCH_TARGET_HEIGHT / 2,
            width: buttonWidth + 4,
            height: TOUCH_TARGET_HEIGHT,
            fill: 'rgba(0, 0, 0, 0.01)',
            listening: true,
          });
          hitRect.setAttr('tealchartCursor', 'pointer');

          hitRect.on('mousedown touchstart', (e) => {
            e.cancelBubble = true;
            const currentBound = this.getCurrentBound(group, bound);
            // Unlike a drag, a cancel or close has nothing to supersede: the
            // action sits unconfirmed until the line leaves the feed, and a
            // second click would submit the same cancel again.
            if (currentBound.actionState?.isPending) return;
            if (button.type === 'cancel') {
              this.options.onOrderCancel?.(currentBound.lineId);
            } else {
              this.options.onPositionClose?.(currentBound.lineId);
            }
            this.options.onCursorChange?.('crosshair');
          });
          hitRect.on('mouseenter', () => this.options.onCursorChange?.('pointer'));
          hitRect.on('mouseleave', () => this.options.onCursorChange?.('crosshair'));
          buttonGroup.add(hitRect);
        } else if (button.type === 'reverse') {
          const icons = createReverseIcon(currentX, lineY, buttonWidth, button.iconColor);
          icons.forEach((icon) => buttonGroup.add(icon));
          refs.buttonTexts.push(undefined);
          refs.buttonIcons.push(icons);

          const hitRect = new Konva.Rect({
            x: currentX - 2,
            y: lineY - TOUCH_TARGET_HEIGHT / 2,
            width: buttonWidth + 4,
            height: TOUCH_TARGET_HEIGHT,
            fill: 'rgba(0, 0, 0, 0.01)',
            listening: true,
          });
          hitRect.setAttr('tealchartCursor', 'pointer');

          hitRect.on('mousedown touchstart', (e) => {
            e.cancelBubble = true;
            const currentBound = this.getCurrentBound(group, bound);
            if (currentBound.actionState?.isPending) return;
            this.options.onPositionReverse?.(currentBound.lineId);
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
          points: [lineStartX, lineY, priceAxisLabelX - PRICE_AXIS_RIGHT_PADDING, lineY],
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

    const secondaryText = bound.countdownToTime ? formatCountdown(bound.countdownToTime) : bound.label.secondaryText;
    const tagStyle = resolvePriceAxisTagStyle({ type: bound.type, label: bound.label, color: bound.color });

    const refs = (group.getAttr('contentRefs') as CachedLineContentRefs | undefined) || {};
    const priceAxisRect = new Konva.Rect({
      x: priceAxisLabelX,
      y: priceAxisLabelY,
      width: bound.width,
      height: bound.height,
      fill: tagStyle.backgroundColor,
      stroke: tagStyle.borderColor,
      strokeWidth: 1,
      cornerRadius: 2,
      listening: false,
    });
    group.add(priceAxisRect);
    refs.priceAxisRect = priceAxisRect;

    if (secondaryText) {
      const fontFamily = this.getTextFontFamily();
      const primaryTextNode = new Konva.Text({
        x: priceAxisLabelX + PRICE_AXIS_LABEL_TEXT_PADDING_X,
        y: priceAxisLabelY + 1,
        width: Math.max(0, bound.width - PRICE_AXIS_LABEL_TEXT_PADDING_X * 2),
        height: bound.height / 2,
        text: bound.label.primaryText,
        fontSize: 11,
        fontFamily,
        fill: tagStyle.textColor,
        align: 'right',
        verticalAlign: 'middle',
        listening: false,
      });
      group.add(primaryTextNode);
      refs.priceAxisPrimaryText = primaryTextNode;
      const tradingSecondaryTextNode = new Konva.Text({
        x: priceAxisLabelX + PRICE_AXIS_LABEL_TEXT_PADDING_X,
        y: priceAxisLabelY + bound.height / 2 - 1,
        width: Math.max(0, bound.width - PRICE_AXIS_LABEL_TEXT_PADDING_X * 2),
        height: bound.height / 2,
        text: secondaryText,
        fontSize: 11,
        fontFamily,
        fill: tagStyle.textColor,
        align: 'right',
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
        x: priceAxisLabelX + PRICE_AXIS_LABEL_TEXT_PADDING_X,
        y: priceAxisLabelY,
        width: Math.max(0, bound.width - PRICE_AXIS_LABEL_TEXT_PADDING_X * 2),
        height: bound.height,
        text: bound.label.primaryText,
        fontSize: 11,
        fontFamily,
        fill: tagStyle.textColor,
        align: 'right',
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
