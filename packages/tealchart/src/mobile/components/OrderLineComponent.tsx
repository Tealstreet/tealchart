/**
 * OrderLineComponent - React Native draggable order line
 *
 * Mirrors web's Konva-based PriceLineLayer for order lines:
 * - Horizontal price line with dashed styling
 * - Label showing order type, quantity, price
 * - Cancel button
 * - Invisible 44px drag handle for touch-friendly dragging
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

import type { OrderLineRenderData, Viewport, ChartMargins } from '../../types';
import { priceToY, yToPrice, type ChartDimensions } from '../utils/coordinates';

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
  /** Callback when order price is changed via drag */
  onPriceChange?: (orderId: string, newPrice: number) => void;
  /** Callback when order is cancelled */
  onCancel?: (orderId: string) => void;
}

const TOUCH_TARGET_HEIGHT = 44; // Minimum touch target per accessibility guidelines
const LABEL_HEIGHT = 18;
const CONNECTOR_LINE_THRESHOLD = 3; // Min offset to show connector line

export const OrderLineComponent: React.FC<OrderLineComponentProps> = ({
  order,
  viewport,
  dimensions,
  pricePrecision = 2,
  useNarrowText = false,
  onPriceChange,
  onCancel,
}) => {
  // Calculate Y position from price
  const baseY = useMemo(
    () => priceToY(order.price, viewport, dimensions),
    [order.price, viewport, dimensions]
  );

  // Shared values for drag animation
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const startY = useSharedValue(0);

  // Handle price change callback
  const handlePriceChange = useCallback((newPrice: number) => {
    if (onPriceChange && order.editable) {
      onPriceChange(order.id, newPrice);
    }
  }, [onPriceChange, order.id, order.editable]);

  // Handle cancel callback
  const handleCancel = useCallback(() => {
    if (onCancel && order.cancellable) {
      onCancel(order.id);
    }
  }, [onCancel, order.id, order.cancellable]);

  // Pan gesture for dragging
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
  }, [order.editable, baseY, viewport, dimensions, handlePriceChange, isDragging, translateY, startY]);

  // Animated styles for the line container
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Line style based on lineStyle property
  const lineStyle = useMemo(() => {
    // 0=solid, 1=dotted, 2=dashed
    switch (order.lineStyle) {
      case 1: return 'dotted';
      case 2: return 'dashed';
      default: return 'solid';
    }
  }, [order.lineStyle]);

  // Calculate label positioning based on lineLength
  const chartWidth = dimensions.width - dimensions.margins.left - dimensions.margins.right;
  const labelX = useMemo(() => {
    // lineLength=100 means line extends full width, label at LEFT edge
    // lineLength=0 means no line extension, label at RIGHT edge (near price axis)
    const maxLabelX = dimensions.width - dimensions.margins.right - 120; // Approximate label width
    const minLabelX = dimensions.margins.left;
    return minLabelX + ((maxLabelX - minLabelX) * (100 - order.lineLength) / 100);
  }, [order.lineLength, dimensions]);

  // Display text (use narrow if appropriate)
  const displayText = useNarrowText ? order.textShort : order.text;
  const displayQuantity = useNarrowText ? order.quantityShort : order.quantity;

  // Price axis label position
  const priceAxisLabelX = dimensions.width - dimensions.margins.right;

  // Format price for display
  const formattedPrice = order.price.toFixed(pricePrecision);

  return (
    <Animated.View
      style={[
        styles.container,
        { top: baseY - TOUCH_TARGET_HEIGHT / 2 },
        animatedContainerStyle,
      ]}
    >
      {/* Horizontal line - left segment (if extendLeft) */}
      {order.extendLeft && (
        <View
          style={[
            styles.lineSegment,
            {
              left: dimensions.margins.left,
              width: labelX - dimensions.margins.left - 2,
              top: TOUCH_TARGET_HEIGHT / 2,
              borderBottomColor: order.lineColor,
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
              backgroundColor: order.bodyBackgroundColor,
              borderColor: order.bodyBorderColor,
              borderTopLeftRadius: 2,
              borderBottomLeftRadius: 2,
            },
          ]}
        >
          <Text style={[styles.labelText, { color: order.bodyTextColor }]}>
            {displayText}
          </Text>
        </View>

        {/* Quantity segment */}
        <View
          style={[
            styles.labelSegment,
            {
              backgroundColor: order.quantityBackgroundColor,
              borderColor: order.quantityBorderColor,
              borderLeftWidth: 0,
            },
          ]}
        >
          <Text style={[styles.labelText, { color: order.quantityTextColor }]}>
            {displayQuantity}
          </Text>
        </View>

        {/* Cancel button */}
        {order.cancellable && (
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              {
                backgroundColor: order.cancelButtonBackgroundColor,
                borderColor: order.cancelButtonBorderColor,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <Text style={[styles.cancelIcon, { color: order.cancelButtonIconColor }]}>
              ×
            </Text>
          </Pressable>
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
            borderBottomColor: order.lineColor,
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
            backgroundColor: order.bodyBackgroundColor,
            borderColor: order.lineColor,
          },
        ]}
      >
        <Text style={[styles.priceText, { color: order.bodyTextColor }]}>
          {formattedPrice}
        </Text>
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
