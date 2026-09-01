import type { PlotOutput } from '@tealstreet/tealscript';
import type { SharedValue } from 'react-native-reanimated';
import type { Bar } from '../../types';
import type { NativeChartFrame, NativePaneFrame } from './nativeChartFrame';
import type { NativeIndicatorPaneInfo } from './NativeIndicatorPlotLayer';
import type { NativePaneRange, NativePaneRangeOverrides } from './nativePaneRangeOverride';
import type { NativeResolvedPriceAxisTag } from '../utils/priceAxisTagLayout';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { memo, useMemo, useRef } from 'react';

import { DashPathEffect, Group, Skia, Line as SkiaLine } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import {
  formatIndicatorOutputAxisValue,
  getIndicatorOutputAxisLabelSources,
  resolveIndicatorOutputSourceTime,
} from '../../rendering/indicatorOutputAxisLabels';
import { NATIVE_PRICE_AXIS_TAG_SIZING, PriceAxisTagWidthCache } from '../../utils/priceAxisTagSizing';
import { withPriceAxisTagBackgroundAlpha } from '../../utils/priceAxisTagStyle';
import { createNativePriceAxisLane, NATIVE_PRICE_AXIS_TAG_PADDING_X } from '../utils/nativePriceAxisLane';
import {
  createNativePriceAxisTagTextLayout,
  findNativeResolvedPriceAxisTagCenterY,
  getNativePriceAxisSingleLineTextBaselineOffset,
  resolveNativePriceAxisTagStack,
} from '../utils/priceAxisTagLayout';
import { nativePaneValueToYWithRange, resolveNativePaneValueRange } from './nativePaneRangeOverride';
import { NativePriceAxisTagBox, NativePriceAxisTagStaticText } from './NativePriceAxisTag';
import { sharedTimeToNativeX } from './nativeSharedViewport';
import { measureNativeSkiaTextWidth } from './nativeSkiaText';

export const NATIVE_INDICATOR_OUTPUT_AXIS_TAG_HEIGHT = NATIVE_PRICE_AXIS_TAG_SIZING.indicatorOutput.height;
export const NATIVE_INDICATOR_OUTPUT_AXIS_TAG_MIN_WIDTH = 28;
const NATIVE_INDICATOR_OUTPUT_AXIS_TAG_PADDING_X = NATIVE_PRICE_AXIS_TAG_PADDING_X;
const NATIVE_INDICATOR_OUTPUT_AXIS_TAG_GAP = 0;
const NATIVE_INDICATOR_OUTPUT_AXIS_GUIDE_DASH = [4, 4];

export interface NativeIndicatorOutputAxisLabel {
  id: string;
  pane: NativePaneFrame;
  value: number;
  text: string;
  color: string;
  valueY: number;
  y: number;
  sourceTime?: number;
}

export interface NativeIndicatorOutputAxisLabelGroup {
  paneId: string;
  pane: NativePaneFrame;
  labels: NativeIndicatorOutputAxisLabel[];
  x: number;
  width: number;
}

