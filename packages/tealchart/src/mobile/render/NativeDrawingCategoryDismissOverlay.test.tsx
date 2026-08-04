import type { ReactElement } from 'react';

import { Pressable } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { NativeDrawingCategoryDismissOverlay } from './NativeDrawingCategoryDismissOverlay';

interface TestElementProps {
  accessibilityLabel?: string;
  accessibilityRole?: string;
  onPress?: () => void;
  style?: unknown;
}

type TestElement = ReactElement<TestElementProps>;

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return style && typeof style === 'object' ? (style as Record<string, unknown>) : {};
}

describe('NativeDrawingCategoryDismissOverlay', () => {
  it('renders a transparent chart-sized tap target under the drawing drawer', () => {
    const onDismiss = vi.fn();
    const overlay = NativeDrawingCategoryDismissOverlay({
      height: 440,
      onDismiss,
      top: 36,
      width: 390,
    }) as TestElement;

    expect(overlay.type).toBe(Pressable);
    expect(overlay.props.accessibilityLabel).toBe('Dismiss drawing tool menu');
    expect(overlay.props.accessibilityRole).toBe('button');
    expect(flattenStyle(overlay.props.style)).toEqual(
      expect.objectContaining({
        elevation: 5,
        height: 440,
        left: 0,
        position: 'absolute',
        top: 36,
        width: 390,
        zIndex: 39,
      }),
    );

    overlay.props.onPress?.();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not render without usable dimensions', () => {
    expect(
      NativeDrawingCategoryDismissOverlay({
        height: 0,
        onDismiss: vi.fn(),
        top: 36,
        width: 390,
      }),
    ).toBeNull();
    expect(
      NativeDrawingCategoryDismissOverlay({
        height: 440,
        onDismiss: vi.fn(),
        top: 36,
        width: 0,
      }),
    ).toBeNull();
  });
});
