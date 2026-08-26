import type { PlotOutput } from '@tealstreet/tealscript';
import type { NativeChartFrame, NativePaneFrame } from './nativeChartFrame';
import type { NativeIndicatorPaneInfo } from './NativeIndicatorPlotLayer';

import { memo, useMemo } from 'react';

import { Group, Skia } from '@shopify/react-native-skia';

import {
  formatIndicatorOutputAxisValue,
  getIndicatorOutputAxisLabelSources,
} from '../../rendering/indicatorOutputAxisLabels';
import { getNativePriceAxisSingleLineTextBaselineOffset } from '../utils/priceAxisTagLayout';
import { createNativeAxisTagLayout, createNativeAxisTagTextLayout, PRICE_AXIS_TAG_HEIGHT } from './nativeAxisTagLayout';
import { NativePriceAxisTagBox, NativePriceAxisTagStaticText } from './NativePriceAxisTag';

interface NativeIndicatorOutputAxisLabel {
  id: string;
  pane: NativePaneFrame;
  value: number;
  text: string;
  color: string;
  y: number;
}

export function NativeIndicatorOutputAxisLabelLayerImpl({
  axisFont,
  backgroundColor,
  frame,
  indicatorPaneInfo,
  plots,
  totalBarCount,
}: {
  axisFont: ReturnType<typeof Skia.Font>;
  backgroundColor: string;
  frame: NativeChartFrame;
  indicatorPaneInfo: Readonly<Record<string, NativeIndicatorPaneInfo>>;
  plots: readonly PlotOutput[];
  totalBarCount: number;
}) {
  const labels = useMemo(
    () => resolveNativeIndicatorOutputAxisLabels({ frame, indicatorPaneInfo, plots, totalBarCount }),
    [frame, indicatorPaneInfo, plots, totalBarCount],
  );
  if (labels.length === 0) return null;

  const longestText = labels.reduce(
    (longest, label) => (label.text.length > longest.length ? label.text : longest),
    '',
  );
  const tagLayout = createNativeAxisTagLayout(frame, axisFont, longestText);
  const baselineOffset = getNativePriceAxisSingleLineTextBaselineOffset(PRICE_AXIS_TAG_HEIGHT);

  return (
    <Group>
      {labels.map((label) => {
        const textLayout = createNativeAxisTagTextLayout(tagLayout.x, tagLayout.width, axisFont, label.text);
        const tagY = label.y - PRICE_AXIS_TAG_HEIGHT / 2;
        return (
          <Group key={label.id}>
            <NativePriceAxisTagBox
              x={tagLayout.x}
              y={tagY}
              width={tagLayout.width}
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
      })}
    </Group>
  );
}

function resolveNativeIndicatorOutputAxisLabels({
  frame,
  indicatorPaneInfo,
  plots,
  totalBarCount,
}: {
  frame: NativeChartFrame;
  indicatorPaneInfo: Readonly<Record<string, NativeIndicatorPaneInfo>>;
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
    if (!pane || pane.height <= 0 || rawLabel.value < pane.yMin || rawLabel.value > pane.yMax) continue;

    const range = pane.yMax - pane.yMin;
    if (range <= 0) continue;

    labels.push({
      id: rawLabel.id,
      pane,
      value: rawLabel.value,
      text: formatIndicatorOutputAxisValue(rawLabel.value, range, rawLabel.precision),
      color: rawLabel.color,
      y: pane.top + ((pane.yMax - rawLabel.value) / range) * pane.height,
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
