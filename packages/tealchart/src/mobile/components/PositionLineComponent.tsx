/**
 * PositionLineComponent - React Native draggable position line
 *
 * Mirrors web's Konva-based PriceLineLayer for position lines:
 * - Horizontal price line showing entry price
 * - Label showing symbol, quantity, entry, PnL
 * - Close button
 * - TP/SL buttons (draggable for bracket orders)
 */

import type { PositionLineRenderData, Viewport } from '../../types';
import type { ChartDimensions } from '../utils/coordinates';

import React, { useCallback, useMemo, useState } from 'react';

import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import {
  DEFAULT_BUY_CANDLE_COLOR,
  DEFAULT_SELL_CANDLE_COLOR,
  DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR,
  DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR,
  STOP_LOSS_COLOR,
} from '../../constants';
import { calculatePartialBracketPercentFromDelta } from '../../interaction/partialBrackets';
import { priceToY, yToPrice } from '../utils/coordinates';
import {
  formatNativeTradeLinePrice,
  layoutNativeTradeLine,
  measureNativeTradeLineLabelWidth,
} from '../utils/tradeLineLayout';
import { NativeTradeLineSegment } from './NativeTradeLineSegment';

export interface PositionLineComponentProps {
  /** Position line render data from adapter */
  position: PositionLineRenderData;
  /** Current viewport for coordinate transforms */
  viewport: Viewport;
  /** Chart dimensions and margins */
  dimensions: ChartDimensions;
  /** Price precision for display */
  pricePrecision?: number;
  /** Use narrow text (compact display) */
  useNarrowText?: boolean;
  /** Collision-adjusted label center Y. The price line itself remains at position.price. */
  labelY?: number;
  /** Positive PnL and TP default color, usually the active candle up color. */
  positiveColor?: string;
  /** Negative PnL default color, usually the active candle down color. */
  negativeColor?: string;
  /** Called when the close button is pressed. */
  onClose?: (position: PositionLineRenderData) => void;
  /** Called when the reverse button is pressed. */
  onReverse?: (position: PositionLineRenderData) => void;
  /** Called when TP is pressed without drag. */
  onTPClick?: (position: PositionLineRenderData) => void;
  /** Called when SL is pressed without drag. */
  onSLClick?: (position: PositionLineRenderData) => void;
  /** Called when TP drag commits. */
  onTPDragEnd?: (position: PositionLineRenderData, price: number, partialPercent?: number) => void;
  /** Called when SL drag commits. */
  onSLDragEnd?: (position: PositionLineRenderData, price: number, partialPercent?: number) => void;
  /** Continuous TP drag move callback (for Skia preview state only) */
  onTPMovePreview?: (positionId: string, price: number, partialPercent?: number) => void;
  /** Continuous SL drag move callback (for Skia preview state only) */
  onSLMovePreview?: (positionId: string, price: number, partialPercent?: number) => void;
  /** Called when any TP/SL drag ends (to clear preview) */
  onTPSLDragEnd?: () => void;
}

const TOUCH_TARGET_HEIGHT = 44;
const LABEL_HEIGHT = 18;
const ACTION_BUTTON_WIDTH = 18;
const TP_SL_BUTTON_WIDTH = 24;
const DRAG_THRESHOLD = 5;

function isBracketDrag(event: { translationX?: number; translationY: number }): boolean {
  return Math.abs(event.translationX ?? 0) > DRAG_THRESHOLD || Math.abs(event.translationY) > DRAG_THRESHOLD;
}

