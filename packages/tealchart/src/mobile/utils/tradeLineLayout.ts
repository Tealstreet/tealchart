import type { ChartLabelButton, ChartLabelSegment, OrderLineRenderData, PositionLineRenderData } from '../../types';
import type { ChartDimensions } from './coordinates';

import { getOemsOrderObjectId, getOemsPositionObjectId } from '../../interaction/oemsLineState';
import { computeTradingLineLabelMinX, MOBILE_CHART_CHROME_METRICS } from '../../layout/chartGeometry';
import {
  orderTradeLineButtonsForDisplay,
  resolveOrderTradeLineLabel,
  resolvePositionTradeLineLabel,
} from '../../utils/tradeLineLabel';

export type NativeTradeLineBorderStyle = 'solid' | 'dashed' | 'dotted';
export type NativeTradeLineDashArray = readonly number[] | undefined;
export type NativeTradeLineObjectType = 'order' | 'position';
export type NativeTradeLineActionType = ChartLabelButton['type'];
export type NativeTradeLineCornerStyle = 'all' | 'left' | 'right' | 'none';

export interface NativeSelectedTradeLine {
  objectType: NativeTradeLineObjectType;
  objectId: string;
}

const ACTION_BUTTON_WIDTH = 16;
const BRACKET_BUTTON_WIDTH = 26;
const DEFAULT_CHARACTER_WIDTH = 6.8;
const DEFAULT_PRICE_LABEL_MIN_WIDTH = 50;
const LABEL_TO_LINE_GAP = 2;
export const NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X = 6;
const SEGMENT_BORDER_OVERLAP = 1;
const DEFAULT_PRICE_DECIMALS = 2;
const MAX_PRICE_DECIMALS = 20;
const SEGMENT_HORIZONTAL_PADDING = 8;
const BRACKET_GAP = 6;
const TRADE_LINE_MIN_LABEL_WIDTH = 88;
const TRADE_LABEL_HIT_SLOP = 8;
const MIN_VISIBLE_SEGMENT_TEXT_WIDTH = 1;
const numberFormatCache = new Map<number, Intl.NumberFormat>();

export interface NativeOrderDragZone {
  objectId: string;
  price: number;
  x1: number;
  x2: number;
}

export interface NativeTradeLineActionZone {
  objectType: NativeTradeLineObjectType;
  objectId: string;
  actionType: NativeTradeLineActionType;
  price: number;
  entryPrice: number;
  dragPrice?: number;
  partialEnabled: boolean;
  positionNotional: number;
  positionIsLong: boolean;
  /** Fill for the drag preview's tag and zone - tinted to sit behind text. */
  color: string;
  /** Stroke for the drag preview's price line - the bracket's own colour. */
  lineColor: string;
  x1: number;
  x2: number;
}

export interface NativeTradeLineRow {
  objectType: NativeTradeLineObjectType;
  objectId: string;
  price: number;
  x1?: number;
  x2?: number;
}

export interface NativeTradeLineSegmentGeometry extends ChartLabelSegment {
  x: number;
  width: number;
  textX: number;
  displayText: string;
  corners: NativeTradeLineCornerStyle;
}

export interface NativeTradeLineButtonGeometry extends ChartLabelButton {
  x: number;
  width: number;
  textX: number;
  displayIcon: string;
  corners: NativeTradeLineCornerStyle;
}

export interface NativeTradeLineGeometry {
  objectType: NativeTradeLineObjectType;
  objectId: string;
  price: number;
  fitting: NativeTradeLineFittingState;
  priceLabelText: string;
  priceLabelTextX: number;
  labelX: number;
  labelWidth: number;
  leftLineStartX: number;
  leftLineEndX: number;
  rightLineStartX: number;
  rightLineEndX: number;
  priceLabelX: number;
  priceLabelWidth: number;
  segments: NativeTradeLineSegmentGeometry[];
  buttons: NativeTradeLineButtonGeometry[];
  /** Bridges the bracket gap so TP/SL reads as part of the label, not a loose chip. */
  bracketConnector: NativeTradeLineBracketConnector | null;
  dragZone: NativeOrderDragZone | null;
  actionZones: NativeTradeLineActionZone[];
}

