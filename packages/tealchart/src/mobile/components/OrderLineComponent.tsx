/**
 * OrderLineComponent - React Native draggable order line
 *
 * Mirrors web's Konva-based PriceLineLayer for order lines:
 * - Horizontal price line with dashed styling
 * - Label showing order type, quantity, price
 * - TP/SL buttons (draggable for bracket orders)
 * - Cancel button
 * - Invisible 44px drag handle for touch-friendly dragging
 */

import type { OrderLineRenderData, Viewport } from '../../types';
import type { ChartDimensions } from '../utils/coordinates';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import {
  DEFAULT_BUY_CANDLE_COLOR,
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

export interface OrderLineComponentProps {
  /** Order line render data from adapter */
  order: OrderLineRenderData;
  /** Current viewport for coordinate transforms */
  viewport: Viewport;
  /** Chart dimensions and margins */
  dimensions: ChartDimensions;
  /** Price precision for display */
  pricePrecision?: number;
  /** Use narrow text (compact display) */
  useNarrowText?: boolean;
  /** Collision-adjusted label center Y. The price line itself remains at order.price. */
  labelY?: number;
  /** TP default color, usually the active candle up color. */
  positiveColor?: string;
  /** Called when the order price drag starts. */
  onPriceDragStart?: (lineId: string, originalPrice: number, externalOrderId?: string) => void;
  /** Continuous order price drag callback. */
  onPriceDragMove?: (lineId: string, price: number, externalOrderId?: string) => void;
  /** Called when the order price drag ends. */
  onPriceDragEnd?: (lineId: string, price: number, externalOrderId?: string) => void;
  /** Called when the order price drag is cancelled before a normal end. */
  onPriceDragCancel?: (lineId: string, externalOrderId?: string) => void;
  /** Called when the order cancel button is pressed. */
  onCancel?: (order: OrderLineRenderData) => void;
  /** Called when TP is pressed without drag. */
  onTPClick?: (order: OrderLineRenderData) => void;
  /** Called when SL is pressed without drag. */
  onSLClick?: (order: OrderLineRenderData) => void;
  /** Called when TP drag commits. */
  onTPDragEnd?: (order: OrderLineRenderData, price: number, partialPercent?: number) => void;
  /** Called when SL drag commits. */
  onSLDragEnd?: (order: OrderLineRenderData, price: number, partialPercent?: number) => void;
  /** Continuous TP drag move callback (for Skia preview state only) */
  onTPMovePreview?: (orderId: string, price: number, partialPercent?: number) => void;
  /** Continuous SL drag move callback (for Skia preview state only) */
  onSLMovePreview?: (orderId: string, price: number, partialPercent?: number) => void;
  /** Called when any TP/SL drag ends (to clear preview) */
  onTPSLDragEnd?: () => void;
}

const TOUCH_TARGET_HEIGHT = 44; // Minimum touch target per accessibility guidelines
const LABEL_HEIGHT = 18;
const ACTION_BUTTON_WIDTH = 18;
const TP_SL_BUTTON_WIDTH = 24;
const DRAG_THRESHOLD = 5;

function isBracketDrag(event: { translationX?: number; translationY: number }): boolean {
  return Math.abs(event.translationX ?? 0) > DRAG_THRESHOLD || Math.abs(event.translationY) > DRAG_THRESHOLD;
}

export const OrderLineComponent: React.FC<OrderLineComponentProps> = ({
  order,
  viewport,
  dimensions,
  pricePrecision = 2,
  useNarrowText = false,
  labelY,
  positiveColor = DEFAULT_BUY_CANDLE_COLOR,
  onPriceDragStart,
  onPriceDragMove,
  onPriceDragEnd,
  onPriceDragCancel,
  onCancel,
  onTPClick,
  onSLClick,
  onTPDragEnd,
  onSLDragEnd,
  onTPMovePreview,
  onSLMovePreview,
  onTPSLDragEnd,
}) => {
  const isPending = order.actionState?.isPending ?? false;
  const isAwaitingCallback = order.actionState?.isAwaitingCallback ?? false;
  // Calculate Y position from price
  const baseY = useMemo(() => priceToY(order.price, viewport, dimensions), [order.price, viewport, dimensions]);
  const labelCenterY = labelY ?? baseY;
  const containerTop = Math.min(baseY, labelCenterY) - TOUCH_TARGET_HEIGHT / 2;
  const containerHeight = Math.abs(labelCenterY - baseY) + TOUCH_TARGET_HEIGHT;
  const lineCenterY = baseY - containerTop;
  const labelTop = labelCenterY - containerTop - TOUCH_TARGET_HEIGHT / 2;
  const connectorTop = Math.min(baseY, labelCenterY) - containerTop;
  const connectorHeight = Math.abs(labelCenterY - baseY);

  const priceDragBaseY = useSharedValue(baseY);
  const tpTranslateY = useSharedValue(0);
  const slTranslateY = useSharedValue(0);
  const tpDragging = useSharedValue(false);
  const slDragging = useSharedValue(false);

  const priceDragContextRef = useRef({
    dimensions,
    editable: order.editable && !isPending,
    externalOrderId: order.orderId,
    lineId: order.id,
    onPriceDragCancel,
    onPriceDragEnd,
    onPriceDragMove,
    onPriceDragStart,
    originalPrice: order.price,
    startY: baseY,
    viewport,
  });
  priceDragContextRef.current = {
    dimensions,
    editable: order.editable && !isPending,
    externalOrderId: order.orderId,
    lineId: order.id,
    onPriceDragCancel,
    onPriceDragEnd,
    onPriceDragMove,
    onPriceDragStart,
    originalPrice: order.price,
    startY: priceDragContextRef.current.startY,
    viewport,
  };

  useEffect(() => {
    priceDragBaseY.value = baseY;
  }, [baseY, priceDragBaseY]);

  const handlePriceDragStart = useCallback((startY: number) => {
    const context = priceDragContextRef.current;
    if (context.editable) {
      context.startY = startY;
      context.onPriceDragStart?.(context.lineId, context.originalPrice, context.externalOrderId);
    }
  }, []);

  const handlePriceDragMove = useCallback(
    (translationY: number) => {
      const context = priceDragContextRef.current;
      if (context.editable) {
        const price = yToPrice(context.startY + translationY, context.viewport, context.dimensions);
        context.onPriceDragMove?.(context.lineId, price, context.externalOrderId);
      }
    },
    [],
  );

  const handlePriceDragEnd = useCallback(
    (translationY: number) => {
      const context = priceDragContextRef.current;
      if (context.editable) {
        const price = yToPrice(context.startY + translationY, context.viewport, context.dimensions);
        context.onPriceDragEnd?.(context.lineId, price, context.externalOrderId);
      }
    },
    [],
  );

  const handlePriceDragCancel = useCallback(() => {
    const context = priceDragContextRef.current;
    if (context.editable) {
      context.onPriceDragCancel?.(context.lineId, context.externalOrderId);
    }
  }, []);

  const handleCancel = useCallback(() => {
    if (order.cancellable && !isPending) {
      onCancel?.(order);
    }
  }, [isPending, onCancel, order]);

  const handleTPClick = useCallback(() => {
    if (!isPending) onTPClick?.(order);
  }, [isPending, onTPClick, order]);

  const handleSLClick = useCallback(() => {
    if (!isPending) onSLClick?.(order);
  }, [isPending, onSLClick, order]);

  const handleTPDragEnd = useCallback(
    (newPrice: number, partialPercent?: number) => {
      if (!isPending) onTPDragEnd?.(order, newPrice, partialPercent);
    },
    [isPending, onTPDragEnd, order],
  );

  const handleSLDragEnd = useCallback(
    (newPrice: number, partialPercent?: number) => {
      if (!isPending) onSLDragEnd?.(order, newPrice, partialPercent);
    },
    [isPending, onSLDragEnd, order],
  );

  // Handle continuous TP move (for adapter callback + Skia drag preview)
  const handleTPMove = useCallback(
    (price: number, partialPercent: number) => {
      order.callbacks?.onTPMove?.(price, partialPercent);
      onTPMovePreview?.(order.id, price, partialPercent);
    },
    [order.callbacks, onTPMovePreview, order.id],
  );

  // Handle continuous SL move (for adapter callback + Skia drag preview)
  const handleSLMove = useCallback(
    (price: number, partialPercent: number) => {
      order.callbacks?.onSLMove?.(price, partialPercent);
      onSLMovePreview?.(order.id, price, partialPercent);
    },
    [order.callbacks, onSLMovePreview, order.id],
  );

  // Handle TP/SL drag end (clear preview)
  const handleTPSLDragEnd = useCallback(() => {
    if (onTPSLDragEnd) {
      onTPSLDragEnd();
    }
  }, [onTPSLDragEnd]);

  // TP button drag gesture
  const tpPanGesture = useMemo(() => {
    if (!order.brackets || isPending) return Gesture.Pan().enabled(false);

    return Gesture.Pan()
      .minDistance(DRAG_THRESHOLD)
      .onStart(() => {
        tpDragging.value = true;
      })
      .onUpdate((event) => {
        tpTranslateY.value = event.translationY;
        if (isBracketDrag(event)) {
          const dragPrice = yToPrice(baseY + event.translationY, viewport, dimensions);
          const partialPercent = order.partialEnabled
            ? calculatePartialBracketPercentFromDelta(event.translationX ?? 0)
            : 100;
          runOnJS(handleTPMove)(dragPrice, partialPercent);
        }
      })
      .onEnd((event) => {
        tpDragging.value = false;
        const finalY = baseY + event.translationY;
        const newPrice = yToPrice(finalY, viewport, dimensions);
        const partialPercent = order.partialEnabled
          ? calculatePartialBracketPercentFromDelta(event.translationX ?? 0)
          : undefined;

        runOnJS(handleTPSLDragEnd)();

        runOnJS(handleTPDragEnd)(newPrice, partialPercent);

        tpTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      })
      .onFinalize(() => {
        runOnJS(handleTPSLDragEnd)();
      });
  }, [
    order.brackets,
    isPending,
    baseY,
    viewport,
    dimensions,
    handleTPDragEnd,
    handleTPMove,
    handleTPSLDragEnd,
    order.partialEnabled,
    tpDragging,
    tpTranslateY,
  ]);

  // SL button drag gesture
  const slPanGesture = useMemo(() => {
    if (!order.brackets || isPending) return Gesture.Pan().enabled(false);

    return Gesture.Pan()
      .minDistance(DRAG_THRESHOLD)
      .onStart(() => {
        slDragging.value = true;
      })
      .onUpdate((event) => {
        slTranslateY.value = event.translationY;
        if (isBracketDrag(event)) {
          const dragPrice = yToPrice(baseY + event.translationY, viewport, dimensions);
          const partialPercent = order.partialEnabled
            ? calculatePartialBracketPercentFromDelta(event.translationX ?? 0)
            : 100;
          runOnJS(handleSLMove)(dragPrice, partialPercent);
        }
      })
      .onEnd((event) => {
        slDragging.value = false;
        const finalY = baseY + event.translationY;
        const newPrice = yToPrice(finalY, viewport, dimensions);
        const partialPercent = order.partialEnabled
          ? calculatePartialBracketPercentFromDelta(event.translationX ?? 0)
          : undefined;

        runOnJS(handleTPSLDragEnd)();

        runOnJS(handleSLDragEnd)(newPrice, partialPercent);

        slTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      })
      .onFinalize(() => {
        runOnJS(handleTPSLDragEnd)();
      });
  }, [
    order.brackets,
    isPending,
    baseY,
    viewport,
    dimensions,
    handleSLDragEnd,
    handleSLMove,
    handleTPSLDragEnd,
    order.partialEnabled,
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

  // Pan gesture for dragging (order price change)
  const panGesture = useMemo(() => {
    if (!order.editable || isPending) return Gesture.Pan().enabled(false);

    return Gesture.Pan()
      .minDistance(DRAG_THRESHOLD)
      .onStart(() => {
        runOnJS(handlePriceDragStart)(priceDragBaseY.value);
      })
      .onUpdate((event) => {
        runOnJS(handlePriceDragMove)(event.translationY);
      })
      .onEnd((event) => {
        runOnJS(handlePriceDragEnd)(event.translationY);
      })
      .onFinalize((_event, success) => {
        if (!success) {
          runOnJS(handlePriceDragCancel)();
        }
      });
  }, [
    order.editable,
    isPending,
    handlePriceDragStart,
    handlePriceDragMove,
    handlePriceDragEnd,
    handlePriceDragCancel,
    priceDragBaseY,
  ]);

  // Display text (use narrow if appropriate)
  const displayText = useNarrowText && order.textShort ? order.textShort : order.text;
  const displayQuantity = useNarrowText && order.quantityShort ? order.quantityShort : order.quantity;
  const labelSegments = useMemo(
    () =>
      [
        {
          key: 'text',
          text: displayText,
          backgroundColor: order.bodyBackgroundColor,
          borderColor: order.bodyBorderColor,
          textColor: order.bodyTextColor,
        },
        {
          key: 'quantity',
          text: displayQuantity,
          backgroundColor: order.quantityBackgroundColor,
          borderColor: order.quantityBorderColor,
          textColor: order.quantityTextColor,
        },
      ].filter((segment) => segment.text.length > 0),
    [
      displayQuantity,
      displayText,
      order.bodyBackgroundColor,
      order.bodyBorderColor,
      order.bodyTextColor,
      order.quantityBackgroundColor,
      order.quantityBorderColor,
      order.quantityTextColor,
    ],
  );

  // Format price for display
  const formattedPrice = formatNativeTradeLinePrice(order.price, pricePrecision);

  // Whether to show TP/SL buttons
  const showBrackets = order.brackets !== null;
  const fallbackLabelWidth = useMemo(
    () =>
      measureNativeTradeLineLabelWidth({
        actionButtonCount: order.cancellable ? 1 : 0,
        bracketButtonCount: showBrackets ? 2 : 0,
        bracketGap: 6,
        segmentHorizontalPadding: 6,
        texts: labelSegments.map((segment) => segment.text),
      }),
    [labelSegments, order.cancellable, showBrackets],
  );
  const [measuredLabelWidth, setMeasuredLabelWidth] = useState<number | null>(null);
  const labelWidth = measuredLabelWidth ?? fallbackLabelWidth;
  const tradeLineLayout = useMemo(
    () =>
      layoutNativeTradeLine({
        dimensions,
        formattedPrice,
        labelWidth,
        lineLength: order.lineLength,
        lineLengthUnit: order.lineLengthUnit,
      }),
    [dimensions, formattedPrice, labelWidth, order.lineLength, order.lineLengthUnit],
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

  const lineColor = order.lineColor;
  const takeProfitColor = order.brackets?.takeProfitColor ?? positiveColor;
  const takeProfitTextColor = order.brackets?.takeProfitTextColor ?? DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR;
  const stopLossColor = order.brackets?.stopLossColor ?? STOP_LOSS_COLOR;
  const stopLossTextColor = order.brackets?.stopLossTextColor ?? DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.container, { height: containerHeight, opacity: isAwaitingCallback ? 0.58 : 1, top: containerTop }]}
    >
      {/* Horizontal line - left segment (if extendLeft) */}
      {order.extendLeft && (
        <NativeTradeLineSegment
          color={lineColor}
          left={tradeLineLayout.lineStartX}
          lineStyle={order.lineStyle}
          lineWidth={order.lineWidth}
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
        <GestureDetector gesture={panGesture}>
          <Animated.View collapsable={false} style={styles.labelBodyHitTarget}>
            <View style={styles.labelBody}>
              {labelSegments.map((segment, index) => {
                const isFirst = index === 0;
                const isLastBeforeGap = index === labelSegments.length - 1 && !order.cancellable;

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
                        borderTopRightRadius: isLastBeforeGap ? 2 : 0,
                        borderBottomRightRadius: isLastBeforeGap ? 2 : 0,
                      },
                    ]}
                  >
                    <Text style={[styles.labelText, { color: segment.textColor }]}>{segment.text}</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </GestureDetector>

        {/* Cancel button — flush with label segments */}
        {order.cancellable && (
          <Pressable
            accessibilityLabel={order.cancelAsSubmit ? 'Submit order changes' : 'Cancel order'}
            accessibilityRole="button"
            onPress={handleCancel}
            style={styles.actionHitTarget}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <View
              style={[
                styles.cancelButton,
                {
                  backgroundColor: order.cancelButtonBackgroundColor,
                  borderColor: order.cancelButtonBorderColor,
                },
              ]}
            >
              <Text style={[styles.cancelIcon, { color: order.cancelButtonIconColor }]}>
                {order.cancelAsSubmit ? '✓' : '×'}
              </Text>
            </View>
          </Pressable>
        )}

        {/* TP/SL Buttons (if brackets enabled) — separated by gap */}
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

      {/* Horizontal line - right segment (from label to price axis) */}
      <NativeTradeLineSegment
        color={lineColor}
        left={tradeLineLayout.rightLineLeft}
        lineStyle={order.lineStyle}
        lineWidth={order.lineWidth}
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
              width: Math.max(1, order.lineWidth),
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
            backgroundColor: order.bodyBackgroundColor,
            borderColor: order.bodyBorderColor,
          },
        ]}
      >
        <Text style={[styles.priceText, { color: order.bodyTextColor }]}>{formattedPrice}</Text>
      </View>
    </Animated.View>
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
    paddingHorizontal: 6,
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
    alignItems: 'center',
    marginLeft: 6, // Gap between cancel button and TP/SL buttons
    flexShrink: 0,
  },
  bracketButtonWrapper: {
    height: TOUCH_TARGET_HEIGHT,
    marginLeft: 0,
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
    borderLeftWidth: 0,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bracketButtonText: {
    fontSize: 9,
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
  cancelButton: {
    width: ACTION_BUTTON_WIDTH,
    minWidth: ACTION_BUTTON_WIDTH,
    height: LABEL_HEIGHT,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cancelIcon: {
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

export default OrderLineComponent;
