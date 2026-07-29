import React from 'react';

import { StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { nativeTradeLineDashArray } from '../utils/tradeLineLayout';

interface NativeTradeLineSegmentProps {
  color: string;
  left: number;
  lineStyle: number;
  lineWidth: number;
  top: number;
  width: number;
}

export function NativeTradeLineSegment({
  color,
  left,
  lineStyle,
  lineWidth,
  top,
  width,
}: NativeTradeLineSegmentProps): React.ReactElement | null {
  if (width <= 0) return null;

  const strokeWidth = Math.max(1, lineWidth);
  const height = strokeWidth + 4;
  const centerY = height / 2;
  const dashArray = nativeTradeLineDashArray(lineStyle);

  return (
    <View pointerEvents="none" style={[styles.container, { height, left, top: top - centerY, width }]}>
      <Svg width={width} height={height}>
        <Line
          x1={0}
          y1={centerY}
          x2={width}
          y2={centerY}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          strokeDasharray={dashArray}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
});
