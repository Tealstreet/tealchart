import type { NativeChartFrame } from './nativeChartFrame';

import { Group, Path as SkiaPath, Rect, Skia, Line as SkiaLine } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

export interface NativeAxisChromeLayerProps {
  backgroundColor: string;
  frame: NativeChartFrame;
  gridColor: string;
  separatorColor: string;
}

export function NativeAxisChromeLayer({
  backgroundColor,
  frame,
  gridColor,
  separatorColor,
}: NativeAxisChromeLayerProps) {
  const separatorPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    for (let index = 0; index < frame.panes.length - 1; index += 1) {
      const pane = frame.panes[index];
      // A collapsed pane has no boundary of its own to draw. And a boundary that
      // has reached the chart's own bottom edge - which is where it lands when
      // every pane below has collapsed - is the time-axis border, not a divider.
      if (!pane || pane.height <= 0 || pane.bottom >= frame.timeAxisTop) continue;
      path.moveTo(frame.contentLeft, pane.bottom);
      path.lineTo(frame.contentRight, pane.bottom);
    }
    return path;
  });

  return (
    <Group>
      <Rect
        x={frame.contentLeft}
        y={frame.timeAxisTop}
        width={frame.contentWidth}
        height={Math.max(0, frame.timeAxisBottom - frame.timeAxisTop)}
        color={backgroundColor}
      />
      <SkiaLine
        p1={{ x: frame.contentLeft, y: frame.timeAxisTop + 0.5 }}
        p2={{ x: frame.contentRight, y: frame.timeAxisTop + 0.5 }}
        color={gridColor}
        strokeWidth={1}
      />
      {/* A pane boundary is a control, not a grid line — drawn heavier than one
          so it reads as something you can grab. One path rather than a line per
          pane: the element count then stops tracking pane geometry, which is the
          half of a maximize that no channel work can make late. */}
      <SkiaPath
        path={separatorPath}
        color={separatorColor}
        opacity={0.35}
        style="stroke"
        strokeWidth={2}
      />
    </Group>
  );
}
