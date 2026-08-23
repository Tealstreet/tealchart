import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import React from 'react';

import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';

export interface NativeFloatingAnchor {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface NativeWindowDimensions {
  height: number;
  width: number;
}

export interface NativeAnchoredSurfacePosition {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
}

export interface ResolveNativeAnchoredSurfacePositionOptions {
  anchor?: NativeFloatingAnchor | null;
  fallbackLeft?: number;
  fallbackTop?: number;
  gap?: number;
  margin?: number;
  maxHeight?: number;
  maxWidth?: number;
  minHeight?: number;
  minWidth?: number;
  preferredWidth: number;
  viewport: NativeWindowDimensions;
}

export function getNativeWindowDimensionsFallback(fallbackWidth: number): NativeWindowDimensions {
  const measured = (
    Dimensions as { get?: (dimension: 'window') => { height: number; width: number } } | undefined
  )?.get?.('window');
  return measured ?? { height: 844, width: fallbackWidth };
}

export function resolveNativeAnchoredSurfacePosition({
  anchor,
  fallbackLeft = 0,
  fallbackTop = 0,
  gap = 4,
  margin = 8,
  maxHeight = 420,
  maxWidth,
  minHeight = 180,
  minWidth = 0,
  preferredWidth,
  viewport,
}: ResolveNativeAnchoredSurfacePositionOptions): NativeAnchoredSurfacePosition {
  const availableWidth = Math.max(0, viewport.width - margin * 2);
  const width = Math.min(Math.max(minWidth, preferredWidth), maxWidth ?? preferredWidth, availableWidth);
  const desiredLeft = anchor ? anchor.x + anchor.width - width : fallbackLeft;
  const left = Math.min(Math.max(margin, desiredLeft), Math.max(margin, viewport.width - width - margin));
  const desiredTop = anchor ? anchor.y + anchor.height + gap : fallbackTop;
  const top = Math.min(Math.max(margin, desiredTop), Math.max(margin, viewport.height - minHeight - margin));
  const maxAvailableHeight = Math.max(minHeight, viewport.height - top - margin);
  const resolvedMaxHeight = Math.min(maxHeight, maxAvailableHeight);

  return { left, maxHeight: resolvedMaxHeight, top, width };
}

export interface NativeAnchoredFloatingSurfaceProps {
  anchor?: NativeFloatingAnchor | null;
  backgroundColor: string;
  borderColor: string;
  children: ReactNode | ((position: NativeAnchoredSurfacePosition) => ReactNode);
  fallbackLeft?: number;
  fallbackTop?: number;
  fallbackViewportWidth: number;
  gap?: number;
  margin?: number;
  maxHeight?: number;
  maxWidth?: number;
  minHeight?: number;
  minWidth?: number;
  onRequestClose: () => void;
  preferredWidth: number;
  style?: StyleProp<ViewStyle>;
  visible: boolean;
}

export function NativeAnchoredFloatingSurface({
  anchor,
  backgroundColor,
  borderColor,
  children,
  fallbackLeft,
  fallbackTop,
  fallbackViewportWidth,
  gap,
  margin,
  maxHeight,
  maxWidth,
  minHeight,
  minWidth,
  onRequestClose,
  preferredWidth,
  style,
  visible,
}: NativeAnchoredFloatingSurfaceProps) {
  if (!visible) return null;

  const viewport = getNativeWindowDimensionsFallback(fallbackViewportWidth);
  const position = resolveNativeAnchoredSurfacePosition({
    anchor,
    fallbackLeft,
    fallbackTop,
    gap,
    margin,
    maxHeight,
    maxWidth,
    minHeight,
    minWidth,
    preferredWidth,
    viewport,
  });

  return (
    <Modal animationType="none" transparent visible onRequestClose={onRequestClose}>
      <Pressable
        accessibilityLabel="Close floating chart overlay"
        accessibilityRole="button"
        onPress={onRequestClose}
        style={styles.backdrop}
      />
      <View
        pointerEvents="auto"
        style={[
          styles.surface,
          {
            backgroundColor,
            borderColor,
            left: position.left,
            maxHeight: position.maxHeight,
            top: position.top,
            width: position.width,
          },
          style,
        ]}
      >
        {typeof children === 'function' ? children(position) : children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  surface: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'absolute',
  },
});