export const PositionLineComponent: React.FC<PositionLineComponentProps> = ({
  position,
  viewport,
  dimensions,
  pricePrecision = 2,
  useNarrowText = false,
  labelY,
  positiveColor = DEFAULT_BUY_CANDLE_COLOR,
  negativeColor = DEFAULT_SELL_CANDLE_COLOR,
  onClose,
  onReverse,
  onTPClick,
  onSLClick,
  onTPDragEnd,
  onSLDragEnd,
  onTPMovePreview,
  onSLMovePreview,
  onTPSLDragEnd,
}) => {
  const isPending = position.actionState?.isPending ?? false;
  const isAwaitingCallback = position.actionState?.isAwaitingCallback ?? false;
  // Calculate Y position from price
  const baseY = useMemo(() => priceToY(position.price, viewport, dimensions), [position.price, viewport, dimensions]);
  const labelCenterY = labelY ?? baseY;
  const containerTop = Math.min(baseY, labelCenterY) - TOUCH_TARGET_HEIGHT / 2;
  const containerHeight = Math.abs(labelCenterY - baseY) + TOUCH_TARGET_HEIGHT;
  const lineCenterY = baseY - containerTop;
  const labelTop = labelCenterY - containerTop - TOUCH_TARGET_HEIGHT / 2;
  const connectorTop = Math.min(baseY, labelCenterY) - containerTop;
  const connectorHeight = Math.abs(labelCenterY - baseY);

  // Shared values for TP/SL button drag
  const tpTranslateY = useSharedValue(0);
  const slTranslateY = useSharedValue(0);
  const tpDragging = useSharedValue(false);
  const slDragging = useSharedValue(false);

  const handleClose = useCallback(() => {
    if (position.closeable && !isPending) {
      onClose?.(position);
    }
  }, [isPending, onClose, position]);

  const handleReverse = useCallback(() => {
    if (position.reversible && !isPending) {
      onReverse?.(position);
    }
  }, [isPending, onReverse, position]);

  const handleTPClick = useCallback(() => {
    if (!isPending) onTPClick?.(position);
  }, [isPending, onTPClick, position]);

  const handleSLClick = useCallback(() => {
    if (!isPending) onSLClick?.(position);
  }, [isPending, onSLClick, position]);

  const handleTPDragEnd = useCallback(
    (newPrice: number, partialPercent?: number) => {
      if (!isPending) onTPDragEnd?.(position, newPrice, partialPercent);
    },
    [isPending, onTPDragEnd, position],
  );

  const handleSLDragEnd = useCallback(
    (newPrice: number, partialPercent?: number) => {
      if (!isPending) onSLDragEnd?.(position, newPrice, partialPercent);
    },
    [isPending, onSLDragEnd, position],
  );

  // Handle continuous TP move (for adapter callback + Skia drag preview)
  const handleTPMove = useCallback(
    (price: number, partialPercent: number) => {
      position.callbacks?.onTPMove?.(price, partialPercent);
      onTPMovePreview?.(position.id, price, partialPercent);
    },
    [position.callbacks, onTPMovePreview, position.id],
  );

  // Handle continuous SL move (for adapter callback + Skia drag preview)
  const handleSLMove = useCallback(
    (price: number, partialPercent: number) => {
      position.callbacks?.onSLMove?.(price, partialPercent);
      onSLMovePreview?.(position.id, price, partialPercent);
    },
    [position.callbacks, onSLMovePreview, position.id],
  );

  // Handle TP/SL drag end (clear preview)
  const handleTPSLDragEnd = useCallback(() => {
    if (onTPSLDragEnd) {
      onTPSLDragEnd();
    }
  }, [onTPSLDragEnd]);

  // TP button drag gesture
  const tpPanGesture = useMemo(() => {
    if (!position.brackets || isPending) return Gesture.Pan().enabled(false);

    return Gesture.Pan()
      .minDistance(DRAG_THRESHOLD)
      .onStart(() => {
        tpDragging.value = true;
      })
      .onUpdate((event) => {
        tpTranslateY.value = event.translationY;
        // Emit continuous move for Skia drag preview (only after drag threshold)
        if (isBracketDrag(event)) {
          const dragPrice = yToPrice(baseY + event.translationY, viewport, dimensions);
          const partialPercent = position.partialEnabled
            ? calculatePartialBracketPercentFromDelta(event.translationX ?? 0)
            : 100;
          runOnJS(handleTPMove)(dragPrice, partialPercent);
        }
      })
      .onEnd((event) => {
        tpDragging.value = false;
        const finalY = baseY + event.translationY;
        const newPrice = yToPrice(finalY, viewport, dimensions);
        const partialPercent = position.partialEnabled
          ? calculatePartialBracketPercentFromDelta(event.translationX ?? 0)
          : undefined;

        // Clear Skia drag preview
        runOnJS(handleTPSLDragEnd)();

        runOnJS(handleTPDragEnd)(newPrice, partialPercent);

        tpTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      })
      .onFinalize(() => {
        // Ensure preview is cleared even if gesture is cancelled
        runOnJS(handleTPSLDragEnd)();
      });
  }, [
    position.brackets,
    isPending,
    baseY,
    viewport,
    dimensions,
    handleTPDragEnd,
    handleTPMove,
    handleTPSLDragEnd,
    position.partialEnabled,
    tpDragging,
    tpTranslateY,
  ]);

  // SL button drag gesture
  const slPanGesture = useMemo(() => {
    if (!position.brackets || isPending) return Gesture.Pan().enabled(false);

    return Gesture.Pan()
      .minDistance(DRAG_THRESHOLD)
      .onStart(() => {
        slDragging.value = true;
      })
      .onUpdate((event) => {
        slTranslateY.value = event.translationY;
        // Emit continuous move for Skia drag preview (only after drag threshold)
        if (isBracketDrag(event)) {
          const dragPrice = yToPrice(baseY + event.translationY, viewport, dimensions);
          const partialPercent = position.partialEnabled
            ? calculatePartialBracketPercentFromDelta(event.translationX ?? 0)
            : 100;
          runOnJS(handleSLMove)(dragPrice, partialPercent);
        }
      })
      .onEnd((event) => {
        slDragging.value = false;
        const finalY = baseY + event.translationY;
        const newPrice = yToPrice(finalY, viewport, dimensions);
        const partialPercent = position.partialEnabled
          ? calculatePartialBracketPercentFromDelta(event.translationX ?? 0)
          : undefined;

        // Clear Skia drag preview
        runOnJS(handleTPSLDragEnd)();

        runOnJS(handleSLDragEnd)(newPrice, partialPercent);

        slTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      })
      .onFinalize(() => {
        // Ensure preview is cleared even if gesture is cancelled
        runOnJS(handleTPSLDragEnd)();
      });
  }, [
    position.brackets,
    isPending,
    baseY,
    viewport,
    dimensions,
    handleSLDragEnd,
    handleSLMove,
    handleTPSLDragEnd,
    position.partialEnabled,
    slDragging,
    slTranslateY,
  ]);

  // Animated styles for TP button
  const tpAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tpTranslateY.value }],
  }));

  // Animated styles for SL button
  const slAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slTranslateY.value }],
  }));

  // Display text (use narrow if appropriate)
  const displayText = useNarrowText && position.textShort ? position.textShort : position.text;
  const displayQuantity = useNarrowText && position.quantityShort ? position.quantityShort : position.quantity;
  const displayPnl = useNarrowText && position.pnlShort ? position.pnlShort : position.pnl;

  // Format price for display
  const formattedPrice = formatNativeTradeLinePrice(position.price, pricePrecision);

  // Whether to show TP/SL buttons
  const showBrackets = position.brackets !== null;

  const lineColor = position.lineColor;
  const takeProfitColor = position.brackets?.takeProfitColor ?? positiveColor;
  const takeProfitTextColor = position.brackets?.takeProfitTextColor ?? DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR;
  const stopLossColor = position.brackets?.stopLossColor ?? STOP_LOSS_COLOR;
  const stopLossTextColor = position.brackets?.stopLossTextColor ?? DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR;

  // PnL segment color based on profit state
  const pnlStateColor = useMemo(() => {
    switch (position.profitState) {
      case 'positive':
        return positiveColor;
      case 'negative':
        return negativeColor;
      default:
        return undefined;
    }
  }, [position.profitState, positiveColor, negativeColor]);
  const pnlBackgroundColor = pnlStateColor ?? lineColor;
  const pnlBorderColor = DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR;
  const pnlTextColor = pnlStateColor ? DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR : position.bodyTextColor;
  const labelSegments = useMemo(
    () =>
      [
        {
          key: 'text',
          text: displayText,
          backgroundColor: position.bodyBackgroundColor,
          borderColor: position.bodyBorderColor,
          textColor: position.bodyTextColor,
        },
        {
          key: 'quantity',
          text: displayQuantity,
          backgroundColor: position.quantityBackgroundColor,
          borderColor: position.quantityBorderColor,
          textColor: position.quantityTextColor,
        },
        {
          key: 'pnl',
          text: displayPnl,
          backgroundColor: pnlBackgroundColor,
          borderColor: pnlBorderColor,
          textColor: pnlTextColor,
        },
      ].filter((segment) => segment.text.length > 0),
    [
      displayPnl,
      displayQuantity,
      displayText,
      pnlBackgroundColor,
      pnlBorderColor,
      pnlTextColor,
      position.bodyBackgroundColor,
      position.bodyBorderColor,
      position.bodyTextColor,
      position.quantityBackgroundColor,
      position.quantityBorderColor,
      position.quantityTextColor,
    ],
  );
  const fallbackLabelWidth = useMemo(
    () =>
      measureNativeTradeLineLabelWidth({
        actionButtonCount: Number(position.reversible) + Number(position.closeable),
        bracketButtonCount: showBrackets ? 2 : 0,
        bracketGap: 4,
        segmentHorizontalPadding: 7,
        texts: labelSegments.map((segment) => segment.text),
      }),
    [labelSegments, position.closeable, position.reversible, showBrackets],
  );
  const [measuredLabelWidth, setMeasuredLabelWidth] = useState<number | null>(null);
  const labelWidth = measuredLabelWidth ?? fallbackLabelWidth;
  const tradeLineLayout = useMemo(
    () =>
      layoutNativeTradeLine({
        dimensions,
        formattedPrice,
        labelWidth,
        lineLength: position.lineLength,
        lineLengthUnit: position.lineLengthUnit,
      }),
    [dimensions, formattedPrice, labelWidth, position.lineLength, position.lineLengthUnit],
  );
  const handleLabelLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = Math.ceil(event.nativeEvent.layout.width);
      if (nextWidth > 0 && Math.abs(nextWidth - (measuredLabelWidth ?? 0)) > 0.5) {
        setMeasuredLabelWidth(nextWidth);
      }
    },
    [measuredLabelWidth],
  );

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { height: containerHeight, opacity: isAwaitingCallback ? 0.58 : 1, top: containerTop }]}
    >
      {/* Horizontal line - left segment (if extendLeft) */}
      {position.extendLeft && (
        <NativeTradeLineSegment
          color={lineColor}
          left={tradeLineLayout.lineStartX}
          lineStyle={position.lineStyle}
          lineWidth={position.lineWidth}
          top={lineCenterY}
          width={tradeLineLayout.leftLineWidth}
        />
      )}

      {/* Label group */}
      <View
        onLayout={handleLabelLayout}
        style={[
          styles.labelGroup,
          {
            left: tradeLineLayout.labelX,
            maxWidth: tradeLineLayout.maxLabelWidth,
            top: labelTop,
          },
        ]}
      >
        <View style={styles.labelBodyHitTarget} pointerEvents="none">
          <View style={styles.labelBody}>
            {labelSegments.map((segment, index) => {
              const isFirst = index === 0;
              const isLastBeforeActions =
                index === labelSegments.length - 1 && !position.reversible && !position.closeable;

              return (
                <View
                  key={segment.key}
                  style={[
                    styles.labelSegment,
                    {
                      backgroundColor: segment.backgroundColor,
                      borderColor: segment.borderColor,
                      borderLeftWidth: isFirst ? 1 : 0,
                      borderTopLeftRadius: isFirst ? 2 : 0,
                      borderBottomLeftRadius: isFirst ? 2 : 0,
                      borderTopRightRadius: isLastBeforeActions ? 2 : 0,
                      borderBottomRightRadius: isLastBeforeActions ? 2 : 0,
                    },
                  ]}
                >
                  <Text style={[styles.labelText, { color: segment.textColor }]}>{segment.text}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Reverse button */}
        {position.reversible && (
          <Pressable
            accessibilityLabel="Reverse position"
            accessibilityRole="button"
            onPress={handleReverse}
            style={styles.actionHitTarget}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <View
              style={[
                styles.actionButton,
                {
                  backgroundColor: position.reverseButtonBackgroundColor,
                  borderColor: position.reverseButtonBorderColor,
                  borderLeftWidth: 0,
                  borderTopRightRadius: position.closeable ? 0 : 2,
                  borderBottomRightRadius: position.closeable ? 0 : 2,
                },
              ]}
            >
              <Text style={[styles.actionIcon, { color: position.reverseButtonIconColor }]}>⇄</Text>
            </View>
          </Pressable>
        )}

        {/* Close button */}
        {position.closeable && (
          <Pressable
            accessibilityLabel="Close position"
            accessibilityRole="button"
            onPress={handleClose}
            style={styles.actionHitTarget}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <View
              style={[
                styles.actionButton,
                {
                  backgroundColor: position.closeButtonBackgroundColor,
                  borderColor: position.closeButtonBorderColor,
                  borderLeftWidth: 0,
                  borderTopRightRadius: 2,
                  borderBottomRightRadius: 2,
                },
              ]}
            >
              <Text style={[styles.actionIcon, { color: position.closeButtonIconColor }]}>×</Text>
            </View>
          </Pressable>
        )}

        {/* TP/SL Buttons (if brackets enabled) */}
        {showBrackets && (
          <View style={styles.bracketButtons}>
            {/* TP Button */}
            <GestureDetector gesture={tpPanGesture}>
              <Animated.View collapsable={false} style={[styles.bracketButtonWrapper, tpAnimatedStyle]}>
                <Pressable
                  accessibilityLabel="Take profit"
                  accessibilityRole="button"
                  onPress={handleTPClick}
                  style={styles.bracketButtonHitTarget}
                  hitSlop={{ top: 10, bottom: 10, left: 2, right: 2 }}
                >
                  <View
                    style={[
                      styles.bracketButton,
                      {
                        backgroundColor: takeProfitColor,
                        borderColor: DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR,
                        borderTopLeftRadius: 2,
                        borderBottomLeftRadius: 2,
                      },
                    ]}
                  >
                    <Text style={[styles.bracketButtonText, { color: takeProfitTextColor }]}>TP</Text>
                  </View>
                </Pressable>
              </Animated.View>
            </GestureDetector>

            {/* SL Button */}
            <GestureDetector gesture={slPanGesture}>
              <Animated.View collapsable={false} style={[styles.bracketButtonWrapper, slAnimatedStyle]}>
                <Pressable
                  accessibilityLabel="Stop loss"
                  accessibilityRole="button"
                  onPress={handleSLClick}
                  style={styles.bracketButtonHitTarget}
                  hitSlop={{ top: 10, bottom: 10, left: 2, right: 2 }}
                >
                  <View
                    style={[
                      styles.bracketButton,
                      {
                        backgroundColor: stopLossColor,
                        borderColor: DEFAULT_TRADE_LINE_SEGMENT_BORDER_COLOR,
                        borderTopRightRadius: 2,
                        borderBottomRightRadius: 2,
                        borderLeftWidth: 0,
                      },
                    ]}
                  >
                    <Text style={[styles.bracketButtonText, { color: stopLossTextColor }]}>SL</Text>
                  </View>
                </Pressable>
              </Animated.View>
            </GestureDetector>
          </View>
        )}
      </View>

      {/* Horizontal line - right segment */}
      <NativeTradeLineSegment
        color={lineColor}
        left={tradeLineLayout.rightLineLeft}
        lineStyle={position.lineStyle}
        lineWidth={position.lineWidth}
        top={lineCenterY}
        width={tradeLineLayout.rightLineWidth}
      />

      {connectorHeight > 1 && (
        <View
          pointerEvents="none"
          style={[
            styles.collisionConnector,
            {
              backgroundColor: lineColor,
              height: connectorHeight,
              left: tradeLineLayout.rightLineLeft,
              top: connectorTop,
              width: Math.max(1, position.lineWidth),
            },
          ]}
        />
      )}

      {/* Price axis label */}
      <View
        style={[
          styles.priceAxisLabel,
          {
            left: tradeLineLayout.priceLabelLeft,
            width: tradeLineLayout.priceLabelWidth,
            top: labelCenterY - containerTop - (LABEL_HEIGHT * 1.2) / 2,
            backgroundColor: position.bodyBackgroundColor,
            borderColor: position.bodyBorderColor,
          },
        ]}
      >
        <Text style={[styles.priceText, { color: position.bodyTextColor }]}>{formattedPrice}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelGroup: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    height: TOUCH_TARGET_HEIGHT,
    zIndex: 2,
  },
  collisionConnector: {
    position: 'absolute',
    zIndex: 1,
  },
  labelBodyHitTarget: {
    height: TOUCH_TARGET_HEIGHT,
    justifyContent: 'center',
    flexShrink: 1,
  },
  labelBody: {
    flexDirection: 'row',
    alignItems: 'center',
    height: LABEL_HEIGHT,
    flexShrink: 1,
  },
  labelSegment: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    height: LABEL_HEIGHT,
    flexShrink: 0,
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 11,
    fontFamily: 'System',
    includeFontPadding: false,
    lineHeight: 14,
    textAlign: 'center',
    flexShrink: 1,
  },
  bracketButtons: {
    flexDirection: 'row',
    marginLeft: 4,
    flexShrink: 0,
  },
  bracketButtonWrapper: {
    height: TOUCH_TARGET_HEIGHT,
    flexShrink: 0,
    justifyContent: 'center',
  },
  bracketButtonHitTarget: {
    height: TOUCH_TARGET_HEIGHT,
    justifyContent: 'center',
  },
  bracketButton: {
    width: TP_SL_BUTTON_WIDTH,
    minWidth: TP_SL_BUTTON_WIDTH,
    height: LABEL_HEIGHT,
    borderWidth: 1,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bracketButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    includeFontPadding: false,
    lineHeight: 12,
    textAlign: 'center',
  },
  actionHitTarget: {
    width: ACTION_BUTTON_WIDTH,
    minWidth: ACTION_BUTTON_WIDTH,
    height: TOUCH_TARGET_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  actionButton: {
    width: ACTION_BUTTON_WIDTH,
    minWidth: ACTION_BUTTON_WIDTH,
    height: LABEL_HEIGHT,
    borderWidth: 1,
    borderLeftWidth: 0,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  actionIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    includeFontPadding: false,
    lineHeight: 16,
    textAlign: 'center',
  },
  priceAxisLabel: {
    position: 'absolute',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 2,
    minWidth: 50,
    alignItems: 'center',
    zIndex: 2,
  },
  priceText: {
    fontSize: 11,
    fontFamily: 'System',
    includeFontPadding: false,
    lineHeight: 14,
    textAlign: 'center',
  },
});

export default PositionLineComponent;
