import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { useMemo } from 'react';

import { Group, Skia, Line as SkiaLine } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import {
  clampNativePriceAxisTickLabelY,
  createNativeRightAlignedAxisTextX,
  getNativeAxisTextCharacterCapacity,
} from '../utils/axisTickLayout';
import { fitNativeAxisTextToCharacterCountWorklet } from './nativeAxisTagLayout';
import { getNativePriceGridSlot, getNativePriceGridSlotCount } from './nativeGridSlots';
import { formatNativePriceAxisTickWithPrecisionWorklet } from './nativePriceFormat';
import { measureNativeSkiaAxisCharacterWidth, NativeAnimatedSkiaText } from './nativeSkiaText';

interface NativeStaticPriceGridSlot {
  labelText: string;
  labelX: number;
  labelY: number;
  lineEnd: { x: number; y: number };
  lineStart: { x: number; y: number };
  visible: boolean;
  y: number;
}

type NativePriceGridSlotModel = NativeStaticPriceGridSlot;

function nativePriceToYFromViewport({
  frame,
  price,
  priceMax,
  priceMin,
}: {
  frame: NativeChartFrame;
  price: number;
  priceMax: number;
  priceMin: number;
}): number {
  'worklet';
  const range = priceMax - priceMin;
  if (range === 0) return frame.mainPane.top + frame.mainPane.height / 2;
  const ratio = (priceMax - price) / range;
  return frame.mainPane.top + ratio * frame.mainPane.height;
}

export function resolveNativePriceGridSlotModel({
  characterWidth,
  frame,
  index,
  labelMaxWidth,
  labelRight,
  maxCharacters,
  priceMax,
  priceMin,
  pricePrecision,
}: {
  characterWidth: number;
  frame: NativeChartFrame;
  index: number;
  labelMaxWidth: number;
  labelRight: number;
  maxCharacters: number;
  priceMax: number;
  priceMin: number;
  pricePrecision: number;
}): NativePriceGridSlotModel {
  'worklet';
  const slot = getNativePriceGridSlot({
    index,
    priceMin,
    priceMax,
    priceHeight: frame.mainPane.height,
  });
  const y = nativePriceToYFromViewport({ frame, price: slot.price, priceMax, priceMin });
  const labelText = fitNativeAxisTextToCharacterCountWorklet(
    formatNativePriceAxisTickWithPrecisionWorklet(slot.price, slot.spacing, pricePrecision),
    maxCharacters,
  );

  return {
    labelText,
    labelX: createNativeRightAlignedAxisTextX(labelRight, labelText.length, characterWidth, labelMaxWidth),
    labelY: clampNativePriceAxisTickLabelY(frame, y),
    lineEnd: { x: frame.priceAxisRight, y },
    lineStart: { x: frame.contentLeft, y },
    visible: slot.visible && y >= frame.mainPane.top && y <= frame.mainPane.bottom,
    y,
  };
}

function NativeAnimatedPriceGrid({
  axisFont,
  characterWidth,
  frame,
  gridColor,
  index,
  labelMaxWidth,
  labelRight,
  maxCharacters,
  pricePrecision,
  sharedViewport,
  showAxisLabels,
  showGridLines,
  textColor,
}: {
  axisFont: ReturnType<typeof Skia.Font>;
  characterWidth: number;
  frame: NativeChartFrame;
  gridColor: string;
  index: number;
  labelMaxWidth: number;
  labelRight: number;
  maxCharacters: number;
  pricePrecision: number;
  sharedViewport: NativeViewportSharedValues;
  showAxisLabels: boolean;
  showGridLines: boolean;
  textColor: string;
}) {
  const model = useDerivedValue(() =>
    resolveNativePriceGridSlotModel({
      characterWidth,
      frame,
      index,
      labelMaxWidth,
      labelRight,
      maxCharacters,
      priceMax: sharedViewport.priceMax.value,
      priceMin: sharedViewport.priceMin.value,
      pricePrecision,
    }),
  );
  const opacity = useDerivedValue(() => (model.value.visible ? 1 : 0));
  const labelText = useDerivedValue(() => model.value.labelText);
  const labelX = useDerivedValue(() => model.value.labelX);
  const labelY = useDerivedValue(() => model.value.labelY);
  const lineStart = useDerivedValue(() => model.value.lineStart);
  const lineEnd = useDerivedValue(() => model.value.lineEnd);

  return (
    <Group opacity={opacity}>
      {showGridLines && <SkiaLine p1={lineStart} p2={lineEnd} color={gridColor} strokeWidth={1} />}
      {showAxisLabels && (
        <NativeAnimatedSkiaText x={labelX} y={labelY} text={labelText} font={axisFont} color={textColor} />
      )}
    </Group>
  );
}

