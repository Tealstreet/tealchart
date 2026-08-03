import type { NativeTradeLineGeometry } from '../utils/tradeLineLayout';

import { Group, Line as SkiaLine, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import {
  createNativeCloseButtonIconLines,
  createNativeReverseButtonIconLines,
} from '../utils/tradeLineButtonIconLayout';
import { NativeAnimatedSkiaText } from './nativeSkiaText';

function NativeTradeLineIconStroke({
  color,
  line,
}: {
  color: string;
  line: { x1: number; y1: number; x2: number; y2: number; strokeWidth: number };
}) {
  return (
    <SkiaLine
      p1={{ x: line.x1, y: line.y1 }}
      p2={{ x: line.x2, y: line.y2 }}
      color={color}
      strokeWidth={line.strokeWidth}
    />
  );
}

export function NativeTradeLineButtonIcon({
  button,
  color,
  font,
  tradeLabelHeight,
}: {
  button: NativeTradeLineGeometry['buttons'][number];
  color: string;
  font: ReturnType<typeof Skia.Font>;
  tradeLabelHeight: number;
}) {
  const reverseLines = useMemo(
    () => createNativeReverseButtonIconLines({ x: button.x, y: 0, width: button.width, height: tradeLabelHeight }),
    [button.width, button.x, tradeLabelHeight],
  );
  const closeLines = useMemo(
    () => createNativeCloseButtonIconLines({ x: button.x, y: 0, width: button.width, height: tradeLabelHeight }),
    [button.width, button.x, tradeLabelHeight],
  );

  if (button.type === 'reverse') {
    return (
      <Group>
        {reverseLines.map((line, index) => (
          <NativeTradeLineIconStroke key={`reverse-${index}`} color={color} line={line} />
        ))}
      </Group>
    );
  }

  if (button.type === 'close' || button.type === 'cancel') {
    return (
      <Group>
        {closeLines.map((line, index) => (
          <NativeTradeLineIconStroke key={`close-${index}`} color={color} line={line} />
        ))}
      </Group>
    );
  }

  return (
    <NativeAnimatedSkiaText
      x={button.textX}
      y={tradeLabelHeight / 2 + 4}
      text={button.displayIcon}
      font={font}
      color={color}
    />
  );
}