export interface NativeTradeLineBracketConnector {
  color: string;
  x1: number;
  x2: number;
}

export interface NativeTradeLineFittingState {
  mode: 'full' | 'compact';
  hiddenActionTypes: NativeTradeLineActionType[];
  hiddenSegmentIndexes: number[];
  truncatedSegmentIndexes: number[];
}

export interface NativeTradeLineGeometryInput {
  dimensions: ChartDimensions;
  line: OrderLineRenderData | PositionLineRenderData;
  priceLabelLane?: NativeTradeLinePriceLabelLane;
  pricePrecision: number;
  textWidth: (text: string) => number;
  smallTextWidth: (text: string) => number;
  priceTextWidth?: (text: string) => number;
  positiveColor: string;
  negativeColor: string;
  chartLabelMinX?: number;
}

export function isNativeSelectedTradeLineMatch(
  selected: NativeSelectedTradeLine | null | undefined,
  line: Pick<NativeTradeLineGeometry, 'objectType' | 'objectId'>,
): boolean {
  return selected?.objectType === line.objectType && selected.objectId === line.objectId;
}

export function promoteNativeSelectedTradeLineGeometry(
  geometries: readonly NativeTradeLineGeometry[],
  selected: NativeSelectedTradeLine | null | undefined,
): NativeTradeLineGeometry[] {
  if (!selected) return [...geometries];
  const promoted: NativeTradeLineGeometry[] = [];
  const rest: NativeTradeLineGeometry[] = [];
  for (const geometry of geometries) {
    if (isNativeSelectedTradeLineMatch(selected, geometry)) {
      promoted.push(geometry);
    } else {
      rest.push(geometry);
    }
  }
  return promoted.length > 0 ? [...rest, ...promoted] : [...geometries];
}

export interface NativeTradeLineLabelParts {
  texts: readonly string[];
  segmentHorizontalPadding: number;
  actionButtonCount?: number;
  bracketButtonCount?: number;
  bracketGap?: number;
}

export interface NativeTradeLineLayoutInput {
  dimensions: ChartDimensions;
  formattedPrice: string;
  priceLabelLane?: NativeTradeLinePriceLabelLane;
  priceLabelWidth?: number;
  labelWidth: number;
  lineLength: number;
  lineLengthUnit?: 'percentage' | 'pixel';
  chartLabelMinX?: number;
}

export interface NativeTradeLineLayout {
  labelWidth: number;
  labelX: number;
  leftLineWidth: number;
  lineStartX: number;
  maxLabelWidth: number;
  priceLabelLeft: number;
  priceLabelWidth: number;
  rightLineLeft: number;
  rightLineWidth: number;
}

