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

import React, { useCallback, useMemo } from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { STOP_LOSS_COLOR, TAKE_PROFIT_COLOR } from '../../constants';
import { calculatePartialBracketPercentFromDelta } from '../../interaction/partialBrackets';
import { MOBILE_CHART_CHROME_METRICS } from '../../layout/chartGeometry';
import { safeToFixed } from '../../utils/safeNumber';
import { priceToY, yToPrice } from '../utils/coordinates';

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
  /** Continuous TP drag move callback (for Skia preview state only) */
  onTPMovePreview?: (orderId: string, price: number, partialPercent?: number) => void;
  /** Continuous SL drag move callback (for Skia preview state only) */
  onSLMovePreview?: (orderId: string, price: number, partialPercent?: number) => void;
  /** Called when any TP/SL drag ends (to clear preview) */
  onTPSLDragEnd?: () => void;
}

const TOUCH_TARGET_HEIGHT = 44; // Minimum touch target per accessibility guidelines
const LABEL_HEIGHT = 18;
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
  onTPMovePreview,
  onSLMovePreview,
  onTPSLDragEnd,
}) => {
  // Calculate Y position from price
  const baseY = useMemo(() => priceToY(order.price, viewport, dimensions), [order.price, viewport, dimensions]);

  // Shared values for drag animation
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const startY = useSharedValue(0);

  // Shared values for TP/SL button drag
  const tpTranslateY = useSharedValue(0);
  const slTranslateY = useSharedValue(0);
  const tpDragging = useSharedValue(false);
  const slDragging = useSharedValue(false);

  // Handle price change callback
  const handlePriceChange = useCallback(
    (newPrice: number) => {
      if (order.editable) {
        order.callbacks?.onMove?.(newPrice);
      }
    },
    [order.callbacks, order.editable],
  );

  const handlePriceMoving = useCallback(
    (newPrice: number) => {
      if (order.editable) {
        order.callbacks?.onMoving?.(newPrice);
      }
    },
    [order.callbacks, order.editable],
  );

  // Handle cancel callback — fire directly from adapter callbacks
  const handleCancel = useCallback(() => {
    if (order.cancellable) {
      order.callbacks?.onCancel?.();
    }
  }, [order.cancellable, order.callbacks]);

  // Handle TP click (no drag) — fire directly from adapter callbacks
  const handleTPClick = useCallback(() => {
    order.callbacks?.onTPClick?.();
  }, [order.callbacks]);

  // Handle SL click (no drag) — fire directly from adapter callbacks
  const handleSLClick = useCallback(() => {
    order.callbacks?.onSLClick?.();
  }, [order.callbacks]);

  // Handle TP drag end — fire directly from adapter callbacks
  const handleTPDragEnd = useCallback(
    (newPrice: number, partialPercent?: number) => {
      order.callbacks?.onTPMoveEnd?.(newPrice, partialPercent);
    },
    [order.callbacks],
  );

  // Handle SL drag end — fire directly from adapter callbacks
  const handleSLDragEnd = useCallback(
    (newPrice: number, partialPercent?: number) => {
      order.callbacks?.onSLMoveEnd?.(newPrice, partialPercent);
    },
    [order.callbacks],
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
    if (!order.brackets) return Gesture.Pan();

    return Gesture.Pan()
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

        if (isBracketDrag(event)) {
          runOnJS(handleTPDragEnd)(newPrice, partialPercent);
        } else {
          runOnJS(handleTPClick)();
        }

        tpTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      })
      .onFinalize(() => {
        runOnJS(handleTPSLDragEnd)();
      });
  }, [
    order.brackets,
    baseY,
    viewport,
    dimensions,
    handleTPClick,
    handleTPDragEnd,
    handleTPMove,
    handleTPSLDragEnd,
    tpDragging,
    tpTranslateY,
  ]);

  // SL button drag gesture
  const slPanGesture = useMemo(() => {
    if (!order.brackets) return Gesture.Pan();

    return Gesture.Pan()
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

        if (isBracketDrag(event)) {
          runOnJS(handleSLDragEnd)(newPrice, partialPercent);
        } else {
          runOnJS(handleSLClick)();
        }

        slTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      })
      .onFinalize(() => {
        runOnJS(handleTPSLDragEnd)();
      });
  }, [
    order.brackets,
    baseY,
    viewport,
    dimensions,
    handleSLClick,
    handleSLDragEnd,
    handleSLMove,
    handleTPSLDragEnd,
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
    if (!order.editable) return Gesture.Pan();

    return Gesture.Pan()
      .onStart(() => {
        isDragging.value = true;
        startY.value = translateY.value;
      })
      .onUpdate((event) => {
        // Constrain to vertical only
        translateY.value = startY.value + event.translationY;
        const currentY = baseY + translateY.value;
        const currentPrice = yToPrice(currentY, viewport, dimensions);
        runOnJS(handlePriceMoving)(currentPrice);
      })
      .onEnd(() => {
        isDragging.value = false;
        // Calculate new price from final Y position
        const finalY = baseY + translateY.value;
        const newPrice = yToPrice(finalY, viewport, dimensions);

        // Reset position (callback will update the actual price)
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });

        // Call price change handler
        runOnJS(handlePriceChange)(newPrice);
      });
  }, [
    order.editable,
    baseY,
    viewport,
    dimensions,
    handlePriceChange,
    handlePriceMoving,
    isDragging,
    translateY,
    startY,
  ]);

  // Animated styles for the line container
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Line style based on lineStyle property
  const lineStyle = useMemo(() => {
    // 0=solid, 1=dotted, 2=dashed
    switch (order.lineStyle) {
      case 1:
        return 'dotted';
      case 2:
        return 'dashed';
      default:
        return 'solid';
    }
  }, [order.lineStyle]);

  // Calculate label positioning based on lineLength
  const lineStartX = useMemo(
    () =>
      Math.max(
        dimensions.margins.left,
        MOBILE_CHART_CHROME_METRICS.leftToolRailInset + MOBILE_CHART_CHROME_METRICS.leftToolRailWidth + 2,
      ),
    [dimensions.margins.left],
  );
  const labelX = useMemo(() => {
    // lineLength=100 means line extends full width, label at LEFT edge
    // lineLength=0 means no line extension, label at RIGHT edge (near price axis)
    const maxLabelX = dimensions.width - dimensions.margins.right - 120; // Approximate label width
    const minLabelX = lineStartX;
    return minLabelX + ((maxLabelX - minLabelX) * (100 - order.lineLength)) / 100;
  }, [order.lineLength, dimensions.width, dimensions.margins.right, lineStartX]);
  const lineColor = order.lineColor;
  const takeProfitColor = order.brackets?.takeProfitColor ?? TAKE_PROFIT_COLOR;
  const takeProfitTextColor = order.brackets?.takeProfitTextColor ?? order.bodyTextColor;
  const stopLossColor = order.brackets?.stopLossColor ?? STOP_LOSS_COLOR;
  const stopLossTextColor = order.brackets?.stopLossTextColor ?? order.bodyTextColor;

  // Display text (use narrow if appropriate)
  const displayText = useNarrowText ? order.textShort : order.text;
  const displayQuantity = useNarrowText ? order.quantityShort : order.quantity;

  // Format price for display
  const formattedPrice = safeToFixed(order.price, pricePrecision);

  // Whether to show TP/SL buttons
  const showBrackets = order.brackets !== null;

  return (
    <Animated.View style={[styles.container, { top: baseY - TOUCH_TARGET_HEIGHT / 2 }, animatedContainerStyle]}>
      {/* Horizontal line - left segment (if extendLeft) */}
      {order.extendLeft && (
        <View
          style={[
            styles.lineSegment,
            {
              left: lineStartX,
              width: Math.max(0, labelX - lineStartX - 2),
              top: TOUCH_TARGET_HEIGHT / 2,
              borderBottomColor: lineColor,
              borderBottomWidth: order.lineWidth,
              borderStyle: lineStyle as 'solid' | 'dashed' | 'dotted',
            },
          ]}
        />
      )}

      {/* Invisible drag handle - full width, 44px tall for touch accessibility */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.dragHandle,
            {
              left: labelX,
              width: 100, // Approximate label width - drag handle over label area
              height: TOUCH_TARGET_HEIGHT,
            },
          ]}
        />
      </GestureDetector>

      {/* Label group */}
      <View
        style={[
          styles.labelGroup,
          {
            left: labelX,
            top: (TOUCH_TARGET_HEIGHT - LABEL_HEIGHT) / 2,
          },
        ]}
      >
        {/* Type/Text segment */}
        <View
          style={[
            styles.labelSegment,
            {
              backgroundColor: lineColor,
              borderColor: lineColor,
              borderTopLeftRadius: 2,
              borderBottomLeftRadius: 2,
            },
          ]}
        >
          <Text style={[styles.labelText, { color: order.bodyTextColor }]}>{displayText}</Text>
        </View>

        {/* Quantity segment */}
        <View
          style={[
            styles.labelSegment,
            {
              backgroundColor: lineColor,
              borderColor: lineColor,
              borderLeftWidth: 0,
            },
          ]}
        >
          <Text style={[styles.labelText, { color: order.quantityTextColor }]}>{displayQuantity}</Text>
        </View>

        {/* Cancel button — flush with label segments */}
        {order.cancellable && (
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              {
                backgroundColor: lineColor,
                borderColor: lineColor,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <Text style={[styles.cancelIcon, { color: order.cancelButtonIconColor }]}>
              {order.cancelAsSubmit ? '✓' : '×'}
            </Text>
          </Pressable>
        )}

        {/* TP/SL Buttons (if brackets enabled) — separated by gap */}
        {showBrackets && (
          <View style={styles.bracketButtons}>
            {/* TP Button */}
            <GestureDetector gesture={tpPanGesture}>
              <Animated.View style={[styles.bracketButtonWrapper, tpAnimatedStyle]}>
                <View
                  style={[
                    styles.bracketButton,
                    {
                      backgroundColor: takeProfitColor,
                      borderColor: takeProfitColor,
                    },
                  ]}
                >
                  <Text style={[styles.bracketButtonText, { color: takeProfitTextColor }]}>TP</Text>
                </View>
              </Animated.View>
            </GestureDetector>

            {/* SL Button */}
            <GestureDetector gesture={slPanGesture}>
              <Animated.View style={[styles.bracketButtonWrapper, slAnimatedStyle]}>
                <View
                  style={[
                    styles.bracketButton,
                    {
                      backgroundColor: stopLossColor,
                      borderColor: stopLossColor,
                    },
                  ]}
                >
                  <Text style={[styles.bracketButtonText, { color: stopLossTextColor }]}>SL</Text>
                </View>
              </Animated.View>
            </GestureDetector>
          </View>
        )}
      </View>

      {/* Horizontal line - right segment (from label to price axis) */}
      <View
        style={[
          styles.lineSegment,
          {
            left: labelX + 100 + 2, // After label
            right: dimensions.margins.right + 60, // Before price axis label
            top: TOUCH_TARGET_HEIGHT / 2,
            borderBottomColor: lineColor,
            borderBottomWidth: order.lineWidth,
            borderStyle: lineStyle as 'solid' | 'dashed' | 'dotted',
          },
        ]}
      />

      {/* Price axis label */}
      <View
        style={[
          styles.priceAxisLabel,
          {
            right: 4, // Small padding from edge
            top: (TOUCH_TARGET_HEIGHT - LABEL_HEIGHT * 1.2) / 2,
            backgroundColor: lineColor,
            borderColor: lineColor,
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
    height: TOUCH_TARGET_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineSegment: {
    position: 'absolute',
    height: 0,
    borderBottomWidth: 1,
  },
  dragHandle: {
    position: 'absolute',
    backgroundColor: 'transparent',
    // Cursor not applicable on mobile, but helps with debugging
  },
  labelGroup: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    height: LABEL_HEIGHT,
  },
  labelSegment: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    height: LABEL_HEIGHT,
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 11,
    fontFamily: 'System',
  },
  bracketButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6, // Gap between cancel button and TP/SL buttons
  },
  bracketButtonWrapper: {
    marginLeft: 0,
  },
  bracketButton: {
    width: TP_SL_BUTTON_WIDTH,
    height: LABEL_HEIGHT,
    borderWidth: 1,
    borderLeftWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bracketButtonText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  cancelButton: {
    width: 18,
    height: LABEL_HEIGHT,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  priceAxisLabel: {
    position: 'absolute',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 2,
    minWidth: 50,
    alignItems: 'center',
  },
  priceText: {
    fontSize: 11,
    fontFamily: 'System',
  },
});

export default OrderLineComponent;
