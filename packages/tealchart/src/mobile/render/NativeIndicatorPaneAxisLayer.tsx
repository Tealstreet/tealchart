import type { Skia } from '@shopify/react-native-skia';
import type { NativeChartFrame, NativePaneFrame } from './nativeChartFrame';

import { Group, Line as SkiaLine } from '@shopify/react-native-skia';

import { createNativeRightAlignedAxisTextX, getNativeAxisTextCharacterCapacity } from '../utils/axisTickLayout';
import { fitNativeAxisTextToCharacterCountWorklet } from './nativeAxisTagLayout';
import { getNativePriceGridSlot, getNativePriceGridSlotCount } from './nativeGridSlots';
import { formatNativeIndicatorAxisTickWorklet } from './nativePriceFormat';
import { priceToNativeY } from './nativeProjection';
import { measureNativeSkiaAxisCharacterWidth, NativeSkiaText } from './nativeSkiaText';

export interface NativeIndicatorPaneAxisSlot {
  labelText: string;
  labelX: number;
  labelY: number;
  lineEnd: { x: number; y: number };
  lineStart: { x: number; y: number };
  value: number;
  visible: boolean;
  y: number;
}

/**
 * An indicator pane's own value axis. The main pane's grid animates with the
 * price viewport; an indicator pane's range is whatever autoscale settled on for
 * this frame, so these ticks are plain static geometry.
 */
export function resolveNativeIndicatorPaneAxisSlots({
  characterWidth,
  frame,
  labelMaxWidth,
  labelRight,
  maxCharacters,
  pane,
}: {
  characterWidth: number;
  frame: NativeChartFrame;
  labelMaxWidth: number;
  labelRight: number;
  maxCharacters: number;
  pane: NativePaneFrame;
}): NativeIndicatorPaneAxisSlot[] {
  if (pane.height <= 0 || pane.yMax - pane.yMin <= 0) return [];

  const slotCount = getNativePriceGridSlotCount(pane.height);

  return Array.from({ length: slotCount }, (_, index) => {
    const slot = getNativePriceGridSlot({
      index,
      priceMin: pane.yMin,
      priceMax: pane.yMax,
      priceHeight: pane.height,
    });
    const y = priceToNativeY(slot.price, pane);
    const labelText = fitNativeAxisTextToCharacterCountWorklet(
      formatNativeIndicatorAxisTickWorklet(slot.price, slot.spacing),
      maxCharacters,
    );

    return {
      labelText,
      labelX: createNativeRightAlignedAxisTextX(labelRight, labelText.length, characterWidth, labelMaxWidth),
      labelY: Math.max(pane.top + 10, Math.min(pane.bottom - 2, y + 4)),
      lineEnd: { x: frame.priceAxisRight, y },
      lineStart: { x: frame.contentLeft, y },
      value: slot.price,
      // A short pane often admits only its two end ticks — for a 0-100
      // oscillator those sit exactly on pane.top and pane.bottom, so culling
      // the edges leaves the axis blank. Keep them and clamp the baseline.
      visible: slot.visible && y >= pane.top - 0.5 && y <= pane.bottom + 0.5,
      y,
    };
  });
}

export function NativeIndicatorPaneAxisLayer({
  axisFont,
  frame,
  gridColor,
  showAxisLabels = true,
  showGridLines = true,
  textColor,
}: {
  axisFont: ReturnType<typeof Skia.Font>;
  frame: NativeChartFrame;
  gridColor: string;
  showAxisLabels?: boolean;
  showGridLines?: boolean;
  textColor: string;
}) {
  if (!showAxisLabels && !showGridLines) return null;

  const characterWidth = measureNativeSkiaAxisCharacterWidth(axisFont);
  const labelRight = frame.priceAxisRight - 4;
  const labelMaxWidth = Math.max(0, labelRight - (frame.priceAxisLeft + 4));
  const maxCharacters = getNativeAxisTextCharacterCapacity(labelMaxWidth, characterWidth);

  return (
    <>
      {frame.panes
        .filter((pane) => pane.type === 'indicator')
        .map((pane) =>
          resolveNativeIndicatorPaneAxisSlots({
            characterWidth,
            frame,
            labelMaxWidth,
            labelRight,
            maxCharacters,
            pane,
          })
            .filter((slot) => slot.visible)
            .map((slot, index) => (
              <Group key={`${pane.id}-axis-${index}`}>
                {showGridLines && (
                  <SkiaLine p1={slot.lineStart} p2={slot.lineEnd} color={gridColor} strokeWidth={1} />
                )}
                {showAxisLabels && (
                  <NativeSkiaText
                    x={slot.labelX}
                    y={slot.labelY}
                    text={slot.labelText}
                    font={axisFont}
                    color={textColor}
                  />
                )}
              </Group>
            )),
        )}
    </>
  );
}
