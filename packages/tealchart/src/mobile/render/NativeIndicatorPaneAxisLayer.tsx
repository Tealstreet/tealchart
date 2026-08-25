import type { Skia } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { NativeChartFrame, NativePaneFrame } from './nativeChartFrame';
import type { NativePaneRange, NativePaneRangeOverrides } from './nativePaneRangeOverride';

import { memo, useMemo } from 'react';

import { Glyphs, Path as SkiaPath, Skia as SkiaApi } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { createNativeLeftAlignedAxisTextX, getNativeAxisTextCharacterCapacity } from '../utils/axisTickLayout';
import { fitNativeAxisTextToCharacterCountWorklet } from './nativeAxisTagLayout';
import {
  getNativePriceGridSlot,
  getNativePriceGridSlotCount,
  NATIVE_INDICATOR_PANE_MIN_LABEL_SPACING,
} from './nativeGridSlots';
import { formatNativeIndicatorAxisTickWorklet } from './nativePriceFormat';
import type { NativeAxisGlyph } from './nativeAxisLabelGlyphs';
import { appendNativeAxisLabelGlyphs, createNativeAxisGlyphMetrics } from './nativeAxisLabelGlyphs';
import { measureNativeSkiaAxisCharacterWidth, NATIVE_ANIMATED_TEXT_CHARACTERS } from './nativeSkiaText';

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
  frame: NativeChartFrame;
  index: number;
  labelLeft: number;
  maxCharacters: number;
  pane: NativePaneFrame;
  range: NativePaneRange;
  /** Geometry-only callers skip the label formatting they would discard. */
  skipLabel?: boolean;
}

/**
 * One tick on an indicator pane's own value axis.
 *
 * The range is passed in rather than read off the pane, so a drag in flight can
 * feed the live value from a shared value and the axis tracks the finger.
 */
