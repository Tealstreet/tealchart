import React from 'react';
import {
  Group,
  Rect,
} from '@shopify/react-native-skia';

import type { NativeChartFrame } from './nativeChartFrame';
import { NativeAxisChromeLayer } from './NativeAxisChromeLayer';

export interface NativeChartChromeLayerProps {
  backgroundColor: string;
  frame: NativeChartFrame;
  gridColor: string;
}

export function NativeChartChromeLayer({
  backgroundColor,
  frame,
  gridColor,
}: NativeChartChromeLayerProps) {
  return (
    <Group>
      <Rect x={0} y={0} width={frame.dimensions.width} height={frame.dimensions.height} color={backgroundColor} />

      <NativeAxisChromeLayer
        backgroundColor={backgroundColor}
        frame={frame}
        gridColor={gridColor}
      />
    </Group>
  );
}
