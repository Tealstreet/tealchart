/**
 * ChartTopBarComponent - Top toolbar for mobile chart
 *
 * Contains symbol info, timeframe selector, and indicators button.
 * Matches the web's ChartTopBar styling with React Native components.
 */

import type {
  UpdateUserDrawingOptions,
  UserDrawingIconName,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTextAlign,
  UserDrawingTool,
  UserDrawingTrendLineExtend,
  UserDrawingZOrderAction,
} from '../../drawings';

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  getSelectedUserDrawing,
  getUserDrawingAllDrawingsUpdateOptions,
  getUserDrawingLineWidthDescriptors,
  getUserDrawingLineWidthPreviewFontSize,
  getUserDrawingOpacityDescriptors,
  getUserDrawingToolDescriptor,
  isUserDrawingFillToolbarEnabled,
  isUserDrawingFillVisibilityToolbarEnabled,
  isUserDrawingGlobalToolbarAction,
  isUserDrawingIconToolbarEnabled,
  isUserDrawingStyleToolbarEnabled,
  isUserDrawingTextAnnotation,
  isUserDrawingTextToolbarEnabled,
  isUserDrawingToolbarActionEnabled,
  supportsUserDrawingFillColorControls,
  supportsUserDrawingFillVisibilityControls,
  supportsUserDrawingIconControls,
  supportsUserDrawingRichTextControls,
  supportsUserDrawingTextAlignControls,
  supportsUserDrawingTextAppearanceControls,
  supportsUserDrawingTextWrapControls,
  supportsUserDrawingTrendLineExtendControls,
  USER_DRAWING_FILL_COLOR_DESCRIPTORS,
  USER_DRAWING_FONT_FAMILY_DESCRIPTORS,
  USER_DRAWING_FONT_SIZE_DESCRIPTORS,
  USER_DRAWING_FONT_STYLE_DESCRIPTORS,
  USER_DRAWING_FONT_WEIGHT_DESCRIPTORS,
  USER_DRAWING_ICON_NAME_DESCRIPTORS,
  USER_DRAWING_LINE_COLOR_DESCRIPTORS,
  USER_DRAWING_LINE_STYLE_DESCRIPTORS,
  USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS,
  USER_DRAWING_TEXT_ALIGN_DESCRIPTORS,
  USER_DRAWING_TEXT_COLOR_DESCRIPTORS,
  USER_DRAWING_TEXT_DECORATION_DESCRIPTORS,
  USER_DRAWING_TEXT_MAX_WIDTH_DESCRIPTORS,
  USER_DRAWING_TEXT_WRAP_DESCRIPTORS,
  USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS,
  USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS,
  USER_DRAWING_TREND_LINE_EXTEND_DESCRIPTORS,
} from '../../drawings';
import { computeLeftToolRailTop, MOBILE_CHART_CHROME_METRICS } from '../../layout/chartGeometry';
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
  /** Callback when temporary measure mode should toggle */
  onUserDrawingMeasureModeChange?: (enabled: boolean) => void;
  /** Callback when selected drawings should be reordered */
  onUserDrawingZOrderChange?: (action: UserDrawingZOrderAction) => void;
  /** Callback when selected drawing style should change */
  onUserDrawingStyleChange?: (style: Partial<UserDrawingStyle>) => void;
  /** Callback when selected text-label alignment should change */
  onUserDrawingTextAlignChange?: (textAlign: UserDrawingTextAlign) => void;
  /** Callback when selected trend-line extension should change */
  onUserDrawingTrendLineExtendChange?: (extend: UserDrawingTrendLineExtend) => void;
  /** Callback when selected icon marker shape should change */
  onUserDrawingIconNameChange?: (iconName: UserDrawingIconName) => void;
  /** Callback when selected drawing visibility should change */
  onUserDrawingVisibilityChange?: (visible: boolean, options?: UpdateUserDrawingOptions) => void;
  /** Callback when selected drawing locked state should change */
  onUserDrawingLockedChange?: (locked: boolean, options?: UpdateUserDrawingOptions) => void;
}