export function NativeIndicatorOutputAxisLabelLayerImpl({
  backgroundColor,
  bars,
  frame,
  indicatorPaneInfo,
  mainPaneRange,
  paneRangeOverrides,
  plots,
  resolvedPriceAxisTags,
  sharedViewport,
  smallFont,
  totalBarCount,
}: {
  backgroundColor: string;
  bars: readonly Bar[];
  frame: NativeChartFrame;
  indicatorPaneInfo: Readonly<Record<string, NativeIndicatorPaneInfo>>;
  /** The price scale, which the main pane's own frame does not carry. */
  mainPaneRange?: NativePaneRange | null;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  plots: readonly PlotOutput[];
  /** The shared price-axis stack, which main-pane readouts are resolved in. */
  resolvedPriceAxisTags: SharedValue<NativeResolvedPriceAxisTag[]>;
  sharedViewport: NativeViewportSharedValues;
  smallFont: ReturnType<typeof Skia.Font>;
  totalBarCount: number;
}) {
  const tagBackgroundColor = withPriceAxisTagBackgroundAlpha(backgroundColor);
  const axisTagWidthCache = useRef(new PriceAxisTagWidthCache()).current;
  const labels = useMemo(
    () =>
      resolveNativeIndicatorOutputAxisLabels({
        bars,
        frame,
        indicatorPaneInfo,
        mainPaneRange,
        paneRangeOverrides: paneRangeOverrides?.value,
        plots,
        totalBarCount,
      }),
    [bars, frame, indicatorPaneInfo, mainPaneRange, paneRangeOverrides, plots, totalBarCount],
  );
  if (labels.length === 0) return null;

  const labelGroups = resolveNativeIndicatorOutputAxisLabelGroups({
    axisFont: smallFont,
    frame,
    labels,
    widthCache: axisTagWidthCache,
  });
  const baselineOffset = getNativePriceAxisSingleLineTextBaselineOffset(NATIVE_INDICATOR_OUTPUT_AXIS_TAG_HEIGHT);

  return (
    <Group>
      {labelGroups.flatMap((group) => {
        // The shared stack deliberately does not floor-clamp its result - a tag
        // stacked under a fixed one may need a few pixels more than the plot
        // has - so a main-pane readout pushed past the pane edge is clipped
        // here rather than pulled back into view the way the layer's own pass
        // used to. Losing the crowded outlier beats closing the gap that keeps
        // the tags above it readable.
        const clip = {
          x: frame.contentLeft,
          y: group.pane.top + 1,
          width: frame.priceAxisRight - frame.contentLeft,
          height: Math.max(0, group.pane.height - 2),
        };
        return group.labels.map((label) => (
          <NativeIndicatorOutputAxisTag
            key={label.id}
            backgroundColor={tagBackgroundColor}
            baselineOffset={baselineOffset}
            clip={clip}
            frame={frame}
            group={group}
            label={label}
            paneRangeOverrides={paneRangeOverrides}
            resolvedPriceAxisTags={label.pane.type === 'main' ? resolvedPriceAxisTags : undefined}
            sharedViewport={sharedViewport}
            smallFont={smallFont}
          />
        ));
      })}
    </Group>
  );
}

function NativeIndicatorOutputAxisTag({
  backgroundColor,
  baselineOffset,
  clip,
  frame,
  group,
  label,
  paneRangeOverrides,
  resolvedPriceAxisTags,
  sharedViewport,
  smallFont,
}: {
  backgroundColor: string;
  baselineOffset: number;
  clip: { x: number; y: number; width: number; height: number };
  frame: NativeChartFrame;
  group: NativeIndicatorOutputAxisLabelGroup;
  label: NativeIndicatorOutputAxisLabel;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  /**
   * Set only for main-pane readouts, which resolve in the shared stack. An
   * indicator-pane readout must not close over it, or every frame of an order
   * drag re-evaluates a centre that cannot have moved.
   */
  resolvedPriceAxisTags?: SharedValue<NativeResolvedPriceAxisTag[]>;
  sharedViewport: NativeViewportSharedValues;
  smallFont: ReturnType<typeof Skia.Font>;
}) {
  const textLayout = createNativePriceAxisTagTextLayout(
    group.x,
    group.width,
    label.text,
    (value) => measureNativeSkiaTextWidth(smallFont, value),
    NATIVE_INDICATOR_OUTPUT_AXIS_TAG_PADDING_X,
  );
  const labelOffsetFromValueY = label.y - label.valueY;
  const valueY = useDerivedValue(() => {
    const range = resolveNativePaneValueRange(label.pane, paneRangeOverrides?.value, {
      yMin: sharedViewport.priceMin.value,
      yMax: sharedViewport.priceMax.value,
    });
    return nativePaneValueToYWithRange(label.value, label.pane, range);
  });
  // A main-pane readout reads its centre off the shared stack, the same way the
  // price and trade lines beside it do - falling back to its own price when the
  // stack has dropped it, which is how every other consumer handles that.
  const labelCenterY = useDerivedValue(() =>
    resolvedPriceAxisTags
      ? findNativeResolvedPriceAxisTagCenterY(resolvedPriceAxisTags.value, label.id, valueY.value)
      : valueY.value + labelOffsetFromValueY,
  );
  const tagY = useDerivedValue(() => labelCenterY.value - NATIVE_INDICATOR_OUTPUT_AXIS_TAG_HEIGHT / 2);
  const textY = useDerivedValue(() => tagY.value + baselineOffset);
  const guideY = useDerivedValue(() => Math.round(valueY.value) + 0.5);
  const sourceTime = label.sourceTime;
  const sourceX = useDerivedValue(() => {
    if (!Number.isFinite(sourceTime ?? NaN)) return Number.NaN;
    return sharedTimeToNativeX(sourceTime!, sharedViewport, frame);
  }, [sourceTime, sharedViewport, frame]);
  const guideStart = useDerivedValue(() => {
    return { x: resolveNativeIndicatorOutputGuideStartX(sourceX.value, frame, group.x), y: guideY.value };
  }, [sourceX, frame, group.x, guideY]);
  const guideEnd = useDerivedValue(() => ({ x: group.x, y: guideY.value }), [group.x, guideY]);

  return (
    <Group clip={clip}>
      <SkiaLine p1={guideStart} p2={guideEnd} color={label.color} strokeWidth={1} opacity={0.65}>
        <DashPathEffect intervals={NATIVE_INDICATOR_OUTPUT_AXIS_GUIDE_DASH} />
      </SkiaLine>
      <NativePriceAxisTagBox
        x={group.x}
        y={tagY}
        width={group.width}
        height={NATIVE_INDICATOR_OUTPUT_AXIS_TAG_HEIGHT}
        backgroundColor={backgroundColor}
        borderColor={label.color}
      />
      <NativePriceAxisTagStaticText
        x={textLayout.x}
        y={textY}
        text={textLayout.text}
        font={smallFont}
        color={label.color}
      />
    </Group>
  );
}

