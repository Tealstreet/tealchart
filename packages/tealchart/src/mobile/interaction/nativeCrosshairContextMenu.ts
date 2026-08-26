import type { SharedValue } from 'react-native-reanimated';
import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativePaneRangeOverrides } from '../render/nativePaneRangeOverride';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';

import { snapPriceToTick, snapTimeToInterval } from '../../interaction/crosshairSnap';
import { getNativePaneAtY } from '../render/nativeChartFrame';
import { getNativePriceGridSlot, NATIVE_INDICATOR_PANE_MIN_LABEL_SPACING } from '../render/nativeGridSlots';
import { resolveNativePaneRange } from '../render/nativePaneRangeOverride';
import {
  formatNativeIndicatorAxisTickWorklet,
  formatNativeTradeLinePriceWorklet,
  getNativeTradeLinePriceDecimalsWorklet,
} from '../render/nativePriceFormat';
import {
  NATIVE_PRICE_AXIS_LANE_LEFT_INSET,
  NATIVE_PRICE_AXIS_LANE_RIGHT_INSET,
  NATIVE_PRICE_AXIS_TAG_MIN_WIDTH,
  NATIVE_PRICE_AXIS_TAG_PADDING_X,
} from '../utils/nativePriceAxisLane';

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
  minWidth = 0,
): NativeCrosshairPriceLabelLayout {
  'worklet';
  const laneLeft = frame.priceAxisLeft + NATIVE_PRICE_AXIS_LANE_LEFT_INSET;
  const laneRight = frame.dimensions.width - NATIVE_PRICE_AXIS_LANE_RIGHT_INSET;
  const laneWidth = Math.max(0, laneRight - laneLeft);
  const measuredWidth =
    Math.ceil(labelText.length * NATIVE_CROSSHAIR_PRICE_LABEL_CHARACTER_WIDTH) + NATIVE_PRICE_AXIS_TAG_PADDING_X * 2;
  const width = Math.max(0, Math.max(NATIVE_PRICE_AXIS_TAG_MIN_WIDTH, laneWidth, measuredWidth, minWidth));
  const x = laneRight - width;
  const textWidth = Math.ceil(labelText.length * NATIVE_CROSSHAIR_PRICE_LABEL_CHARACTER_WIDTH);

  return {
    x,
    width,
    textX: x + (width - textWidth) / 2,
  };
}

