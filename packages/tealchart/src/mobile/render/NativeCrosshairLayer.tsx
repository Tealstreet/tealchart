import type { SharedValue } from 'react-native-reanimated';
import type { RenderOptions } from '../../types';
import type { NativeCrosshairSharedValues } from '../interaction/nativeCrosshair';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativePaneRangeOverrides } from './nativePaneRangeOverride';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { memo } from 'react';

import { DashPathEffect, Group, RoundedRect, Skia, Line as SkiaLine } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { withPriceAxisTagBackgroundAlpha } from '../../utils/priceAxisTagStyle';
import {
  isNativeCrosshairOverMainPane,
  NATIVE_CROSSHAIR_CONTEXT_MENU_BUTTON_RADIUS,
  nativeCrosshairXToTime,
  resolveNativeCrosshairContextMenuButtonLayout,
  resolveNativeCrosshairPriceLabelLayout,
  resolveNativeCrosshairPriceLabelText,
  resolveNativeCrosshairSnappedX,
  resolveNativeCrosshairSnappedY,
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
  intervalMs: number;
  options: RenderOptions;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  pricePrecision: number;
  sharedViewport: NativeViewportSharedValues;
}

export function NativeCrosshairLayerImpl({
  axisFont,
  crosshair,
  frame,
  hasContextMenu,
  intervalMs,
  options,
  paneRangeOverrides,
  pricePrecision,
  sharedViewport,
}: NativeCrosshairLayerProps) {
  const color = options.crosshairColor ?? '#888888';
  const labelBackgroundColor = withPriceAxisTagBackgroundAlpha(color);
  const textColor = options.backgroundColor ?? '#131722';
  const opacity = useDerivedValue(() => (crosshair.visible.value ? 1 : 0));
  const snappedX = useDerivedValue(() =>
    resolveNativeCrosshairSnappedX(frame, sharedViewport, crosshair.x.value, intervalMs),
  );
  const snappedY = useDerivedValue(() =>
    resolveNativeCrosshairSnappedY(frame, sharedViewport, crosshair.y.value, pricePrecision),
  );
  // Through every pane, not just the main one - the panes tile contiguously
  // down to the time axis, so that whole span is the plot.
  const verticalStart = useDerivedValue(() => ({ x: snappedX.value, y: frame.mainPane.top }));
  const verticalEnd = useDerivedValue(() => ({ x: snappedX.value, y: frame.timeAxisTop }));
  const horizontalStart = useDerivedValue(() => ({ x: frame.contentLeft, y: snappedY.value }));
  const priceText = useDerivedValue(() =>
    resolveNativeCrosshairPriceLabelText(frame, sharedViewport, crosshair.y.value, pricePrecision, paneRangeOverrides),
  );
  // The button opens order actions at a price, which only the price pane has.
  const contextMenuVisible = useDerivedValue(
    () => hasContextMenu && isNativeCrosshairOverMainPane(frame, snappedY.value),
  );
  const contextMenuOpacity = useDerivedValue(() => (contextMenuVisible.value ? 1 : 0));
  const priceLabel = useDerivedValue(() => {
    const nextLabel = resolveNativeCrosshairPriceLabelLayout(
      frame,
      pricePrecision,
      priceText.value,
      crosshair.priceLabelMaxWidth?.value ?? 0,
    );
    if (crosshair.priceLabelMaxWidth && nextLabel.width > crosshair.priceLabelMaxWidth.value) {
      crosshair.priceLabelMaxWidth.value = nextLabel.width;
    }
    return nextLabel;
  });
  const priceLabelX = useDerivedValue(() => priceLabel.value.x);
  const priceLabelWidth = useDerivedValue(() => priceLabel.value.width);
  const priceTextX = useDerivedValue(() => priceLabel.value.textX);
  const horizontalEnd = useDerivedValue(() => ({
    x: contextMenuVisible.value
      ? Math.max(
          frame.contentLeft,
          resolveNativeCrosshairContextMenuButtonLayout(
            frame,
            snappedY.value,
            pricePrecision,
            priceText.value,
            crosshair.priceLabelMaxWidth?.value ?? 0,
          ).centerX -
            NATIVE_CROSSHAIR_CONTEXT_MENU_BUTTON_RADIUS -
            NATIVE_CROSSHAIR_BUTTON_LINE_GAP,
        )
      : frame.contentRight,
    y: snappedY.value,
  }));
  const priceLabelY = useDerivedValue(() => snappedY.value - NATIVE_CROSSHAIR_LABEL_HEIGHT / 2);
  const priceTextY = useDerivedValue(() => priceLabelY.value + NATIVE_CROSSHAIR_TEXT_BASELINE_OFFSET);
  const timeLabelX = useDerivedValue(() =>
    clampNativeCrosshairLabelX(frame, snappedX.value, NATIVE_CROSSHAIR_TIME_LABEL_WIDTH),
  );
  const timeTextX = useDerivedValue(() => timeLabelX.value + 8);
  const timeTextY = frame.timeAxisTop + NATIVE_CROSSHAIR_TEXT_BASELINE_OFFSET;
  const timeText = useDerivedValue(() => {
    const timeStep =
      (sharedViewport.endTime.value - sharedViewport.startTime.value) / Math.max(1, frame.contentWidth / 80);
    return formatNativeTimeAxisLabelWorklet(nativeCrosshairXToTime(snappedX.value, sharedViewport, frame), timeStep);
  });
  const contextButtonLayout = useDerivedValue(() =>
    resolveNativeCrosshairContextMenuButtonLayout(
      frame,
      snappedY.value,
      pricePrecision,
      priceText.value,
      crosshair.priceLabelMaxWidth?.value ?? 0,
    ),
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
        <Group opacity={contextMenuOpacity}>
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
        </Group>
      ) : null}
      <RoundedRect
        x={priceLabelX}
        y={priceLabelY}
        width={priceLabelWidth}
        height={NATIVE_CROSSHAIR_LABEL_HEIGHT}
        r={2}
        color={labelBackgroundColor}
      />
      <NativeAnimatedSkiaText x={priceTextX} y={priceTextY} text={priceText} font={axisFont} color={textColor} />
      <RoundedRect
        x={timeLabelX}
        y={frame.timeAxisTop}
        width={NATIVE_CROSSHAIR_TIME_LABEL_WIDTH}
        height={NATIVE_CROSSHAIR_LABEL_HEIGHT}
        r={2}
        color={labelBackgroundColor}
      />
      <NativeAnimatedSkiaText x={timeTextX} y={timeTextY} text={timeText} font={axisFont} color={textColor} />
    </Group>
  );
}

// Memoised: the chart owner re-renders on every unrelated UI state change, and
// reconciling this subtree each time was the cost behind the laggy transitions.
export const NativeCrosshairLayer = memo(NativeCrosshairLayerImpl);
NativeCrosshairLayer.displayName = 'NativeCrosshairLayer';
