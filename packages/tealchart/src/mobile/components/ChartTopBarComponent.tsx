/**
 * ChartTopBarComponent - Top toolbar for mobile chart
 *
 * Contains symbol info, timeframe selector, and indicators button.
 * Matches the web's ChartTopBar styling with React Native components.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type {
  UserDrawingIconName,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTextAlign,
  UserDrawingTool,
  UserDrawingZOrderAction,
} from '../../drawings';

import {
  getSelectedUserDrawing,
  getUserDrawingZOrderAction,
  isUserDrawingToolbarActionEnabled,
  isUserDrawingFillToolbarEnabled,
  isUserDrawingIconToolbarEnabled,
  isUserDrawingStyleToolbarEnabled,
  isUserDrawingTextToolbarEnabled,
  isUserDrawingTextAnnotation,
  resolveUserDrawingStyleToolbarAction,
  supportsUserDrawingFillControls,
  supportsUserDrawingIconControls,
  supportsUserDrawingTextAlignControls,
  supportsUserDrawingTextStyleControls,
  USER_DRAWING_FILL_COLOR_DESCRIPTORS,
  USER_DRAWING_FONT_FAMILY_DESCRIPTORS,
  USER_DRAWING_FONT_SIZE_DESCRIPTORS,
  USER_DRAWING_FONT_WEIGHT_DESCRIPTORS,
  USER_DRAWING_ICON_NAME_DESCRIPTORS,
  USER_DRAWING_LINE_COLOR_DESCRIPTORS,
  USER_DRAWING_LINE_STYLE_DESCRIPTORS,
  USER_DRAWING_LINE_WIDTH_DESCRIPTORS,
  USER_DRAWING_OPACITY_DESCRIPTORS,
  USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS,
  USER_DRAWING_STYLE_TOOLBAR_ACTION_DESCRIPTORS,
  USER_DRAWING_TEXT_ALIGN_DESCRIPTORS,
  USER_DRAWING_TEXT_COLOR_DESCRIPTORS,
  USER_DRAWING_TOOL_DESCRIPTORS,
  USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS,
} from '../../drawings';
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
  /** Current user drawing state for toolbar highlighting and action availability */
  userDrawingState?: UserDrawingState;
  /** Callback when a drawing tool is selected */
  onUserDrawingToolSelect?: (tool: UserDrawingTool) => void;
  /** Callback when the selected drawing should be duplicated */
  onUserDrawingDuplicateSelected?: () => void;
  /** Callback when the selected drawing should be deleted */
  onUserDrawingDeleteSelected?: () => void;
  /** Callback when the active drawing draft should be cancelled */
  onUserDrawingCancelDraft?: () => void;
  /** Callback when all user drawings should be cleared */
  onUserDrawingClearAll?: () => void;
  /** Callback when selected drawings should be reordered */
  onUserDrawingZOrderChange?: (action: UserDrawingZOrderAction) => void;
  /** Callback when selected drawing style should change */
  onUserDrawingStyleChange?: (style: Partial<UserDrawingStyle>) => void;
  /** Callback when selected text-label alignment should change */
  onUserDrawingTextAlignChange?: (textAlign: UserDrawingTextAlign) => void;
  /** Callback when selected icon marker shape should change */
  onUserDrawingIconNameChange?: (iconName: UserDrawingIconName) => void;
  /** Callback when selected drawing visibility should change */
  onUserDrawingVisibilityChange?: (visible: boolean) => void;
  /** Callback when selected drawing locked state should change */
  onUserDrawingLockedChange?: (locked: boolean, includeLocked?: boolean) => void;
}

