import type { PlotOutput } from '@tealstreet/tealscript';
import type { SharedValue } from 'react-native-reanimated';
import type { NativeChartFrame, NativePaneFrame } from './nativeChartFrame';
import type { NativeIndicatorPaneInfo } from './NativeIndicatorPlotLayer';
import type { NativePaneRangeOverrides } from './nativePaneRangeOverride';

import { memo, useMemo } from 'react';

import { Group, Skia } from '@shopify/react-native-skia';

import {
  formatIndicatorOutputAxisValue,
  getIndicatorOutputAxisLabelSources,
} from '../../rendering/indicatorOutputAxisLabels';
import {
  createNativePriceAxisLane,
  NATIVE_PRICE_AXIS_TAG_MIN_WIDTH,
  NATIVE_PRICE_AXIS_TAG_PADDING_X,
} from '../utils/nativePriceAxisLane';
import { nativePaneValueToYWithRange, resolveNativePaneRange } from './nativePaneRangeOverride';
import { getNativePriceAxisSingleLineTextBaselineOffset } from '../utils/priceAxisTagLayout';
import { createNativeAxisTagTextLayout, PRICE_AXIS_TAG_HEIGHT } from './nativeAxisTagLayout';
import { measureNativeSkiaTextWidth } from './nativeSkiaText';
import { NativePriceAxisTagBox, NativePriceAxisTagStaticText } from './NativePriceAxisTag';

export interface NativeIndicatorOutputAxisLabel {
  id: string;
  pane: NativePaneFrame;
  value: number;
  text: string;
  color: string;
  y: number;
}

export interface NativeIndicatorOutputAxisLabelGroup {
  paneId: string;
  labels: NativeIndicatorOutputAxisLabel[];
  x: number;
  width: number;
}

export function NativeIndicatorOutputAxisLabelLayerImpl({
  axisFont,
  backgroundColor,
  frame,
  indicatorPaneInfo,
  paneRangeOverrides,
  plots,
  totalBarCount,
}: {
  axisFont: ReturnType<typeof Skia.Font>;
  backgroundColor: string;
  frame: NativeChartFrame;
  indicatorPaneInfo: Readonly<Record<string, NativeIndicatorPaneInfo>>;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  plots: readonly PlotOutput[];
  totalBarCount: number;
}) {
  const labels = useMemo(
    () =>
      resolveNativeIndicatorOutputAxisLabels({
        frame,
        indicatorPaneInfo,
        paneRangeOverrides: paneRangeOverrides?.value,
        plots,
        totalBarCount,
      }),
    [frame, indicatorPaneInfo, paneRangeOverrides, plots, totalBarCount],
  );
  if (labels.length === 0) return null;

  const labelGroups = resolveNativeIndicatorOutputAxisLabelGroups({ axisFont, frame, labels });
  const baselineOffset = getNativePriceAxisSingleLineTextBaselineOffset(PRICE_AXIS_TAG_HEIGHT);

  return (
    <Group>
      {labelGroups.flatMap((group) =>
        group.labels.map((label) => {
          const textLayout = createNativeAxisTagTextLayout(group.x, group.width, axisFont, label.text);
          const tagY = label.y - PRICE_AXIS_TAG_HEIGHT / 2;
          return (
            <Group key={label.id}>
              <NativePriceAxisTagBox
                x={group.x}
                y={tagY}
                width={group.width}
                height={PRICE_AXIS_TAG_HEIGHT}
                backgroundColor={backgroundColor}
                borderColor={label.color}
              />
              <NativePriceAxisTagStaticText
                x={textLayout.x}
                y={tagY + baselineOffset}
                text={textLayout.text}
                font={axisFont}
                color={label.color}
              />
            </Group>
          );
        }),
      )}
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
      Math.max(NATIVE_PRICE_AXIS_TAG_MIN_WIDTH, Math.ceil(textWidth + NATIVE_PRICE_AXIS_TAG_PADDING_X * 2)),
    );

    return {
      paneId,
      labels: paneLabels,
      x: lane.left,
      width,
    };
  });
}

export function resolveNativeIndicatorOutputAxisLabels({
  frame,
  indicatorPaneInfo,
  paneRangeOverrides,
  plots,
  totalBarCount,
}: {
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

    labels.push({
      id: rawLabel.id,
      pane,
      value: rawLabel.value,
      text: formatIndicatorOutputAxisValue(rawLabel.value, range, rawLabel.precision),
      color: rawLabel.color,
      y: nativePaneValueToYWithRange(rawLabel.value, pane, paneRange),
    });
  }

  return resolveNativeIndicatorOutputLabelCollisions(labels);
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

    const minCenterY = firstPane.top + PRICE_AXIS_TAG_HEIGHT / 2;
    const maxCenterY = firstPane.bottom - PRICE_AXIS_TAG_HEIGHT / 2;
    const minGap = PRICE_AXIS_TAG_HEIGHT + 2;

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

    resolved.push(...sorted);
  }

  return resolved;
}

export const NativeIndicatorOutputAxisLabelLayer = memo(NativeIndicatorOutputAxisLabelLayerImpl);
NativeIndicatorOutputAxisLabelLayer.displayName = 'NativeIndicatorOutputAxisLabelLayer';
