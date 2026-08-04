import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { useMemo } from 'react';

import { Group, Skia, Line as SkiaLine } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { clampNativeTimeAxisTickLabelX, getNativeAxisTextCharacterCapacity } from '../utils/axisTickLayout';
import { fitNativeAxisTextToCharacterCountWorklet } from './nativeAxisTagLayout';
import { getNativeTimeGridSlot, getNativeTimeGridSlotCount } from './nativeGridSlots';
import { measureNativeSkiaAxisCharacterWidth, NativeAnimatedSkiaText } from './nativeSkiaText';
import { formatNativeTimeAxisLabelWorklet } from './nativeTimeFormat';

const NATIVE_TIME_AXIS_MAX_CHARACTERS = 8;

interface NativeStaticTimeGridSlot {
  labelText: string;
  labelX: number;
  lineEnd: { x: number; y: number };
  lineStart: { x: number; y: number };
  visible: boolean;
  x: number;
}

type NativeTimeGridSlotModel = NativeStaticTimeGridSlot;

function nativeTimeToXFromViewport({
  endTime,
  frame,
  startTime,
  time,
}: {
  endTime: number;
  frame: NativeChartFrame;
  startTime: number;
  time: number;
}): number {
  'worklet';
  const range = endTime - startTime;
  if (range === 0) return frame.contentLeft + frame.contentWidth / 2;
  const ratio = (time - startTime) / range;
  return frame.contentLeft + ratio * frame.contentWidth;
}

export function resolveNativeTimeGridSlotModel({
  characterWidth,
  endTime,
  frame,
  index,
  maxCharacters,
  startTime,
}: {
  characterWidth: number;
  endTime: number;
  frame: NativeChartFrame;
  index: number;
  maxCharacters: number;
  startTime: number;
}): NativeTimeGridSlotModel {
  'worklet';
  const slot = getNativeTimeGridSlot({
    index,
    startTime,
    endTime,
    chartWidth: frame.contentWidth,
  });
  const x = nativeTimeToXFromViewport({ endTime, frame, startTime, time: slot.time });
  const labelText = fitNativeAxisTextToCharacterCountWorklet(
    formatNativeTimeAxisLabelWorklet(slot.time, slot.step, slot.showMonthLabel),
    maxCharacters,
  );

  return {
    labelText,
    labelX: clampNativeTimeAxisTickLabelX(frame, x, Math.min(labelText.length * characterWidth, frame.contentWidth)),
    lineEnd: { x, y: frame.timeAxisTop },
    lineStart: { x, y: frame.mainPane.top },
    visible: slot.visible && x >= frame.contentLeft && x <= frame.contentRight,
    x,
  };
}

function NativeAnimatedTimeGrid({
  axisFont,
  characterWidth,
  frame,
  gridColor,
  index,
  maxCharacters,
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
  maxCharacters: number;
  sharedViewport: NativeViewportSharedValues;
  showAxisLabels: boolean;
  showGridLines: boolean;
  textColor: string;
}) {
  const model = useDerivedValue(() =>
    resolveNativeTimeGridSlotModel({
      characterWidth,
      endTime: sharedViewport.endTime.value,
      frame,
      index,
      maxCharacters,
      startTime: sharedViewport.startTime.value,
    }),
  );
  const opacity = useDerivedValue(() => (model.value.visible ? 1 : 0));
  const labelText = useDerivedValue(() => model.value.labelText);
  const labelX = useDerivedValue(() => model.value.labelX);
  const lineStart = useDerivedValue(() => model.value.lineStart);
  const lineEnd = useDerivedValue(() => model.value.lineEnd);

  return (
    <Group opacity={opacity}>
      {showGridLines && <SkiaLine p1={lineStart} p2={lineEnd} color={gridColor} strokeWidth={1} />}
      {showAxisLabels && (
        <NativeAnimatedSkiaText
          x={labelX}
          y={frame.timeAxisTop + 18}
          text={labelText}
          font={axisFont}
          color={textColor}
        />
      )}
    </Group>
  );
}

function getNativeStaticTimeGridSlots({
  characterWidth,
  frame,
  maxCharacters,
  projection,
  slotCount,
}: {
  characterWidth: number;
  frame: NativeChartFrame;
  maxCharacters: number;
  projection: NativeChartProjection;
  slotCount: number;
}): NativeStaticTimeGridSlot[] {
  return Array.from({ length: slotCount }, (_, index) => {
    const slot = getNativeTimeGridSlot({
      index,
      startTime: projection.viewport.startTime,
      endTime: projection.viewport.endTime,
      chartWidth: frame.contentWidth,
    });
    const x = projection.timeToX(slot.time);
    const labelText = fitNativeAxisTextToCharacterCountWorklet(
      formatNativeTimeAxisLabelWorklet(slot.time, slot.step, slot.showMonthLabel),
      maxCharacters,
    );

    return {
      labelText,
      labelX: clampNativeTimeAxisTickLabelX(frame, x, Math.min(labelText.length * characterWidth, frame.contentWidth)),
      lineEnd: { x, y: frame.timeAxisTop },
      lineStart: { x, y: frame.mainPane.top },
      visible: slot.visible && x >= frame.contentLeft && x <= frame.contentRight,
      x,
    };
  });
}

export function NativeTimeGridLayer({
  axisFont,
  frame,
  gridColor,
  showAxisLabels = true,
  showGridLines = true,
  staticProjection,
  sharedViewport,
  textColor,
}: {
  axisFont: ReturnType<typeof Skia.Font>;
  frame: NativeChartFrame;
  gridColor: string;
  showAxisLabels?: boolean;
  showGridLines?: boolean;
  staticProjection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
  textColor: string;
}) {
  if (!showAxisLabels && !showGridLines) return null;

  const characterWidth = measureNativeSkiaAxisCharacterWidth(axisFont);
  const maxCharacters = Math.min(
    NATIVE_TIME_AXIS_MAX_CHARACTERS,
    getNativeAxisTextCharacterCapacity(frame.contentWidth, characterWidth),
  );
  const slotCount = getNativeTimeGridSlotCount(frame.contentWidth);
  const staticSlots = useMemo(
    () =>
      staticProjection
        ? getNativeStaticTimeGridSlots({
            characterWidth,
            frame,
            maxCharacters,
            projection: staticProjection,
            slotCount,
          })
        : null,
    [characterWidth, frame, maxCharacters, staticProjection, slotCount],
  );

  if (staticSlots) {
    return (
      <>
        {staticSlots.map((slot, index) => (
          <Group key={`time-grid-${index}`} opacity={slot.visible ? 1 : 0}>
            {showGridLines && <SkiaLine p1={slot.lineStart} p2={slot.lineEnd} color={gridColor} strokeWidth={1} />}
            {showAxisLabels && (
              <NativeAnimatedSkiaText
                x={slot.labelX}
                y={frame.timeAxisTop + 18}
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
        <NativeAnimatedTimeGrid
          key={`time-grid-${index}`}
          axisFont={axisFont}
          characterWidth={characterWidth}
          frame={frame}
          gridColor={gridColor}
          index={index}
          maxCharacters={maxCharacters}
          sharedViewport={sharedViewport}
          showAxisLabels={showAxisLabels}
          showGridLines={showGridLines}
          textColor={textColor}
        />
      ))}
    </>
  );
}
