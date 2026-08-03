import type { ReactElement, ReactNode } from 'react';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Canvas, Group, Path, Skia } from '../../test/reactNativeSkiaMock';
import { NativeDrawingIconImpl } from './NativeDrawingIcon';

vi.mock('@shopify/react-native-skia', async () => await import('../../test/reactNativeSkiaMock'));

function walkElements(node: ReactNode, visitor: (element: ReactElement) => void): void {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (Array.isArray(node)) {
    for (const child of node) walkElements(child, visitor);
    return;
  }
  if (typeof node !== 'object' || !('props' in node)) return;

  const element = node as ReactElement;
  visitor(element);
  walkElements(element.props.children as ReactNode, visitor);
}

function collectElementsByType(root: ReactNode, type: unknown): ReactElement[] {
  const elements: ReactElement[] = [];
  walkElements(root, (element) => {
    if (element.type === type) elements.push(element);
  });
  return elements;
}

describe('NativeDrawingIcon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders shared registry icons as native Skia paths', () => {
    const icon = NativeDrawingIconImpl({
      color: '#d1d4dc',
      name: 'refresh',
      size: 16,
      strokeWidth: 2,
    });

    expect(icon).not.toBeNull();
    expect((icon as ReactElement).type).toBe(Canvas);
    expect((icon as ReactElement).props.style).toEqual([
      {
        height: 16,
        opacity: undefined,
        width: 16,
      },
      undefined,
    ]);

    expect(collectElementsByType(icon, Group)).toHaveLength(1);
    expect(collectElementsByType(icon, Path)).toHaveLength(4);
    for (const path of collectElementsByType(icon, Path)) {
      expect(path.props).toMatchObject({
        color: '#d1d4dc',
        strokeCap: 'round',
        strokeJoin: 'round',
        strokeWidth: 2,
        style: 'stroke',
      });
    }
    expect(Skia.Path.MakeFromSVGString).toHaveBeenCalledTimes(4);
  });

  it('returns null for unknown icon names', () => {
    expect(NativeDrawingIconImpl({ name: 'not-authored' })).toBeNull();
  });
});