const TOP_BAR_HEIGHT = 36;
type PressableStyleState = { pressed: boolean };

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
    userDrawingState,
    onUserDrawingToolSelect,
    onUserDrawingDuplicateSelected,
    onUserDrawingDeleteSelected,
    onUserDrawingCancelDraft,
    onUserDrawingClearAll,
    onUserDrawingZOrderChange,
    onUserDrawingStyleChange,
    onUserDrawingTextAlignChange,
    onUserDrawingIconNameChange,
    onUserDrawingVisibilityChange,
    onUserDrawingLockedChange,
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

    const selectedDrawing = userDrawingState ? getSelectedUserDrawing(userDrawingState) : null;
    const styleControlsEnabled = userDrawingState ? isUserDrawingStyleToolbarEnabled(userDrawingState) : false;
    const fillControlsEnabled = userDrawingState ? isUserDrawingFillToolbarEnabled(userDrawingState) : false;
    const iconControlsEnabled = userDrawingState ? isUserDrawingIconToolbarEnabled(userDrawingState) : false;
    const textControlsEnabled = userDrawingState ? isUserDrawingTextToolbarEnabled(userDrawingState) : false;
    const fillControlsSupported = selectedDrawing ? supportsUserDrawingFillControls(selectedDrawing) : false;
    const iconControlsSupported = selectedDrawing ? supportsUserDrawingIconControls(selectedDrawing) : false;
    const textStyleControlsSupported = selectedDrawing ? supportsUserDrawingTextStyleControls(selectedDrawing) : false;
    const textAlignControlsSupported = selectedDrawing ? supportsUserDrawingTextAlignControls(selectedDrawing) : false;

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
          style={({ pressed }: PressableStyleState) => [
            styles.indicatorsButton,
            pressed && styles.indicatorsButtonPressed,
          ]}
          onPress={onIndicatorsPress}
        >
          <Text style={[styles.indicatorsIcon, { color: textSecondaryColor }]}>ƒ</Text>
          <Text style={[styles.indicatorsText, { color: textSecondaryColor }]}>Indicators</Text>
        </Pressable>

        {userDrawingState && (
          <>
            <View style={styles.divider} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.drawingContainer}
            >
              {USER_DRAWING_TOOL_DESCRIPTORS.map((descriptor) => (
                <Pressable
                  key={descriptor.tool}
                  accessibilityRole="button"
                  accessibilityLabel={descriptor.label}
                  accessibilityState={{ selected: userDrawingState.activeTool === descriptor.tool }}
                  onPress={() => onUserDrawingToolSelect?.(descriptor.tool)}
                  style={({ pressed }: PressableStyleState) => [
                    styles.drawingButton,
                    userDrawingState.activeTool === descriptor.tool && [
                      styles.drawingButtonActive,
                      { backgroundColor: `${accentColor}33` },
                    ],
                    pressed && userDrawingState.activeTool !== descriptor.tool && styles.drawingButtonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.drawingButtonText,
                      { color: userDrawingState.activeTool === descriptor.tool ? accentColor : textSecondaryColor },
                    ]}
                  >
                    {descriptor.icon}
                  </Text>
                </Pressable>
              ))}

              <View style={styles.innerDivider} />

              {selectedDrawing && (
                <>
                  {USER_DRAWING_LINE_COLOR_DESCRIPTORS.map((descriptor) => {
                    const active = selectedDrawing.style.lineColor.toLowerCase() === descriptor.color.toLowerCase();
                    return (
                      <Pressable
                        key={descriptor.color}
                        accessibilityRole="button"
                        accessibilityLabel={descriptor.label}
                        accessibilityState={{ disabled: !styleControlsEnabled, selected: active }}
                        disabled={!styleControlsEnabled}
                        onPress={() => onUserDrawingStyleChange?.({ lineColor: descriptor.color })}
                        style={[
                          styles.drawingSwatchButton,
                          { backgroundColor: descriptor.color },
                          active && [styles.drawingSwatchButtonActive, { borderColor: accentColor }],
                          !styleControlsEnabled && styles.drawingButtonDisabled,
                        ]}
                      />
                    );
                  })}

                  <View style={styles.innerDivider} />

                  {USER_DRAWING_LINE_WIDTH_DESCRIPTORS.map((descriptor) => {
                    const active = selectedDrawing.style.lineWidth === descriptor.width;
                    return (
                      <Pressable
                        key={descriptor.width}
                        accessibilityRole="button"
                        accessibilityLabel={descriptor.label}
                        accessibilityState={{ disabled: !styleControlsEnabled, selected: active }}
                        disabled={!styleControlsEnabled}
                        onPress={() => onUserDrawingStyleChange?.({ lineWidth: descriptor.width })}
                        style={({ pressed }: PressableStyleState) => [
                          styles.drawingButton,
                          active && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                          styleControlsEnabled && pressed && !active && styles.drawingButtonPressed,
                          !styleControlsEnabled && styles.drawingButtonDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.drawingButtonText,
                            { color: active ? accentColor : textSecondaryColor, fontSize: 10 + descriptor.width },
                          ]}
                        >
                          ━
                        </Text>
                      </Pressable>
                    );
                  })}

                  {USER_DRAWING_LINE_STYLE_DESCRIPTORS.map((descriptor) => {
                    const active = selectedDrawing.style.lineStyle === descriptor.lineStyle;
                    return (
                      <Pressable
                        key={descriptor.lineStyle}
                        accessibilityRole="button"
                        accessibilityLabel={descriptor.label}
                        accessibilityState={{ disabled: !styleControlsEnabled, selected: active }}
                        disabled={!styleControlsEnabled}
                        onPress={() => onUserDrawingStyleChange?.({ lineStyle: descriptor.lineStyle })}
                        style={({ pressed }: PressableStyleState) => [
                          styles.drawingButton,
                          active && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                          styleControlsEnabled && pressed && !active && styles.drawingButtonPressed,
                          !styleControlsEnabled && styles.drawingButtonDisabled,
                        ]}
                      >
                        <Text style={[styles.drawingButtonText, { color: active ? accentColor : textSecondaryColor }]}>
                          {descriptor.icon}
                        </Text>
                      </Pressable>
                    );
                  })}

                  {USER_DRAWING_OPACITY_DESCRIPTORS.map((descriptor) => {
                    const active = (selectedDrawing.style.opacity ?? 1) === descriptor.opacity;
                    return (
                      <Pressable
                        key={descriptor.opacity}
                        accessibilityRole="button"
                        accessibilityLabel={descriptor.label}
                        accessibilityState={{ disabled: !styleControlsEnabled, selected: active }}
                        disabled={!styleControlsEnabled}
                        onPress={() => onUserDrawingStyleChange?.({ opacity: descriptor.opacity })}
                        style={({ pressed }: PressableStyleState) => [
                          styles.drawingButton,
                          active && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                          styleControlsEnabled && pressed && !active && styles.drawingButtonPressed,
                          !styleControlsEnabled && styles.drawingButtonDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.drawingButtonText,
                            { color: active ? accentColor : textSecondaryColor, fontSize: 10 },
                          ]}
                        >
                          {Math.round(descriptor.opacity * 100)}
                        </Text>
                      </Pressable>
                    );
                  })}

                  {USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS.filter(
                    (descriptor) => descriptor.style === 'lineVisible',
                  ).map((descriptor) => {
                    const active = selectedDrawing.style.lineVisible !== false;
                    return (
                      <Pressable
                        key={descriptor.style}
                        accessibilityRole="button"
                        accessibilityLabel={descriptor.label}
                        accessibilityState={{ disabled: !styleControlsEnabled, selected: active }}
                        disabled={!styleControlsEnabled}
                        onPress={() => onUserDrawingStyleChange?.({ lineVisible: !active })}
                        style={({ pressed }: PressableStyleState) => [
                          styles.drawingButton,
                          active && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                          styleControlsEnabled && pressed && !active && styles.drawingButtonPressed,
                          !styleControlsEnabled && styles.drawingButtonDisabled,
                        ]}
                      >
                        <Text style={[styles.drawingButtonText, { color: active ? accentColor : textSecondaryColor }]}>
                          {descriptor.icon}
                        </Text>
                      </Pressable>
                    );
                  })}

                  <View style={styles.innerDivider} />

                  {fillControlsSupported && (
                    <>
                      {USER_DRAWING_FILL_COLOR_DESCRIPTORS.map((descriptor) => {
                        const active =
                          selectedDrawing.style.fillColor?.toLowerCase() === descriptor.fillColor.toLowerCase();
                        return (
                          <Pressable
                            key={descriptor.fillColor}
                            accessibilityRole="button"
                            accessibilityLabel={descriptor.label}
                            accessibilityState={{ disabled: !fillControlsEnabled, selected: active }}
                            disabled={!fillControlsEnabled}
                            onPress={() => onUserDrawingStyleChange?.({ fillColor: descriptor.fillColor })}
                            style={[
                              styles.drawingSwatchButton,
                              { backgroundColor: descriptor.fillColor },
                              active && [styles.drawingSwatchButtonActive, { borderColor: accentColor }],
                              !fillControlsEnabled && styles.drawingButtonDisabled,
                            ]}
                          />
                        );
                      })}

                      {USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS.filter(
                        (descriptor) => descriptor.style === 'fillVisible',
                      ).map((descriptor) => {
                        const active = selectedDrawing.style.fillVisible !== false;
                        return (
                          <Pressable
                            key={descriptor.style}
                            accessibilityRole="button"
                            accessibilityLabel={descriptor.label}
                            accessibilityState={{ disabled: !fillControlsEnabled, selected: active }}
                            disabled={!fillControlsEnabled}
                            onPress={() => onUserDrawingStyleChange?.({ fillVisible: !active })}
                            style={({ pressed }: PressableStyleState) => [
                              styles.drawingButton,
                              active && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                              fillControlsEnabled && pressed && !active && styles.drawingButtonPressed,
                              !fillControlsEnabled && styles.drawingButtonDisabled,
                            ]}
                          >
                            <Text
                              style={[styles.drawingButtonText, { color: active ? accentColor : textSecondaryColor }]}
                            >
                              {descriptor.icon}
                            </Text>
                          </Pressable>
                        );
                      })}

                      <View style={styles.innerDivider} />
                    </>
                  )}

                  {iconControlsSupported && (
                    <>
                      {USER_DRAWING_ICON_NAME_DESCRIPTORS.map((descriptor) => {
                        const active = selectedDrawing.kind === 'icon' && selectedDrawing.iconName === descriptor.iconName;
                        return (
                          <Pressable
                            key={descriptor.iconName}
                            accessibilityRole="button"
                            accessibilityLabel={descriptor.label}
                            accessibilityState={{ disabled: !iconControlsEnabled, selected: active }}
                            disabled={!iconControlsEnabled}
                            onPress={() => onUserDrawingIconNameChange?.(descriptor.iconName)}
                            style={({ pressed }: PressableStyleState) => [
                              styles.drawingButton,
                              active && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                              iconControlsEnabled && pressed && !active && styles.drawingButtonPressed,
                              !iconControlsEnabled && styles.drawingButtonDisabled,
                            ]}
                          >
                            <Text style={[styles.drawingButtonText, { color: active ? accentColor : textSecondaryColor }]}>
                              {descriptor.icon}
                            </Text>
                          </Pressable>
                        );
                      })}

                      <View style={styles.innerDivider} />
                    </>
                  )}

                  {textStyleControlsSupported && (
                    <>
                      {USER_DRAWING_TEXT_COLOR_DESCRIPTORS.map((descriptor) => {
                        const active =
                          selectedDrawing.style.textColor?.toLowerCase() === descriptor.textColor.toLowerCase();
                        return (
                          <Pressable
                            key={descriptor.textColor}
                            accessibilityRole="button"
                            accessibilityLabel={descriptor.label}
                            accessibilityState={{ disabled: !textControlsEnabled, selected: active }}
                            disabled={!textControlsEnabled}
                            onPress={() => onUserDrawingStyleChange?.({ textColor: descriptor.textColor })}
                            style={[
                              styles.drawingSwatchButton,
                              { backgroundColor: descriptor.textColor },
                              active && [styles.drawingSwatchButtonActive, { borderColor: accentColor }],
                              !textControlsEnabled && styles.drawingButtonDisabled,
                            ]}
                          />
                        );
                      })}

                      {USER_DRAWING_FONT_SIZE_DESCRIPTORS.map((descriptor) => {
                        const active = selectedDrawing.style.fontSize === descriptor.fontSize;
                        return (
                          <Pressable
                            key={descriptor.fontSize}
                            accessibilityRole="button"
                            accessibilityLabel={descriptor.label}
                            accessibilityState={{ disabled: !textControlsEnabled, selected: active }}
                            disabled={!textControlsEnabled}
                            onPress={() => onUserDrawingStyleChange?.({ fontSize: descriptor.fontSize })}
                            style={({ pressed }: PressableStyleState) => [
                              styles.drawingButton,
                              active && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                              textControlsEnabled && pressed && !active && styles.drawingButtonPressed,
                              !textControlsEnabled && styles.drawingButtonDisabled,
                            ]}
                          >
                            <Text
                              style={[
                                styles.drawingButtonText,
                                { color: active ? accentColor : textSecondaryColor, fontSize: 11 },
                              ]}
                            >
                              {descriptor.fontSize}
                            </Text>
                          </Pressable>
                        );
                      })}

                      {USER_DRAWING_FONT_FAMILY_DESCRIPTORS.map((descriptor) => {
                        const active = (selectedDrawing.style.fontFamily ?? 'sans-serif') === descriptor.fontFamily;
                        return (
                          <Pressable
                            key={descriptor.fontFamily}
                            accessibilityRole="button"
                            accessibilityLabel={descriptor.label}
                            accessibilityState={{ disabled: !textControlsEnabled, selected: active }}
                            disabled={!textControlsEnabled}
                            onPress={() => onUserDrawingStyleChange?.({ fontFamily: descriptor.fontFamily })}
                            style={({ pressed }: PressableStyleState) => [
                              styles.drawingButton,
                              active && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                              textControlsEnabled && pressed && !active && styles.drawingButtonPressed,
                              !textControlsEnabled && styles.drawingButtonDisabled,
                            ]}
                          >
                            <Text
                              style={[
                                styles.drawingButtonText,
                                { color: active ? accentColor : textSecondaryColor, fontSize: 11 },
                              ]}
                            >
                              {descriptor.icon}
                            </Text>
                          </Pressable>
                        );
                      })}

                      {USER_DRAWING_FONT_WEIGHT_DESCRIPTORS.map((descriptor) => {
                        const active = (selectedDrawing.style.fontWeight ?? 'normal') === descriptor.fontWeight;
                        return (
                          <Pressable
                            key={descriptor.fontWeight}
                            accessibilityRole="button"
                            accessibilityLabel={descriptor.label}
                            accessibilityState={{ disabled: !textControlsEnabled, selected: active }}
                            disabled={!textControlsEnabled}
                            onPress={() => onUserDrawingStyleChange?.({ fontWeight: descriptor.fontWeight })}
                            style={({ pressed }: PressableStyleState) => [
                              styles.drawingButton,
                              active && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                              textControlsEnabled && pressed && !active && styles.drawingButtonPressed,
                              !textControlsEnabled && styles.drawingButtonDisabled,
                            ]}
                          >
                            <Text
                              style={[
                                styles.drawingButtonText,
                                {
                                  color: active ? accentColor : textSecondaryColor,
                                  fontSize: 11,
                                  fontWeight: descriptor.fontWeight === 'bold' ? '700' : '400',
                                },
                              ]}
                            >
                              {descriptor.icon}
                            </Text>
                          </Pressable>
                        );
                      })}

                      {textAlignControlsSupported &&
                        USER_DRAWING_TEXT_ALIGN_DESCRIPTORS.map((descriptor) => {
                          const active =
                            (selectedDrawing.kind === 'table' || isUserDrawingTextAnnotation(selectedDrawing)) &&
                            selectedDrawing.textAlign === descriptor.textAlign;
                          return (
                            <Pressable
                              key={descriptor.textAlign}
                              accessibilityRole="button"
                              accessibilityLabel={descriptor.label}
                              accessibilityState={{ disabled: !textControlsEnabled, selected: active }}
                              disabled={!textControlsEnabled}
                              onPress={() => onUserDrawingTextAlignChange?.(descriptor.textAlign)}
                              style={({ pressed }: PressableStyleState) => [
                                styles.drawingButton,
                                active && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                                textControlsEnabled && pressed && !active && styles.drawingButtonPressed,
                                !textControlsEnabled && styles.drawingButtonDisabled,
                              ]}
                            >
                              <Text
                                style={[styles.drawingButtonText, { color: active ? accentColor : textSecondaryColor }]}
                              >
                                {descriptor.icon}
                              </Text>
                            </Pressable>
                          );
                        })}

                      <View style={styles.innerDivider} />
                    </>
                  )}

                  {USER_DRAWING_STYLE_TOOLBAR_ACTION_DESCRIPTORS.map((descriptor) => {
                    const actionState = resolveUserDrawingStyleToolbarAction(userDrawingState, descriptor.action);
                    const enabled = actionState.enabled;
                    return (
                      <Pressable
                        key={descriptor.action}
                        accessibilityRole="button"
                        accessibilityLabel={descriptor.label}
                        accessibilityState={{ disabled: !enabled }}
                        disabled={!enabled}
                        onPress={() => {
                          if (actionState.visible !== undefined) {
                            onUserDrawingVisibilityChange?.(actionState.visible);
                          }
                          if (actionState.locked !== undefined) {
                            onUserDrawingLockedChange?.(actionState.locked, actionState.includeLocked);
                          }
                        }}
                        style={({ pressed }: PressableStyleState) => [
                          styles.drawingButton,
                          enabled && pressed && styles.drawingButtonPressed,
                          !enabled && styles.drawingButtonDisabled,
                        ]}
                      >
                        <Text style={[styles.drawingButtonText, { color: textSecondaryColor }]}>{descriptor.icon}</Text>
                      </Pressable>
                    );
                  })}

                  <View style={styles.innerDivider} />
                </>
              )}

              {USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS.map((descriptor) => {
                const enabled = isUserDrawingToolbarActionEnabled(userDrawingState, descriptor.action);
                return (
                  <Pressable
                    key={descriptor.action}
                    accessibilityRole="button"
                    accessibilityLabel={descriptor.label}
                    accessibilityState={{ disabled: !enabled }}
                    disabled={!enabled}
                    onPress={() => {
                      if (descriptor.action === 'duplicateSelected') onUserDrawingDuplicateSelected?.();
                      if (descriptor.action === 'deleteSelected') onUserDrawingDeleteSelected?.();
                      const zOrderAction = getUserDrawingZOrderAction(descriptor.action);
                      if (zOrderAction) onUserDrawingZOrderChange?.(zOrderAction);
                      if (descriptor.action === 'cancelDraft') onUserDrawingCancelDraft?.();
                      if (descriptor.action === 'clearAll') onUserDrawingClearAll?.();
                    }}
                    style={({ pressed }: PressableStyleState) => [
                      styles.drawingButton,
                      !enabled && styles.drawingButtonDisabled,
                      enabled && pressed && styles.drawingButtonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.drawingButtonText,
                        { color: textSecondaryColor },
                        !enabled && styles.drawingButtonTextDisabled,
                      ]}
                    >
                      {descriptor.icon}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}
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
  drawingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  drawingButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawingButtonActive: {},
  drawingSwatchButton: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#363a45',
    marginHorizontal: 3,
  },
  drawingSwatchButtonActive: {
    borderWidth: 2,
  },
  drawingButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  drawingButtonDisabled: {
    opacity: 0.35,
  },
  drawingButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  drawingButtonTextDisabled: {
    opacity: 0.8,
  },
  innerDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#363a45',
    marginHorizontal: 4,
  },
});

export default ChartTopBarComponent;