export interface NativeTradeLinePriceLabelLane {
  left: number;
  right: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function nativeTradeLineBorderStyle(lineStyle: number): NativeTradeLineBorderStyle {
  switch (lineStyle) {
    case 1:
      return 'dotted';
    case 2:
    case 3:
    case 4:
      return 'dashed';
    default:
      return 'solid';
  }
}

export function nativeTradeLineDashArray(lineStyle: number): NativeTradeLineDashArray {
  switch (lineStyle) {
    case 1:
      return [1, 5];
    case 2:
    case 3:
      return [4, 4];
    case 4:
      return [6, 3];
    default:
      return undefined;
  }
}

export function estimateNativeTradeLineTextWidth(text: string): number {
  return Math.ceil(text.length * DEFAULT_CHARACTER_WIDTH);
}

function fitNativeTradeLineText(text: string, maxWidth: number, textWidth: (text: string) => number): string {
  if (maxWidth < MIN_VISIBLE_SEGMENT_TEXT_WIDTH) return '';
  if (textWidth(text) <= maxWidth) return text;

  const suffix = '...';
  if (textWidth(suffix) > maxWidth) {
    let end = text.length;
    while (end > 0 && textWidth(text.slice(0, end)) > maxWidth) {
      end -= 1;
    }
    return text.slice(0, end);
  }

  let end = text.length;
  while (end > 0 && textWidth(`${text.slice(0, end)}${suffix}`) > maxWidth) {
    end -= 1;
  }

  return end > 0 ? `${text.slice(0, end)}${suffix}` : '';
}

function getMinimumNativeSegmentWidth(text: string, textWidth: (text: string) => number): number {
  if (!text) return 0;
  return Math.ceil(textWidth(text.slice(0, 1))) + SEGMENT_HORIZONTAL_PADDING * 2;
}

function clampPriceDecimals(decimals: number): number {
  return clamp(Math.trunc(decimals), 0, MAX_PRICE_DECIMALS);
}

function getDecimalPlacesFromTickPrecision(precision: number): number {
  if (!Number.isFinite(precision) || precision <= 0) return DEFAULT_PRICE_DECIMALS;
  if (precision >= 1) return 0;

  const precisionText = precision.toString();
  if (precisionText.includes('e')) {
    const [mantissa = '', exponentText = '0'] = precisionText.split('e');
    const exponent = Number.parseInt(exponentText, 10);
    if (exponent >= 0) return 0;

    const decimalIndex = mantissa.indexOf('.');
    const mantissaDecimals = decimalIndex >= 0 ? mantissa.length - decimalIndex - 1 : 0;
    return clampPriceDecimals(-exponent + mantissaDecimals);
  }

  const decimalIndex = precisionText.indexOf('.');
  return decimalIndex >= 0 ? clampPriceDecimals(precisionText.length - decimalIndex - 1) : 0;
}

export function getNativeTradeLinePriceDecimals(pricePrecision = DEFAULT_PRICE_DECIMALS): number {
  if (!Number.isFinite(pricePrecision) || pricePrecision < 0) return DEFAULT_PRICE_DECIMALS;
  if (pricePrecision === 0) return 0;
  if (pricePrecision >= 1) return 0;
  return getDecimalPlacesFromTickPrecision(pricePrecision);
}

export function formatNativeTradeLinePrice(price: number, pricePrecision = DEFAULT_PRICE_DECIMALS): string {
  const decimals = getNativeTradeLinePriceDecimals(pricePrecision);
  let formatter = numberFormatCache.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    });
    numberFormatCache.set(decimals, formatter);
  }

  return formatter.format(Number.isFinite(price) ? price : 0);
}

export function measureNativeTradeLineLabelWidth(parts: NativeTradeLineLabelParts): number {
  const segmentWidth = parts.texts.reduce(
    (width, text) => width + estimateNativeTradeLineTextWidth(text) + parts.segmentHorizontalPadding * 2,
    0,
  );
  const collapsedBorders = Math.max(parts.texts.length - 1, 0) * SEGMENT_BORDER_OVERLAP;
  const actionWidth = (parts.actionButtonCount ?? 0) * ACTION_BUTTON_WIDTH;
  const bracketCount = parts.bracketButtonCount ?? 0;
  const bracketWidth = bracketCount > 0 ? (parts.bracketGap ?? 0) + bracketCount * BRACKET_BUTTON_WIDTH : 0;

  return Math.ceil(segmentWidth - collapsedBorders + actionWidth + bracketWidth);
}

export function getNativeTradeLineActionButtonWidth(): number {
  return ACTION_BUTTON_WIDTH;
}

function getNativeTradeLineSegmentCorners(
  index: number,
  segmentCount: number,
  buttonCount: number,
  buttonsDetached = false,
): NativeTradeLineCornerStyle {
  // Detached buttons no longer continue the pill, so the segments close
  // themselves off rather than running square into a gap.
  const segmentsEndThePill = buttonCount === 0 || buttonsDetached;
  if (index === 0 && segmentCount === 1 && segmentsEndThePill) return 'all';
  if (index === 0) return 'left';
  if (index === segmentCount - 1 && segmentsEndThePill) return 'right';
  return 'none';
}

function getNativeTradeLineButtonCorners(
  index: number,
  buttonCount: number,
  segmentCount: number,
): NativeTradeLineCornerStyle {
  if (buttonCount === 0) return 'none';
  if (segmentCount === 0 && buttonCount === 1) return 'all';
  if (segmentCount === 0 && index === 0) return 'left';
  if (index === buttonCount - 1) return 'right';
  return 'none';
}

