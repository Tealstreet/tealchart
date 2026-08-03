import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';

import {
  NATIVE_PRICE_AXIS_LANE_RIGHT_INSET,
  NATIVE_PRICE_AXIS_TAG_MIN_WIDTH,
  NATIVE_PRICE_AXIS_TAG_PADDING_X,
} from '../utils/nativePriceAxisLane';
import {
  formatNativeTradeLinePriceWorklet,
  getNativeTradeLinePriceDecimalsWorklet,
} from '../render/nativePriceFormat';

export const NATIVE_CROSSHAIR_CONTEXT_MENU_BUTTON_RADIUS = 9;
export const NATIVE_CROSSHAIR_CONTEXT_MENU_BUTTON_HIT_RADIUS = 24;
export const NATIVE_CROSSHAIR_CONTEXT_MENU_BUTTON_RIGHT_OFFSET = 11;
const NATIVE_CROSSHAIR_PRICE_LABEL_CHARACTER_WIDTH = 6.8;

export interface NativeCrosshairContextMenuButtonLayout {
  centerX: number;
  centerY: number;
  radius: number;
  hitRadius: number;
}

export interface NativeCrosshairPriceLabelLayout {
  x: number;
  width: number;
  textX: number;
}

function getNativeCrosshairPriceDecimals(pricePrecision: number): number {
  'worklet';
  return getNativeTradeLinePriceDecimalsWorklet(pricePrecision);
}

function getNativeCrosshairPriceLabelCapacityText(pricePrecision: number): string {
  'worklet';
  const decimals = getNativeCrosshairPriceDecimals(pricePrecision);
  if (decimals === 0) return '999,999';

  let decimalText = '';
  for (let index = 0; index < decimals; index += 1) decimalText += '9';
  return `999,999.${decimalText}`;
}

export function resolveNativeCrosshairPriceLabelLayout(
  frame: NativeChartFrame,
  pricePrecision: number,
  labelText = getNativeCrosshairPriceLabelCapacityText(pricePrecision),
): NativeCrosshairPriceLabelLayout {
  'worklet';
  const laneRight = frame.dimensions.width - NATIVE_PRICE_AXIS_LANE_RIGHT_INSET;
  const measuredWidth =
    Math.ceil(labelText.length * NATIVE_CROSSHAIR_PRICE_LABEL_CHARACTER_WIDTH) + NATIVE_PRICE_AXIS_TAG_PADDING_X * 2;
  const width = Math.max(0, Math.max(NATIVE_PRICE_AXIS_TAG_MIN_WIDTH, measuredWidth));
  const x = laneRight - width;

  return {
    x,
    width,
    textX: laneRight - NATIVE_PRICE_AXIS_TAG_PADDING_X - Math.ceil(labelText.length * NATIVE_CROSSHAIR_PRICE_LABEL_CHARACTER_WIDTH),
  };
}

export function resolveNativeCrosshairPriceLabelText(
  frame: NativeChartFrame,
  sharedViewport: NativeViewportSharedValues,
  crosshairY: number,
  pricePrecision: number,
): string {
  'worklet';
  const range = sharedViewport.priceMax.value - sharedViewport.priceMin.value;
  const price =
    range === 0 || frame.mainPane.height === 0
      ? sharedViewport.priceMin.value
      : sharedViewport.priceMax.value - ((crosshairY - frame.mainPane.top) / frame.mainPane.height) * range;
  return formatNativeTradeLinePriceWorklet(price, pricePrecision);
}

export function nativeCrosshairYToPrice(
  y: number,
  sharedViewport: NativeViewportSharedValues,
  frame: NativeChartFrame,
): number {
  'worklet';
  const range = sharedViewport.priceMax.value - sharedViewport.priceMin.value;
  if (range === 0 || frame.mainPane.height === 0) return sharedViewport.priceMin.value;
  const ratio = (y - frame.mainPane.top) / frame.mainPane.height;
  return sharedViewport.priceMax.value - ratio * range;
}

export function nativeCrosshairXToTime(
  x: number,
  sharedViewport: NativeViewportSharedValues,
  frame: NativeChartFrame,
): number {
  'worklet';
  const range = sharedViewport.endTime.value - sharedViewport.startTime.value;
  if (range === 0 || frame.contentWidth === 0) return sharedViewport.startTime.value;
  const ratio = (x - frame.contentLeft) / frame.contentWidth;
  return sharedViewport.startTime.value + ratio * range;
}

export function resolveNativeCrosshairContextMenuButtonLayout(
  frame: NativeChartFrame,
  crosshairY: number,
  pricePrecision = 2,
  priceLabelText?: string,
): NativeCrosshairContextMenuButtonLayout {
  'worklet';
  const priceLabel = resolveNativeCrosshairPriceLabelLayout(frame, pricePrecision, priceLabelText);
  return {
    centerX: priceLabel.x - NATIVE_CROSSHAIR_CONTEXT_MENU_BUTTON_RIGHT_OFFSET,
    centerY: Math.min(Math.max(crosshairY, frame.mainPane.top), frame.mainPane.bottom),
    radius: NATIVE_CROSSHAIR_CONTEXT_MENU_BUTTON_RADIUS,
    hitRadius: NATIVE_CROSSHAIR_CONTEXT_MENU_BUTTON_HIT_RADIUS,
  };
}

export function isNativeCrosshairContextMenuButtonTap({
  frame,
  crosshairY,
  pricePrecision,
  sharedViewport,
  x,
  y,
}: {
  frame: NativeChartFrame;
  crosshairY: number;
  pricePrecision?: number;
  sharedViewport?: NativeViewportSharedValues;
  x: number;
  y: number;
}): boolean {
  'worklet';
  const priceLabelText = sharedViewport
    ? resolveNativeCrosshairPriceLabelText(frame, sharedViewport, crosshairY, pricePrecision ?? 2)
    : undefined;
  const layout = resolveNativeCrosshairContextMenuButtonLayout(frame, crosshairY, pricePrecision, priceLabelText);
  const dx = x - layout.centerX;
  const dy = y - layout.centerY;
  return dx * dx + dy * dy <= layout.hitRadius * layout.hitRadius;
}
