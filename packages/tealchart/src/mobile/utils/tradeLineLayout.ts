import type { ChartDimensions } from './coordinates';

import { MOBILE_CHART_CHROME_METRICS } from '../../layout/chartGeometry';

export type NativeTradeLineBorderStyle = 'solid' | 'dashed' | 'dotted';
export type NativeTradeLineDashArray = readonly number[] | undefined;

const ACTION_BUTTON_WIDTH = 18;
const BRACKET_BUTTON_WIDTH = 24;
const DEFAULT_CHARACTER_WIDTH = 6.8;
const DEFAULT_PRICE_LABEL_MIN_WIDTH = 50;
const LABEL_TO_LINE_GAP = 2;
const PRICE_LABEL_HORIZONTAL_PADDING = 4;
const SEGMENT_BORDER_OVERLAP = 1;
const DEFAULT_PRICE_DECIMALS = 2;
const MAX_PRICE_DECIMALS = 20;
const numberFormatCache = new Map<number, Intl.NumberFormat>();

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
  labelWidth: number;
  lineLength: number;
  lineLengthUnit?: 'percentage' | 'pixel';
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
  if (Number.isInteger(pricePrecision)) return clampPriceDecimals(pricePrecision);
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

export function measureNativeTradeLinePriceLabelWidth(formattedPrice: string): number {
  return Math.max(
    DEFAULT_PRICE_LABEL_MIN_WIDTH,
    Math.ceil(estimateNativeTradeLineTextWidth(formattedPrice) + PRICE_LABEL_HORIZONTAL_PADDING * 2),
  );
}

export function layoutNativeTradeLine(input: NativeTradeLineLayoutInput): NativeTradeLineLayout {
  const lineStartX = Math.max(
    input.dimensions.margins.left,
    MOBILE_CHART_CHROME_METRICS.leftToolRailInset + MOBILE_CHART_CHROME_METRICS.leftToolRailWidth + 2,
  );
  const priceLabelWidth = measureNativeTradeLinePriceLabelWidth(input.formattedPrice);
  const priceLabelLeft = input.dimensions.width - priceLabelWidth - PRICE_LABEL_HORIZONTAL_PADDING;
  const lineEndX = Math.max(lineStartX, priceLabelLeft - LABEL_TO_LINE_GAP);
  const maxLabelWidth = Math.max(0, lineEndX - lineStartX - LABEL_TO_LINE_GAP);
  const labelWidth = Math.min(input.labelWidth, maxLabelWidth);
  const maxLabelX = Math.max(lineStartX, lineEndX - labelWidth - LABEL_TO_LINE_GAP);
  const lineRange = maxLabelX - lineStartX;
  const rawLabelX =
    input.lineLengthUnit === 'pixel'
      ? maxLabelX - Math.max(0, input.lineLength)
      : lineStartX + (lineRange * clamp(100 - input.lineLength, 0, 100)) / 100;
  const labelX = clamp(rawLabelX, lineStartX, maxLabelX);
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
