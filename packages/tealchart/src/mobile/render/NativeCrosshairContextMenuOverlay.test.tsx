import type { ReactElement, ReactNode } from 'react';

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import {
  NativeCrosshairContextMenuOverlayImpl,
  resolveNativeContextMenuHostContentLayout,
  resolveNativeContextMenuOverlayLayout,
} from './NativeCrosshairContextMenuOverlay';

interface TestElementProps {
  accessibilityState?: unknown;
  children?: ReactNode;
  disabled?: boolean;
  onPress?: (event?: { stopPropagation?: () => void }) => void;
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

describe('NativeCrosshairContextMenuOverlay', () => {
  it('clamps the menu inside the native chart viewport', () => {
    expect(
      resolveNativeContextMenuOverlayLayout({
        anchorX: 360,
        anchorY: 430,
        dimensions: { width: 390, height: 480 },
        items: [
          { position: 'top', text: 'One', click: vi.fn() },
          { position: 'top', text: 'Two', click: vi.fn() },
          { position: 'top', text: 'Three', click: vi.fn() },
          { position: 'top', text: 'Four', click: vi.fn() },
          { position: 'top', text: 'Five', click: vi.fn() },
        ],
        itemCount: 5,
      }),
    ).toEqual({ left: 172, top: 292, width: 176 });
  });

  it('renders callback items and closes after enabled item press', () => {
    const click = vi.fn();
    const close = vi.fn();
    const overlay = NativeCrosshairContextMenuOverlayImpl({
      backgroundColor: '#131722',
      dimensions: { width: 390, height: 480 },
      menu: {
        anchorX: 300,
        anchorY: 100,
        items: [
          { position: 'top', text: 'Conditional Buy', click },
          { position: 'top', text: 'Disabled', click: vi.fn(), enabled: false },
        ],
      },
      onClose: close,
      renderOptions: { gridColor: '#363a45' },
      textColor: '#d1d4dc',
    });
    const pressables = collectElementsByType(overlay, Pressable);
    const views = collectElementsByType(overlay, View);
    const texts = collectElementsByType(overlay, Text);

    expect(flattenStyle(views[0].props.style)).toEqual(
      expect.objectContaining({
        backgroundColor: '#20232d',
        borderColor: '#363a45',
        left: 112,
        width: 176,
      }),
    );
    expect(texts.map((text) => text.props.children)).toEqual(['Conditional Buy', 'Disabled']);
    pressables[1].props.onPress?.({ stopPropagation: vi.fn() });
    expect(click).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(pressables[2].props.disabled).toBe(true);
    expect(pressables[2].props.accessibilityState).toEqual({ disabled: true });
  });
});

describe('NativeCrosshairContextMenuOverlay host content', () => {
  it('hides host content while its native layout has not been measured', () => {
    const overlay = NativeCrosshairContextMenuOverlayImpl({
      backgroundColor: '#131722',
      dimensions: { width: 390, height: 480 },
      menu: {
        anchorX: 300,
        anchorY: 100,
        content: React.createElement(Text, null, 'Quick order'),
        items: [],
      },
      onClose: vi.fn(),
      renderOptions: { gridColor: '#363a45' },
      textColor: '#d1d4dc',
    });
    const views = collectElementsByType(overlay, View);
    const style = flattenStyle(views[0].props.style);
    const texts = collectElementsByType(overlay, Text);

    expect(style.right).toBe(102);
    expect(style.opacity).toBe(0);
    expect(style.width).toBeUndefined();
    expect(style.left).toBeUndefined();
    expect(texts.map((text) => text.props.children)).toContain('Quick order');
  });

  it('clamps measured host content inside the native chart viewport', () => {
    expect(
      resolveNativeContextMenuHostContentLayout({
        anchorX: 375,
        anchorY: 430,
        contentSize: { width: 268, height: 86 },
        dimensions: { width: 390, height: 480 },
      }),
    ).toEqual({ left: 95, maxHeight: 86, top: 386, width: 268 });

    const overlay = NativeCrosshairContextMenuOverlayImpl({
      backgroundColor: '#131722',
      dimensions: { width: 390, height: 480 },
      hostContentSize: { width: 268, height: 86 },
      menu: {
        anchorX: 375,
        anchorY: 430,
        content: React.createElement(Text, null, 'Quick order'),
        items: [],
      },
      onClose: vi.fn(),
      renderOptions: { gridColor: '#363a45' },
      textColor: '#d1d4dc',
    });
    const views = collectElementsByType(overlay, View);
    const style = flattenStyle(views[0].props.style);

    expect(style.left).toBe(95);
    expect(style.maxHeight).toBe(86);
    expect(style.top).toBe(386);
    expect(style.width).toBe(268);
    expect(style.right).toBeUndefined();
    expect(style.opacity).toBeUndefined();
  });

  it('caps oversized measured host content to the native chart viewport', () => {
    expect(
      resolveNativeContextMenuHostContentLayout({
        anchorX: 120,
        anchorY: 40,
        contentSize: { width: 480, height: 700 },
        dimensions: { width: 390, height: 480 },
      }),
    ).toEqual({ left: 8, maxHeight: 464, top: 8, width: 374 });
  });
});
