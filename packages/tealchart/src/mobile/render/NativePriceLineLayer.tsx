import type { SharedValue } from 'react-native-reanimated';
import type { PriceLine } from '../../types';
import type { NativeBracketDragSharedValues } from '../interaction/nativeOemsDragState';
import type { NativeBracketPriceLineRef } from '../utils/nativeBracketPriceLines';
import type { NativeResolvedPriceAxisTag } from '../utils/priceAxisTagLayout';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { DashPathEffect, Group, Skia, Line as SkiaLine } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { isNativeBracketPriceLineRefActive } from '../utils/nativeBracketPriceLines';
import { getNativePriceAxisTagBackgroundColor, getNativePriceAxisTagTextColor } from '../utils/nativeColor';
import {
  findNativeResolvedPriceAxisTagCenterY,
  getNativeCountdownLayoutText,
  getNativePriceAxisPrimaryTextBaselineOffset,
  getNativePriceAxisSecondaryTextBaselineOffset,
  getNativePriceAxisSingleLineTextBaselineOffset,
  getNativePriceLineMeasurementText,
} from '../utils/priceAxisTagLayout';
import { getNativePriceLineTagId } from '../utils/priceAxisTagSources';
import { formatNativeTradeLinePrice } from '../utils/tradeLineLayout';
import {
  createNativeAxisTagLayout,
  createNativeAxisTagTextLayout,
  formatNativeCountdown,
  PRICE_AXIS_TAG_HEIGHT,
} from './nativeAxisTagLayout';
import { NativePriceAxisTagBox, NativePriceAxisTagStaticText } from './NativePriceAxisTag';
import { sharedPriceToNativeY } from './nativeSharedViewport';
import { measureNativeSkiaTextWidth } from './nativeSkiaText';

function priceLineDash(lineStyle: PriceLine['lineStyle']): number[] | null {
  if (lineStyle === 'dotted') return [2, 5];
  if (lineStyle === 'dashed') return [7, 5];
  return null;
}

function isNativePriceLineYVisible(value: number, frame: NativeChartFrame): boolean {
  'worklet';
  return value >= frame.mainPane.top && value <= frame.mainPane.bottom;
}

function resolveNativePriceLineAxisTagCenterY(
  resolvedPriceAxisTags: readonly NativeResolvedPriceAxisTag[],
  lineId: string,
  fallbackCenterY: number,
): number {
  'worklet';
  return findNativeResolvedPriceAxisTagCenterY(resolvedPriceAxisTags, getNativePriceLineTagId(lineId), fallbackCenterY);
}