/** True only over the price pane, where a y really is a price. */
export function isNativeCrosshairOverMainPane(frame: NativeChartFrame, crosshairY: number): boolean {
  'worklet';
  const pane = getNativePaneAtY(frame, crosshairY);
  return pane !== null && pane.type === 'main';
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

export function resolveNativeCrosshairSnappedPrice(
  frame: NativeChartFrame,
  sharedViewport: NativeViewportSharedValues,
  crosshairY: number,
  pricePrecision: number,
): number {
  'worklet';
  return snapPriceToTick(nativeCrosshairYToPrice(crosshairY, sharedViewport, frame), pricePrecision);
}

export function resolveNativeCrosshairPriceLabelText(
  frame: NativeChartFrame,
  sharedViewport: NativeViewportSharedValues,
  crosshairY: number,
  pricePrecision: number,
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>,
): string {
  'worklet';
  const pane = getNativePaneAtY(frame, crosshairY);
  if (pane !== null && pane.type === 'indicator') {
    // An indicator pane's scale is not a price - RSI runs 0-100, MACD is
    // unitless - so the label reads the way that pane's own axis ticks read,
    // off the same live range the plot is drawn against.
    const paneRange = resolveNativePaneRange(pane, paneRangeOverrides?.value);
    const span = paneRange.yMax - paneRange.yMin;
    const value =
      pane.height === 0 || span === 0
        ? paneRange.yMin
        : paneRange.yMax - ((crosshairY - pane.top) / pane.height) * span;
    const slot = getNativePriceGridSlot({
      index: 0,
      priceMin: paneRange.yMin,
      priceMax: paneRange.yMax,
      priceHeight: pane.height,
      minLabelSpacing: NATIVE_INDICATOR_PANE_MIN_LABEL_SPACING,
    });
    return formatNativeIndicatorAxisTickWorklet(value, slot.spacing);
  }
  const price = snapPriceToTick(nativeCrosshairYToPrice(crosshairY, sharedViewport, frame), pricePrecision);
  return formatNativeTradeLinePriceWorklet(price, pricePrecision);
}

export function resolveNativeCrosshairSnappedY(
  frame: NativeChartFrame,
  sharedViewport: NativeViewportSharedValues,
  crosshairY: number,
  pricePrecision: number,
): number {
  'worklet';
  if (!isNativeCrosshairOverMainPane(frame, crosshairY)) return crosshairY;
  const priceRange = sharedViewport.priceMax.value - sharedViewport.priceMin.value;
  if (priceRange === 0 || frame.mainPane.height === 0) return frame.mainPane.top + frame.mainPane.height / 2;
  const price = snapPriceToTick(nativeCrosshairYToPrice(crosshairY, sharedViewport, frame), pricePrecision);
  return frame.mainPane.top + ((sharedViewport.priceMax.value - price) / priceRange) * frame.mainPane.height;
}

export function resolveNativeCrosshairSnappedTime(
  frame: NativeChartFrame,
  sharedViewport: NativeViewportSharedValues,
  crosshairX: number,
  intervalMs: number,
): number {
  'worklet';
  return snapTimeToInterval(nativeCrosshairXToTime(crosshairX, sharedViewport, frame), intervalMs);
}

export function resolveNativeCrosshairSnappedX(
  frame: NativeChartFrame,
  sharedViewport: NativeViewportSharedValues,
  crosshairX: number,
  intervalMs: number,
): number {
  'worklet';
  const timeRange = sharedViewport.endTime.value - sharedViewport.startTime.value;
  if (timeRange === 0 || frame.contentWidth === 0) return frame.contentLeft + frame.contentWidth / 2;
  const time = resolveNativeCrosshairSnappedTime(frame, sharedViewport, crosshairX, intervalMs);
  return frame.contentLeft + ((time - sharedViewport.startTime.value) / timeRange) * frame.contentWidth;
}

export function resolveNativeCrosshairContextMenuButtonLayout(
  frame: NativeChartFrame,
  crosshairY: number,
  pricePrecision = 2,
  priceLabelText?: string,
  minPriceLabelWidth = 0,
): NativeCrosshairContextMenuButtonLayout {
  'worklet';
  const priceLabel = resolveNativeCrosshairPriceLabelLayout(frame, pricePrecision, priceLabelText, minPriceLabelWidth);
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
  priceLabelMinWidth = 0,
  sharedViewport,
  x,
  y,
}: {
  frame: NativeChartFrame;
  crosshairY: number;
  pricePrecision?: number;
  priceLabelMinWidth?: number;
  sharedViewport?: NativeViewportSharedValues;
  x: number;
  y: number;
}): boolean {
  'worklet';
  // The button only exists over the price pane; a tap where it used to be must
  // not open order actions against an indicator value.
  if (!isNativeCrosshairOverMainPane(frame, crosshairY)) return false;
  const priceLabelText = sharedViewport
    ? resolveNativeCrosshairPriceLabelText(frame, sharedViewport, crosshairY, pricePrecision ?? 2)
    : undefined;
  const layout = resolveNativeCrosshairContextMenuButtonLayout(
    frame,
    crosshairY,
    pricePrecision,
    priceLabelText,
    priceLabelMinWidth,
  );
  const dx = x - layout.centerX;
  const dy = y - layout.centerY;
  return dx * dx + dy * dy <= layout.hitRadius * layout.hitRadius;
}
