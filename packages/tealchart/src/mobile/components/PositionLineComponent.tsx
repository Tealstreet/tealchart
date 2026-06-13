/**
 * PositionLineComponent - React Native draggable position line
 *
 * Mirrors web's Konva-based PriceLineLayer for position lines:
 * - Horizontal price line showing entry price
 * - Label showing symbol, quantity, entry, PnL
 * - Close button
 * - TP/SL buttons (draggable for bracket orders)
 */

import type { ChartLabelButton, PositionLineRenderData, Viewport } from '../../types';
import type { ChartDimensions } from '../utils/coordinates';

import React, { useCallback, useMemo } from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { safeToFixed } from '../../utils/safeNumber';
import { bracketPartialPercent } from '../utils/bracketPartial';
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
  /** Callback when position is closed (fallback if no adapter callback) */
  onClose?: (positionId: string) => void;
  /** Callback when position is reversed (fallback if no adapter callback) */
  onReverse?: (positionId: string) => void;
  /** Callback when a custom line action is pressed */
  onLineAction?: (lineId: string, actionId: string) => void;
  /** Continuous TP drag move callback (for Skia preview state only) */
  onTPMovePreview?: (positionId: string, price: number) => void;
  /** Continuous SL drag move callback (for Skia preview state only) */
  onSLMovePreview?: (positionId: string, price: number) => void;
  /** Called when any TP/SL drag ends (to clear preview) */
  onTPSLDragEnd?: () => void;
}

