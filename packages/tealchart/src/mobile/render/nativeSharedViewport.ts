import type { SharedValue } from 'react-native-reanimated';
import type { NativeTradeLineObjectType, NativeTradeLineRow } from '../utils/tradeLineLayout';
import type { NativeChartFrame } from './nativeChartFrame';

export interface NativeViewportSharedValues {
  startTime: SharedValue<number>;
  endTime: SharedValue<number>;
  priceMin: SharedValue<number>;
  priceMax: SharedValue<number>;
}

export function sharedPriceToNativeY(price: number, sharedViewport: NativeViewportSharedValues, frame: NativeChartFrame): number {
  'worklet';
  const range = sharedViewport.priceMax.value - sharedViewport.priceMin.value;
  if (range === 0) return frame.mainPane.top + frame.mainPane.height / 2;
  const ratio = (sharedViewport.priceMax.value - price) / range;
  return frame.mainPane.top + ratio * frame.mainPane.height;
}

export function sharedTimeToNativeX(time: number, sharedViewport: NativeViewportSharedValues, frame: NativeChartFrame): number {
  'worklet';
  const range = sharedViewport.endTime.value - sharedViewport.startTime.value;
  if (range === 0) return frame.contentLeft + frame.contentWidth / 2;
  const ratio = (time - sharedViewport.startTime.value) / range;
  return frame.contentLeft + ratio * frame.contentWidth;
}

/**
 * Maximising another pane collapses this one to zero height, and a zero-height
 * pane draws nothing. Without this the containment test degenerates to a single
 * y - the seam - and anything whose price lands there smears across the pane
 * that was maximised.
 */
export function isNativeMainPaneVisible(frame: NativeChartFrame): boolean {
  'worklet';
  return frame.mainPane.height > 0;
}

export function isNativeYInMainPane(value: number, frame: NativeChartFrame): boolean {
  'worklet';
  return isNativeMainPaneVisible(frame) && value >= frame.mainPane.top && value <= frame.mainPane.bottom;
}

/**
 * The lowest a price-axis label may reach. The time axis is chrome - it carries
 * the date ticks and the settings gear - so a label that runs into it is drawn
 * over rather than merely cramped.
 */
export function getNativePriceAxisTagFloor(frame: NativeChartFrame): number {
  'worklet';
  return Math.min(frame.mainPane.bottom, frame.timeAxisTop);
}

export function resolveNativeTradeLineLabelTopOffset(
  rows: readonly NativeTradeLineRow[],
  objectType: NativeTradeLineObjectType,
  objectId: string,
  sharedViewport: NativeViewportSharedValues,
  frame: NativeChartFrame,
  tradeLabelHeight: number,
): number {
  'worklet';
  if (rows.length === 0) return -tradeLabelHeight / 2;

  const minCenter = frame.mainPane.top + tradeLabelHeight / 2;
  const maxCenter = frame.mainPane.bottom - tradeLabelHeight / 2;
  const sorted: { centerY: number; index: number; objectId: string; objectType: NativeTradeLineObjectType; price: number }[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rawCenter = sharedPriceToNativeY(row.price, sharedViewport, frame);
    if (!isNativeYInMainPane(rawCenter, frame)) continue;
    const centerY = Math.min(Math.max(rawCenter, minCenter), maxCenter);
    sorted.push({
      centerY,
      index,
      objectId: row.objectId,
      objectType: row.objectType,
      price: row.price,
    });
  }

  if (sorted.length === 0) return -tradeLabelHeight / 2;

  sorted.sort((left, right) => left.centerY - right.centerY || left.index - right.index);

  for (let index = 1; index < sorted.length; index += 1) {
    sorted[index].centerY = Math.max(sorted[index].centerY, sorted[index - 1].centerY + tradeLabelHeight);
  }

  for (let index = sorted.length - 2; index >= 0; index -= 1) {
    sorted[index].centerY = Math.min(sorted[index].centerY, sorted[index + 1].centerY - tradeLabelHeight);
  }

  const bottomOverflow = sorted[sorted.length - 1].centerY - maxCenter;
  if (bottomOverflow > 0) {
    for (let index = 0; index < sorted.length; index += 1) {
      sorted[index].centerY -= bottomOverflow;
    }
  }

  const topOverflow = minCenter - sorted[0].centerY;
  if (topOverflow > 0) {
    for (let index = 0; index < sorted.length; index += 1) {
      sorted[index].centerY += topOverflow;
    }
  }

  for (let index = 0; index < sorted.length; index += 1) {
    const row = sorted[index];
    if (row.objectType === objectType && row.objectId === objectId) {
      return row.centerY - sharedPriceToNativeY(row.price, sharedViewport, frame) - tradeLabelHeight / 2;
    }
  }

  return -tradeLabelHeight / 2;
}
