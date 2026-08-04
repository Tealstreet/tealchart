import type { ReactElement, ReactNode } from 'react';
import type { NativeBracketDragSharedValues } from '../interaction/nativeOemsDragState';

import { matchFont } from '@shopify/react-native-skia';
import { describe, expect, it } from 'vitest';

import {
  AnimatedBracketDragPreview,
  formatNativeBracketPartialPreviewLabel,
  NativePartialBoundaryLine,
  NativePartialMarker,
  NATIVE_BRACKET_PARTIAL_MARKER_TEXTS,
  resolveNativeBracketPartialMarkerOffset,
  shouldShowNativeBracketPartialMarker,
} from './NativeBracketDragPreviewLayer';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { NativePriceAxisTagAnimatedText } from './NativePriceAxisTag';

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
    activeEntryPrice: shared(63500),
    activeDragStartX: shared(270),
    activeDragCurrentX: shared(270),
    activePositionNotional: shared(2500),
    activePositionIsLong: shared(true),
    activePartialPercent: shared(100),
    activePartialEnabled: shared(false),
    activeColor: shared('#12c48b'),
  };
}

describe('AnimatedBracketDragPreview', () => {
  it('formats position partial previews with PnL and distance context', () => {
    expect(
      formatNativeBracketPartialPreviewLabel({
        bracketType: 'tp',
        entryPrice: 100,
        isLong: true,
        notional: 1_000,
        partialPercent: 50,
        price: 110,
      }),
    ).toBe('+$50.00 | 50% Partial TP | +10.00%');
  });

  it('formats order partial previews without fake PnL', () => {
    expect(
      formatNativeBracketPartialPreviewLabel({
        bracketType: 'sl',
        entryPrice: 100,
        isLong: true,
        notional: 0,
        partialPercent: 75,
        price: 90,
      }),
    ).toBe('75% Partial SL | -10.00%');
  });

  it('hides inactive partial markers that would clamp into the active marker', () => {
    expect(resolveNativeBracketPartialMarkerOffset(10, 1)).toBe(220);
    expect(resolveNativeBracketPartialMarkerOffset(50, -1)).toBe(-110);
    expect(
      shouldShowNativeBracketPartialMarker({
        activeCenter: 540,
        activeWidth: 36,
        isActive: false,
        markerCenter: 528,
        markerWidth: 42,
        zoneLeft: 100,
        zoneRight: 560,
      }),
    ).toBe(false);
    expect(
      shouldShowNativeBracketPartialMarker({
        activeCenter: 540,
        activeWidth: 36,
        isActive: true,
        markerCenter: 590,
        markerWidth: 36,
        zoneLeft: 100,
        zoneRight: 560,
      }),
    ).toBe(true);
  });

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
    dragState.activeDragCurrentX.value = 325;

    const layer = AnimatedBracketDragPreview({
      axisFont: matchFont({ fontSize: 11 }),
      dragState,
      frame: wideFrame,
      pricePrecision: 0,
      resolvedPriceAxisTags: shared([]),
      sharedViewport,
    });
    const labels = collectElementsByType(layer, NativePriceAxisTagAnimatedText);
    const markers = collectElementsByType(layer, NativePartialMarker);
    const boundaries = collectElementsByType(layer, NativePartialBoundaryLine);

    expect(labels).toHaveLength(1);
    expect(labels[0].props.text.value).toBe('TP 63,777');
    expect(labels[0].props.maxCharacters).toBe(Number.MAX_SAFE_INTEGER);
    expect(labels[0].props.characterSet).not.toContain('%');
    expect(markers).toHaveLength(NATIVE_BRACKET_PARTIAL_MARKER_TEXTS.length);
    expect(markers.map((marker) => `${marker.props.marker.percent}%`)).toEqual(NATIVE_BRACKET_PARTIAL_MARKER_TEXTS);
    expect(boundaries).toHaveLength(NATIVE_BRACKET_PARTIAL_MARKER_TEXTS.length - 2);
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
