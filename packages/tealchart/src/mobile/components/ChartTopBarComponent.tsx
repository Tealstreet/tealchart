/**
 * ChartTopBarComponent - Top toolbar for mobile chart
 *
 * Contains symbol info, timeframe selector, and indicators button.
 * Matches the web's ChartTopBar styling with React Native components.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';

// Timeframe options matching web
export interface TimeframeOption {
  value: string;
  label: string;
  shortLabel: string;
}

export const AVAILABLE_TIMEFRAMES: TimeframeOption[] = [
  { value: '1', label: '1 minute', shortLabel: '1m' },
  { value: '3', label: '3 minutes', shortLabel: '3m' },
  { value: '5', label: '5 minutes', shortLabel: '5m' },
  { value: '15', label: '15 minutes', shortLabel: '15m' },
  { value: '30', label: '30 minutes', shortLabel: '30m' },
  { value: '60', label: '1 hour', shortLabel: '1h' },
  { value: '240', label: '4 hours', shortLabel: '4h' },
  { value: '1D', label: '1 day', shortLabel: '1D' },
  { value: '1W', label: '1 week', shortLabel: '1W' },
];

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
}

const TOP_BAR_HEIGHT = 36;

export const ChartTopBarComponent: React.FC<ChartTopBarComponentProps> = memo(({
  symbol,
  exchangeName,
  interval,
  onIntervalChange,
  onIndicatorsPress,
  backgroundColor = 'transparent',
  textColor = '#d1d4dc',
  textSecondaryColor = '#787b86',
  accentColor = '#2962ff',
}) => {
  // Handle timeframe selection
  const handleTimeframePress = useCallback((value: string) => {
    onIntervalChange?.(value);
  }, [onIntervalChange]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Symbol display (only shown if symbol is provided) */}
      {symbol ? (
        <>
          <View style={styles.symbolContainer}>
            <Text style={[styles.symbolText, { color: textColor }]}>{symbol}</Text>
            {exchangeName && (
              <Text style={[styles.exchangeText, { color: textSecondaryColor }]}>
                {exchangeName}
              </Text>
            )}
          </View>
          {/* Divider after symbol */}
          <View style={styles.divider} />
        </>
      ) : (
        /* Leading divider when no symbol */
        <View style={styles.divider} />
      )}

      {/* Timeframe selector - horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timeframeContainer}
      >
        {AVAILABLE_TIMEFRAMES.map((tf) => (
          <TimeframeButton
            key={tf.value}
            value={tf.value}
            label={tf.shortLabel}
            isActive={interval === tf.value}
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
        style={({ pressed }) => [
          styles.indicatorsButton,
          pressed && styles.indicatorsButtonPressed,
        ]}
        onPress={onIndicatorsPress}
      >
        <Text style={[styles.indicatorsIcon, { color: textSecondaryColor }]}>ƒ</Text>
        <Text style={[styles.indicatorsText, { color: textSecondaryColor }]}>
          Indicators
        </Text>
      </Pressable>
    </View>
  );
});

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

const TimeframeButton: React.FC<TimeframeButtonProps> = memo(({
  value,
  label,
  isActive,
  onPress,
  textColor,
  accentColor,
}) => {
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
      <Text
        style={[
          styles.timeframeButtonText,
          { color: isActive ? accentColor : textColor },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

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
