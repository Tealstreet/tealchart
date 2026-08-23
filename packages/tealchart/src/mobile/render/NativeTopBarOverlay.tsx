import type { TimeframeOption } from '../../state/chartState';
import type { ResolutionString } from '../../types';
import type { NativeTopBarActionCommand, NativeTopBarButtonGeometry, NativeTopBarLayout } from '../utils/topBarLayout';

import React from 'react';

import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TIMEFRAME_GROUPS } from '../../state/chartState';
import { NativeDrawingIcon } from './NativeDrawingIcon';

interface TimeframeMenuAnchor {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface TimeframeMenuMeasurer {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
}

function getWindowDimensionsFallback(topBarWidth: number): { height: number; width: number } {
  const measured = (
    Dimensions as { get?: (dimension: 'window') => { height: number; width: number } } | undefined
  )?.get?.('window');
  return measured ?? { height: 844, width: topBarWidth };
}

export interface NativeTopBarOverlayProps {
  backgroundColor: string;
  gridColor: string;
  favoriteTimeframeValues?: readonly ResolutionString[];
  menuTimeframes?: readonly TimeframeOption[];
  mutedTextColor: string;
  onAction: (action: NativeTopBarActionCommand) => void;
  onFavoriteTimeframeToggle?: (interval: ResolutionString) => void;
  textColor: string;
  topBarLayout: NativeTopBarLayout;
}

function iconForButton(button: NativeTopBarButtonGeometry) {
  if (button.type === 'undo') return 'undo';
  if (button.type === 'redo') return 'redo';
  if (button.type === 'indicators') return 'indicators';
  if (button.type === 'timeframeMenu') return 'chevronDown';
  return null;
}

function accessibilityLabelForButton(button: NativeTopBarButtonGeometry): string {
  if (button.type === 'timeframe') return `${button.text} timeframe`;
  if (button.type === 'timeframeMenu') return 'More timeframes';
  if (button.type === 'indicators') return 'Indicators';
  if (button.type === 'layout') return 'Chart layouts';
  if (button.type === 'undo') return 'Undo drawing action';
  return 'Redo drawing action';
}

export function NativeTopBarOverlayImpl({
  backgroundColor,
  favoriteTimeframeValues = [],
  gridColor,
  menuTimeframes = [],
  mutedTextColor,
  onAction,
  onFavoriteTimeframeToggle,
  textColor,
  topBarLayout,
}: NativeTopBarOverlayProps) {
  const [timeframeMenuOpen, setTimeframeMenuOpen] = React.useState(false);
  const [timeframeMenuAnchor, setTimeframeMenuAnchor] = React.useState<TimeframeMenuAnchor | null>(null);
  const timeframeMenuButtonRef = React.useRef<TimeframeMenuMeasurer | null>(null);
  const favoriteTimeframeSet = React.useMemo(() => new Set(favoriteTimeframeValues), [favoriteTimeframeValues]);
  const groupedMenuTimeframes = React.useMemo(
    () =>
      TIMEFRAME_GROUPS.map((group) => ({
        group,
        timeframes: menuTimeframes.filter((timeframe) => timeframe.group === group.value),
      })).filter((entry) => entry.timeframes.length > 0),
    [menuTimeframes],
  );
  const windowDimensions = getWindowDimensionsFallback(topBarLayout.width);
  const menuWidth = Math.min(292, Math.max(228, windowDimensions.width - 16));
  const fallbackMenuLeft = Math.max(8, Math.min(topBarLayout.scrollAreaX, Math.max(8, topBarLayout.width - menuWidth)));
  const anchorMenuLeft = timeframeMenuAnchor
    ? timeframeMenuAnchor.x + timeframeMenuAnchor.width - menuWidth
    : fallbackMenuLeft;
  const menuLeft = Math.max(8, Math.min(anchorMenuLeft, windowDimensions.width - menuWidth - 8));
  const menuTop = Math.max(8, (timeframeMenuAnchor?.y ?? 0) + (timeframeMenuAnchor?.height ?? topBarLayout.height) + 4);
  const menuMaxHeight = Math.min(420, Math.max(180, windowDimensions.height - menuTop - 8));
  const handleButtonPress = React.useCallback(
    (button: NativeTopBarButtonGeometry) => {
      if (button.type === 'timeframeMenu') {
        if (timeframeMenuOpen) {
          setTimeframeMenuOpen(false);
          return;
        }
        const buttonRef = timeframeMenuButtonRef.current;
        if (buttonRef && typeof buttonRef.measureInWindow === 'function') {
          buttonRef.measureInWindow((x, y, width, height) => {
            setTimeframeMenuAnchor({ x, y, width, height });
            setTimeframeMenuOpen(true);
          });
          return;
        }
        setTimeframeMenuAnchor(null);
        setTimeframeMenuOpen(true);
        return;
      }
      onAction(button);
    },
    [onAction, timeframeMenuOpen],
  );
  const handleMenuTimeframePress = React.useCallback(
    (timeframe: TimeframeOption) => {
      setTimeframeMenuOpen(false);
      onAction({ type: 'timeframe', interval: timeframe.value });
    },
    [onAction],
  );

  return (
    <View pointerEvents="box-none" style={styles.overlayRoot}>
      <View
        pointerEvents="auto"
        style={[
          styles.overlay,
          {
            backgroundColor,
            borderBottomColor: gridColor,
            height: topBarLayout.height,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.symbol,
            {
              color: topBarLayout.symbol.color || textColor,
              height: topBarLayout.height,
              left: topBarLayout.symbol.x,
              lineHeight: topBarLayout.height,
            },
          ]}
        >
          {topBarLayout.symbol.text}
        </Text>
        {topBarLayout.symbolChevron && (
          <View
            pointerEvents="none"
            style={[
              styles.symbolChevron,
              {
                height: topBarLayout.height,
                left: topBarLayout.symbolChevron.x,
              },
            ]}
          >
            <NativeDrawingIcon
              name="chevronDown"
              size={13}
              color={topBarLayout.symbolChevron.color || mutedTextColor}
              strokeWidth={2.1}
            />
          </View>
        )}
        {topBarLayout.symbolHitRect && (
          <Pressable
            accessibilityLabel="Change symbol"
            accessibilityRole="button"
            hitSlop={{ left: 2, right: 4, top: 4, bottom: 4 }}
            onPress={() => onAction({ type: 'symbol' })}
            style={[
              styles.symbolButton,
              {
                height: topBarLayout.symbolHitRect.height,
                left: topBarLayout.symbolHitRect.x,
                top: topBarLayout.symbolHitRect.y,
                width: topBarLayout.symbolHitRect.width,
              },
            ]}
          />
        )}

        <ScrollView
          bounces={false}
          horizontal
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          style={[
            styles.scrollArea,
            {
              height: topBarLayout.height,
              left: topBarLayout.scrollAreaX,
            },
          ]}
        >
          <View style={{ height: topBarLayout.height, width: topBarLayout.scrollContentWidth }}>
            {topBarLayout.dividers.map((divider, index) => (
              <View
                key={`native-top-bar-divider-${index}`}
                pointerEvents="none"
                style={[
                  styles.divider,
                  {
                    backgroundColor: gridColor,
                    height: divider.height,
                    left: divider.x,
                    top: divider.y,
                  },
                ]}
              />
            ))}

            {topBarLayout.buttons.map((button) => {
              const icon = iconForButton(button);
              return (
                <Pressable
                  key={`native-top-bar-button-${button.type}-${button.interval ?? button.text}-${button.x}`}
                  ref={
                    button.type === 'timeframeMenu'
                      ? (node) => {
                          timeframeMenuButtonRef.current = node as TimeframeMenuMeasurer | null;
                        }
                      : undefined
                  }
                  accessibilityLabel={accessibilityLabelForButton(button)}
                  accessibilityRole="button"
                  disabled={!button.enabled}
                  hitSlop={{ left: 3, right: 3, top: 4, bottom: 4 }}
                  onPress={() => handleButtonPress(button)}
                  style={[
                    styles.button,
                    {
                      backgroundColor: button.backgroundColor ?? 'transparent',
                      height: button.height,
                      left: button.x,
                      opacity: button.enabled ? 1 : 0.45,
                      top: button.y,
                      width: button.width,
                    },
                  ]}
                >
                  {icon && (
                    <NativeDrawingIcon
                      name={icon}
                      size={button.type === 'indicators' ? 18 : 19}
                      color={button.textColor}
                      strokeWidth={button.type === 'indicators' ? 1.7 : 1.9}
                    />
                  )}
                  {button.type !== 'undo' && button.type !== 'redo' && button.type !== 'timeframeMenu' && (
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.buttonText,
                        {
                          color: button.textColor,
                        },
                        button.type === 'indicators' ? styles.indicatorsText : null,
                        button.type === 'layout' ? styles.layoutText : null,
                      ]}
                    >
                      {button.text}
                    </Text>
                  )}
                  {button.type === 'layout' ? (
                    <NativeDrawingIcon name="chevronDown" size={13} color={button.textColor} strokeWidth={2} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
      {timeframeMenuOpen ? (
        <Modal animationType="none" transparent visible onRequestClose={() => setTimeframeMenuOpen(false)}>
          <Pressable
            accessibilityLabel="Close timeframe selector"
            accessibilityRole="button"
            onPress={() => setTimeframeMenuOpen(false)}
            style={styles.timeframeMenuBackdrop}
          />
          <View
            pointerEvents="auto"
            style={[
              styles.timeframeMenu,
              {
                backgroundColor,
                borderColor: gridColor,
                left: menuLeft,
                maxHeight: menuMaxHeight,
                top: menuTop,
                width: menuWidth,
              },
            ]}
          >
            <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={{ maxHeight: menuMaxHeight }}>
              {groupedMenuTimeframes.map(({ group, timeframes }) => (
                <View key={group.value}>
                  <Text style={[styles.timeframeMenuGroupLabel, { color: mutedTextColor }]}>{group.label}</Text>
                  {timeframes.map((timeframe) => {
                    const active = topBarLayout.interval === timeframe.value;
                    const favorite = favoriteTimeframeSet.has(timeframe.value);
                    return (
                      <View
                        key={timeframe.value}
                        style={[
                          styles.timeframeMenuRow,
                          {
                            backgroundColor: active ? gridColor : 'transparent',
                          },
                        ]}
                      >
                        <Pressable
                          accessibilityLabel={`${timeframe.label} timeframe`}
                          accessibilityRole="button"
                          onPress={() => handleMenuTimeframePress(timeframe)}
                          style={styles.timeframeMenuLabelButton}
                        >
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.timeframeMenuLabel,
                              {
                                color: active ? textColor : mutedTextColor,
                              },
                            ]}
                          >
                            {timeframe.label}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel={`${favorite ? 'Unfavorite' : 'Favorite'} ${timeframe.label}`}
                          accessibilityRole="button"
                          onPress={() => onFavoriteTimeframeToggle?.(timeframe.value)}
                          style={styles.timeframeFavoriteButton}
                        >
                          <Text
                            style={[
                              styles.timeframeFavoriteIcon,
                              {
                                color: favorite ? '#f5a623' : mutedTextColor,
                              },
                            ]}
                          >
                            {favorite ? '★' : '☆'}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

export const NativeTopBarOverlay = React.memo(NativeTopBarOverlayImpl);
NativeTopBarOverlay.displayName = 'NativeTopBarOverlay';

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'absolute',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    position: 'absolute',
    width: StyleSheet.hairlineWidth,
  },
  indicatorsText: {
    marginLeft: 4,
  },
  layoutText: {
    marginRight: 3,
  },
  overlayRoot: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  overlay: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  scrollArea: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  symbol: {
    fontSize: 14,
    fontWeight: '600',
    position: 'absolute',
  },
  symbolButton: {
    position: 'absolute',
  },
  symbolChevron: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: 16,
  },
  timeframeFavoriteButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 42,
  },
  timeframeFavoriteIcon: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
  },
  timeframeMenuBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  timeframeMenu: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'absolute',
  },
  timeframeMenuGroupLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.7,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  timeframeMenuLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  timeframeMenuLabelButton: {
    flex: 1,
    height: 38,
    justifyContent: 'center',
    paddingLeft: 12,
  },
  timeframeMenuRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 38,
  },
});
