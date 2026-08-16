import type { Skia } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { NativeChartFrame, NativePaneFrame } from './nativeChartFrame';
import type { NativePaneRange, NativePaneRangeOverrides } from './nativePaneRangeOverride';

import { Group, Line as SkiaLine } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { createNativeRightAlignedAxisTextX, getNativeAxisTextCharacterCapacity } from '../utils/axisTickLayout';
import { fitNativeAxisTextToCharacterCountWorklet } from './nativeAxisTagLayout';
import {
  getNativePriceGridSlot,
  getNativePriceGridSlotCount,
  NATIVE_INDICATOR_PANE_MIN_LABEL_SPACING,
} from './nativeGridSlots';
import { formatNativeIndicatorAxisTickWorklet } from './nativePriceFormat';
import { measureNativeSkiaAxisCharacterWidth, NativeAnimatedSkiaText } from './nativeSkiaText';

export interface NativeIndicatorPaneAxisSlot {
  labelText: string;
  labelX: number;
  labelY: number;
  lineEnd: { x: number; y: number };
  lineStart: { x: number; y: number };
  value: number;
  visible: boolean;
  y: number;
}

interface NativeIndicatorPaneAxisSlotInput {
  characterWidth: number;
  frame: NativeChartFrame;
  index: number;
  labelMaxWidth: number;
  labelRight: number;
  maxCharacters: number;
  pane: NativePaneFrame;
  range: NativePaneRange;
}

/**
 * One tick on an indicator pane's own value axis.
 *
 * The range is passed in rather than read off the pane, so a drag in flight can
 * feed the live value from a shared value and the axis tracks the finger.
 */
export function resolveNativeIndicatorPaneAxisSlot({
  characterWidth,
  frame,
  index,
  labelMaxWidth,
  labelRight,
  maxCharacters,
  pane,
  range,
}: NativeIndicatorPaneAxisSlotInput): NativeIndicatorPaneAxisSlot {
  'worklet';
  const slot = getNativePriceGridSlot({
    index,
    priceMin: range.yMin,
    priceMax: range.yMax,
    priceHeight: pane.height,
    minLabelSpacing: NATIVE_INDICATOR_PANE_MIN_LABEL_SPACING,
  });
  const span = range.yMax - range.yMin;
  const y = span === 0 ? pane.top + pane.height / 2 : pane.top + ((range.yMax - slot.price) / span) * pane.height;
  const labelText = fitNativeAxisTextToCharacterCountWorklet(
    formatNativeIndicatorAxisTickWorklet(slot.price, slot.spacing),
    maxCharacters,
  );

  return {
    labelText,
    labelX: createNativeRightAlignedAxisTextX(labelRight, labelText.length, characterWidth, labelMaxWidth),
    labelY: Math.max(pane.top + 10, Math.min(pane.bottom - 2, y + 4)),
    lineEnd: { x: frame.priceAxisRight, y },
    lineStart: { x: frame.contentLeft, y },
    value: slot.price,
    // A short pane often admits only its two end ticks — for a 0-100 oscillator
    // those sit exactly on pane.top and pane.bottom, so culling the edges leaves
    // the axis blank. Keep them and clamp the baseline.
    visible: slot.visible && y >= pane.top - 0.5 && y <= pane.bottom + 0.5,
    y,
  };
}

export function resolveNativeIndicatorPaneAxisSlots(
  input: Omit<NativeIndicatorPaneAxisSlotInput, 'index' | 'range'> & { range?: NativePaneRange },
): NativeIndicatorPaneAxisSlot[] {
  const { pane } = input;
  const range = input.range ?? { yMin: pane.yMin, yMax: pane.yMax };
  if (pane.height <= 0 || range.yMax - range.yMin <= 0) return [];

  return Array.from(
    { length: getNativePriceGridSlotCount(pane.height, NATIVE_INDICATOR_PANE_MIN_LABEL_SPACING) },
    (_, index) => resolveNativeIndicatorPaneAxisSlot({ ...input, index, range }),
  );
}

function NativeAnimatedIndicatorPaneAxisTick({
  axisFont,
  characterWidth,
  frame,
  gridColor,
  index,
  labelMaxWidth,
  labelRight,
  maxCharacters,
  pane,
  paneRangeOverrides,
  showAxisLabels,
  showGridLines,
  textColor,
}: NativeIndicatorPaneAxisSlotInput & {
  axisFont: ReturnType<typeof Skia.Font>;
  gridColor: string;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  showAxisLabels: boolean;
  showGridLines: boolean;
  textColor: string;
  range?: NativePaneRange;
}) {
  const model = useDerivedValue(() =>
    resolveNativeIndicatorPaneAxisSlot({
      characterWidth,
      frame,
      index,
      labelMaxWidth,
      labelRight,
      maxCharacters,
      pane,
      range: (() => {
        const overrides = paneRangeOverrides?.value;
        const override = overrides ? overrides[pane.id] : undefined;
        return override ?? { yMin: pane.yMin, yMax: pane.yMax };
      })(),
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

export function NativeIndicatorPaneAxisLayer({
  axisFont,
  frame,
  gridColor,
  paneRangeOverrides,
  showAxisLabels = true,
  showGridLines = true,
  textColor,
}: {
  axisFont: ReturnType<typeof Skia.Font>;
  frame: NativeChartFrame;
  gridColor: string;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  showAxisLabels?: boolean;
  showGridLines?: boolean;
  textColor: string;
}) {
  if (!showAxisLabels && !showGridLines) return null;

  const characterWidth = measureNativeSkiaAxisCharacterWidth(axisFont);
  const labelRight = frame.priceAxisRight - 4;
  const labelMaxWidth = Math.max(0, labelRight - (frame.priceAxisLeft + 4));
  const maxCharacters = getNativeAxisTextCharacterCapacity(labelMaxWidth, characterWidth);

  return (
    <>
      {frame.panes
        .filter((pane) => pane.type === 'indicator' && pane.height > 0)
        .map((pane) =>
          Array.from({ length: getNativePriceGridSlotCount(pane.height, NATIVE_INDICATOR_PANE_MIN_LABEL_SPACING) }, (_, index) => (
            <NativeAnimatedIndicatorPaneAxisTick
              key={`${pane.id}-axis-${index}`}
              axisFont={axisFont}
              characterWidth={characterWidth}
              frame={frame}
              gridColor={gridColor}
              index={index}
              labelMaxWidth={labelMaxWidth}
              labelRight={labelRight}
              maxCharacters={maxCharacters}
              pane={pane}
              paneRangeOverrides={paneRangeOverrides}
              range={{ yMin: pane.yMin, yMax: pane.yMax }}
              showAxisLabels={showAxisLabels}
              showGridLines={showGridLines}
              textColor={textColor}
            />
          )),
        )}
    </>
  );
}
