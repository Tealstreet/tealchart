import type { PlotOutput } from '@tealstreet/tealscript';
import type { SharedValue } from 'react-native-reanimated';
import type { Bar } from '../../types';
import type { NativeChartFrame, NativePaneFrame } from './nativeChartFrame';
import type { NativeIndicatorPaneInfo } from './NativeIndicatorPlotLayer';
import type { NativePaneRangeOverrides } from './nativePaneRangeOverride';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { memo, useMemo } from 'react';

import { DashPathEffect, Group, Line as SkiaLine, Skia } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import {
  formatIndicatorOutputAxisValue,
  getIndicatorOutputAxisLabelSources,
  resolveIndicatorOutputSourceTime,
} from '../../rendering/indicatorOutputAxisLabels';
import { NATIVE_PRICE_AXIS_TAG_SIZING } from '../../utils/priceAxisTagSizing';
import {
  createNativePriceAxisLane,
  NATIVE_PRICE_AXIS_TAG_PADDING_X,
} from '../utils/nativePriceAxisLane';
import { nativePaneValueToYWithRange, resolveNativePaneRange } from './nativePaneRangeOverride';
import { getNativePriceAxisSingleLineTextBaselineOffset } from '../utils/priceAxisTagLayout';
import { createNativePriceAxisTagTextLayout } from '../utils/priceAxisTagLayout';
import { measureNativeSkiaTextWidth } from './nativeSkiaText';
import { NativePriceAxisTagBox, NativePriceAxisTagStaticText } from './NativePriceAxisTag';
import { sharedTimeToNativeX } from './nativeSharedViewport';

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
  paneRangeOverrides,
  plots,
  sharedViewport,
  smallFont,
  totalBarCount,
}: {
  backgroundColor: string;
  bars: readonly Bar[];
  frame: NativeChartFrame;
  indicatorPaneInfo: Readonly<Record<string, NativeIndicatorPaneInfo>>;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  plots: readonly PlotOutput[];
  sharedViewport: NativeViewportSharedValues;
  smallFont: ReturnType<typeof Skia.Font>;
  totalBarCount: number;
}) {
  const labels = useMemo(
    () =>
      resolveNativeIndicatorOutputAxisLabels({
        bars,
        frame,
        indicatorPaneInfo,
        paneRangeOverrides: paneRangeOverrides?.value,
        plots,
        totalBarCount,
      }),
    [bars, frame, indicatorPaneInfo, paneRangeOverrides, plots, totalBarCount],
  );
  if (labels.length === 0) return null;

  const labelGroups = resolveNativeIndicatorOutputAxisLabelGroups({ axisFont: smallFont, frame, labels });
  const baselineOffset = getNativePriceAxisSingleLineTextBaselineOffset(NATIVE_INDICATOR_OUTPUT_AXIS_TAG_HEIGHT);

  return (
    <Group>
      {labelGroups.flatMap((group) => {
        const clip = {
          x: frame.contentLeft,
          y: group.pane.top + 1,
          width: frame.priceAxisRight - frame.contentLeft,
          height: Math.max(0, group.pane.height - 2),
        };
        return group.labels.map((label) => (
          <NativeIndicatorOutputAxisTag
            key={label.id}
            backgroundColor={backgroundColor}
            baselineOffset={baselineOffset}
            clip={clip}
            frame={frame}
            group={group}
            label={label}
            paneRangeOverrides={paneRangeOverrides}
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
    const range = resolveNativePaneRange(label.pane, paneRangeOverrides?.value);
    return nativePaneValueToYWithRange(label.value, label.pane, range);
  });
  const labelCenterY = useDerivedValue(() => valueY.value + labelOffsetFromValueY);
  const tagY = useDerivedValue(() => labelCenterY.value - NATIVE_INDICATOR_OUTPUT_AXIS_TAG_HEIGHT / 2);
  const textY = useDerivedValue(() => tagY.value + baselineOffset);
  const guideY = useDerivedValue(() => Math.round(valueY.value) + 0.5);
  const sourceTime = label.sourceTime;
  const sourceX = useDerivedValue(
    () => {
      if (!Number.isFinite(sourceTime ?? NaN)) return Number.NaN;
      return sharedTimeToNativeX(sourceTime!, sharedViewport, frame);
    },
    [sourceTime, sharedViewport, frame],
  );
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
}: {
  axisFont: ReturnType<typeof Skia.Font>;
  frame: NativeChartFrame;
  labels: readonly NativeIndicatorOutputAxisLabel[];
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
    const width = Math.min(
      lane.width,
      Math.max(
        NATIVE_INDICATOR_OUTPUT_AXIS_TAG_MIN_WIDTH,
        Math.ceil(textWidth + NATIVE_INDICATOR_OUTPUT_AXIS_TAG_PADDING_X * 2),
      ),
    );

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
  paneRangeOverrides,
  plots,
  totalBarCount,
}: {
  bars?: readonly Bar[];
  frame: NativeChartFrame;
  indicatorPaneInfo: Readonly<Record<string, NativeIndicatorPaneInfo>>;
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

    const paneRange = resolveNativePaneRange(pane, paneRangeOverrides);
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

    const minCenterY = firstPane.top + NATIVE_INDICATOR_OUTPUT_AXIS_TAG_HEIGHT / 2;
    const maxCenterY = firstPane.bottom - NATIVE_INDICATOR_OUTPUT_AXIS_TAG_HEIGHT / 2;
    const minGap = NATIVE_INDICATOR_OUTPUT_AXIS_TAG_HEIGHT + NATIVE_INDICATOR_OUTPUT_AXIS_TAG_GAP;

    for (let index = 0; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const label = sorted[index]!;
      const lowerBound = previous ? previous.y + minGap : minCenterY;
      label.y = Math.max(lowerBound, Math.min(maxCenterY, label.y));
    }

    for (let index = sorted.length - 1; index >= 0; index -= 1) {
      const next = sorted[index + 1];
      const label = sorted[index]!;
      const upperBound = next ? next.y - minGap : maxCenterY;
      label.y = Math.min(upperBound, Math.max(minCenterY, label.y));
    }

    for (const label of sorted) {
      label.y = Math.max(minCenterY, Math.min(maxCenterY, label.y));
    }

    resolved.push(...sorted);
  }

  return resolved;
}

export const NativeIndicatorOutputAxisLabelLayer = memo(NativeIndicatorOutputAxisLabelLayerImpl);
NativeIndicatorOutputAxisLabelLayer.displayName = 'NativeIndicatorOutputAxisLabelLayer';