function getNativeTradeLineButtonCornersForVisibleButtons(
  buttons: readonly NativeTradeLineButtonGeometry[],
  index: number,
  segmentCount: number,
): NativeTradeLineCornerStyle {
  const button = buttons[index];
  if (!button) return 'none';

  const previous = index > 0 ? buttons[index - 1] : null;
  const next = index < buttons.length - 1 ? buttons[index + 1] : null;
  const hasLeadingContent = segmentCount > 0;
  const startsGroup = !previous || shouldInsertTradeLineButtonGap(previous, button, hasLeadingContent);
  // `button` is never null here, so the leading-content branch cannot fire.
  const endsGroup = !next || shouldInsertTradeLineButtonGap(button, next);
  // A leading bracket button now stands off the segments, so it is detached
  // from them and rounds its left edge rather than butting up square.
  const leadingGap = index === 0 && shouldInsertTradeLineButtonGap(null, button, hasLeadingContent);
  const startsDetachedGroup = startsGroup && (leadingGap || !(index === 0 && segmentCount > 0));

  if (startsDetachedGroup && endsGroup) return 'all';
  if (startsDetachedGroup) return 'left';
  if (endsGroup) return 'right';
  return 'none';
}

export function measureNativeTradeLinePriceLabelWidth(
  formattedPrice: string,
  textWidth = estimateNativeTradeLineTextWidth,
): number {
  return Math.max(
    DEFAULT_PRICE_LABEL_MIN_WIDTH,
    Math.ceil(textWidth(formattedPrice) + NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X * 2),
  );
}

export function getNativeTradeLinePriceLabelCapacityText(pricePrecision = DEFAULT_PRICE_DECIMALS): string {
  return formatNativeTradeLinePrice(999999, pricePrecision);
}

export function getNativeTradeLinePriceLabelCharacterCapacity(priceLabelWidth: number, characterWidth: number): number {
  if (characterWidth <= 0) return 1;
  return Math.max(
    1,
    Math.floor(Math.max(0, priceLabelWidth - NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X * 2) / characterWidth),
  );
}

export function getNativeTradeLineTextBaselineOffset(tradeLabelHeight: number): number {
  return Math.round(tradeLabelHeight / 2 + 5);
}

export function getNativeTradeLinePriceTagTextBaselineOffset(tradeLabelHeight: number): number {
  return getNativeTradeLineTextBaselineOffset(tradeLabelHeight + 2);
}

// Delegating rather than re-deriving: this was a byte-identical third copy of
// the same precedence, and the OEMS store is keyed by the shared one. Any drift
// between them silently stops pending state from rendering.
export function getNativeOrderObjectId(line: OrderLineRenderData): string {
  return getOemsOrderObjectId(line);
}

export function getNativePositionObjectId(line: PositionLineRenderData): string {
  return getOemsPositionObjectId(line);
}

function isOrderLineRenderData(line: OrderLineRenderData | PositionLineRenderData): line is OrderLineRenderData {
  return 'cancellable' in line;
}

function getTradeLineButtonWidth(button: ChartLabelButton): number {
  return button.type === 'tp' || button.type === 'sl' ? BRACKET_BUTTON_WIDTH : ACTION_BUTTON_WIDTH;
}

/**
 * The bracket buttons are their own group and stand off whatever precedes them.
 *
 * `hasLeadingContent` covers the case where they are the first buttons: the
 * thing to their left is then the segment block rather than another button, and
 * they should stand off that too. Without it the gap appeared only when a
 * cancel/close/reverse button happened to be shown, so the same label spaced
 * itself differently depending on which actions were available.
 *
 * With no segments either, there is nothing to stand off and a leading gap
 * would just be a hole before the pill.
 */
function shouldInsertTradeLineButtonGap(
  previous: ChartLabelButton | null,
  next: ChartLabelButton,
  hasLeadingContent = false,
): boolean {
  const nextBracket = next.type === 'tp' || next.type === 'sl';
  if (!previous) return hasLeadingContent && nextBracket;
  const previousBracket = previous.type === 'tp' || previous.type === 'sl';
  return previousBracket !== nextBracket;
}

