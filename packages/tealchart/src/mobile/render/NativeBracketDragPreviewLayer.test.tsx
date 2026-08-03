import type { ReactElement, ReactNode } from 'react';
import type { NativeBracketDragSharedValues } from '../interaction/nativeOemsDragState';

import { describe, expect, it } from 'vitest';
import { matchFont } from '@shopify/react-native-skia';

import { AnimatedBracketDragPreview } from './NativeBracketDragPreviewLayer';
import { NativePriceAxisTagAnimatedText } from './NativePriceAxisTag';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';

function shared<T>(value: T) {
  return { value };
}

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

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 390,
    height: 420,
    margins: { bottom: 32, left: 62, right: 90, top: 24 },
  },
  panes: [{ id: 'main', type: 'main', top: 24, height: 364, yMin: 63000, yMax: 64000 }],
});

const wideFrame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 560,
    height: 420,
    margins: { bottom: 32, left: 62, right: 160, top: 24 },
  },
  panes: [{ id: 'main', type: 'main', top: 24, height: 364, yMin: 63000, yMax: 64000 }],
});

const sharedViewport = {
  startTime: shared(0),
  endTime: shared(100),
  priceMin: shared(63000),
  priceMax: shared(64000),
};

function bracketDragState(): NativeBracketDragSharedValues {
  return {
    activeObjectId: shared('position-btc'),
    activeObjectType: shared('position'),
    activeBracketType: shared('tp'),
    activePrice: shared(63777),
    activePartialPercent: shared(100),
    activePartialEnabled: shared(false),
    activeColor: shared('#12c48b'),
  };
}

describe('AnimatedBracketDragPreview', () => {
  it('emits a live bracket price-axis tag label while dragging TP or SL', () => {
    const layer = AnimatedBracketDragPreview({
      axisFont: matchFont({ fontSize: 11 }),
      dragState: bracketDragState(),
      frame,
      pricePrecision: 0,
      resolvedPriceAxisTags: shared([]),
      sharedViewport,
    });
    const labels = collectElementsByType(layer, NativePriceAxisTagAnimatedText);

    expect(labels).toHaveLength(1);
    expect(labels[0].props.text.value).toBe('TP 63,777');
    expect(labels[0].props.maxCharacters).toBeGreaterThanOrEqual('TP 63,777'.length);
  });

  it('includes partial bracket context in the live drag preview label', () => {
    const dragState = bracketDragState();
    dragState.activePartialEnabled.value = true;
    dragState.activePartialPercent.value = 75;

    const layer = AnimatedBracketDragPreview({
      axisFont: matchFont({ fontSize: 11 }),
      dragState,
      frame: wideFrame,
      pricePrecision: 0,
      resolvedPriceAxisTags: shared([]),
      sharedViewport,
    });
    const labels = collectElementsByType(layer, NativePriceAxisTagAnimatedText);

    expect(labels).toHaveLength(1);
    expect(labels[0].props.text.value).toBe('75% Partial TP 63...');
    expect(labels[0].props.characterSet).toContain('%');
    expect(labels[0].props.characterSet).toContain('Partial');
  });

  it('uses the compact bracket label when partial mode is full size', () => {
    const dragState = bracketDragState();
    dragState.activePartialEnabled.value = true;
    dragState.activePartialPercent.value = 100;

    const layer = AnimatedBracketDragPreview({
      axisFont: matchFont({ fontSize: 11 }),
      dragState,
      frame,
      pricePrecision: 0,
      resolvedPriceAxisTags: shared([]),
      sharedViewport,
    });
    const labels = collectElementsByType(layer, NativePriceAxisTagAnimatedText);

    expect(labels).toHaveLength(1);
    expect(labels[0].props.text.value).toBe('TP 63,777');
  });
});
