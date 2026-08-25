import type { NativeChartFrame } from '../render/nativeChartFrame';

export interface NativeAxisTextLayout {
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  right: number;
}

export interface NativeAxisTextLayoutInput {
  frame: NativeChartFrame;
  text: string;
  textWidth: number;
  fitText?: (text: string, maxWidth: number) => { text: string; width: number };
  baselineOffset?: number;
}

export type NativeAxisStaticTextLayout = Omit<NativeAxisTextLayout, 'y'>;

function resolveFittedText(input: NativeAxisTextLayoutInput, maxWidth: number): { text: string; width: number } {
  if (input.textWidth <= maxWidth) return { text: input.text, width: input.textWidth };
  return input.fitText?.(input.text, maxWidth) ?? { text: input.text, width: input.textWidth };
}

export function createNativePriceAxisTickTextLayout(input: NativeAxisTextLayoutInput): NativeAxisStaticTextLayout {
  const left = input.frame.priceAxisLeft + 4;
  const right = input.frame.priceAxisRight - 4;
  const maxWidth = Math.max(0, right - left);
  const fitted = resolveFittedText(input, maxWidth);
  const x = Math.max(left, right - fitted.width);

  return {
    text: fitted.text,
    x,
    maxWidth,
    right,
  };
}

export function clampNativePriceAxisTickLabelY(frame: NativeChartFrame, y: number, baselineOffset = 4): number {
  'worklet';
  return Math.max(frame.mainPane.top + 11, Math.min(frame.mainPane.bottom - 3, y + baselineOffset));
}

export function createNativePriceAxisTickLabelLayout(input: NativeAxisTextLayoutInput & { y: number }): NativeAxisTextLayout {
  return {
    ...createNativePriceAxisTickTextLayout(input),
    y: clampNativePriceAxisTickLabelY(input.frame, input.y, input.baselineOffset),
  };
}

export interface NativeTimeAxisStaticTextLayout {
  text: string;
  width: number;
  y: number;
  maxWidth: number;
  right: number;
}

export function createNativeTimeAxisTickTextLayout(input: NativeAxisTextLayoutInput): NativeTimeAxisStaticTextLayout {
  const left = input.frame.contentLeft;
  const right = input.frame.contentRight;
  const maxWidth = Math.max(0, right - left);
  const fitted = resolveFittedText(input, maxWidth);

  return {
    text: fitted.text,
    width: fitted.width,
    y: input.frame.timeAxisTop + (input.baselineOffset ?? 18),
    maxWidth,
    right,
  };
}

export function clampNativeTimeAxisTickLabelX(frame: NativeChartFrame, x: number, width: number): number {
  'worklet';
  return Math.max(frame.contentLeft, Math.min(frame.contentRight - width, x - width / 2));
}

export function createNativeTimeAxisTickLabelLayout(input: NativeAxisTextLayoutInput & { x: number }): NativeAxisTextLayout {
  const textLayout = createNativeTimeAxisTickTextLayout(input);

  return {
    text: textLayout.text,
    x: clampNativeTimeAxisTickLabelX(input.frame, input.x, textLayout.width),
    y: textLayout.y,
    maxWidth: textLayout.maxWidth,
    right: textLayout.right,
  };
}

export function createNativeRightAlignedAxisTextX(right: number, textLength: number, characterWidth: number, maxWidth: number): number {
  'worklet';
  if (characterWidth <= 0) return right;
  const width = Math.min(Math.max(0, textLength) * characterWidth, maxWidth);
  return right - width;
}

export function createNativeCenteredAxisTextX(left: number, textLength: number, characterWidth: number, maxWidth: number): number {
  'worklet';
  if (characterWidth <= 0) return left;
  const width = Math.min(Math.max(0, textLength) * characterWidth, maxWidth);
  return left + Math.max(0, (maxWidth - width) / 2);
}

export function createNativeLeftAlignedAxisTextX(left: number): number {
  'worklet';
  return left;
}

export function getNativeAxisTextCharacterCapacity(maxWidth: number, characterWidth: number): number {
  if (characterWidth <= 0) return 1;
  return Math.max(1, Math.floor(Math.max(0, maxWidth) / characterWidth));
}
