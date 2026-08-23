import type { ReactNode } from 'react';
import type { GestureResponderEvent } from 'react-native';
import type { ContextMenuItem, RenderOptions } from '../../types';

import React from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';

const NATIVE_CONTEXT_MENU_MIN_WIDTH = 176;
const NATIVE_CONTEXT_MENU_MAX_WIDTH = 236;
const NATIVE_CONTEXT_MENU_ROW_HEIGHT = 34;
const NATIVE_CONTEXT_MENU_PADDING_X = 5;
const NATIVE_CONTEXT_MENU_PADDING_Y = 5;
const NATIVE_CONTEXT_MENU_MARGIN = 8;
const NATIVE_CONTEXT_MENU_ANCHOR_GAP = 12;
const NATIVE_CONTEXT_MENU_TEXT_CHARACTER_WIDTH = 8;
const NATIVE_CONTEXT_MENU_TEXT_HORIZONTAL_PADDING = 28;
const NATIVE_HOST_CONTENT_FALLBACK_WIDTH = 228;
const NATIVE_HOST_CONTENT_FALLBACK_HEIGHT = 66;

export interface NativeCrosshairContextMenuState {
  anchorX: number;
  anchorY: number;
  items: ContextMenuItem[];
  /** Set instead of `items` when the host renders the menu itself. */
  content?: ReactNode;
  contentHeight?: number;
  contentWidth?: number;
}

export interface NativeContextMenuOverlayLayout {
  left: number;
  top: number;
  width: number;
}

export interface NativeHostContentPlacement {
  left: number;
  top: number;
}

export interface NativeCrosshairContextMenuOverlayProps {
  backgroundColor: string;
  dimensions: { width: number; height: number };
  hostContentSize?: { width: number; height: number } | null;
  menu: NativeCrosshairContextMenuState;
  onHostContentLayout?: (size: { width: number; height: number }) => void;
  onClose: () => void;
  renderOptions: RenderOptions;
  textColor: string;
}

export function resolveNativeContextMenuOverlayLayout({
  anchorX,
  anchorY,
  dimensions,
  items,
  itemCount,
}: {
  anchorX: number;
  anchorY: number;
  dimensions: { width: number; height: number };
  items?: readonly ContextMenuItem[];
  itemCount: number;
}): NativeContextMenuOverlayLayout {
  const longestTextLength = Math.max(0, ...(items ?? []).map((item) => item.text.length));
  const preferredWidth = Math.max(
    NATIVE_CONTEXT_MENU_MIN_WIDTH,
    Math.min(
      NATIVE_CONTEXT_MENU_MAX_WIDTH,
      longestTextLength * NATIVE_CONTEXT_MENU_TEXT_CHARACTER_WIDTH + NATIVE_CONTEXT_MENU_TEXT_HORIZONTAL_PADDING,
    ),
  );
  const width = Math.min(preferredWidth, Math.max(0, dimensions.width - NATIVE_CONTEXT_MENU_MARGIN * 2));
  const height = itemCount * NATIVE_CONTEXT_MENU_ROW_HEIGHT + NATIVE_CONTEXT_MENU_PADDING_Y * 2;
  const left = Math.min(
    Math.max(NATIVE_CONTEXT_MENU_MARGIN, anchorX - width - NATIVE_CONTEXT_MENU_ANCHOR_GAP),
    Math.max(NATIVE_CONTEXT_MENU_MARGIN, dimensions.width - width - NATIVE_CONTEXT_MENU_MARGIN),
  );
  const top = Math.min(
    Math.max(NATIVE_CONTEXT_MENU_MARGIN, anchorY + NATIVE_CONTEXT_MENU_MARGIN),
    Math.max(NATIVE_CONTEXT_MENU_MARGIN, dimensions.height - height - NATIVE_CONTEXT_MENU_MARGIN),
  );

  return { left, top, width };
}

export function resolveNativeHostContentPlacement({
  anchorX,
  anchorY,
  contentHeight,
  contentWidth,
  dimensions,
}: {
  anchorX: number;
  anchorY: number;
  contentHeight?: number;
  contentWidth?: number;
  dimensions: { width: number; height: number };
}): NativeHostContentPlacement {
  const width = Math.min(
    contentWidth ?? NATIVE_HOST_CONTENT_FALLBACK_WIDTH,
    Math.max(0, dimensions.width - NATIVE_CONTEXT_MENU_MARGIN * 2),
  );
  const height = Math.min(
    contentHeight ?? NATIVE_HOST_CONTENT_FALLBACK_HEIGHT,
    Math.max(0, dimensions.height - NATIVE_CONTEXT_MENU_MARGIN * 2),
  );
  const left = Math.min(
    Math.max(NATIVE_CONTEXT_MENU_MARGIN, anchorX - width - NATIVE_CONTEXT_MENU_ANCHOR_GAP),
    Math.max(NATIVE_CONTEXT_MENU_MARGIN, dimensions.width - width - NATIVE_CONTEXT_MENU_MARGIN),
  );
  const top = Math.min(
    Math.max(NATIVE_CONTEXT_MENU_MARGIN, anchorY - height / 2),
    Math.max(NATIVE_CONTEXT_MENU_MARGIN, dimensions.height - height - NATIVE_CONTEXT_MENU_MARGIN),
  );

  return { left, top };
}

