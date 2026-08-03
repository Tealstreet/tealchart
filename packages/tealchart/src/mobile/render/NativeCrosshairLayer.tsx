import type { RenderOptions } from '../../types';
import type { NativeCrosshairSharedValues } from '../interaction/nativeCrosshair';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { DashPathEffect, Group, RoundedRect, Skia, Line as SkiaLine } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import {
  NATIVE_CROSSHAIR_CONTEXT_MENU_BUTTON_RADIUS,
  nativeCrosshairXToTime,
  resolveNativeCrosshairContextMenuButtonLayout,
  resolveNativeCrosshairPriceLabelLayout,
  resolveNativeCrosshairPriceLabelText,
} from '../interaction/nativeCrosshairContextMenu';
import { NativeAnimatedSkiaText } from './nativeSkiaText';
import { formatNativeTimeAxisLabelWorklet } from './nativeTimeFormat';

const NATIVE_CROSSHAIR_DASH = [4, 4];
const NATIVE_CROSSHAIR_LABEL_HEIGHT = 18;
const NATIVE_CROSSHAIR_TIME_LABEL_WIDTH = 76;
const NATIVE_CROSSHAIR_TEXT_BASELINE_OFFSET = 13;
const NATIVE_CROSSHAIR_PLUS_ARM_LENGTH = 4.5;
const NATIVE_CROSSHAIR_BUTTON_LINE_GAP = 4;

function clampNativeCrosshairLabelX(frame: NativeChartFrame, x: number, width: number): number {
  'worklet';
  return Math.min(Math.max(x - width / 2, frame.contentLeft), frame.contentRight - width);
}

export interface NativeCrosshairLayerProps {
  axisFont: ReturnType<typeof Skia.Font>;
  crosshair: NativeCrosshairSharedValues;
  frame: NativeChartFrame;
  hasContextMenu: boolean;
  options: RenderOptions;
  pricePrecision: number;
  sharedViewport: NativeViewportSharedValues;
}

