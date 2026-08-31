import type { SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { NativePaneDividerBand, NativePaneDividerTarget } from '../interaction/nativePaneDivider';

import { Image as SkiaImage, Rect, Line as SkiaLine } from '@shopify/react-native-skia';
import { memo } from 'react';
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

/**
 * One pane, one bitmap, stretched to wherever the drag puts it.
 *
 * Everything here is driven by shared values, so a divider drag costs no React
 * render and no chart re-layout — which is the whole point. Committing the real
 * heights per frame is correct and unusably slow.
 *
 * The bitmap also retires itself, and that is not a nicety. `paneGeometry` and
 * `settledGeometry` are plain props read through a derived value, which is the
 * same channel every plot path takes: a new committed frame restarts this
 * mapper in the same effect flush as theirs, so both land in one mapper run and
 * Skia records one picture from it. The bitmap therefore cannot vanish on a
 * frame where the paths behind it are still drawing the pre-drag layout. Every
 * attempt to retire it from JS instead was a race, because JS cannot observe
 * that run - it can only guess at frames after the commit and be wrong on a
 * slow one.
 */
function NativePaneDividerBandImage({
  backgroundColor,
  bands,
  image,
  index,
  paneGeometry,
  settledGeometry,
  width,
}: {
  backgroundColor: string;
  bands: SharedValue<NativePaneDividerBand[]>;
  image: SkImage;
  index: number;
  paneGeometry: string;
  settledGeometry: string | null;
  width: number;
}) {
  const y = useDerivedValue(() => bands.value[index]?.top ?? 0);
  const height = useDerivedValue(() => {
    if (settledGeometry !== null && settledGeometry === paneGeometry) return 0;
    return Math.max(bands.value[index]?.height ?? 0, 0);
  });

  return (
    <>
      <Rect color={backgroundColor} height={height} width={width} x={0} y={y} />
      <SkiaImage fit="fill" height={height} image={image} width={width} x={0} y={y} />
    </>
  );
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

/** Memoized because every `<Canvas>` child is: an unmemoized one repaints the
 * scene graph on each parent render, which is every bar tick. */
export const NativePaneDividerResizeLayer = memo(function NativePaneDividerResizeLayer({
  backgroundColor,
  bands,
  paneGeometry,
  settledGeometry,
  snapshots,
  target,
  width,
}: {
  backgroundColor: string;
  bands: SharedValue<NativePaneDividerBand[]>;
  /** Signature of the pane geometry the committed frame paints. */
  paneGeometry: string;
  /** Signature the released drag asked for, or null while one is in flight. */
  settledGeometry: string | null;
  snapshots: readonly NativePaneSnapshot[];
  target: SharedValue<NativePaneDividerTarget | null>;
  width: number;
}) {
  return (
    <>
      {snapshots.map((snapshot, index) => (
        <NativePaneDividerBandImage
          key={snapshot.paneId}
          backgroundColor={backgroundColor}
          bands={bands}
          image={snapshot.image}
          index={index}
          paneGeometry={paneGeometry}
          settledGeometry={settledGeometry}
          width={width}
        />
      ))}
      <NativePaneDividerHighlight bands={bands} target={target} width={width} />
    </>
  );
})