export function AnimatedPriceLine({
  bracketDragState,
  frame,
  line,
  pricePrecision,
  resolvedPriceAxisTags,
  sharedViewport,
  staticProjection,
  axisFont,
}: {
  bracketDragState: NativeBracketDragSharedValues;
  frame: NativeChartFrame;
  line: PriceLine & { nativeBracketRef?: NativeBracketPriceLineRef };
  pricePrecision: number;
  resolvedPriceAxisTags: SharedValue<NativeResolvedPriceAxisTag[]>;
  sharedViewport: NativeViewportSharedValues;
  staticProjection?: NativeChartProjection | null;
  axisFont: ReturnType<typeof Skia.Font>;
}) {
  const dash = priceLineDash(line.lineStyle);
  const label = line.label.primaryText || formatNativeTradeLinePrice(line.price, pricePrecision);
  const secondaryLabel =
    line.countdownToTime !== undefined ? formatNativeCountdown(line.countdownToTime) : line.label.secondaryText;
  const secondaryLayoutLabel =
    line.countdownToTime !== undefined && secondaryLabel
      ? getNativeCountdownLayoutText(secondaryLabel)
      : secondaryLabel;
  const tagHeight = secondaryLabel ? 34 : PRICE_AXIS_TAG_HEIGHT;
  const measurementLabel = getNativePriceLineMeasurementText(label, secondaryLayoutLabel, (value) =>
    measureNativeSkiaTextWidth(axisFont, value),
  );
  const axisTag = createNativeAxisTagLayout(frame, axisFont, measurementLabel);
  const primaryText = createNativeAxisTagTextLayout(axisTag.x, axisTag.width, axisFont, label);
  const secondaryText = secondaryLabel
    ? createNativeAxisTagTextLayout(axisTag.x, axisTag.width, axisFont, secondaryLabel)
    : null;
  const primaryTextBaselineOffset = secondaryLabel
    ? getNativePriceAxisPrimaryTextBaselineOffset(tagHeight)
    : getNativePriceAxisSingleLineTextBaselineOffset(tagHeight);
  const secondaryTextBaselineOffset = getNativePriceAxisSecondaryTextBaselineOffset(tagHeight);
  const tagBackgroundColor = getNativePriceAxisTagBackgroundColor(line.label.backgroundColor, line.color);
  const tagColor = getNativePriceAxisTagTextColor(line.label.textColor, tagBackgroundColor);
  const bracketSuppressed = useDerivedValue(() =>
    isNativeBracketPriceLineRefActive(line.nativeBracketRef, bracketDragState),
  );
  const y = useDerivedValue(() => sharedPriceToNativeY(line.price, sharedViewport, frame));
  const labelCenterY = useDerivedValue(() =>
    resolveNativePriceLineAxisTagCenterY(resolvedPriceAxisTags.value, line.id, y.value),
  );
  const labelY = useDerivedValue(() => labelCenterY.value - tagHeight / 2);
  const primaryTextY = useDerivedValue(() => labelY.value + primaryTextBaselineOffset);
  const secondaryTextY = useDerivedValue(() => labelY.value + secondaryTextBaselineOffset);
  const lineStart = useDerivedValue(() => ({ x: frame.contentLeft, y: y.value }));
  const lineEnd = useDerivedValue(() => ({ x: axisTag.x, y: y.value }));
  const lineOpacity = useDerivedValue(() =>
    isNativePriceLineYVisible(y.value, frame) && !bracketSuppressed.value ? 1 : 0,
  );
  const shouldRenderAxisTag = line.showAxisTag === true || !line.renderLineOnCanvas;
  const tagOpacity = useDerivedValue(() => (shouldRenderAxisTag && !bracketSuppressed.value ? 1 : 0));

  if (staticProjection) {
    const staticY = staticProjection.priceToY(line.price);
    const staticLabelY = staticY - tagHeight / 2;
    const staticLineOpacity = isNativePriceLineYVisible(staticY, frame) ? 1 : 0;
    const staticLineStart = { x: frame.contentLeft, y: staticY };
    const staticLineEnd = { x: axisTag.x, y: staticY };

    return (
      <>
        <Group opacity={staticLineOpacity}>
          <SkiaLine p1={staticLineStart} p2={staticLineEnd} color={line.color} strokeWidth={line.lineWidth ?? 1}>
            {dash && <DashPathEffect intervals={dash} />}
          </SkiaLine>
        </Group>
        {shouldRenderAxisTag ? (
          <Group opacity={1}>
            <NativePriceAxisTagBox
              x={axisTag.x}
              y={staticLabelY}
              width={axisTag.width}
              height={tagHeight}
              backgroundColor={tagBackgroundColor}
              borderColor={line.color}
            />
            <NativePriceAxisTagStaticText
              x={primaryText.x}
              y={staticLabelY + primaryTextBaselineOffset}
              text={primaryText.text}
              font={axisFont}
              color={tagColor}
            />
            {secondaryText && (
              <NativePriceAxisTagStaticText
                x={secondaryText.x}
                y={staticLabelY + secondaryTextBaselineOffset}
                text={secondaryText.text}
                font={axisFont}
                color={tagColor}
              />
            )}
          </Group>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Group opacity={lineOpacity}>
        <SkiaLine p1={lineStart} p2={lineEnd} color={line.color} strokeWidth={line.lineWidth ?? 1}>
          {dash && <DashPathEffect intervals={dash} />}
        </SkiaLine>
      </Group>
      {shouldRenderAxisTag ? (
        <Group opacity={tagOpacity}>
          <NativePriceAxisTagBox
            x={axisTag.x}
            y={labelY}
            width={axisTag.width}
            height={tagHeight}
            backgroundColor={tagBackgroundColor}
            borderColor={line.color}
          />
          <NativePriceAxisTagStaticText
            x={primaryText.x}
            y={primaryTextY}
            text={primaryText.text}
            font={axisFont}
            color={tagColor}
          />
          {secondaryText && (
            <NativePriceAxisTagStaticText
              x={secondaryText.x}
              y={secondaryTextY}
              text={secondaryText.text}
              font={axisFont}
              color={tagColor}
            />
          )}
        </Group>
      ) : null}
    </>
  );
}
