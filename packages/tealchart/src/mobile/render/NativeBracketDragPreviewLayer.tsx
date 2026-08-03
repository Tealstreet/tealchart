import type { SharedValue } from 'react-native-reanimated';
import type { NativeBracketDragSharedValues } from '../interaction/nativeOemsDragState';
import type { NativeResolvedPriceAxisTag } from '../utils/priceAxisTagLayout';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import {
  DashPathEffect,
  Group,
  Line as SkiaLine,
  Skia,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR } from '../../constants';
import {
  getNativeDarkLabelBackgroundColor,
  NATIVE_PRICE_AXIS_TAG_TEXT_COLOR,
} from '../utils/nativeColor';
import {
  findNativeResolvedPriceAxisTagCenterY,
  getNativePriceAxisSingleLineTextBaselineOffset,
} from '../utils/priceAxisTagLayout';
import { getNativeBracketDragTagId } from '../utils/priceAxisTagSources';
import {
  createNativeAxisLaneTagLayout,
  fitNativeAxisTextToCharacterCountWorklet,
  getNativeAxisTagTextCharacterCapacity,
  PRICE_AXIS_TAG_HEIGHT,
} from './nativeAxisTagLayout';
import { formatNativeTradeLinePriceWorklet } from './nativePriceFormat';
import {
  NativePriceAxisTagAnimatedText,
  NativePriceAxisTagBox,
} from './NativePriceAxisTag';
import {
  measureNativeSkiaAxisCharacterWidth,
} from './nativeSkiaText';
import { sharedPriceToNativeY } from './nativeSharedViewport';

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
  const axisCharacterWidth = measureNativeSkiaAxisCharacterWidth(axisFont);
  const maxTagCharacters = getNativeAxisTagTextCharacterCapacity(tagLayout.width, axisCharacterWidth);
  const tagText = useDerivedValue(() => {
    const bracket = dragState.activeBracketType.value.toUpperCase();
    const typeLabel =
      dragState.activePartialEnabled.value && dragState.activePartialPercent.value < 100
        ? `${Math.round(dragState.activePartialPercent.value)}% Partial ${bracket}`
        : bracket;
    const text = `${typeLabel} ${formatNativeTradeLinePriceWorklet(dragState.activePrice.value, pricePrecision)}`;
    return fitNativeAxisTextToCharacterCountWorklet(text, maxTagCharacters);
  });
  const labelCenterY = useDerivedValue(() => {
    if (!dragState.activeObjectId.value) return -1000;
    return resolveNativePriceAxisTagCenterY(
      resolvedPriceAxisTags.value,
      getNativeBracketDragTagId(dragState.activeObjectId.value, dragState.activeBracketType.value),
      y.value,
    );
  });
  const lineEnd = useDerivedValue(() => ({ x: tagLayout.x, y: y.value }));
  const connectorStart = useDerivedValue(() => ({ x: tagLayout.x, y: y.value }));
  const connectorEnd = useDerivedValue(() => ({ x: tagLayout.x, y: labelCenterY.value }));
  const connectorOpacity = useDerivedValue(() => (Math.abs(labelCenterY.value - y.value) > 2 ? 0.5 : 0));
  const labelY = useDerivedValue(() => labelCenterY.value - PRICE_AXIS_TAG_HEIGHT / 2);
  const textBaselineOffset = getNativePriceAxisSingleLineTextBaselineOffset(PRICE_AXIS_TAG_HEIGHT);
  const textY = useDerivedValue(() => labelY.value + textBaselineOffset);
  const previewOpacity = useDerivedValue(() => (dragState.activeObjectId.value && isNativeBracketPreviewYVisible(y.value, frame) ? 1 : 0));

  return (
    <Group opacity={previewOpacity}>
      <SkiaLine p1={lineStart} p2={lineEnd} color={color} strokeWidth={1} style="stroke">
        <DashPathEffect intervals={[4, 4]} />
      </SkiaLine>
      <SkiaLine p1={connectorStart} p2={connectorEnd} color={color} strokeWidth={1} opacity={connectorOpacity} />
      <NativePriceAxisTagBox
        x={tagLayout.x}
        y={labelY}
        width={tagLayout.width}
        height={PRICE_AXIS_TAG_HEIGHT}
        backgroundColor={getNativeDarkLabelBackgroundColor()}
        borderColor={color}
      />
      <NativePriceAxisTagAnimatedText
        x={tagLayout.textX}
        y={textY}
        text={tagText}
        maxCharacters={maxTagCharacters}
        characterWidth={axisCharacterWidth}
        font={axisFont}
        color={NATIVE_PRICE_AXIS_TAG_TEXT_COLOR}
        characterSet="0123456789,.-:+% PartialTPSL"
      />
    </Group>
  );
}
