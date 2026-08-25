import type { NativeChartFrame } from './nativeChartFrame';

import { Skia } from '@shopify/react-native-skia';

import { getNativeAxisTextCharacterCapacity } from '../utils/axisTickLayout';
import {
  createNativePriceAxisLane,
  NATIVE_PRICE_AXIS_TAG_MIN_WIDTH,
  NATIVE_PRICE_AXIS_TAG_PADDING_X,
} from '../utils/nativePriceAxisLane';
import { createNativePriceAxisTagLayout, createNativePriceAxisTagTextLayout } from '../utils/priceAxisTagLayout';
import { fitNativeSkiaTextToWidth, measureNativeSkiaTextWidth } from './nativeSkiaText';

export const PRICE_AXIS_TAG_HEIGHT = 22;

export function formatNativeCountdown(targetTimeMs: number, nowMs: number = Date.now()): string {
  const remaining = Math.max(0, targetTimeMs - nowMs);
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

export function formatNativeCountdownWorklet(targetTimeMs: number, nowMs: number): string {
  'worklet';
  const remaining = Math.max(0, targetTimeMs - nowMs);
  const totalSeconds = Math.floor(remaining / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  const paddedMinutes = totalMinutes < 10 ? `0${totalMinutes}` : `${totalMinutes}`;
  return `${paddedMinutes}:${paddedSeconds}`;
}

export function fitNativeAxisTextToCharacterCountWorklet(text: string, maxLength: number): string {
  'worklet';
  if (maxLength <= 0) return '';
  if (text.length <= maxLength) return text;
  if (maxLength <= 3) return '.'.repeat(maxLength);
  return `${text.slice(0, maxLength - 3)}...`;
}

export function createNativeFittedAxisText(
  font: ReturnType<typeof Skia.Font>,
  text: string,
  maxWidth: number,
): { text: string; width: number } {
  const displayText = fitNativeSkiaTextToWidth(font, text, maxWidth);
  return {
    text: displayText,
    width: measureNativeSkiaTextWidth(font, displayText),
  };
}

export function createNativeAxisTagTextLayout(
  x: number,
  width: number,
  font: ReturnType<typeof Skia.Font>,
  text: string,
) {
  return createNativePriceAxisTagTextLayout(
    x,
    width,
    text,
    (value) => measureNativeSkiaTextWidth(font, value),
    NATIVE_PRICE_AXIS_TAG_PADDING_X,
  );
}

export function createNativeAxisTagLayout(
  frame: NativeChartFrame,
  font: ReturnType<typeof Skia.Font>,
  text: string,
  minWidth = NATIVE_PRICE_AXIS_TAG_MIN_WIDTH,
) {
  const lane = createNativePriceAxisLane(frame);

  return createNativePriceAxisTagLayout({
    frame,
    text,
    textWidth: (value) => measureNativeSkiaTextWidth(font, value),
    minWidth: Math.max(minWidth, lane.width),
    paddingX: NATIVE_PRICE_AXIS_TAG_PADDING_X,
    rightInset: frame.dimensions.width - lane.right,
  });
}

export function createNativeAxisLaneTagLayout(frame: NativeChartFrame) {
  const lane = createNativePriceAxisLane(frame);

  return {
    x: lane.right - lane.width,
    width: lane.width,
    text: '',
    textX: lane.left + NATIVE_PRICE_AXIS_TAG_PADDING_X,
  };
}

export function getNativeAxisTagTextCharacterCapacity(tagWidth: number, characterWidth: number): number {
  return getNativeAxisTextCharacterCapacity(
    Math.max(0, tagWidth - NATIVE_PRICE_AXIS_TAG_PADDING_X * 2),
    characterWidth,
  );
}