function getNativeTradeLineActionPrice(
  line: OrderLineRenderData | PositionLineRenderData,
  actionType: NativeTradeLineActionType,
): number {
  if (actionType === 'tp') return line.brackets?.takeProfit ?? line.price;
  if (actionType === 'sl') return line.brackets?.stopLoss ?? line.price;
  return line.price;
}

function measureTradeLineButtonBlockWidth(buttons: readonly ChartLabelButton[], hasLeadingContent = false): number {
  return buttons.reduce((width, button, index) => {
    const previous = index > 0 ? buttons[index - 1] : null;
    const gap = shouldInsertTradeLineButtonGap(previous, button, hasLeadingContent) ? BRACKET_GAP : 0;
    return width + gap + getTradeLineButtonWidth(button);
  }, 0);
}

function getTradeLineButtonPriority(button: ChartLabelButton): number {
  switch (button.type) {
    case 'cancel':
    case 'close':
    case 'reverse':
      return 100;
    case 'tp':
    case 'sl':
      return 50;
    default:
      return 0;
  }
}

function fitTradeLineButtons(
  buttons: readonly ChartLabelButton[],
  availableWidth: number,
  hasLeadingContent = false,
): {
  visibleButtons: ChartLabelButton[];
  hiddenActionTypes: NativeTradeLineActionType[];
} {
  if (measureTradeLineButtonBlockWidth(buttons, hasLeadingContent) <= availableWidth) {
    return {
      visibleButtons: [...buttons],
      hiddenActionTypes: [],
    };
  }

  const selectedIndexes = new Set<number>();
  const candidates = buttons
    .map((button, index) => ({ button, index }))
    .sort((a, b) => getTradeLineButtonPriority(b.button) - getTradeLineButtonPriority(a.button) || a.index - b.index);

  for (const candidate of candidates) {
    const nextIndexes = [...selectedIndexes, candidate.index].sort((a, b) => a - b);
    const nextButtons = nextIndexes.map((index) => buttons[index]);
    if (measureTradeLineButtonBlockWidth(nextButtons, hasLeadingContent) <= availableWidth) {
      selectedIndexes.add(candidate.index);
    }
  }

  return {
    visibleButtons: buttons.filter((_, index) => selectedIndexes.has(index)),
    hiddenActionTypes: buttons.filter((_, index) => !selectedIndexes.has(index)).map((button) => button.type),
  };
}

function measureTradeLineLabelContentWidth(
  segments: readonly ChartLabelSegment[],
  buttons: readonly ChartLabelButton[],
  textWidth: (text: string) => number,
): number {
  const segmentWidth = segments.reduce(
    (width, segment) =>
      width + Math.ceil(textWidth(segment.textShort ?? segment.text)) + SEGMENT_HORIZONTAL_PADDING * 2,
    0,
  );
  // Must account for the leading bracket gap too, or the label asks for 6px
  // less than the geometry spends and the gap is taken out of the segment text
  // instead of widening the label.
  const buttonWidth = measureTradeLineButtonBlockWidth(buttons, segments.length > 0);
  return Math.max(TRADE_LINE_MIN_LABEL_WIDTH, Math.ceil(segmentWidth + buttonWidth));
}

