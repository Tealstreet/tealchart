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

/**
 * Presented frames the preview outlives its commit by. Sized to cover the
 * Android path rebuild (~250ms measured) rather than to hit the moment it ends.
 */
const NATIVE_PANE_DIVIDER_SETTLE_FRAMES = 18;

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
 * The bitmap retires itself in the draw pass, and it waits out a fixed number
 * of presented frames to do it. That count is a fence, not a mechanism, and it
 * is the one piece of this drag that is tuned rather than derived.
 *
 * What it is fencing: a pane-geometry commit rebuilds every plot path in the
 * canvas, and on Android that work has been measured at roughly a quarter of a
 * second - the frames stay on the pre-drag layout throughout. Retiring the
 * bitmap any earlier uncovers them. Four attempts to find the exact moment
 * failed, each closer than the last: an extra animation frame, a single-commit
 * clear, a JS echo of the committed geometry, then this comparison alone. They
 * all reduce to JS or a mapper trying to observe a repaint neither of them can
 * see. Reanimated could order this for us if the paths declared their rebuild
 * as a shared-value output, since mappers are sorted topologically on those -
 * they do not, and `useDerivedValue` cannot declare one.
 *
 * So the count waits longer than the repaint takes rather than guessing when it
 * lands. Being late costs a stretched bitmap for a few more frames; being early
 * is the flap. iOS pays nothing visible for it - its paths land in one frame,
 * and the bitmap it holds is already at the committed geometry.
 */
function NativePaneDividerBandImage({
  backgroundColor,
  bands,
  image,
  index,
  paneGeometry,
  settleFrames,
  settledGeometry,
  width,
}: {
  backgroundColor: string;
  bands: SharedValue<NativePaneDividerBand[]>;
  image: SkImage;
  index: number;
  paneGeometry: string;
  settleFrames: SharedValue<number>;
  settledGeometry: string | null;
  width: number;
}) {
  const y = useDerivedValue(() => bands.value[index]?.top ?? 0);
  const height = useDerivedValue(() => {
    const settled = settledGeometry !== null && settledGeometry === paneGeometry;
    if (settled && settleFrames.value >= NATIVE_PANE_DIVIDER_SETTLE_FRAMES) return 0;
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
  settleFrames,
  settledGeometry,
  snapshots,
  target,
  width,
}: {
  backgroundColor: string;
  bands: SharedValue<NativePaneDividerBand[]>;
  /** Signature of the pane geometry the committed frame paints. */
  paneGeometry: string;
  /** Presented frames since the release settled, counted on the UI thread. */
  settleFrames: SharedValue<number>;
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
          settleFrames={settleFrames}
          settledGeometry={settledGeometry}
          width={width}
        />
      ))}
      <NativePaneDividerHighlight bands={bands} target={target} width={width} />
    </>
  );
})
