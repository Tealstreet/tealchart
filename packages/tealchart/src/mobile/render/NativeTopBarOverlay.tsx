import type { NativeTopBarActionCommand, NativeTopBarButtonGeometry, NativeTopBarLayout } from '../utils/topBarLayout';

import React from 'react';

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NativeDrawingIcon } from './NativeDrawingIcon';

export interface NativeTopBarOverlayProps {
  backgroundColor: string;
  gridColor: string;
  mutedTextColor: string;
  onAction: (action: NativeTopBarActionCommand) => void;
  textColor: string;
  topBarLayout: NativeTopBarLayout;
}

function iconForButton(button: NativeTopBarButtonGeometry) {
  if (button.type === 'undo') return 'undo';
  if (button.type === 'redo') return 'redo';
  if (button.type === 'indicators') return 'indicators';
  return null;
}

function accessibilityLabelForButton(button: NativeTopBarButtonGeometry): string {
  if (button.type === 'timeframe') return `${button.text} timeframe`;
  if (button.type === 'indicators') return 'Indicators';
  if (button.type === 'layout') return 'Chart layouts';
  if (button.type === 'undo') return 'Undo drawing action';
  return 'Redo drawing action';
}

export function NativeTopBarOverlayImpl({
  backgroundColor,
  gridColor,
  mutedTextColor,
  onAction,
  textColor,
  topBarLayout,
}: NativeTopBarOverlayProps) {
  return (
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
                accessibilityLabel={accessibilityLabelForButton(button)}
                accessibilityRole="button"
                disabled={!button.enabled}
                hitSlop={{ left: 3, right: 3, top: 4, bottom: 4 }}
                onPress={() => onAction(button)}
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
                {button.type !== 'undo' && button.type !== 'redo' && (
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
});