export function buildNativeTradeLineGeometry(input: NativeTradeLineGeometryInput): NativeTradeLineGeometry {
  const { dimensions, line, negativeColor, positiveColor, pricePrecision, smallTextWidth, textWidth } = input;
  const priceTextWidth = input.priceTextWidth ?? smallTextWidth;
  const objectType = isOrderLineRenderData(line) ? 'order' : 'position';
  const objectId = isOrderLineRenderData(line) ? getNativeOrderObjectId(line) : getNativePositionObjectId(line);
  const priceLabelText = formatNativeTradeLinePrice(line.price, pricePrecision);
  const priceLabelWidth = measureNativeTradeLinePriceLabelWidth(priceLabelText, priceTextWidth);
  const label = isOrderLineRenderData(line)
    ? resolveOrderTradeLineLabel(line, positiveColor)
    : resolvePositionTradeLineLabel(line, positiveColor, negativeColor);
  const segments = label.segments;
  const buttons = orderTradeLineButtonsForDisplay(label.buttons ?? []);
  const layout = layoutNativeTradeLine({
    dimensions,
    formattedPrice: priceLabelText,
    priceLabelLane: input.priceLabelLane,
    priceLabelWidth,
    labelWidth: measureTradeLineLabelContentWidth(segments, buttons, textWidth),
    lineLength: line.lineLength,
    lineLengthUnit: line.lineLengthUnit,
    chartLabelMinX: input.chartLabelMinX,
  });
  let currentX = layout.labelX;
  const availableWidth = layout.labelWidth;
  // Measured against the segments we intend to draw; the advance below uses the
  // ones that actually fit. Reserving a gap that then goes undrawn only makes
  // the label narrower, whereas drawing one that was never reserved would open
  // a hole before the pill.
  const hasSegmentCandidates = segments.length > 0;
  const { visibleButtons, hiddenActionTypes } = fitTradeLineButtons(buttons, availableWidth, hasSegmentCandidates);
  const buttonBlockWidth = measureTradeLineButtonBlockWidth(visibleButtons, hasSegmentCandidates);
  let remainingSegmentWidth = Math.max(0, availableWidth - buttonBlockWidth);
  const segmentCandidates = segments
    .map((segment, sourceIndex) => {
      const text = segment.textShort ?? segment.text;
      return {
        segment,
        sourceIndex,
        text,
        minimumWidth: getMinimumNativeSegmentWidth(text, textWidth),
        preferredWidth: Math.ceil(textWidth(text)) + SEGMENT_HORIZONTAL_PADDING * 2,
      };
    })
    .filter((candidate) => candidate.minimumWidth > 0);
  let fittingSegmentCount = 0;
  let minimumSegmentWidth = 0;
  for (const candidate of segmentCandidates) {
    if (minimumSegmentWidth + candidate.minimumWidth > remainingSegmentWidth) break;
    fittingSegmentCount += 1;
    minimumSegmentWidth += candidate.minimumWidth;
  }
  const fittingSegmentCandidates = segmentCandidates.slice(0, fittingSegmentCount);
  const visibleSegmentSourceIndexes = new Set(fittingSegmentCandidates.map((candidate) => candidate.sourceIndex));
  const hiddenSegmentIndexes = segmentCandidates
    .filter((candidate) => !visibleSegmentSourceIndexes.has(candidate.sourceIndex))
    .map((candidate) => candidate.sourceIndex);
  let extraSegmentWidth = Math.max(0, remainingSegmentWidth - minimumSegmentWidth);
  const truncatedSegmentIndexes: number[] = [];
  const segmentGeometry = fittingSegmentCandidates
    .map((candidate) => {
      const preferredExtraWidth = Math.max(0, candidate.preferredWidth - candidate.minimumWidth);
      const extraWidth = Math.min(preferredExtraWidth, extraSegmentWidth);
      const targetWidth = candidate.minimumWidth + extraWidth;
      extraSegmentWidth -= extraWidth;
      if (targetWidth <= SEGMENT_HORIZONTAL_PADDING * 2) return null;
      const displayText = fitNativeTradeLineText(
        candidate.text,
        targetWidth - SEGMENT_HORIZONTAL_PADDING * 2,
        textWidth,
      );
      if (!displayText) return null;
      if (displayText !== candidate.text) truncatedSegmentIndexes.push(candidate.sourceIndex);
      const geometry = {
        ...candidate.segment,
        text: candidate.text,
        displayText,
        x: currentX,
        width: targetWidth,
        textX: currentX + SEGMENT_HORIZONTAL_PADDING,
      };
      currentX += targetWidth;
      remainingSegmentWidth -= targetWidth;
      return geometry;
    })
    .filter((segment): segment is Omit<NativeTradeLineSegmentGeometry, 'corners'> => Boolean(segment));
  let previousButton: ChartLabelButton | null = null;
  let bracketConnector: NativeTradeLineBracketConnector | null = null;
  const buttonGeometry = visibleButtons
    .map((button, index) => {
      const gap = shouldInsertTradeLineButtonGap(previousButton, button, segmentGeometry.length > 0) ? BRACKET_GAP : 0;
      const width = getTradeLineButtonWidth(button);
      if (currentX + gap + width > layout.labelX + availableWidth) return null;
      if (gap > 0) bracketConnector = { color: line.lineColor, x1: currentX, x2: currentX + gap };
      currentX += gap;
      const displayIcon = button.icon;
      const iconWidth = Math.ceil(smallTextWidth(displayIcon));
      const geometry = {
        ...button,
        displayIcon,
        x: currentX,
        width,
        textX: Math.round(currentX + width / 2 - iconWidth / 2),
        corners: getNativeTradeLineButtonCorners(index, visibleButtons.length, segmentGeometry.length),
      };
      currentX += width;
      previousButton = button;
      return geometry;
    })
    .filter((button): button is NativeTradeLineButtonGeometry => Boolean(button));
  const visibleButtonCount = buttonGeometry.length;
  const buttonsDetachedFromSegments =
    segmentGeometry.length > 0 &&
    buttonGeometry.length > 0 &&
    shouldInsertTradeLineButtonGap(null, buttonGeometry[0], true);
  const segmentGeometryWithCorners: NativeTradeLineSegmentGeometry[] = segmentGeometry.map((segment, index) => ({
    ...segment,
    corners: getNativeTradeLineSegmentCorners(
      index,
      segmentGeometry.length,
      visibleButtonCount,
      buttonsDetachedFromSegments,
    ),
  }));
  const buttonGeometryWithCorners: NativeTradeLineButtonGeometry[] = buttonGeometry.map((button, index) => ({
    ...button,
    corners: getNativeTradeLineButtonCornersForVisibleButtons(buttonGeometry, index, segmentGeometryWithCorners.length),
  }));
  const positionData = objectType === 'position' ? (line as PositionLineRenderData).positionData : null;
  const actionZones: NativeTradeLineActionZone[] = buttonGeometryWithCorners.map((button) => ({
    objectType,
    objectId,
    actionType: button.type,
    price: line.price,
    entryPrice: positionData?.entryPrice ?? line.price,
    dragPrice: getNativeTradeLineActionPrice(line, button.type),
    partialEnabled: line.partialEnabled ?? false,
    positionNotional: positionData?.notional ?? 0,
    positionIsLong: positionData?.isLong ?? true,
    color: button.type === 'tp' || button.type === 'sl' ? button.backgroundColor : line.lineColor,
    lineColor: button.accentColor ?? line.lineColor,
    x1: button.x - TRADE_LABEL_HIT_SLOP,
    x2: button.x + button.width + TRADE_LABEL_HIT_SLOP,
  }));
  const dragLabelBodyRightX =
    segmentGeometryWithCorners.length > 0
      ? Math.max(...segmentGeometryWithCorners.map((segment) => segment.x + segment.width))
      : layout.labelX;
  const hasDraggableLabelBody = dragLabelBodyRightX > layout.labelX;
  const renderedLabelWidth = Math.max(0, currentX - layout.labelX);
  const leftLineEndX = line.extendLeft === false ? layout.lineStartX : layout.labelX - LABEL_TO_LINE_GAP;
  const rightLineStartX = layout.labelX + renderedLabelWidth + LABEL_TO_LINE_GAP;
  const measuredPriceTextWidth = Math.min(
    priceTextWidth(priceLabelText),
    Math.max(0, layout.priceLabelWidth - NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X * 2),
  );
  const priceLabelTextX = Math.round(layout.priceLabelLeft + (layout.priceLabelWidth - measuredPriceTextWidth) / 2);

  return {
    objectType,
    objectId,
    price: line.price,
    fitting: {
      mode:
        hiddenActionTypes.length > 0 || hiddenSegmentIndexes.length > 0 || truncatedSegmentIndexes.length > 0
          ? 'compact'
          : 'full',
      hiddenActionTypes,
      hiddenSegmentIndexes,
      truncatedSegmentIndexes,
    },
    priceLabelText,
    priceLabelTextX,
    labelX: layout.labelX,
    labelWidth: renderedLabelWidth,
    leftLineStartX: layout.lineStartX,
    leftLineEndX,
    rightLineStartX,
    rightLineEndX: layout.priceLabelLeft - LABEL_TO_LINE_GAP,
    priceLabelX: layout.priceLabelLeft,
    priceLabelWidth: layout.priceLabelWidth,
    segments: segmentGeometryWithCorners,
    buttons: buttonGeometryWithCorners,
    bracketConnector,
    dragZone:
      objectType === 'order' &&
      isOrderLineRenderData(line) &&
      line.editable &&
      !line.actionState?.isAwaitingCallback &&
      line.callbacks?.onMove &&
      hasDraggableLabelBody
        ? {
            objectId,
            price: line.price,
            x1: layout.labelX,
            x2: dragLabelBodyRightX,
          }
        : null,
    actionZones,
  };
}

