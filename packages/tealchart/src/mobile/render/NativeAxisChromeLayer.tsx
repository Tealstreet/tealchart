import {
  Group,
  Line as SkiaLine,
  Rect,
} from '@shopify/react-native-skia';

import type { NativeChartFrame } from './nativeChartFrame';

export interface NativeAxisChromeLayerProps {
  backgroundColor: string;
  frame: NativeChartFrame;
  gridColor: string;
}

export function NativeAxisChromeLayer({
  backgroundColor,
  frame,
  gridColor,
}: NativeAxisChromeLayerProps) {
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
    </Group>
  );
}
