import type { SharedValue } from 'react-native-reanimated';
import type { NativeTradeLineCornerStyle } from '../utils/tradeLineLayout';

import {
  Group,
  Path,
  Skia,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue } from 'react-native-reanimated';

import { TRADE_LINE_ACCENT_RAIL_WIDTH } from '../../constants';

export function createNativeTradeLineBoxPath(x: number, y: number, width: number, height: number, corners: NativeTradeLineCornerStyle) {
  const radius = 2;
  const leftRadius = corners === 'all' || corners === 'left' ? radius : 0;
  const rightRadius = corners === 'all' || corners === 'right' ? radius : 0;
  const path = Skia.Path.Make();

  path.moveTo(x + leftRadius, y);
  path.lineTo(x + width - rightRadius, y);
  if (rightRadius > 0) path.quadTo(x + width, y, x + width, y + rightRadius);
  path.lineTo(x + width, y + height - rightRadius);
  if (rightRadius > 0) path.quadTo(x + width, y + height, x + width - rightRadius, y + height);
  path.lineTo(x + leftRadius, y + height);
  if (leftRadius > 0) path.quadTo(x, y + height, x, y + height - leftRadius);
  path.lineTo(x, y + leftRadius);
  if (leftRadius > 0) path.quadTo(x, y, x + leftRadius, y);
  path.close();

  return path;
}

export function NativeTradeLineBox({
  x,
  y,
  width,
  height,
  backgroundColor,
  borderColor,
  corners,
}: {
  x: number;
  y: SharedValue<number>;
  width: number;
  height: number;
  backgroundColor: string;
  borderColor: string;
  corners: NativeTradeLineCornerStyle;
}) {
  const path = useMemo(() => createNativeTradeLineBoxPath(x, 0, width, height, corners), [corners, height, width, x]);
  const transform = useDerivedValue(() => [{ translateY: y.value }]);

  return (
    <Group transform={transform}>
      <Path path={path} color={backgroundColor} />
      <Path path={path} color={borderColor} style="stroke" strokeWidth={1} />
    </Group>
  );
}

export function NativeStaticTradeLineBox({
  x,
  y,
  width,
  height,
  backgroundColor,
  borderColor,
  corners,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
  borderColor: string;
  corners: NativeTradeLineCornerStyle;
}) {
  const path = useMemo(() => createNativeTradeLineBoxPath(x, y, width, height, corners), [corners, height, width, x, y]);

  return (
    <>
      <Path path={path} color={backgroundColor} />
      <Path path={path} color={borderColor} style="stroke" strokeWidth={1} />
    </>
  );
}

/**
 * The side-colored rail on the label's leading edge. Inset by half a stroke so
 * it sits inside the segment's hairline instead of painting over its inner half.
 */
export function NativeStaticTradeLineAccentRail({
  x,
  y,
  height,
  color,
  rounded,
}: {
  x: number;
  y: number;
  height: number;
  color: string;
  rounded: boolean;
}) {
  const path = useMemo(
    () =>
      createNativeTradeLineBoxPath(
        x + 0.5,
        y + 0.5,
        TRADE_LINE_ACCENT_RAIL_WIDTH,
        Math.max(0, height - 1),
        rounded ? 'left' : 'none',
      ),
    [height, rounded, x, y],
  );

  return <Path path={path} color={color} />;
}
