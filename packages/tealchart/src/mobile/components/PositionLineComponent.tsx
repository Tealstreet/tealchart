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

import React, { useCallback, useMemo } from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { priceToY, yToPrice } from '../utils/coordinates';

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
  /** Callback when position is closed */
  onClose?: (positionId: string) => void;
  /** Callback when position is reversed */
  onReverse?: (positionId: string) => void;
  /** Callback when TP button is clicked */
  onTPClick?: (positionId: string) => void;
  /** Callback when SL button is clicked */
  onSLClick?: (positionId: string) => void;
  /** Callback when TP is dragged to new price */
  onTPDragEnd?: (positionId: string, price: number, partialPercent?: number) => void;
  /** Callback when SL is dragged to new price */
  onSLDragEnd?: (positionId: string, price: number, partialPercent?: number) => void;
  /** Continuous TP drag move callback (for Skia preview) */
  onTPMove?: (positionId: string, price: number) => void;
  /** Continuous SL drag move callback (for Skia preview) */
  onSLMove?: (positionId: string, price: number) => void;
  /** Called when any TP/SL drag ends (to clear preview) */
  onTPSLDragEnd?: () => void;
}

const TOUCH_TARGET_HEIGHT = 44;
const LABEL_HEIGHT = 18;
const TP_SL_BUTTON_WIDTH = 24;
const TP_COLOR = '#22c55e'; // Green for take profit
const SL_COLOR = '#f97316'; // Orange for stop loss

