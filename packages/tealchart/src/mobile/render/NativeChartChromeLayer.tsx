import React, { memo } from 'react';
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
  separatorColor: string;
}

export function NativeChartChromeLayerImpl({
  backgroundColor,
  frame,
  gridColor,
  separatorColor,
}: NativeChartChromeLayerProps) {
  return (
    <Group>
      <Rect x={0} y={0} width={frame.dimensions.width} height={frame.dimensions.height} color={backgroundColor} />

      <NativeAxisChromeLayer
        backgroundColor={backgroundColor}
        frame={frame}
        gridColor={gridColor}
        separatorColor={separatorColor}
      />
    </Group>
  );
}

// Memoised: the chart owner re-renders on every unrelated UI state change, and
// reconciling this subtree each time was the cost behind the laggy transitions.
export const NativeChartChromeLayer = memo(NativeChartChromeLayerImpl);
NativeChartChromeLayer.displayName = 'NativeChartChromeLayer';