function getNativeStaticPriceGridSlots({
  characterWidth,
  frame,
  labelMaxWidth,
  labelRight,
  maxCharacters,
  projection,
  pricePrecision,
  slotCount,
}: {
  characterWidth: number;
  frame: NativeChartFrame;
  labelMaxWidth: number;
  labelRight: number;
  maxCharacters: number;
  projection: NativeChartProjection;
  pricePrecision: number;
  slotCount: number;
}): NativeStaticPriceGridSlot[] {
  return Array.from({ length: slotCount }, (_, index) => {
    const slot = getNativePriceGridSlot({
      index,
      priceMin: projection.viewport.priceMin,
      priceMax: projection.viewport.priceMax,
      priceHeight: frame.mainPane.height,
    });
    const y = projection.priceToY(slot.price);
    const labelText = fitNativeAxisTextToCharacterCountWorklet(
      formatNativePriceAxisTickWithPrecisionWorklet(slot.price, slot.spacing, pricePrecision),
      maxCharacters,
    );

    return {
      labelText,
      labelX: createNativeRightAlignedAxisTextX(labelRight, labelText.length, characterWidth, labelMaxWidth),
      labelY: clampNativePriceAxisTickLabelY(frame, y),
      lineEnd: { x: frame.priceAxisRight, y },
      lineStart: { x: frame.contentLeft, y },
      visible: slot.visible && y >= frame.mainPane.top && y <= frame.mainPane.bottom,
      y,
    };
  });
}

export function NativePriceGridLayer({
  axisFont,
  frame,
  gridColor,
  showAxisLabels = true,
  showGridLines = true,
  staticProjection,
  pricePrecision,
  sharedViewport,
  textColor,
}: {
  axisFont: ReturnType<typeof Skia.Font>;
  frame: NativeChartFrame;
  gridColor: string;
  showAxisLabels?: boolean;
  showGridLines?: boolean;
  staticProjection?: NativeChartProjection | null;
  pricePrecision: number;
  sharedViewport: NativeViewportSharedValues;
  textColor: string;
}) {
  if (!showAxisLabels && !showGridLines) return null;

  const characterWidth = measureNativeSkiaAxisCharacterWidth(axisFont);
  const labelRight = frame.priceAxisRight - 4;
  const labelMaxWidth = Math.max(0, labelRight - (frame.priceAxisLeft + 4));
  const maxCharacters = getNativeAxisTextCharacterCapacity(labelMaxWidth, characterWidth);
  const slotCount = getNativePriceGridSlotCount(frame.mainPane.height);
  const staticSlots = useMemo(
    () =>
      staticProjection
        ? getNativeStaticPriceGridSlots({
            characterWidth,
            frame,
            labelMaxWidth,
            labelRight,
            maxCharacters,
            pricePrecision,
            projection: staticProjection,
            slotCount,
          })
        : null,
    [characterWidth, frame, labelMaxWidth, labelRight, maxCharacters, pricePrecision, staticProjection, slotCount],
  );

  if (staticSlots) {
    return (
      <>
        {staticSlots.map((slot, index) => (
          <Group key={`price-grid-${index}`} opacity={slot.visible ? 1 : 0}>
            {showGridLines && <SkiaLine p1={slot.lineStart} p2={slot.lineEnd} color={gridColor} strokeWidth={1} />}
            {showAxisLabels && (
              <NativeAnimatedSkiaText
                x={slot.labelX}
                y={slot.labelY}
                text={slot.labelText}
                font={axisFont}
                color={textColor}
              />
            )}
          </Group>
        ))}
      </>
    );
  }

  return (
    <>
      {Array.from({ length: slotCount }, (_, index) => (
        <NativeAnimatedPriceGrid
          key={`price-grid-${index}`}
          axisFont={axisFont}
          characterWidth={characterWidth}
          frame={frame}
          gridColor={gridColor}
          index={index}
          labelMaxWidth={labelMaxWidth}
          labelRight={labelRight}
          maxCharacters={maxCharacters}
          pricePrecision={pricePrecision}
          sharedViewport={sharedViewport}
          showAxisLabels={showAxisLabels}
          showGridLines={showGridLines}
          textColor={textColor}
        />
      ))}
    </>
  );
}