const TOP_BAR_HEIGHT = MOBILE_CHART_CHROME_METRICS.topBarHeight;
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
    onUserDrawingCancelDraft,
    onUserDrawingClearAll,
    onUserDrawingMeasureModeChange,
    onUserDrawingStyleChange,
    onUserDrawingTextAlignChange,
    onUserDrawingTrendLineExtendChange,
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
    const [expandedDrawingCategoryId, setExpandedDrawingCategoryId] = useState<string | null>(null);

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
    const fillColorControlsEnabled = userDrawingState ? isUserDrawingFillToolbarEnabled(userDrawingState) : false;
    const fillVisibilityControlsEnabled = userDrawingState
      ? isUserDrawingFillVisibilityToolbarEnabled(userDrawingState)
      : false;
    const iconControlsEnabled = userDrawingState ? isUserDrawingIconToolbarEnabled(userDrawingState) : false;
    const textControlsEnabled = userDrawingState ? isUserDrawingTextToolbarEnabled(userDrawingState) : false;
    const fillColorControlsSupported = selectedDrawing ? supportsUserDrawingFillColorControls(selectedDrawing) : false;
    const fillVisibilityControlsSupported = selectedDrawing
      ? supportsUserDrawingFillVisibilityControls(selectedDrawing)
      : false;
    const iconControlsSupported = selectedDrawing ? supportsUserDrawingIconControls(selectedDrawing) : false;
    const textAppearanceControlsSupported = selectedDrawing
      ? supportsUserDrawingTextAppearanceControls(selectedDrawing)
      : false;
    const richTextControlsSupported = selectedDrawing ? supportsUserDrawingRichTextControls(selectedDrawing) : false;
    const textAlignControlsSupported = selectedDrawing ? supportsUserDrawingTextAlignControls(selectedDrawing) : false;
    const textWrapControlsSupported = selectedDrawing ? supportsUserDrawingTextWrapControls(selectedDrawing) : false;
    const trendLineExtendControlsSupported = selectedDrawing
      ? supportsUserDrawingTrendLineExtendControls(selectedDrawing)
      : false;
    const expandedDrawingCategory =
      userDrawingState && expandedDrawingCategoryId
        ? USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.find((category) => category.id === expandedDrawingCategoryId)
        : null;

    return (
      <View style={styles.container} pointerEvents="box-none">
        {expandedDrawingCategory && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close drawing tools"
            onPress={() => setExpandedDrawingCategoryId(null)}
            style={styles.drawingToolDismissLayer}
          />
        )}

        {userDrawingState && (
          <View style={styles.drawingToolRail} accessibilityLabel="Drawing tool categories">
            {USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.map((category) => {
              const activeCategory = category.tools.includes(userDrawingState.activeTool);
              const categoryTool = activeCategory ? userDrawingState.activeTool : category.tools[0]!;
              const categoryToolDescriptor = getUserDrawingToolDescriptor(categoryTool);
              const expanded = expandedDrawingCategoryId === category.id;
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${category.label} drawing tools`}
                  accessibilityState={{ expanded, selected: activeCategory }}
                  onPress={() => setExpandedDrawingCategoryId(expanded ? null : category.id)}
                  style={({ pressed }: PressableStyleState) => [
                    styles.drawingToolCategoryButton,
                    activeCategory && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                    pressed && !activeCategory && styles.drawingButtonPressed,
                  ]}
                >
                  <Text
                    style={[styles.drawingButtonText, { color: activeCategory ? accentColor : textSecondaryColor }]}
                  >
                    {categoryToolDescriptor.icon}
                  </Text>
                </Pressable>
              );
            })}

            {expandedDrawingCategory && (
              <View style={styles.drawingToolFlyout} accessibilityLabel={`${expandedDrawingCategory.label} tools`}>
                <Text style={[styles.drawingToolFlyoutTitle, { color: textSecondaryColor }]}>
                  {expandedDrawingCategory.label}
                </Text>
                {expandedDrawingCategory.tools.map((tool) => {
                  const descriptor = getUserDrawingToolDescriptor(tool);
                  const active = userDrawingState.activeTool === descriptor.tool;
                  return (
                    <Pressable
                      key={descriptor.tool}
                      accessibilityRole="button"
                      accessibilityLabel={descriptor.label}
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        onUserDrawingToolSelect?.(descriptor.tool);
                        setExpandedDrawingCategoryId(null);
                      }}
                      style={({ pressed }: PressableStyleState) => [
                        styles.drawingToolFlyoutButton,
                        active && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                        pressed && !active && styles.drawingButtonPressed,
                      ]}
                    >
                      <Text style={[styles.drawingToolFlyoutIcon, { color: textSecondaryColor }]}>
                        {descriptor.icon}
                      </Text>
                      <Text style={[styles.drawingToolFlyoutLabel, { color: active ? accentColor : textColor }]}>
                        {descriptor.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={[styles.topBarRow, { backgroundColor }]}>
          {/* Symbol display (only shown if symbol is provided) */}
          {symbol ? (
            <>
              <View style={styles.symbolContainer}>
                <Text style={[styles.symbolText, { color: textColor }]}>{symbol}</Text>
                {exchangeName && (
                  <Text style={[styles.exchangeText, { color: textSecondaryColor }]}>{exchangeName}</Text>
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

                    {getUserDrawingLineWidthDescriptors(selectedDrawing).map((descriptor) => {
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
                              {
                                color: active ? accentColor : textSecondaryColor,
                                fontSize: getUserDrawingLineWidthPreviewFontSize(descriptor.width),
                              },
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
                          <Text
                            style={[styles.drawingButtonText, { color: active ? accentColor : textSecondaryColor }]}
                          >
                            {descriptor.icon}
                          </Text>
                        </Pressable>
                      );
                    })}

                    {trendLineExtendControlsSupported &&
                      selectedDrawing.kind === 'trendLine' &&
                      USER_DRAWING_TREND_LINE_EXTEND_DESCRIPTORS.map((descriptor) => {
                        const active = selectedDrawing.extend === descriptor.extend;
                        return (
                          <Pressable
                            key={descriptor.extend}
                            accessibilityRole="button"
                            accessibilityLabel={descriptor.label}
                            accessibilityState={{ disabled: !styleControlsEnabled, selected: active }}
                            disabled={!styleControlsEnabled}
                            onPress={() => onUserDrawingTrendLineExtendChange?.(descriptor.extend)}
                            style={({ pressed }: PressableStyleState) => [
                              styles.drawingButton,
                              active && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                              styleControlsEnabled && pressed && !active && styles.drawingButtonPressed,
                              !styleControlsEnabled && styles.drawingButtonDisabled,
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

                    {getUserDrawingOpacityDescriptors(selectedDrawing).map((descriptor) => {
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
                          <Text
                            style={[styles.drawingButtonText, { color: active ? accentColor : textSecondaryColor }]}
                          >
                            {descriptor.icon}
                          </Text>
                        </Pressable>
                      );
                    })}

                    <View style={styles.innerDivider} />

                    {(fillColorControlsSupported || fillVisibilityControlsSupported) && (
                      <>
                        {fillColorControlsSupported &&
                          USER_DRAWING_FILL_COLOR_DESCRIPTORS.map((descriptor) => {
                            const active =
                              selectedDrawing.style.fillColor?.toLowerCase() === descriptor.fillColor.toLowerCase();
                            return (
                              <Pressable
                                key={descriptor.fillColor}
                                accessibilityRole="button"
                                accessibilityLabel={descriptor.label}
                                accessibilityState={{ disabled: !fillColorControlsEnabled, selected: active }}
                                disabled={!fillColorControlsEnabled}
                                onPress={() => onUserDrawingStyleChange?.({ fillColor: descriptor.fillColor })}
                                style={[
                                  styles.drawingSwatchButton,
                                  { backgroundColor: descriptor.fillColor },
                                  active && [styles.drawingSwatchButtonActive, { borderColor: accentColor }],
                                  !fillColorControlsEnabled && styles.drawingButtonDisabled,
                                ]}
                              />
                            );
                          })}

                        {fillVisibilityControlsSupported &&
                          USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS.filter(
                            (descriptor) => descriptor.style === 'fillVisible',
                          ).map((descriptor) => {
                            const active = selectedDrawing.style.fillVisible !== false;
                            return (
                              <Pressable
                                key={descriptor.style}
                                accessibilityRole="button"
                                accessibilityLabel={descriptor.label}
                                accessibilityState={{ disabled: !fillVisibilityControlsEnabled, selected: active }}
                                disabled={!fillVisibilityControlsEnabled}
                                onPress={() => onUserDrawingStyleChange?.({ fillVisible: !active })}
                                style={({ pressed }: PressableStyleState) => [
                                  styles.drawingButton,
                                  active && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                                  fillVisibilityControlsEnabled && pressed && !active && styles.drawingButtonPressed,
                                  !fillVisibilityControlsEnabled && styles.drawingButtonDisabled,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.drawingButtonText,
                                    { color: active ? accentColor : textSecondaryColor },
                                  ]}
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
                          const active =
                            selectedDrawing.kind === 'icon' && selectedDrawing.iconName === descriptor.iconName;
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

                    {textAppearanceControlsSupported && (
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

                        {richTextControlsSupported &&
                          USER_DRAWING_FONT_WEIGHT_DESCRIPTORS.map((descriptor) => {
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

                        {richTextControlsSupported &&
                          USER_DRAWING_FONT_STYLE_DESCRIPTORS.map((descriptor) => {
                            const active = (selectedDrawing.style.fontStyle ?? 'normal') === descriptor.fontStyle;
                            return (
                              <Pressable
                                key={descriptor.fontStyle}
                                accessibilityRole="button"
                                accessibilityLabel={descriptor.label}
                                accessibilityState={{ disabled: !textControlsEnabled, selected: active }}
                                disabled={!textControlsEnabled}
                                onPress={() => onUserDrawingStyleChange?.({ fontStyle: descriptor.fontStyle })}
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
                                      fontStyle: descriptor.fontStyle === 'italic' ? 'italic' : 'normal',
                                    },
                                  ]}
                                >
                                  {descriptor.icon}
                                </Text>
                              </Pressable>
                            );
                          })}

                        {richTextControlsSupported &&
                          USER_DRAWING_TEXT_DECORATION_DESCRIPTORS.map((descriptor) => {
                            const isUnderline = descriptor.textUnderline === true;
                            const active = isUnderline
                              ? !!selectedDrawing.style.textUnderline
                              : !!selectedDrawing.style.textLineThrough;
                            return (
                              <Pressable
                                key={descriptor.label}
                                accessibilityRole="button"
                                accessibilityLabel={descriptor.label}
                                accessibilityState={{ disabled: !textControlsEnabled, selected: active }}
                                disabled={!textControlsEnabled}
                                onPress={() =>
                                  onUserDrawingStyleChange?.(
                                    isUnderline
                                      ? { textUnderline: !selectedDrawing.style.textUnderline }
                                      : { textLineThrough: !selectedDrawing.style.textLineThrough },
                                  )
                                }
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
                                      textDecorationLine: isUnderline ? 'underline' : 'line-through',
                                    },
                                  ]}
                                >
                                  {descriptor.icon}
                                </Text>
                              </Pressable>
                            );
                          })}

                        {textWrapControlsSupported &&
                          USER_DRAWING_TEXT_WRAP_DESCRIPTORS.map((descriptor) => {
                            const active = !!selectedDrawing.style.textWrap === descriptor.textWrap;
                            return (
                              <Pressable
                                key={descriptor.label}
                                accessibilityRole="button"
                                accessibilityLabel={descriptor.label}
                                accessibilityState={{ disabled: !textControlsEnabled, selected: active }}
                                disabled={!textControlsEnabled}
                                onPress={() =>
                                  onUserDrawingStyleChange?.({
                                    textWrap: descriptor.textWrap,
                                    textMaxWidth: selectedDrawing.style.textMaxWidth ?? 180,
                                  })
                                }
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

                        {textWrapControlsSupported &&
                          USER_DRAWING_TEXT_MAX_WIDTH_DESCRIPTORS.map((descriptor) => {
                            const active = (selectedDrawing.style.textMaxWidth ?? 180) === descriptor.textMaxWidth;
                            const widthEnabled = textControlsEnabled && selectedDrawing.style.textWrap === true;
                            return (
                              <Pressable
                                key={descriptor.textMaxWidth}
                                accessibilityRole="button"
                                accessibilityLabel={descriptor.label}
                                accessibilityState={{ disabled: !widthEnabled, selected: active }}
                                disabled={!widthEnabled}
                                onPress={() => onUserDrawingStyleChange?.({ textMaxWidth: descriptor.textMaxWidth })}
                                style={({ pressed }: PressableStyleState) => [
                                  styles.drawingButton,
                                  active && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                                  widthEnabled && pressed && !active && styles.drawingButtonPressed,
                                  !widthEnabled && styles.drawingButtonDisabled,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.drawingButtonText,
                                    { color: active ? accentColor : textSecondaryColor, fontSize: 10 },
                                  ]}
                                >
                                  {descriptor.textMaxWidth}
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
                                  style={[
                                    styles.drawingButtonText,
                                    { color: active ? accentColor : textSecondaryColor },
                                  ]}
                                >
                                  {descriptor.icon}
                                </Text>
                              </Pressable>
                            );
                          })}

                        <View style={styles.innerDivider} />
                      </>
                    )}
                  </>
                )}

                {USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS.filter((descriptor) =>
                  isUserDrawingGlobalToolbarAction(descriptor.action),
                ).map((descriptor) => {
                  const enabled = isUserDrawingToolbarActionEnabled(userDrawingState, descriptor.action);
                  const active = descriptor.action === 'measure' && userDrawingState.measureMode === 'on';
                  return (
                    <Pressable
                      key={descriptor.action}
                      accessibilityRole="button"
                      accessibilityLabel={descriptor.label}
                      accessibilityState={{ disabled: !enabled, selected: active }}
                      disabled={!enabled}
                      onPress={() => {
                        const allDrawingOptions = getUserDrawingAllDrawingsUpdateOptions(userDrawingState);
                        const allDrawingOptionsIncludingLocked = getUserDrawingAllDrawingsUpdateOptions(
                          userDrawingState,
                          {
                            includeLocked: true,
                          },
                        );
                        if (descriptor.action === 'measure') {
                          onUserDrawingMeasureModeChange?.(userDrawingState.measureMode !== 'on');
                        }
                        if (descriptor.action === 'cancelDraft') onUserDrawingCancelDraft?.();
                        if (descriptor.action === 'clearAll') onUserDrawingClearAll?.();
                        if (descriptor.action === 'hideAll') {
                          onUserDrawingVisibilityChange?.(false, allDrawingOptionsIncludingLocked);
                        }
                        if (descriptor.action === 'showAll') {
                          onUserDrawingVisibilityChange?.(true, allDrawingOptionsIncludingLocked);
                        }
                        if (descriptor.action === 'lockAll') {
                          onUserDrawingLockedChange?.(true, allDrawingOptions);
                        }
                        if (descriptor.action === 'unlockAll') {
                          onUserDrawingLockedChange?.(false, allDrawingOptionsIncludingLocked);
                        }
                      }}
                      style={({ pressed }: PressableStyleState) => [
                        styles.drawingButton,
                        active && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                        !enabled && styles.drawingButtonDisabled,
                        enabled && pressed && !active && styles.drawingButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.drawingButtonText,
                          { color: active ? accentColor : textSecondaryColor },
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topBarRow: {
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
    gap: 8,
  },
  drawingToolRail: {
    position: 'absolute',
    top: computeLeftToolRailTop(MOBILE_CHART_CHROME_METRICS),
    left: MOBILE_CHART_CHROME_METRICS.leftToolRailInset,
    zIndex: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#363a45',
    borderRadius: 6,
    backgroundColor: 'rgba(19, 23, 34, 0.96)',
    gap: 4,
  },
  drawingToolDismissLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 7,
  },
  drawingToolCategoryButton: {
    width: 34,
    height: 34,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawingToolFlyout: {
    position: 'absolute',
    top: 0,
    left: 42,
    width: 250,
    maxHeight: 420,
    padding: 10,
    borderWidth: 1,
    borderColor: '#363a45',
    borderRadius: 6,
    backgroundColor: 'rgba(19, 23, 34, 0.98)',
  },
  drawingToolFlyoutTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  drawingToolFlyoutButton: {
    minHeight: 34,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  drawingToolFlyoutIcon: {
    width: 28,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  drawingToolFlyoutLabel: {
    flex: 1,
    fontSize: 13,
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