export function resolveNativeIndicatorOutputAxisLabelGroups({
  axisFont,
  frame,
  labels,
  widthCache,
}: {
  axisFont: ReturnType<typeof Skia.Font>;
  frame: NativeChartFrame;
  labels: readonly NativeIndicatorOutputAxisLabel[];
  widthCache?: PriceAxisTagWidthCache;
}): NativeIndicatorOutputAxisLabelGroup[] {
  const lane = createNativePriceAxisLane(frame);
  const labelsByPane = new Map<string, NativeIndicatorOutputAxisLabel[]>();
  for (const label of labels) {
    const paneLabels = labelsByPane.get(label.pane.id) ?? [];
    paneLabels.push(label);
    labelsByPane.set(label.pane.id, paneLabels);
  }

  return Array.from(labelsByPane.entries(), ([paneId, paneLabels]) => {
    const textWidth = paneLabels.reduce(
      (maxWidth, label) => Math.max(maxWidth, measureNativeSkiaTextWidth(axisFont, label.text)),
      0,
    );
    const measuredWidth = Math.min(
      lane.width,
      Math.max(
        NATIVE_INDICATOR_OUTPUT_AXIS_TAG_MIN_WIDTH,
        Math.ceil(textWidth + NATIVE_INDICATOR_OUTPUT_AXIS_TAG_PADDING_X * 2),
      ),
    );
    const width = widthCache?.resolve(`${paneId}:indicator-output`, measuredWidth) ?? measuredWidth;

    return {
      paneId,
      pane: paneLabels[0]!.pane,
      labels: paneLabels,
      x: lane.left,
      width,
    };
  });
}