function resolveNativeContextMenuBackgroundColor(backgroundColor: string): string {
  const hex = backgroundColor.trim();
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return backgroundColor;
  const value = match[1];
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.35 ? '#20232d' : '#ffffff';
}

export function NativeCrosshairContextMenuOverlayImpl({
  backgroundColor,
  dimensions,
  hostContentSize,
  menu,
  onHostContentLayout,
  onClose,
  renderOptions,
  textColor,
}: NativeCrosshairContextMenuOverlayProps) {
  const layout = resolveNativeContextMenuOverlayLayout({
    anchorX: menu.anchorX,
    anchorY: menu.anchorY,
    dimensions,
    items: menu.items,
    itemCount: menu.items.length,
  });
  const borderColor = renderOptions.gridColor ?? '#363a45';
  const disabledColor = '#787b86';
  const menuBackgroundColor = resolveNativeContextMenuBackgroundColor(backgroundColor);

  const contentPlacement = menu.content
    ? resolveNativeHostContentPlacement({
        anchorX: menu.anchorX,
        anchorY: menu.anchorY,
        contentHeight: hostContentSize?.height ?? menu.contentHeight,
        contentWidth: hostContentSize?.width ?? menu.contentWidth,
        dimensions,
      })
    : null;

  const stopPropagation = (event: GestureResponderEvent) => {
    event.stopPropagation?.();
  };

  return (
    <Pressable pointerEvents="auto" style={styles.overlay} onPress={onClose}>
      <View
        style={
          // Host content owns everything inside the box, chrome included.
          // The wrapper measures it once and then clamps that box in-chart.
          contentPlacement
            ? [styles.hostContent, contentPlacement]
            : [
                styles.menu,
                { backgroundColor: menuBackgroundColor, borderColor },
                { left: layout.left, top: layout.top, width: layout.width },
              ]
        }
        onLayout={
          menu.content
            ? (event) => {
                const { height, width } = event.nativeEvent.layout;
                onHostContentLayout?.({ height, width });
              }
            : undefined
        }
        onStartShouldSetResponder={() => true}
      >
        {menu.content}

        {menu.items.map((item, index) => {
          const enabled = item.enabled !== false;
          return (
            <Pressable
              key={`${item.text}-${index}`}
              accessibilityRole="menuitem"
              accessibilityState={{ disabled: !enabled }}
              disabled={!enabled}
              style={({ pressed }) => [styles.item, pressed && enabled ? styles.itemPressed : null]}
              onPress={(event) => {
                stopPropagation(event);
                if (!enabled) return;
                try {
                  item.click();
                } finally {
                  onClose();
                }
              }}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.itemText,
                  {
                    color: enabled ? textColor : disabledColor,
                    opacity: enabled ? 1 : 0.7,
                  },
                ]}
              >
                {item.text}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Pressable>
  );
}

function NativeCrosshairContextMenuOverlayWithMeasurement({
  ...props
}: Omit<NativeCrosshairContextMenuOverlayProps, 'hostContentSize' | 'onHostContentLayout'>) {
  const [hostContentSize, setHostContentSize] = React.useState<{ width: number; height: number } | null>(null);

  return (
    <NativeCrosshairContextMenuOverlayImpl
      {...props}
      hostContentSize={hostContentSize}
      onHostContentLayout={(next) => {
        setHostContentSize((current) =>
          current?.height === next.height && current.width === next.width ? current : next,
        );
      }}
    />
  );
}
export const NativeCrosshairContextMenuOverlay = React.memo(NativeCrosshairContextMenuOverlayWithMeasurement);
NativeCrosshairContextMenuOverlay.displayName = 'NativeCrosshairContextMenuOverlay';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
  },
  menu: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: NATIVE_CONTEXT_MENU_PADDING_X,
    paddingVertical: NATIVE_CONTEXT_MENU_PADDING_Y,
    position: 'absolute',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  hostContent: {
    position: 'absolute',
  },
  item: {
    borderRadius: 4,
    height: NATIVE_CONTEXT_MENU_ROW_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  itemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  itemText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
});