export const PositionLineComponent: React.FC<PositionLineComponentProps> = ({
  position,
  viewport,
  dimensions,
  pricePrecision = 2,
  useNarrowText = false,
  onClose,
  onReverse,
  onTPClick,
  onSLClick,
  onTPDragEnd,
  onSLDragEnd,
  onTPMove,
  onSLMove,
  onTPSLDragEnd,
}) => {
  // Calculate Y position from price
  const baseY = useMemo(() => priceToY(position.price, viewport, dimensions), [position.price, viewport, dimensions]);

  // Shared values for TP/SL button drag
  const tpTranslateY = useSharedValue(0);
  const slTranslateY = useSharedValue(0);
  const tpDragging = useSharedValue(false);
  const slDragging = useSharedValue(false);

  // Handle close callback
  const handleClose = useCallback(() => {
    if (onClose && position.closeable) {
      onClose(position.id);
    }
  }, [onClose, position.id, position.closeable]);

  // Handle reverse callback
  const handleReverse = useCallback(() => {
    if (onReverse && position.reversible) {
      onReverse(position.id);
    }
  }, [onReverse, position.id, position.reversible]);

  // Handle TP click (no drag)
  const handleTPClick = useCallback(() => {
    if (onTPClick) {
      onTPClick(position.id);
    }
  }, [onTPClick, position.id]);

  // Handle SL click (no drag)
  const handleSLClick = useCallback(() => {
    if (onSLClick) {
      onSLClick(position.id);
    }
  }, [onSLClick, position.id]);

  // Handle TP drag end
  const handleTPDragEnd = useCallback(
    (newPrice: number) => {
      if (onTPDragEnd) {
        onTPDragEnd(position.id, newPrice);
      }
    },
    [onTPDragEnd, position.id],
  );

  // Handle SL drag end
  const handleSLDragEnd = useCallback(
    (newPrice: number) => {
      if (onSLDragEnd) {
        onSLDragEnd(position.id, newPrice);
      }
    },
    [onSLDragEnd, position.id],
  );

  // Handle continuous TP move (for Skia drag preview)
  const handleTPMove = useCallback(
    (price: number) => {
      if (onTPMove) {
        onTPMove(position.id, price);
      }
    },
    [onTPMove, position.id],
  );

  // Handle continuous SL move (for Skia drag preview)
  const handleSLMove = useCallback(
    (price: number) => {
      if (onSLMove) {
        onSLMove(position.id, price);
      }
    },
    [onSLMove, position.id],
  );

  // Handle TP/SL drag end (clear preview)
  const handleTPSLDragEnd = useCallback(() => {
    if (onTPSLDragEnd) {
      onTPSLDragEnd();
    }
  }, [onTPSLDragEnd]);

  // TP button drag gesture
  const tpPanGesture = useMemo(() => {
    if (!position.brackets) return Gesture.Pan();

    return Gesture.Pan()
      .onStart(() => {
        tpDragging.value = true;
      })
      .onUpdate((event) => {
        tpTranslateY.value = event.translationY;
        // Emit continuous move for Skia drag preview (only after drag threshold)
        if (Math.abs(event.translationY) >= 5) {
          const dragPrice = yToPrice(baseY + event.translationY, viewport, dimensions);
          runOnJS(handleTPMove)(dragPrice);
        }
      })
      .onEnd((event) => {
        tpDragging.value = false;
        const finalY = baseY + event.translationY;
        const newPrice = yToPrice(finalY, viewport, dimensions);

        // Clear Skia drag preview
        runOnJS(handleTPSLDragEnd)();

        // Check if this was a tap vs drag
        if (Math.abs(event.translationY) < 5) {
          runOnJS(handleTPClick)();
        } else {
          runOnJS(handleTPDragEnd)(newPrice);
        }

        tpTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      })
      .onFinalize(() => {
        // Ensure preview is cleared even if gesture is cancelled
        runOnJS(handleTPSLDragEnd)();
      });
  }, [
    position.brackets,
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
    if (!position.brackets) return Gesture.Pan();

    return Gesture.Pan()
      .onStart(() => {
        slDragging.value = true;
      })
      .onUpdate((event) => {
        slTranslateY.value = event.translationY;
        // Emit continuous move for Skia drag preview (only after drag threshold)
        if (Math.abs(event.translationY) >= 5) {
          const dragPrice = yToPrice(baseY + event.translationY, viewport, dimensions);
          runOnJS(handleSLMove)(dragPrice);
        }
      })
      .onEnd((event) => {
        slDragging.value = false;
        const finalY = baseY + event.translationY;
        const newPrice = yToPrice(finalY, viewport, dimensions);

        // Clear Skia drag preview
        runOnJS(handleTPSLDragEnd)();

        // Check if this was a tap vs drag
        if (Math.abs(event.translationY) < 5) {
          runOnJS(handleSLClick)();
        } else {
          runOnJS(handleSLDragEnd)(newPrice);
        }

        slTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      })
      .onFinalize(() => {
        // Ensure preview is cleared even if gesture is cancelled
        runOnJS(handleTPSLDragEnd)();
      });
  }, [
    position.brackets,
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

  // Line style based on lineStyle property
  const lineStyle = useMemo(() => {
    switch (position.lineStyle) {
      case 1:
        return 'dotted';
      case 2:
        return 'dashed';
      default:
        return 'solid';
    }
  }, [position.lineStyle]);

  // Calculate label positioning based on lineLength
  const labelX = useMemo(() => {
    const maxLabelX = dimensions.width - dimensions.margins.right - 150;
    const minLabelX = dimensions.margins.left;
    return minLabelX + ((maxLabelX - minLabelX) * (100 - position.lineLength)) / 100;
  }, [position.lineLength, dimensions]);

  // Display text (use narrow if appropriate)
  const displayText = useNarrowText ? position.textShort : position.text;
  const displayQuantity = useNarrowText ? position.quantityShort : position.quantity;
  const displayPnl = useNarrowText ? position.pnlShort : position.pnl;

  // PnL color based on profit state
  const pnlColor = useMemo(() => {
    switch (position.profitState) {
      case 'positive':
        return '#22c55e';
      case 'negative':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  }, [position.profitState]);

  // Format price for display
  const formattedPrice = position.price.toFixed(pricePrecision);

  // Whether to show TP/SL buttons
  const showBrackets = position.brackets !== null;

  return (
    <View style={[styles.container, { top: baseY - TOUCH_TARGET_HEIGHT / 2 }]}>
      {/* Horizontal line - left segment (if extendLeft) */}
      {position.extendLeft && (
        <View
          style={[
            styles.lineSegment,
            {
              left: dimensions.margins.left,
              width: labelX - dimensions.margins.left - 2,
              top: TOUCH_TARGET_HEIGHT / 2,
              borderBottomColor: position.lineColor,
              borderBottomWidth: position.lineWidth,
              borderStyle: lineStyle as 'solid' | 'dashed' | 'dotted',
            },
          ]}
        />
      )}

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
        {/* Symbol/Text segment */}
        <View
          style={[
            styles.labelSegment,
            {
              backgroundColor: position.bodyBackgroundColor,
              borderColor: position.bodyBorderColor,
              borderTopLeftRadius: 2,
              borderBottomLeftRadius: 2,
            },
          ]}
        >
          <Text style={[styles.labelText, { color: position.bodyTextColor }]}>{displayText}</Text>
        </View>

        {/* Quantity segment */}
        <View
          style={[
            styles.labelSegment,
            {
              backgroundColor: position.quantityBackgroundColor,
              borderColor: position.quantityBorderColor,
              borderLeftWidth: 0,
            },
          ]}
        >
          <Text style={[styles.labelText, { color: position.quantityTextColor }]}>{displayQuantity}</Text>
        </View>

        {/* PnL segment */}
        <View
          style={[
            styles.labelSegment,
            {
              backgroundColor: position.bodyBackgroundColor,
              borderColor: position.bodyBorderColor,
              borderLeftWidth: 0,
            },
          ]}
        >
          <Text style={[styles.labelText, { color: pnlColor }]}>{displayPnl}</Text>
        </View>

        {/* TP/SL Buttons (if brackets enabled) */}
        {showBrackets && (
          <View style={styles.bracketButtons}>
            {/* TP Button */}
            <GestureDetector gesture={tpPanGesture}>
              <Animated.View style={[styles.bracketButtonWrapper, tpAnimatedStyle]}>
                <Pressable
                  style={[
                    styles.bracketButton,
                    {
                      backgroundColor: '#1e222d',
                      borderColor: TP_COLOR,
                      borderTopLeftRadius: 2,
                      borderBottomLeftRadius: 2,
                    },
                  ]}
                >
                  <Text style={[styles.bracketButtonText, { color: TP_COLOR }]}>TP</Text>
                </Pressable>
              </Animated.View>
            </GestureDetector>

            {/* SL Button */}
            <GestureDetector gesture={slPanGesture}>
              <Animated.View style={[styles.bracketButtonWrapper, slAnimatedStyle]}>
                <Pressable
                  style={[
                    styles.bracketButton,
                    {
                      backgroundColor: '#1e222d',
                      borderColor: SL_COLOR,
                      borderTopRightRadius: 2,
                      borderBottomRightRadius: 2,
                      borderLeftWidth: 0,
                    },
                  ]}
                >
                  <Text style={[styles.bracketButtonText, { color: SL_COLOR }]}>SL</Text>
                </Pressable>
              </Animated.View>
            </GestureDetector>
          </View>
        )}

        {/* Close button */}
        {position.closeable && (
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: position.closeButtonBackgroundColor,
                borderColor: position.closeButtonBorderColor,
                opacity: pressed ? 0.7 : 1,
                borderTopRightRadius: position.reversible ? 0 : 2,
                borderBottomRightRadius: position.reversible ? 0 : 2,
              },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <Text style={[styles.actionIcon, { color: position.closeButtonIconColor }]}>×</Text>
          </Pressable>
        )}

        {/* Reverse button */}
        {position.reversible && (
          <Pressable
            onPress={handleReverse}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: position.reverseButtonBackgroundColor,
                borderColor: position.reverseButtonBorderColor,
                borderLeftWidth: 0,
                opacity: pressed ? 0.7 : 1,
                borderTopRightRadius: 2,
                borderBottomRightRadius: 2,
              },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <Text style={[styles.actionIcon, { color: position.reverseButtonIconColor }]}>⇄</Text>
          </Pressable>
        )}
      </View>

      {/* Horizontal line - right segment */}
      <View
        style={[
          styles.lineSegment,
          {
            left: labelX + 180, // After label
            right: dimensions.margins.right + 60,
            top: TOUCH_TARGET_HEIGHT / 2,
            borderBottomColor: position.lineColor,
            borderBottomWidth: position.lineWidth,
            borderStyle: lineStyle as 'solid' | 'dashed' | 'dotted',
          },
        ]}
      />

      {/* Price axis label */}
      <View
        style={[
          styles.priceAxisLabel,
          {
            right: 4,
            top: (TOUCH_TARGET_HEIGHT - LABEL_HEIGHT * 1.2) / 2,
            backgroundColor: position.bodyBackgroundColor,
            borderColor: position.lineColor,
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
    height: TOUCH_TARGET_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineSegment: {
    position: 'absolute',
    height: 0,
    borderBottomWidth: 1,
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
    marginLeft: 4,
  },
  bracketButtonWrapper: {
    height: LABEL_HEIGHT,
  },
  bracketButton: {
    width: TP_SL_BUTTON_WIDTH,
    height: LABEL_HEIGHT,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bracketButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButton: {
    width: 18,
    height: LABEL_HEIGHT,
    borderWidth: 1,
    borderLeftWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
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

export default PositionLineComponent;
