import type { SharedValue } from 'react-native-reanimated';
import type { NativeBracketDragSharedValues } from '../interaction/nativeOemsDragState';
import type { NativeResolvedPriceAxisTag } from '../utils/priceAxisTagLayout';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { DashPathEffect, Group, Skia, Line as SkiaLine } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR } from '../../constants';
import { getNativeDarkLabelBackgroundColor, NATIVE_PRICE_AXIS_TAG_TEXT_COLOR } from '../utils/nativeColor';
import { NATIVE_PRICE_AXIS_TAG_MIN_WIDTH, NATIVE_PRICE_AXIS_TAG_PADDING_X } from '../utils/nativePriceAxisLane';
import {
  findNativeResolvedPriceAxisTagCenterY,
  getNativePriceAxisSingleLineTextBaselineOffset,
} from '../utils/priceAxisTagLayout';
import { getNativeBracketDragTagId } from '../utils/priceAxisTagSources';
import { createNativeAxisLaneTagLayout, PRICE_AXIS_TAG_HEIGHT } from './nativeAxisTagLayout';
import { NativePriceAxisTagAnimatedText, NativePriceAxisTagBox } from './NativePriceAxisTag';
import { formatNativeTradeLinePriceWorklet } from './nativePriceFormat';
import { sharedPriceToNativeY } from './nativeSharedViewport';
import { measureNativeSkiaAxisCharacterWidth } from './nativeSkiaText';

function resolveNativePriceAxisTagCenterY(
  resolvedPriceAxisTags: readonly NativeResolvedPriceAxisTag[],
  targetId: string,
  fallbackCenterY: number,
): number {
  'worklet';
  return findNativeResolvedPriceAxisTagCenterY(resolvedPriceAxisTags, targetId, fallbackCenterY);
}

function isNativeBracketPreviewYVisible(value: number, frame: NativeChartFrame): boolean {
  'worklet';
  return value >= frame.mainPane.top && value <= frame.mainPane.bottom;
}

export function AnimatedBracketDragPreview({
  dragState,
  frame,
  pricePrecision,
  resolvedPriceAxisTags,
  sharedViewport,
  axisFont,
}: {
  dragState: NativeBracketDragSharedValues;
  frame: NativeChartFrame;
  pricePrecision: number;
  resolvedPriceAxisTags: SharedValue<NativeResolvedPriceAxisTag[]>;
  sharedViewport: NativeViewportSharedValues;
  axisFont: ReturnType<typeof Skia.Font>;
}) {
  const y = useDerivedValue(() => {
    if (!dragState.activeObjectId.value) return -1000;
    return sharedPriceToNativeY(dragState.activePrice.value, sharedViewport, frame);
  });
  const color = useDerivedValue(() => dragState.activeColor.value || DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR);
  const lineStart = useDerivedValue(() => ({ x: frame.contentLeft, y: y.value }));
  const tagLayout = createNativeAxisLaneTagLayout(frame);
  const tagRight = tagLayout.x + tagLayout.width;
  const axisCharacterWidth = measureNativeSkiaAxisCharacterWidth(axisFont);
  const tagText = useDerivedValue(() => {
    const bracket = dragState.activeBracketType.value.toUpperCase();
    const typeLabel =
      dragState.activePartialEnabled.value && dragState.activePartialPercent.value < 100
        ? `${Math.round(dragState.activePartialPercent.value)}% Partial ${bracket}`
        : bracket;
    return `${typeLabel} ${formatNativeTradeLinePriceWorklet(dragState.activePrice.value, pricePrecision)}`;
  });
  const tagWidth = useDerivedValue(() =>
    Math.max(
      tagLayout.width,
      NATIVE_PRICE_AXIS_TAG_MIN_WIDTH,
      Math.ceil(tagText.value.length * axisCharacterWidth) + NATIVE_PRICE_AXIS_TAG_PADDING_X * 2,
    ),
  );
  const tagX = useDerivedValue(() => tagRight - tagWidth.value);
  const tagTextX = useDerivedValue(
    () => tagRight - NATIVE_PRICE_AXIS_TAG_PADDING_X - tagText.value.length * axisCharacterWidth,
  );
  const labelCenterY = useDerivedValue(() => {
    if (!dragState.activeObjectId.value) return -1000;
    return resolveNativePriceAxisTagCenterY(
      resolvedPriceAxisTags.value,
      getNativeBracketDragTagId(dragState.activeObjectId.value, dragState.activeBracketType.value),
      y.value,
    );
  });
  const lineEnd = useDerivedValue(() => ({ x: tagX.value, y: y.value }));
  const connectorStart = useDerivedValue(() => ({ x: tagX.value, y: y.value }));
  const connectorEnd = useDerivedValue(() => ({ x: tagX.value, y: labelCenterY.value }));
  const connectorOpacity = useDerivedValue(() => (Math.abs(labelCenterY.value - y.value) > 2 ? 0.5 : 0));
  const labelY = useDerivedValue(() => labelCenterY.value - PRICE_AXIS_TAG_HEIGHT / 2);
  const textBaselineOffset = getNativePriceAxisSingleLineTextBaselineOffset(PRICE_AXIS_TAG_HEIGHT);
  const textY = useDerivedValue(() => labelY.value + textBaselineOffset);
  const previewOpacity = useDerivedValue(() =>
    dragState.activeObjectId.value && isNativeBracketPreviewYVisible(y.value, frame) ? 1 : 0,
  );

  return (
    <Group opacity={previewOpacity}>
      <SkiaLine p1={lineStart} p2={lineEnd} color={color} strokeWidth={1} style="stroke">
        <DashPathEffect intervals={[4, 4]} />
      </SkiaLine>
      <SkiaLine p1={connectorStart} p2={connectorEnd} color={color} strokeWidth={1} opacity={connectorOpacity} />
      <NativePriceAxisTagBox
        x={tagX}
        y={labelY}
        width={tagWidth}
        height={PRICE_AXIS_TAG_HEIGHT}
        backgroundColor={getNativeDarkLabelBackgroundColor()}
        borderColor={color}
      />
      <NativePriceAxisTagAnimatedText
        x={tagTextX}
        y={textY}
        text={tagText}
        maxCharacters={Number.MAX_SAFE_INTEGER}
        characterWidth={axisCharacterWidth}
        font={axisFont}
        color={NATIVE_PRICE_AXIS_TAG_TEXT_COLOR}
        characterSet="0123456789,.-:+% PartialTPSL"
      />
    </Group>
  );
}
