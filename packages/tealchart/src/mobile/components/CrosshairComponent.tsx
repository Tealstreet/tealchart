/**
 * CrosshairComponent - React Native crosshair overlay
 *
 * Shows crosshair lines when user long-presses on chart:
 * - Vertical line (full height, follows X position)
 * - Horizontal line (full width, follows Y position)
 * - Price label at right edge
 * - Time label at bottom edge
 * - Optional "+" button for context menu
 *
 * Uses simple React state for positions to avoid Reanimated worklet issues.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import type { Viewport } from '../../types';
import type { ChartDimensions } from '../utils/coordinates';

export interface CrosshairComponentProps {
  /** X position of crosshair */
  x: number;
  /** Y position of crosshair */
  y: number;
  /** Whether crosshair is visible */
  visible: boolean;
  /** Crosshair color */
  color?: string;
  /** Current viewport for coordinate transforms */
  viewport: Viewport;
  /** Chart dimensions and margins */
  dimensions: ChartDimensions;
  /** Price precision for display */
  pricePrecision?: number;
  /** Whether to show context menu button */
  showContextMenuButton?: boolean;
  /** Callback when context menu button is pressed */
  onContextMenuPress?: (price: number, time: number) => void;
}

const CROSSHAIR_LINE_WIDTH = 1;
const LABEL_HEIGHT = 20;
const LABEL_PADDING_H = 6;
const CONTEXT_BUTTON_SIZE = 18;

export const CrosshairComponent: React.FC<CrosshairComponentProps> = ({
  x,
  y,
  visible,
  color = '#787b86',
  viewport,
  dimensions,
  pricePrecision = 2,
  showContextMenuButton = true,
  onContextMenuPress,
}) => {
  // Chart bounds
  const chartLeft = dimensions.margins.left;
  const chartRight = dimensions.width - dimensions.margins.right;
  const chartTop = dimensions.margins.top;
  const chartBottom = dimensions.height - dimensions.margins.bottom;
  const chartHeight = chartBottom - chartTop;
  const chartWidth = chartRight - chartLeft;

  // Calculate price from Y position
  const price = useMemo(() => {
    const priceRange = viewport.priceMax - viewport.priceMin;
    const ratio = (y - chartTop) / chartHeight;
    return viewport.priceMax - ratio * priceRange;
  }, [y, chartTop, chartHeight, viewport.priceMax, viewport.priceMin]);

  // Calculate time from X position
  const time = useMemo(() => {
    const timeRange = viewport.endTime - viewport.startTime;
    const ratio = (x - chartLeft) / chartWidth;
    return viewport.startTime + ratio * timeRange;
  }, [x, chartLeft, chartWidth, viewport.startTime, viewport.endTime]);

  // Format values for display
  const priceText = price.toFixed(pricePrecision);
  const timeText = useMemo(() => {
    const date = new Date(time);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  }, [time]);

  // Handle context menu button press
  const handleContextMenuPress = () => {
    if (onContextMenuPress) {
      onContextMenuPress(price, time);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Vertical line */}
      <View
        style={[
          styles.verticalLine,
          {
            left: x,
            top: chartTop,
            height: chartBottom - chartTop,
            borderLeftColor: color,
          },
        ]}
        pointerEvents="none"
      />

      {/* Horizontal line */}
      <View
        style={[
          styles.horizontalLine,
          {
            top: y,
            left: chartLeft,
            width: showContextMenuButton
              ? chartRight - chartLeft - CONTEXT_BUTTON_SIZE - 8
              : chartRight - chartLeft,
            borderTopColor: color,
          },
        ]}
        pointerEvents="none"
      />

      {/* Price label (right edge) */}
      <View
        style={[
          styles.priceLabel,
          {
            top: y - LABEL_HEIGHT / 2,
            right: 4,
            backgroundColor: color,
          },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.priceLabelText}>{priceText}</Text>
      </View>

      {/* Time label (bottom edge) */}
      <View
        style={[
          styles.timeLabel,
          {
            top: chartBottom + 2,
            left: x - 50,
            backgroundColor: color,
          },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.timeLabelText}>{timeText}</Text>
      </View>

      {/* Context menu button (+ circle at intersection) */}
      {showContextMenuButton && onContextMenuPress && (
        <Pressable
          onPress={handleContextMenuPress}
          style={[
            styles.contextButton,
            {
              left: x - CONTEXT_BUTTON_SIZE / 2,
              top: y - CONTEXT_BUTTON_SIZE / 2,
              borderColor: color,
            },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.contextButtonText, { color }]}>+</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  verticalLine: {
    position: 'absolute',
    width: 0,
    borderLeftWidth: CROSSHAIR_LINE_WIDTH,
    borderStyle: 'dashed',
  },
  horizontalLine: {
    position: 'absolute',
    height: 0,
    borderTopWidth: CROSSHAIR_LINE_WIDTH,
    borderStyle: 'dashed',
  },
  priceLabel: {
    position: 'absolute',
    height: LABEL_HEIGHT,
    paddingHorizontal: LABEL_PADDING_H,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  priceLabelText: {
    fontSize: 11,
    fontFamily: 'System',
    color: '#000000',
    fontWeight: '500',
  },
  timeLabel: {
    position: 'absolute',
    height: LABEL_HEIGHT,
    paddingHorizontal: LABEL_PADDING_H,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  timeLabelText: {
    fontSize: 11,
    fontFamily: 'System',
    color: '#000000',
    fontWeight: '500',
  },
  contextButton: {
    position: 'absolute',
    width: CONTEXT_BUTTON_SIZE,
    height: CONTEXT_BUTTON_SIZE,
    borderRadius: CONTEXT_BUTTON_SIZE / 2,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
});

export default CrosshairComponent;