export function NativeCrosshairLayer({
  axisFont,
  crosshair,
  frame,
  hasContextMenu,
  options,
  pricePrecision,
  sharedViewport,
}: NativeCrosshairLayerProps) {
  const color = options.crosshairColor ?? '#888888';
  const textColor = options.backgroundColor ?? '#131722';
  const opacity = useDerivedValue(() => (crosshair.visible.value ? 1 : 0));
  const verticalStart = useDerivedValue(() => ({ x: crosshair.x.value, y: frame.mainPane.top }));
  const verticalEnd = useDerivedValue(() => ({ x: crosshair.x.value, y: frame.mainPane.bottom }));
  const horizontalStart = useDerivedValue(() => ({ x: frame.contentLeft, y: crosshair.y.value }));
  const priceText = useDerivedValue(() =>
    resolveNativeCrosshairPriceLabelText(frame, sharedViewport, crosshair.y.value, pricePrecision),
  );
  const priceLabel = useDerivedValue(() =>
    resolveNativeCrosshairPriceLabelLayout(frame, pricePrecision, priceText.value),
  );
  const priceLabelX = useDerivedValue(() => priceLabel.value.x);
  const priceLabelWidth = useDerivedValue(() => priceLabel.value.width);
  const priceTextX = useDerivedValue(() => priceLabel.value.textX);
  const horizontalEnd = useDerivedValue(() => ({
    x: hasContextMenu
      ? Math.max(
          frame.contentLeft,
          resolveNativeCrosshairContextMenuButtonLayout(frame, crosshair.y.value, pricePrecision, priceText.value).centerX -
            NATIVE_CROSSHAIR_CONTEXT_MENU_BUTTON_RADIUS -
            NATIVE_CROSSHAIR_BUTTON_LINE_GAP,
        )
      : frame.contentRight,
    y: crosshair.y.value,
  }));
  const priceLabelY = useDerivedValue(() => crosshair.y.value - NATIVE_CROSSHAIR_LABEL_HEIGHT / 2);
  const priceTextY = useDerivedValue(() => priceLabelY.value + NATIVE_CROSSHAIR_TEXT_BASELINE_OFFSET);
  const timeLabelX = useDerivedValue(() =>
    clampNativeCrosshairLabelX(frame, crosshair.x.value, NATIVE_CROSSHAIR_TIME_LABEL_WIDTH),
  );
  const timeTextX = useDerivedValue(() => timeLabelX.value + 8);
  const timeTextY = frame.timeAxisTop + NATIVE_CROSSHAIR_TEXT_BASELINE_OFFSET;
  const timeText = useDerivedValue(() => {
    const timeStep =
      (sharedViewport.endTime.value - sharedViewport.startTime.value) / Math.max(1, frame.contentWidth / 80);
    return formatNativeTimeAxisLabelWorklet(nativeCrosshairXToTime(crosshair.x.value, sharedViewport, frame), timeStep);
  });
  const contextButtonLayout = useDerivedValue(() =>
    resolveNativeCrosshairContextMenuButtonLayout(frame, crosshair.y.value, pricePrecision, priceText.value),
  );
  const contextButtonX = useDerivedValue(() => contextButtonLayout.value.centerX - contextButtonLayout.value.radius);
  const contextButtonY = useDerivedValue(() => contextButtonLayout.value.centerY - contextButtonLayout.value.radius);
  const contextButtonSize = useDerivedValue(() => contextButtonLayout.value.radius * 2);
  const plusHorizontalStart = useDerivedValue(() => ({
    x: contextButtonLayout.value.centerX - NATIVE_CROSSHAIR_PLUS_ARM_LENGTH,
    y: contextButtonLayout.value.centerY,
  }));
  const plusHorizontalEnd = useDerivedValue(() => ({
    x: contextButtonLayout.value.centerX + NATIVE_CROSSHAIR_PLUS_ARM_LENGTH,
    y: contextButtonLayout.value.centerY,
  }));
  const plusVerticalStart = useDerivedValue(() => ({
    x: contextButtonLayout.value.centerX,
    y: contextButtonLayout.value.centerY - NATIVE_CROSSHAIR_PLUS_ARM_LENGTH,
  }));
  const plusVerticalEnd = useDerivedValue(() => ({
    x: contextButtonLayout.value.centerX,
    y: contextButtonLayout.value.centerY + NATIVE_CROSSHAIR_PLUS_ARM_LENGTH,
  }));

  return (
    <Group opacity={opacity}>
      <SkiaLine p1={verticalStart} p2={verticalEnd} color={color} strokeWidth={1}>
        <DashPathEffect intervals={NATIVE_CROSSHAIR_DASH} />
      </SkiaLine>
      <SkiaLine p1={horizontalStart} p2={horizontalEnd} color={color} strokeWidth={1}>
        <DashPathEffect intervals={NATIVE_CROSSHAIR_DASH} />
      </SkiaLine>
      {hasContextMenu ? (
        <>
          <RoundedRect
            x={contextButtonX}
            y={contextButtonY}
            width={contextButtonSize}
            height={contextButtonSize}
            r={NATIVE_CROSSHAIR_CONTEXT_MENU_BUTTON_RADIUS}
            color={color}
            style="stroke"
            strokeWidth={1}
          />
          <SkiaLine p1={plusHorizontalStart} p2={plusHorizontalEnd} color={color} strokeWidth={1.4} />
          <SkiaLine p1={plusVerticalStart} p2={plusVerticalEnd} color={color} strokeWidth={1.4} />
        </>
      ) : null}
      <RoundedRect
        x={priceLabelX}
        y={priceLabelY}
        width={priceLabelWidth}
        height={NATIVE_CROSSHAIR_LABEL_HEIGHT}
        r={2}
        color={color}
      />
      <NativeAnimatedSkiaText x={priceTextX} y={priceTextY} text={priceText} font={axisFont} color={textColor} />
      <RoundedRect
        x={timeLabelX}
        y={frame.timeAxisTop}
        width={NATIVE_CROSSHAIR_TIME_LABEL_WIDTH}
        height={NATIVE_CROSSHAIR_LABEL_HEIGHT}
        r={2}
        color={color}
      />
      <NativeAnimatedSkiaText x={timeTextX} y={timeTextY} text={timeText} font={axisFont} color={textColor} />
    </Group>
  );
}
