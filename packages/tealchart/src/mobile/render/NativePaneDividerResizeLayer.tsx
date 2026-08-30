import type { SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { NativePaneDividerBand, NativePaneDividerTarget } from '../interaction/nativePaneDivider';
import type { NativeChartFrame } from './nativeChartFrame';

import { Group, Rect, Image as SkiaImage, Line as SkiaLine } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import {
  PANE_DIVIDER_HIGHLIGHT_BAND,
  PANE_DIVIDER_HIGHLIGHT_BAND_RADIUS,
  PANE_DIVIDER_HIGHLIGHT_LINE,
  PANE_DIVIDER_HIGHLIGHT_LINE_WIDTH,
} from '../../constants';

export interface NativePaneSnapshot {
  height: number;
  image: SkImage;
  paneId: string;
  top: number;
}

export function nativePaneDividerSnapshotBridgeVisible({
  bands,
  frame,
  target,
}: {
  bands: readonly NativePaneDividerBand[];
  frame: NativeChartFrame;
  target: NativePaneDividerTarget | null;
}): boolean {
  'worklet';
  if (target) return true;
  if (bands.length === 0) return false;

  for (let index = 0; index < bands.length; index += 1) {
    const band = bands[index]!;
    const pane = frame.panes.find((entry) => entry.id === band.paneId);
    if (!pane) return false;
    if (pane.top !== band.srcTop || pane.height !== band.srcHeight) return false;
  }
  return true;
}

/**
 * One pane, one bitmap, stretched to wherever the drag puts it.
 *
 * Everything here is driven by shared values, so a divider drag costs no React
 * render and no chart re-layout — which is the whole point. Committing the real
 * heights per frame is correct and unusably slow.
 */
function NativePaneDividerBandImage({
  bands,
  image,
  index,
  width,
}: {
  bands: SharedValue<NativePaneDividerBand[]>;
  image: SkImage;
  index: number;
  width: number;
}) {
  const y = useDerivedValue(() => bands.value[index]?.top ?? 0);
  const height = useDerivedValue(() => Math.max(bands.value[index]?.height ?? 0, 0));

  return <SkiaImage fit="fill" height={height} image={image} width={width} x={0} y={y} />;
}

/**
 * The grabbed divider, in web's blue. Drawn here rather than in the chart's
 * chrome because the bitmaps sit above the live chart while a drag is in
 * flight, and a highlight underneath them would be invisible.
 */
function NativePaneDividerHighlight({
  bands,
  target,
  width,
}: {
  bands: SharedValue<NativePaneDividerBand[]>;
  target: SharedValue<NativePaneDividerTarget | null>;
  width: number;
}) {
  const dividerY = useDerivedValue(() => {
    const current = target.value;
    if (!current) return -1;
    const currentBands = bands.value;
    for (let index = 0; index < currentBands.length; index += 1) {
      const band = currentBands[index]!;
      if (band.paneId === current.paneBelowId) return band.top;
    }
    return current.y;
  });
  const bandY = useDerivedValue(() => dividerY.value - PANE_DIVIDER_HIGHLIGHT_BAND_RADIUS);
  const opacity = useDerivedValue(() => (dividerY.value < 0 ? 0 : 1));
  const lineStart = useDerivedValue(() => ({ x: 0, y: dividerY.value }));
  const lineEnd = useDerivedValue(() => ({ x: width, y: dividerY.value }));

  return (
    <>
      <Rect
        color={PANE_DIVIDER_HIGHLIGHT_BAND}
        height={PANE_DIVIDER_HIGHLIGHT_BAND_RADIUS * 2}
        opacity={opacity}
        width={width}
        x={0}
        y={bandY}
      />
      <SkiaLine
        color={PANE_DIVIDER_HIGHLIGHT_LINE}
        opacity={opacity}
        p1={lineStart}
        p2={lineEnd}
        strokeWidth={PANE_DIVIDER_HIGHLIGHT_LINE_WIDTH}
      />
    </>
  );
}

export function NativePaneDividerResizeLayer({
  bands,
  frame,
  snapshots,
  target,
  width,
}: {
  bands: SharedValue<NativePaneDividerBand[]>;
  frame: NativeChartFrame;
  snapshots: readonly NativePaneSnapshot[];
  target: SharedValue<NativePaneDividerTarget | null>;
  width: number;
}) {
  const opacity = useDerivedValue(() =>
    nativePaneDividerSnapshotBridgeVisible({ bands: bands.value, frame, target: target.value }) ? 1 : 0,
  );

  return (
    <Group opacity={opacity}>
      {snapshots.map((snapshot, index) => (
        <NativePaneDividerBandImage
          key={snapshot.paneId}
          bands={bands}
          image={snapshot.image}
          index={index}
          width={width}
        />
      ))}
      <NativePaneDividerHighlight bands={bands} target={target} width={width} />
    </Group>
  );
}