export function resolveNativeIndicatorPaneAxisSlot({
  frame,
  index,
  labelLeft,
  maxCharacters,
  pane,
  range,
  skipLabel,
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
  // The grid-line path needs geometry only, and formatting a string to throw it
  // away is per slot per frame on the UI thread.
  const labelText = skipLabel
    ? ''
    : fitNativeAxisTextToCharacterCountWorklet(
        formatNativeIndicatorAxisTickWorklet(slot.price, slot.spacing),
        maxCharacters,
      );

  return {
    labelText,
    labelX: createNativeLeftAlignedAxisTextX(labelLeft),
    labelY: Math.max(pane.top + 10, Math.min(pane.bottom - 2, y + 4)),
    lineEnd: { x: frame.priceAxisRight, y },
    lineStart: { x: frame.contentLeft, y },
    value: slot.price,
    // A short pane often admits only its two end ticks — for a 0-100 oscillator
    // those sit exactly on pane.top and pane.bottom, so culling the edges leaves
    // the axis blank. Keep them and clamp the baseline.
    // A collapsed pane has top === bottom, so the range check alone passes and
    // the label clamps to top + 10 - i.e. into the pane below. Unreachable while
    // the layer still filters panes by height, but that filter is what has to go
    // for a maximize to stop changing the tree; this is what makes that safe.
    visible: pane.height > 0 && span > 0 && slot.visible && y >= pane.top - 0.5 && y <= pane.bottom + 0.5,
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

export function NativeIndicatorPaneAxisLayerImpl({
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
  const labelLeft = frame.priceAxisLeft + 4;
  const labelRight = frame.priceAxisRight - 4;
  const labelMaxWidth = Math.max(0, labelRight - labelLeft);
  const maxCharacters = getNativeAxisTextCharacterCapacity(labelMaxWidth, characterWidth);
  const indicatorPanes = frame.panes.filter((pane) => pane.type === 'indicator');
  // getNativePriceGridSlotCount is not a worklet, so the bound is counted here
  // and handed to the path below rather than derived inside it.
  const slotCounts = indicatorPanes.map((pane) =>
    pane.height > 0 ? getNativePriceGridSlotCount(pane.height, NATIVE_INDICATOR_PANE_MIN_LABEL_SPACING) : 0,
  );

  // Grid lines carry no text, so every pane's ticks merge into one path built in
  // one derived value. A node per layer instead of a node per tick - and, the
  // reason it is here, the element count stops depending on pane height, which
  // mount and unmount would otherwise put on the React commit.
  // Lines and labels are each one merged node, so every combination is served by
  // composing them - there is no per-tick branch left to fall through to.
  return (
    <>
      {showGridLines ? (
        <NativeIndicatorPaneAxisGridPath
          frame={frame}
          gridColor={gridColor}
          indicatorPanes={indicatorPanes}
          paneRangeOverrides={paneRangeOverrides}
          slotCounts={slotCounts}
        />
      ) : null}
      {showAxisLabels ? (
        <NativeIndicatorPaneAxisLabelGlyphs
          axisFont={axisFont}
          frame={frame}
          indicatorPanes={indicatorPanes}
          labelLeft={labelLeft}
          maxCharacters={maxCharacters}
          paneRangeOverrides={paneRangeOverrides}
          slotCounts={slotCounts}
          textColor={textColor}
        />
      ) : null}
    </>
  );
}

/**
 * Every indicator pane's grid lines as one stroked path. The loop runs to a
 * bound counted on the JS side; resolveNativeIndicatorPaneAxisSlot culls the
 * slots that fall outside their pane, including all of a collapsed one's.
 */
function NativeIndicatorPaneAxisGridPath({
  frame,
  gridColor,
  indicatorPanes,
  paneRangeOverrides,
  slotCounts,
}: {
  frame: NativeChartFrame;
  gridColor: string;
  indicatorPanes: readonly NativePaneFrame[];
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  slotCounts: readonly number[];
}) {
  const path = useDerivedValue(() => {
    const built = SkiaApi.Path.Make();
    const overrides = paneRangeOverrides?.value;
    for (let paneIndex = 0; paneIndex < indicatorPanes.length; paneIndex += 1) {
      const pane = indicatorPanes[paneIndex];
      if (!pane) continue;
      const override = overrides ? overrides[pane.id] : undefined;
      const range = override ?? { yMin: pane.yMin, yMax: pane.yMax };
      const count = slotCounts[paneIndex] ?? 0;
      for (let index = 0; index < count; index += 1) {
        const slot = resolveNativeIndicatorPaneAxisSlot({
          frame,
          index,
          labelLeft: 0,
          maxCharacters: 0,
          pane,
          range,
          skipLabel: true,
        });
        if (!slot.visible) continue;
        built.moveTo(slot.lineStart.x, slot.lineStart.y);
        built.lineTo(slot.lineEnd.x, slot.lineEnd.y);
      }
    }
    return built;
  });

  return <SkiaPath path={path} color={gridColor} style="stroke" strokeWidth={1} />;
}

/** Every indicator pane's axis labels as one Glyphs node. */
function NativeIndicatorPaneAxisLabelGlyphs({
  axisFont,
  frame,
  indicatorPanes,
  labelLeft,
  maxCharacters,
  paneRangeOverrides,
  slotCounts,
  textColor,
}: {
  axisFont: ReturnType<typeof Skia.Font>;
  frame: NativeChartFrame;
  indicatorPanes: readonly NativePaneFrame[];
  labelLeft: number;
  maxCharacters: number;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  slotCounts: readonly number[];
  textColor: string;
}) {
  const glyphMetrics = useMemo(
    () => createNativeAxisGlyphMetrics(axisFont, NATIVE_ANIMATED_TEXT_CHARACTERS),
    [axisFont],
  );
  const glyphs = useDerivedValue(() => {
    const out: NativeAxisGlyph[] = [];
    const overrides = paneRangeOverrides?.value;
    for (let paneIndex = 0; paneIndex < indicatorPanes.length; paneIndex += 1) {
      const pane = indicatorPanes[paneIndex];
      if (!pane) continue;
      const override = overrides ? overrides[pane.id] : undefined;
      const range = override ?? { yMin: pane.yMin, yMax: pane.yMax };
      const count = slotCounts[paneIndex] ?? 0;
      for (let index = 0; index < count; index += 1) {
        const slot = resolveNativeIndicatorPaneAxisSlot({
          frame,
          index,
          labelLeft,
          maxCharacters,
          pane,
          range,
        });
        if (!slot.visible) continue;
        appendNativeAxisLabelGlyphs({
          glyphMetrics,
          out,
          text: slot.labelText,
          x: slot.labelX,
          y: slot.labelY,
        });
      }
    }
    return out;
  });

  return <Glyphs font={axisFont} x={0} y={0} glyphs={glyphs} color={textColor} />;
}

// Memoised: the chart owner re-renders on every unrelated UI state change, and
// reconciling this subtree each time was the cost behind the laggy transitions.
export const NativeIndicatorPaneAxisLayer = memo(NativeIndicatorPaneAxisLayerImpl);
NativeIndicatorPaneAxisLayer.displayName = 'NativeIndicatorPaneAxisLayer';