const TOUCH_TARGET_HEIGHT = 44;
const LABEL_HEIGHT = 18;
const BASE_LABEL_WIDTH = 180;
const BUILT_IN_ACTION_WIDTH = 18;
const TP_SL_BUTTON_WIDTH = 24;
const BRACKET_BUTTON_GAP = 4;
const PRICE_AXIS_GAP = 60;
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
  onLineAction,
  onTPMovePreview,
  onSLMovePreview,
  onTPSLDragEnd,
}) => {
  // Calculate Y position from price
  const baseY = useMemo(() => priceToY(position.price, viewport, dimensions), [position.price, viewport, dimensions]);

  // Shared values for TP/SL button drag
  const tpTranslateY = useSharedValue(0);
  const slTranslateY = useSharedValue(0);
  const tpDragging = useSharedValue(false);
  const slDragging = useSharedValue(false);

  // Handle close callback — fire directly from adapter callbacks
  const handleClose = useCallback(() => {
    if (position.closeable) {
      if (position.callbacks?.onClose) {
        position.callbacks.onClose();
      } else if (onClose) {
        onClose(position.id);
      }
    }
  }, [onClose, position.id, position.closeable, position.callbacks]);

  // Handle reverse callback — fire directly from adapter callbacks
  const handleReverse = useCallback(() => {
    if (position.reversible) {
      if (position.callbacks?.onReverse) {
        position.callbacks.onReverse();
      } else if (onReverse) {
        onReverse(position.id);
      }
    }
  }, [onReverse, position.id, position.reversible, position.callbacks]);

  const handleLineAction = useCallback(
    (action: ChartLabelButton) => {
      if (action.actionId) {
        onLineAction?.(position.id, action.actionId);
      }
    },
    [onLineAction, position.id],
  );

  // Handle TP click (no drag) — fire directly from adapter callbacks
  const handleTPClick = useCallback(() => {
    position.callbacks?.onTPClick?.();
  }, [position.callbacks]);

  // Handle SL click (no drag) — fire directly from adapter callbacks
  const handleSLClick = useCallback(() => {
    position.callbacks?.onSLClick?.();
  }, [position.callbacks]);

  // Handle TP drag end — fire directly from adapter callbacks
  const handleTPDragEnd = useCallback(
    (newPrice: number, partialPercent?: number) => {
      position.callbacks?.onTPMoveEnd?.(newPrice, partialPercent);
    },
    [position.callbacks],
  );

  // Handle SL drag end — fire directly from adapter callbacks
  const handleSLDragEnd = useCallback(
    (newPrice: number, partialPercent?: number) => {
      position.callbacks?.onSLMoveEnd?.(newPrice, partialPercent);
    },
    [position.callbacks],
  );

  // Handle continuous TP move (for adapter callback + Skia drag preview)
  const handleTPMove = useCallback(
    (price: number, partialPercent: number) => {
      position.callbacks?.onTPMove?.(price, partialPercent);
      onTPMovePreview?.(position.id, price);
    },
    [position.callbacks, onTPMovePreview, position.id],
  );

  // Handle continuous SL move (for adapter callback + Skia drag preview)
  const handleSLMove = useCallback(
    (price: number, partialPercent: number) => {
      position.callbacks?.onSLMove?.(price, partialPercent);
      onSLMovePreview?.(position.id, price);
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
          const partialPercent = bracketPartialPercent(position.partialEnabled === true, event.translationX);
          runOnJS(handleTPMove)(dragPrice, partialPercent);
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
          const partialPercent =
            position.partialEnabled === true ? bracketPartialPercent(true, event.translationX) : undefined;
          runOnJS(handleTPDragEnd)(newPrice, partialPercent);
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
    position.partialEnabled,
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
          const partialPercent = bracketPartialPercent(position.partialEnabled === true, event.translationX);
          runOnJS(handleSLMove)(dragPrice, partialPercent);
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
          const partialPercent =
            position.partialEnabled === true ? bracketPartialPercent(true, event.translationX) : undefined;
          runOnJS(handleSLDragEnd)(newPrice, partialPercent);
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
    position.partialEnabled,
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

  // Whether to show TP/SL buttons
  const showBrackets = position.brackets !== null;
  const customActions = useMemo(
    () => (position.actions ?? []).filter((action) => action.type === 'action' && action.actionId),
    [position.actions],
  );
  const labelGroupWidth = useMemo(
    () =>
      BASE_LABEL_WIDTH +
      (showBrackets ? BRACKET_BUTTON_GAP + TP_SL_BUTTON_WIDTH * 2 : 0) +
      (position.closeable ? BUILT_IN_ACTION_WIDTH : 0) +
      (position.reversible ? BUILT_IN_ACTION_WIDTH : 0) +
      customActions.length * TP_SL_BUTTON_WIDTH,
    [customActions.length, position.closeable, position.reversible, showBrackets],
  );

  // Calculate label positioning based on lineLength
  const labelX = useMemo(() => {
    const minLabelX = dimensions.margins.left;
    const maxLabelX = Math.max(
      minLabelX,
      dimensions.width - dimensions.margins.right - PRICE_AXIS_GAP - labelGroupWidth,
    );
    return minLabelX + ((maxLabelX - minLabelX) * (100 - position.lineLength)) / 100;
  }, [position.lineLength, dimensions, labelGroupWidth]);

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
  const formattedPrice = safeToFixed(position.price, pricePrecision);

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
                borderTopRightRadius: position.reversible || customActions.length > 0 ? 0 : 2,
                borderBottomRightRadius: position.reversible || customActions.length > 0 ? 0 : 2,
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
                borderTopRightRadius: customActions.length > 0 ? 0 : 2,
                borderBottomRightRadius: customActions.length > 0 ? 0 : 2,
              },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <Text style={[styles.actionIcon, { color: position.reverseButtonIconColor }]}>⇄</Text>
          </Pressable>
        )}

        {customActions.map((action, index) => (
          <Pressable
            key={action.actionId}
            onPress={() => handleLineAction(action)}
            style={({ pressed }) => [
              styles.customActionButton,
              {
                backgroundColor: action.backgroundColor,
                borderColor: action.borderColor,
                opacity: pressed ? 0.7 : 1,
                borderTopRightRadius: index === customActions.length - 1 ? 2 : 0,
                borderBottomRightRadius: index === customActions.length - 1 ? 2 : 0,
              },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <Text style={[styles.customActionIcon, { color: action.iconColor }]}>{action.icon}</Text>
          </Pressable>
        ))}
      </View>

      {/* Horizontal line - right segment */}
      <View
        style={[
          styles.lineSegment,
          {
            left: labelX + labelGroupWidth, // After label/actions
            right: dimensions.margins.right + PRICE_AXIS_GAP,
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
  customActionButton: {
    width: TP_SL_BUTTON_WIDTH,
    height: LABEL_HEIGHT,
    borderWidth: 1,
    borderLeftWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customActionIcon: {
    fontSize: 9,
    fontWeight: 'bold',
    lineHeight: 11,
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
