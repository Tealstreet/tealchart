import type { SharedValue } from 'react-native-reanimated';
import type { NativeResetViewButtonLayout } from '../interaction/nativeResetViewButton';

import React from 'react';

import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { NATIVE_RESET_VIEW_BUTTON_SIZE } from '../interaction/nativeResetViewButton';
import { NativeDrawingIcon } from './NativeDrawingIcon';

const NATIVE_RESET_VIEW_FADE_MS = 120;

export interface NativeResetViewButtonOverlayProps {
  layout: NativeResetViewButtonLayout;
  visible: SharedValue<boolean>;
}

export function NativeResetViewButtonOverlayImpl({ layout, visible }: NativeResetViewButtonOverlayProps) {
  // Mounted for as long as there is a chart, so revealing it costs a UI-thread
  // opacity change rather than a React render of the whole chart.
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible.value ? 1 : 0, { duration: NATIVE_RESET_VIEW_FADE_MS }),
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, fadeStyle]}>
      <View
        style={[
          styles.hitArea,
          {
            borderRadius: layout.hitRadius,
            height: layout.hitRadius * 2,
            left: layout.centerX - layout.hitRadius,
            top: layout.centerY - layout.hitRadius,
            width: layout.hitRadius * 2,
          },
        ]}
      >
        <View style={styles.button}>
          <NativeDrawingIcon name="refresh" size={16} color="#d1d4dc" strokeWidth={2} />
        </View>
      </View>
    </Animated.View>
  );
}

export const NativeResetViewButtonOverlay = React.memo(NativeResetViewButtonOverlayImpl);
NativeResetViewButtonOverlay.displayName = 'NativeResetViewButtonOverlay';

const styles = StyleSheet.create({
  overlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 30,
  },
  hitArea: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    zIndex: 31,
  },
  button: {
    alignItems: 'center',
    backgroundColor: 'rgba(60, 60, 70, 0.85)',
    borderRadius: NATIVE_RESET_VIEW_BUTTON_SIZE / 2,
    height: NATIVE_RESET_VIEW_BUTTON_SIZE,
    justifyContent: 'center',
    position: 'absolute',
    width: NATIVE_RESET_VIEW_BUTTON_SIZE,
  },
});
