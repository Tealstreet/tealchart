import type { SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { NativePaneDividerBand } from '../interaction/nativePaneDivider';

import { Image as SkiaImage } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

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

export function NativePaneDividerResizeLayer({
  bands,
  snapshots,
  width,
}: {
  bands: SharedValue<NativePaneDividerBand[]>;
  snapshots: readonly NativePaneSnapshot[];
  width: number;
}) {
  return (
    <>
      {snapshots.map((snapshot, index) => (
        <NativePaneDividerBandImage
          key={snapshot.paneId}
          bands={bands}
          image={snapshot.image}
          index={index}
          width={width}
        />
      ))}
    </>
  );
}
