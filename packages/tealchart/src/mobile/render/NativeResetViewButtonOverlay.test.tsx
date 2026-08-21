import type { ReactElement, ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { View } from 'react-native';
import { describe, expect, it } from 'vitest';

import { NativeDrawingIcon } from './NativeDrawingIcon';
import { NativeResetViewButtonOverlayImpl } from './NativeResetViewButtonOverlay';

interface TestElementProps {
  children?: ReactNode;
  style?: unknown;
}

type TestElement = ReactElement<TestElementProps>;

function walkElements(node: ReactNode, visitor: (element: TestElement) => void): void {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (Array.isArray(node)) {
    for (const child of node) walkElements(child, visitor);
    return;
  }
  if (typeof node !== 'object' || !('props' in node)) return;

  const element = node as TestElement;
  visitor(element);
  walkElements(element.props.children as ReactNode, visitor);
}

function collectElementsByType(root: ReactNode, type: unknown): TestElement[] {
  const elements: TestElement[] = [];
  walkElements(root, (element) => {
    if (element.type === type) elements.push(element);
  });
  return elements;
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return style && typeof style === 'object' ? (style as Record<string, unknown>) : {};
}

describe('NativeResetViewButtonOverlay', () => {
  it('draws the full reset hit radius as a visual-only overlay', () => {
    const overlay = NativeResetViewButtonOverlayImpl({
      layout: { centerX: 180, centerY: 300, radius: 14, hitRadius: 50 },
      visible: { value: false } as SharedValue<boolean>,
    });
    // The root is an Animated.View now - it stays mounted and fades - so the
    // plain Views below it are the hit area and the button itself.
    const views = collectElementsByType(overlay, View);
    const hitArea = views.find((view) => flattenStyle(view.props.style).height === 100);
    const visualButton = views.find((view) => flattenStyle(view.props.style).height === 28);
    const icon = collectElementsByType(overlay, NativeDrawingIcon)[0];

    expect(overlay.props.pointerEvents).toBe('none');
    expect(flattenStyle(overlay.props.style)).toEqual(expect.objectContaining({ zIndex: 30 }));
    expect(flattenStyle(hitArea?.props.style)).toEqual(
      expect.objectContaining({
        height: 100,
        left: 130,
        top: 250,
        width: 100,
        zIndex: 31,
      }),
    );
    expect(flattenStyle(visualButton?.props.style)).toEqual(
      expect.objectContaining({
        height: 28,
        width: 28,
      }),
    );
    expect(icon.props.name).toBe('refresh');
  });
});
