/**
 * ChartTopBarComponent - Top toolbar for mobile chart
 *
 * Contains symbol info, timeframe selector, and indicators button.
 * Matches the web's ChartTopBar styling with React Native components.
 */

import type {
  UpdateUserDrawingOptions,
  UserDrawingIconName,
  UserDrawingCommandAvailability,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTextAlign,
  UserDrawingTool,
  UserDrawingTrendLineExtend,
  UserDrawingZOrderAction,
} from '../../drawings';

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  getUserDrawingAllDrawingsUpdateOptions,
  getUserDrawingToolCategoryDescriptorForTool,
  getUserDrawingToolDescriptor,
  isUserDrawingGlobalToolbarAction,
  isUserDrawingToolbarActionEnabled,
  resolveDrawingToolIconName,
  resolveDrawingToolbarActionIconName,
  resolveUserDrawingToolCategoryButtonTool,
  USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS,
  USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS,
} from '../../drawings';
import { DrawingToolIcon } from './DrawingToolIcon';
import { computeLeftToolRailTop, MOBILE_CHART_CHROME_METRICS } from '../../layout/chartGeometry';
import { AVAILABLE_TIMEFRAMES } from '../../state/chartState';
import { TIME_AXIS_HEIGHT } from '../../types';

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
  /** Current drawing command history availability for undo/redo toolbar actions */
  userDrawingCommandAvailability?: UserDrawingCommandAvailability;
  /** Callback when a drawing tool is selected */
  onUserDrawingToolSelect?: (tool: UserDrawingTool) => void;
  /** Callback when the drawing toolbar should undo the last drawing command */
  onUserDrawingUndo?: () => void;
  /** Callback when the drawing toolbar should redo the last undone drawing command */
  onUserDrawingRedo?: () => void;
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
  /** Callback when the drawing toolbar should zoom the chart time range in */
  onUserDrawingZoomIn?: () => void;
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
const MIN_DRAWING_TOOL_OVERLAY_HEIGHT = 96;
const DRAWING_TOOL_FLYOUT_NON_LIST_HEIGHT = 44;
const getMobileWindowHeight = (): number => {
  const dimensionsHeight = Dimensions?.get?.('window')?.height;
  if (typeof dimensionsHeight === 'number' && dimensionsHeight > 0) return dimensionsHeight;
  if (typeof window !== 'undefined' && window.innerHeight > 0) return window.innerHeight;
  return 640;
};

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
    userDrawingCommandAvailability,
    onUserDrawingToolSelect,
    onUserDrawingUndo,
    onUserDrawingRedo,
    onUserDrawingCancelDraft,
    onUserDrawingClearAll,
    onUserDrawingMeasureModeChange,
    onUserDrawingZoomIn,
    onUserDrawingStyleChange,
    onUserDrawingTextAlignChange,
    onUserDrawingTrendLineExtendChange,
    onUserDrawingIconNameChange,
    onUserDrawingVisibilityChange,
    onUserDrawingLockedChange,
  }) => {
    const [windowHeight, setWindowHeight] = useState(getMobileWindowHeight);
    const drawingToolAvailableHeight = Math.max(
      MIN_DRAWING_TOOL_OVERLAY_HEIGHT,
      windowHeight -
        computeLeftToolRailTop(MOBILE_CHART_CHROME_METRICS) -
        TIME_AXIS_HEIGHT -
        MOBILE_CHART_CHROME_METRICS.leftToolRailTopGap,
    );
    const drawingToolBoundsStyle = useMemo(
      () => ({ maxHeight: drawingToolAvailableHeight }),
      [drawingToolAvailableHeight],
    );
    const drawingToolFlyoutListBoundsStyle = useMemo(
      () => ({
        maxHeight: Math.max(0, drawingToolAvailableHeight - DRAWING_TOOL_FLYOUT_NON_LIST_HEIGHT),
      }),
      [drawingToolAvailableHeight],
    );

    useEffect(() => {
      if (!Dimensions?.addEventListener) {
        if (typeof window === 'undefined') return undefined;
        const handleResize = () => setWindowHeight(getMobileWindowHeight());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
      }
      const subscription = Dimensions.addEventListener('change', ({ window }) => {
        setWindowHeight(window.height || getMobileWindowHeight());
      });
      return () => subscription.remove();
    }, []);

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
    const [pinnedDrawingCategoryId, setPinnedDrawingCategoryId] = useState<string | null>(null);
    const [recentDrawingToolsByCategory, setRecentDrawingToolsByCategory] = useState<
      Record<string, UserDrawingTool | undefined>
    >({});

    // Sync internal state when prop changes (controlled mode)
    useEffect(() => {
      setInternalInterval(interval);
    }, [interval]);

    useEffect(() => {
      if (!userDrawingState) return;
      const category = getUserDrawingToolCategoryDescriptorForTool(userDrawingState.activeTool);
      if (!category) return;
      setRecentDrawingToolsByCategory((current) =>
        current[category.id] === userDrawingState.activeTool
          ? current
          : { ...current, [category.id]: userDrawingState.activeTool },
      );
    }, [userDrawingState?.activeTool]);

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

    const expandedDrawingCategory =
      userDrawingState && expandedDrawingCategoryId
        ? USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.find((category) => category.id === expandedDrawingCategoryId)
        : null;

    return (
      <View style={styles.container} pointerEvents="box-none">
        {expandedDrawingCategory && pinnedDrawingCategoryId !== expandedDrawingCategory.id && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close drawing tools"
            onPress={() => setExpandedDrawingCategoryId(null)}
            style={styles.drawingToolDismissLayer}
          />
        )}

        {userDrawingState && (
          <View style={[styles.drawingToolRail, drawingToolBoundsStyle]} accessibilityLabel="Drawing tool categories">
            <View
              style={[styles.drawingToolRailList, drawingToolBoundsStyle]}
              accessibilityLabel="Drawing tool category list"
            >
              <ScrollView contentContainerStyle={styles.drawingToolRailContent} showsVerticalScrollIndicator={false}>
                {USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.map((category) => {
                  const activeCategory = category.tools.includes(userDrawingState.activeTool);
                  const categoryTool = resolveUserDrawingToolCategoryButtonTool(
                    category,
                    userDrawingState.activeTool,
                    recentDrawingToolsByCategory,
                  );
                  const categoryToolDescriptor = getUserDrawingToolDescriptor(categoryTool);
                  const categoryIconName = resolveDrawingToolIconName(categoryTool);
                  const expanded = expandedDrawingCategoryId === category.id;
                  return (
                    <Pressable
                      key={category.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${category.label} drawing tools`}
                      accessibilityState={{ expanded, selected: activeCategory }}
                      onPress={() => {
                        if (expanded && pinnedDrawingCategoryId === category.id) return;
                        setExpandedDrawingCategoryId(expanded ? null : category.id);
                        if (!expanded || pinnedDrawingCategoryId !== category.id) {
                          setPinnedDrawingCategoryId(null);
                        }
                      }}
                      style={({ pressed }: PressableStyleState) => [
                        styles.drawingToolCategoryButton,
                        activeCategory && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                        pressed && !activeCategory && styles.drawingButtonPressed,
                      ]}
                    >
                      {categoryIconName ? (
                        <DrawingToolIcon
                          name={categoryIconName}
                          size={20}
                          color={activeCategory ? accentColor : textSecondaryColor}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.drawingButtonText,
                            { color: activeCategory ? accentColor : textSecondaryColor },
                          ]}
                        >
                          {categoryToolDescriptor.icon}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {expandedDrawingCategory && (
              <View
                style={[styles.drawingToolFlyout, drawingToolBoundsStyle]}
                accessibilityLabel={`${expandedDrawingCategory.label} tools`}
              >
                <View style={styles.drawingToolFlyoutHeader}>
                  <Text style={[styles.drawingToolFlyoutTitle, { color: textSecondaryColor }]}>
                    {expandedDrawingCategory.label}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      pinnedDrawingCategoryId === expandedDrawingCategory.id
                        ? 'Unpin drawing tools'
                        : 'Pin drawing tools'
                    }
                    accessibilityState={{ selected: pinnedDrawingCategoryId === expandedDrawingCategory.id }}
                    onPress={() =>
                      setPinnedDrawingCategoryId((current) =>
                        current === expandedDrawingCategory.id ? null : expandedDrawingCategory.id,
                      )
                    }
                    style={({ pressed }: PressableStyleState) => [
                      styles.drawingToolPinButton,
                      pinnedDrawingCategoryId === expandedDrawingCategory.id && [
                        styles.drawingButtonActive,
                        { backgroundColor: `${accentColor}33` },
                      ],
                      pressed && pinnedDrawingCategoryId !== expandedDrawingCategory.id && styles.drawingButtonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.drawingButtonText,
                        {
                          color:
                            pinnedDrawingCategoryId === expandedDrawingCategory.id ? accentColor : textSecondaryColor,
                        },
                      ]}
                    >
                      {pinnedDrawingCategoryId === expandedDrawingCategory.id ? '●' : '○'}
                    </Text>
                  </Pressable>
                </View>
                <View
                  style={[styles.drawingToolFlyoutList, drawingToolFlyoutListBoundsStyle]}
                  accessibilityLabel={`${expandedDrawingCategory.label} tool list`}
                >
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {expandedDrawingCategory.tools.map((tool) => {
                      const descriptor = getUserDrawingToolDescriptor(tool);
                      const flyoutIconName = resolveDrawingToolIconName(descriptor.tool);
                      const active = userDrawingState.activeTool === descriptor.tool;
                      return (
                        <Pressable
                          key={descriptor.tool}
                          accessibilityRole="button"
                          accessibilityLabel={descriptor.label}
                          accessibilityState={{ selected: active }}
                          onPress={() => {
                            const selectedCategory = getUserDrawingToolCategoryDescriptorForTool(descriptor.tool);
                            if (selectedCategory) {
                              setRecentDrawingToolsByCategory((current) => ({
                                ...current,
                                [selectedCategory.id]: descriptor.tool,
                              }));
                            }
                            onUserDrawingToolSelect?.(descriptor.tool);
                            if (pinnedDrawingCategoryId !== expandedDrawingCategory.id) {
                              setExpandedDrawingCategoryId(null);
                            }
                          }}
                          style={({ pressed }: PressableStyleState) => [
                            styles.drawingToolFlyoutButton,
                            active && [styles.drawingButtonActive, { backgroundColor: `${accentColor}33` }],
                            pressed && !active && styles.drawingButtonPressed,
                          ]}
                        >
                          {flyoutIconName ? (
                            <DrawingToolIcon name={flyoutIconName} size={18} color={textSecondaryColor} />
                          ) : (
                            <Text style={[styles.drawingToolFlyoutIcon, { color: textSecondaryColor }]}>
                              {descriptor.icon}
                            </Text>
                          )}
                          <Text style={[styles.drawingToolFlyoutLabel, { color: active ? accentColor : textColor }]}>
                            {descriptor.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
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

                {USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS.filter((descriptor) =>
                  isUserDrawingGlobalToolbarAction(descriptor.action),
                ).map((descriptor) => {
                  const enabled = isUserDrawingToolbarActionEnabled(
                    userDrawingState,
                    descriptor.action,
                    userDrawingCommandAvailability,
                  );
                  const active = descriptor.action === 'measure' && userDrawingState.measureMode === 'on';
                  const actionIconName = resolveDrawingToolbarActionIconName(descriptor.action);
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
                        if (descriptor.action === 'undo') onUserDrawingUndo?.();
                        if (descriptor.action === 'redo') onUserDrawingRedo?.();
                        if (descriptor.action === 'measure') {
                          onUserDrawingMeasureModeChange?.(userDrawingState.measureMode !== 'on');
                        }
                        if (descriptor.action === 'zoomIn') onUserDrawingZoomIn?.();
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
                      {actionIconName ? (
                        <DrawingToolIcon
                          name={actionIconName}
                          size={18}
                          color={active ? accentColor : textSecondaryColor}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.drawingButtonText,
                            { color: active ? accentColor : textSecondaryColor },
                            !enabled && styles.drawingButtonTextDisabled,
                          ]}
                        >
                          {descriptor.icon}
                        </Text>
                      )}
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
    overflow: 'visible',
  },
  drawingToolRailList: {
    overflow: 'hidden',
  },
  drawingToolRailContent: {
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
    padding: 10,
    borderWidth: 1,
    borderColor: '#363a45',
    borderRadius: 6,
    backgroundColor: 'rgba(19, 23, 34, 0.98)',
  },
  drawingToolFlyoutHeader: {
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  drawingToolFlyoutList: {
    overflow: 'hidden',
  },
  drawingToolFlyoutTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  drawingToolPinButton: {
    width: 30,
    height: 30,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
