import { NATIVE_PRICE_AXIS_TAG_SIZING } from '../../utils/priceAxisTagSizing';
import { NATIVE_PRICE_AXIS_COUNTDOWN_SAMPLE } from './priceAxisTagLayout';
import { estimateNativeTradeLineTextWidth, measureNativeTradeLinePriceLabelWidth } from './tradeLineLayout';

export const DEFAULT_NATIVE_PRICE_AXIS_WIDTH = 68;
export const NATIVE_PRICE_AXIS_LANE_LEFT_INSET = 1;
export const NATIVE_PRICE_AXIS_LANE_RIGHT_INSET = 1;
export const NATIVE_PRICE_AXIS_TAG_MIN_WIDTH = 48;
export const NATIVE_PRICE_AXIS_TAG_PADDING_X = NATIVE_PRICE_AXIS_TAG_SIZING.other.paddingX;

export interface NativePriceAxisLaneWidthInput {
  pricePrecision: number;
  minimumWidth?: number;
  measurementTexts?: readonly string[];
  textWidth?: (text: string) => number;
}

export interface NativePriceAxisLane {
  left: number;
  right: number;
  width: number;
}

export interface NativePriceAxisLaneFrame {
  priceAxisLeft: number;
  dimensions: {
    width: number;
  };
}

export function getNativePriceAxisLaneUsableWidth(priceAxisWidth: number): number {
  return Math.max(0, priceAxisWidth - NATIVE_PRICE_AXIS_LANE_LEFT_INSET - NATIVE_PRICE_AXIS_LANE_RIGHT_INSET);
}

export function createNativePriceAxisLane(frame: NativePriceAxisLaneFrame): NativePriceAxisLane {
  const left = frame.priceAxisLeft + NATIVE_PRICE_AXIS_LANE_LEFT_INSET;
  const right = frame.dimensions.width - NATIVE_PRICE_AXIS_LANE_RIGHT_INSET;

  return {
    left,
    right,
    width: Math.max(0, right - left),
  };
}

export function measureNativePriceAxisTagWidth(text: string, textWidth = estimateNativeTradeLineTextWidth): number {
  return Math.max(NATIVE_PRICE_AXIS_TAG_MIN_WIDTH, Math.ceil(textWidth(text) + NATIVE_PRICE_AXIS_TAG_PADDING_X * 2));
}

export function createNativePriceAxisLaneWidth({
  minimumWidth = DEFAULT_NATIVE_PRICE_AXIS_WIDTH,
  measurementTexts,
  pricePrecision: _pricePrecision,
  textWidth = estimateNativeTradeLineTextWidth,
}: NativePriceAxisLaneWidthInput): number {
  const semanticMeasurementTexts = measurementTexts ?? [NATIVE_PRICE_AXIS_COUNTDOWN_SAMPLE];
  const requiredTagWidth = semanticMeasurementTexts.reduce(
    (width, text) =>
      Math.max(
        width,
        measureNativePriceAxisTagWidth(text, textWidth),
        measureNativeTradeLinePriceLabelWidth(text, textWidth),
      ),
    0,
  );

  return Math.ceil(
    Math.max(minimumWidth, requiredTagWidth + NATIVE_PRICE_AXIS_LANE_LEFT_INSET + NATIVE_PRICE_AXIS_LANE_RIGHT_INSET),
  );
}
