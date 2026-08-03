import React from 'react';

import { Pressable, StyleSheet } from 'react-native';

const NATIVE_DRAWING_CATEGORY_DISMISS_Z_INDEX = 39;

export interface NativeDrawingCategoryDismissOverlayProps {
  height: number;
  onDismiss: () => void;
  top: number;
  width: number;
}

export function NativeDrawingCategoryDismissOverlay({
  height,
  onDismiss,
  top,
  width,
}: NativeDrawingCategoryDismissOverlayProps) {
  if (height <= 0 || width <= 0) return null;

  return (
    <Pressable
      accessibilityLabel="Dismiss drawing tool menu"
      accessibilityRole="button"
      onPress={onDismiss}
      style={[
        styles.backdrop,
        {
          height,
          top,
          width,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    elevation: 5,
    left: 0,
    position: 'absolute',
    zIndex: NATIVE_DRAWING_CATEGORY_DISMISS_Z_INDEX,
  },
});
