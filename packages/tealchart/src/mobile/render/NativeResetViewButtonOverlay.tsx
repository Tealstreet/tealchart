import type { NativeResetViewButtonLayout } from '../interaction/nativeResetViewButton';

import React from 'react';

import { StyleSheet, View } from 'react-native';

import { NATIVE_RESET_VIEW_BUTTON_SIZE } from '../interaction/nativeResetViewButton';
import { NativeDrawingIcon } from './NativeDrawingIcon';

export interface NativeResetViewButtonOverlayProps {
  layout: NativeResetViewButtonLayout;
}

export function NativeResetViewButtonOverlayImpl({ layout }: NativeResetViewButtonOverlayProps) {
  return (
    <View pointerEvents="none" style={styles.overlay}>
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
    </View>
  );
}

export const NativeResetViewButtonOverlay = React.memo(NativeResetViewButtonOverlayImpl);
NativeResetViewButtonOverlay.displayName = 'NativeResetViewButtonOverlay';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
