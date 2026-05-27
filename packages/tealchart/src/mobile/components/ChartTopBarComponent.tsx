/**
 * ChartTopBarComponent - Top toolbar for mobile chart
 *
 * Contains symbol info, timeframe selector, and indicators button.
 * Matches the web's ChartTopBar styling with React Native components.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AVAILABLE_TIMEFRAMES } from '../../state/chartState';

export interface ChartTopBarComponentProps {
  /** Current symbol (e.g., "BTC/USDT") */
  symbol: string;
  /** Exchange name (e.g., "Binance") */
  exchangeName?: string;
  /** Current selected timeframe */
  interval: string;
  /** Callback when timeframe changes */
  onIntervalChange?: (interval: string) => void;
  /** Callback when indicators button is pressed */
  onIndicatorsPress?: () => void;
  /** Background color (transparent by default) */
  backgroundColor?: string;
  /** Text color for primary text */
  textColor?: string;
  /** Text color for secondary text */
  textSecondaryColor?: string;
  /** Accent color for active states */
  accentColor?: string;
  /** Supported resolutions from datafeed (filters timeframe buttons) */
  supportedResolutions?: string[] | null;
}

const TOP_BAR_HEIGHT = 36;

export const ChartTopBarComponent: React.FC<ChartTopBarComponentProps> = memo(
  ({
    symbol,
    exchangeName,
    interval,
    onIntervalChange,
    onIndicatorsPress,
    backgroundColor = 'transparent',
    textColor = '#d1d4dc',
    textSecondaryColor = '#787b86',
    accentColor = '#2962ff',
    supportedResolutions,
  }) => {
    // Filter timeframes by supported resolutions (if set by datafeed)
    const timeframes = useMemo(() => {
      if (!supportedResolutions || supportedResolutions.length === 0) {
        return AVAILABLE_TIMEFRAMES;
      }
      const filtered = AVAILABLE_TIMEFRAMES.filter((tf) => supportedResolutions.includes(tf.value));
      return filtered.length > 0 ? filtered : AVAILABLE_TIMEFRAMES;
    }, [supportedResolutions]);

    // Internal state for immediate visual feedback (like web's nanostores pattern)
    // This makes the component work both controlled and uncontrolled
    const [internalInterval, setInternalInterval] = useState(interval);

    // Sync internal state when prop changes (controlled mode)
    useEffect(() => {
      setInternalInterval(interval);
    }, [interval]);

    // Handle timeframe selection
    // 1. Update internal state immediately (instant visual feedback)
    // 2. Call external callback (parent can fetch new data, update state, etc.)
    const handleTimeframePress = useCallback(
      (value: string) => {
        setInternalInterval(value); // Immediate visual update
        onIntervalChange?.(value); // Notify parent
      },
      [onIntervalChange],
    );

    return (
      <View style={[styles.container, { backgroundColor }]}>
        {/* Symbol display (only shown if symbol is provided) */}
        {symbol ? (
          <>
            <View style={styles.symbolContainer}>
              <Text style={[styles.symbolText, { color: textColor }]}>{symbol}</Text>
              {exchangeName && <Text style={[styles.exchangeText, { color: textSecondaryColor }]}>{exchangeName}</Text>}
            </View>
            {/* Divider after symbol */}
            <View style={styles.divider} />
          </>
        ) : (
          /* Leading divider when no symbol */
          <View style={styles.divider} />
        )}

        {/* Timeframe selector - horizontal scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeframeContainer}>
          {timeframes.map((tf) => (
            <TimeframeButton
              key={tf.value}
              value={tf.value}
              label={tf.shortLabel}
              isActive={internalInterval === tf.value}
              onPress={handleTimeframePress}
              textColor={textSecondaryColor}
              accentColor={accentColor}
            />
          ))}
        </ScrollView>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Indicators button */}
        <Pressable
          style={({ pressed }) => [styles.indicatorsButton, pressed && styles.indicatorsButtonPressed]}
          onPress={onIndicatorsPress}
        >
          <Text style={[styles.indicatorsIcon, { color: textSecondaryColor }]}>ƒ</Text>
          <Text style={[styles.indicatorsText, { color: textSecondaryColor }]}>Indicators</Text>
        </Pressable>
      </View>
    );
  },
);

ChartTopBarComponent.displayName = 'ChartTopBarComponent';

// =============================================================================
// TimeframeButton sub-component
// =============================================================================

interface TimeframeButtonProps {
  value: string;
  label: string;
  isActive: boolean;
  onPress: (value: string) => void;
  textColor: string;
  accentColor: string;
}

const TimeframeButton: React.FC<TimeframeButtonProps> = memo(
  ({ value, label, isActive, onPress, textColor, accentColor }) => {
    const [isPressed, setIsPressed] = useState(false);

    const handlePress = useCallback(() => {
      onPress(value);
    }, [onPress, value]);

    return (
      <Pressable
        onPress={handlePress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        style={[
          styles.timeframeButton,
          isActive && [styles.timeframeButtonActive, { backgroundColor: `${accentColor}33` }],
          isPressed && !isActive && styles.timeframeButtonPressed,
        ]}
      >
        <Text style={[styles.timeframeButtonText, { color: isActive ? accentColor : textColor }]}>{label}</Text>
      </Pressable>
    );
  },
);

TimeframeButton.displayName = 'TimeframeButton';

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 12,
  },
  symbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  symbolText: {
    fontSize: 13,
    fontWeight: '600',
  },
  exchangeText: {
    fontSize: 11,
    marginLeft: 4,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: '#363a45',
  },
  timeframeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  timeframeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  timeframeButtonActive: {
    // backgroundColor set dynamically with accentColor
  },
  timeframeButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeframeButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  indicatorsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    flexShrink: 0,
  },
  indicatorsButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  indicatorsIcon: {
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '700',
  },
  indicatorsText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ChartTopBarComponent;