export function buildNativeTradeLineGeometries(
  orderLines: readonly OrderLineRenderData[],
  positionLines: readonly PositionLineRenderData[],
  input: Omit<NativeTradeLineGeometryInput, 'line'>,
): NativeTradeLineGeometry[] {
  return [...orderLines, ...positionLines].map((line) => buildNativeTradeLineGeometry({ ...input, line }));
}

export function createNativeOrderDragZones(geometries: readonly NativeTradeLineGeometry[]): NativeOrderDragZone[] {
  return geometries.flatMap((geometry) =>
    geometry.dragZone
      ? [
          {
            objectId: geometry.dragZone.objectId,
            price: geometry.dragZone.price,
            x1: geometry.dragZone.x1,
            x2: geometry.dragZone.x2,
          },
        ]
      : [],
  );
}

export function createNativeTradeLineRows(geometries: readonly NativeTradeLineGeometry[]): NativeTradeLineRow[] {
  return geometries.map((geometry) => ({
    objectType: geometry.objectType,
    objectId: geometry.objectId,
    price: geometry.price,
    x1: geometry.leftLineStartX,
    x2: geometry.priceLabelX + geometry.priceLabelWidth,
  }));
}

export function layoutNativeTradeLine(input: NativeTradeLineLayoutInput): NativeTradeLineLayout {
  const lineStartX = Math.round(
    input.chartLabelMinX ?? computeTradingLineLabelMinX(MOBILE_CHART_CHROME_METRICS, input.dimensions.margins),
  );
  const requestedPriceLabelWidth = input.priceLabelWidth ?? measureNativeTradeLinePriceLabelWidth(input.formattedPrice);
  const priceLabelWidth = input.priceLabelLane
    ? Math.max(requestedPriceLabelWidth, input.priceLabelLane.right - input.priceLabelLane.left)
    : requestedPriceLabelWidth;
  const priceLabelLeft = input.priceLabelLane
    ? Math.round(input.priceLabelLane.right - priceLabelWidth)
    : Math.round(input.dimensions.width - priceLabelWidth - NATIVE_TRADE_LINE_PRICE_LABEL_PADDING_X);
  const lineEndX = Math.max(lineStartX, priceLabelLeft - LABEL_TO_LINE_GAP);
  const maxLabelWidth = Math.max(0, lineEndX - lineStartX - LABEL_TO_LINE_GAP);
  const labelWidth = Math.min(input.labelWidth, maxLabelWidth);
  const maxLabelX = Math.max(lineStartX, lineEndX - labelWidth - LABEL_TO_LINE_GAP);
  const lineRange = maxLabelX - lineStartX;
  const rawLabelX =
    input.lineLengthUnit === 'pixel'
      ? maxLabelX - Math.max(0, input.lineLength)
      : lineStartX + (lineRange * clamp(100 - input.lineLength, 0, 100)) / 100;
  const labelX = Math.round(clamp(rawLabelX, lineStartX, maxLabelX));
  const rightLineLeft = labelX + labelWidth + LABEL_TO_LINE_GAP;

  return {
    labelWidth,
    labelX,
    leftLineWidth: Math.max(0, labelX - lineStartX - LABEL_TO_LINE_GAP),
    lineStartX,
    maxLabelWidth,
    priceLabelLeft,
    priceLabelWidth,
    rightLineLeft,
    rightLineWidth: Math.max(0, lineEndX - rightLineLeft),
  };
}