export function resolveNativeIndicatorOutputAxisLabels({
  bars,
  frame,
  indicatorPaneInfo,
  mainPaneRange,
  paneRangeOverrides,
  plots,
  totalBarCount,
}: {
  bars?: readonly Bar[];
  frame: NativeChartFrame;
  indicatorPaneInfo: Readonly<Record<string, NativeIndicatorPaneInfo>>;
  mainPaneRange?: NativePaneRange | null;
  paneRangeOverrides?: NativePaneRangeOverrides;
  plots: readonly PlotOutput[];
  totalBarCount: number;
}): NativeIndicatorOutputAxisLabel[] {
  const paneById = new Map(frame.panes.map((pane) => [pane.id, pane]));
  const rawLabels = getIndicatorOutputAxisLabelSources({
    indicatorPaneInfo,
    panes: frame.panes,
    plots,
    totalBarCount,
  });
  const labels: NativeIndicatorOutputAxisLabel[] = [];

  for (const rawLabel of rawLabels) {
    const pane = paneById.get(rawLabel.paneId);
    if (!pane || pane.height <= 0) continue;

    const paneRange = resolveNativePaneValueRange(pane, paneRangeOverrides, mainPaneRange);
    if (rawLabel.value < paneRange.yMin || rawLabel.value > paneRange.yMax) continue;

    const range = paneRange.yMax - paneRange.yMin;
    if (range <= 0) continue;

    const y = nativePaneValueToYWithRange(rawLabel.value, pane, paneRange);
    labels.push({
      id: rawLabel.id,
      pane,
      value: rawLabel.value,
      text: formatIndicatorOutputAxisValue(rawLabel.value, range, rawLabel.precision),
      color: rawLabel.color,
      valueY: y,
      y,
      sourceTime: resolveNativeIndicatorOutputSourceTime({
        bars,
        plotOffset: rawLabel.plotOffset,
        sourceIndex: rawLabel.sourceIndex,
      }),
    });
  }

  return resolveNativeIndicatorOutputLabelCollisions(labels);
}

function resolveNativeIndicatorOutputSourceTime({
  bars,
  plotOffset,
  sourceIndex,
}: {
  bars?: readonly Bar[];
  plotOffset?: number;
  sourceIndex: number | undefined;
}): number | undefined {
  return resolveIndicatorOutputSourceTime({ bars, plotOffset, sourceIndex });
}

export function resolveNativeIndicatorOutputGuideStartX(
  sourceX: number,
  frame: NativeChartFrame,
  labelX: number,
): number {
  'worklet';
  if (!Number.isFinite(sourceX) || sourceX >= labelX) return labelX;
  return Math.max(frame.contentLeft, sourceX);
}

function resolveNativeIndicatorOutputLabelCollisions(
  labels: NativeIndicatorOutputAxisLabel[],
): NativeIndicatorOutputAxisLabel[] {
  const labelsByPane = new Map<string, NativeIndicatorOutputAxisLabel[]>();
  for (const label of labels) {
    const paneLabels = labelsByPane.get(label.pane.id) ?? [];
    paneLabels.push(label);
    labelsByPane.set(label.pane.id, paneLabels);
  }

  const resolved: NativeIndicatorOutputAxisLabel[] = [];
  for (const paneLabels of labelsByPane.values()) {
    const sorted = [...paneLabels].sort((a, b) => a.y - b.y);
    const firstPane = sorted[0]?.pane;
    if (!firstPane) continue;

    // The main pane's readouts stack with the orders, positions and the
    // last-trade tag instead, in the one shared pass. They still have to come
    // out of here, or they would not be drawn at all.
    if (firstPane.type === 'main') {
      resolved.push(...sorted);
      continue;
    }

    const stack = resolveNativePriceAxisTagStack(
      sorted.map((label) => ({
        id: label.id,
        originalY: label.y,
        height: NATIVE_INDICATOR_OUTPUT_AXIS_TAG_HEIGHT,
      })),
      firstPane.top,
      firstPane.bottom,
      NATIVE_INDICATOR_OUTPUT_AXIS_TAG_GAP,
    );
    const stackById = new Map(stack.map((label) => [label.id, label.centerY]));

    for (const label of sorted) {
      label.y = stackById.get(label.id) ?? label.y;
    }

    resolved.push(...sorted);
  }

  return resolved;
}

export const NativeIndicatorOutputAxisLabelLayer = memo(NativeIndicatorOutputAxisLabelLayerImpl);
NativeIndicatorOutputAxisLabelLayer.displayName = 'NativeIndicatorOutputAxisLabelLayer';
