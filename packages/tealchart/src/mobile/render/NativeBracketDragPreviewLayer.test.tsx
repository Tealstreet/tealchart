import type { ReactElement, ReactNode } from 'react';
import type { NativeBracketDragSharedValues } from '../interaction/nativeOemsDragState';

import { matchFont, Line as SkiaLine } from '@shopify/react-native-skia';
import { describe, expect, it } from 'vitest';

import {
  AnimatedBracketDragPreview,
  formatNativeBracketPartialPreviewLabel,
  NativePartialBoundaryLine,
  NativePartialMarker,
  NATIVE_BRACKET_PARTIAL_MARKER_TEXTS,
  resolveNativePartialSurfaceTops,
  resolveNativeBracketPartialMarkerOffset,
  shouldShowNativeBracketPartialMarker,
} from './NativeBracketDragPreviewLayer';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { NativePriceAxisTagAnimatedText, NativePriceAxisTagBox } from './NativePriceAxisTag';
import { DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR } from '../../constants';

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
    activeDragStartY: shared(200),
    activeDragCurrentY: shared(200),
    activePositionNotional: shared(2500),
    activePositionIsLong: shared(true),
    activePartialPercent: shared(100),
    activePartialEnabled: shared(false),
    activeColor: shared('#12c48b'),
    activeLineColor: shared('#f97316'),
  };
}

describe('partial preview surface placement', () => {
  const pane = { paneBottom: 400, paneTop: 0 };
  const sizes = { labelHeight: 22, markerHeight: 18 };
  const clearance = 44;

  // The markers and pill are read while the finger is down, so both have to
  // clear the fingertip, not merely miss the drag zone.
  it('keeps both surfaces a thumb away from the finger', () => {
    const down = resolveNativePartialSurfaceTops({ draggingDown: true, fingerY: 200, ...sizes, ...pane });

    expect(down.markerTop).toBeGreaterThanOrEqual(200 + clearance);
    expect(down.labelTop + sizes.labelHeight).toBeLessThanOrEqual(200 - clearance);
  });

  it('mirrors the sides when dragging up', () => {
    const up = resolveNativePartialSurfaceTops({ draggingDown: false, fingerY: 200, ...sizes, ...pane });

    expect(up.markerTop + sizes.markerHeight).toBeLessThanOrEqual(200 - clearance);
    expect(up.labelTop).toBeGreaterThanOrEqual(200 + clearance);
  });

  // Resolved as a pair for this reason: independently, both fall back to the
  // same side near an edge and land on top of each other.
  it('stacks rather than overlapping when one side has no room', () => {
    const nearBottom = resolveNativePartialSurfaceTops({ draggingDown: true, fingerY: 380, ...sizes, ...pane });
    const markerSpan = [nearBottom.markerTop, nearBottom.markerTop + sizes.markerHeight];
    const labelSpan = [nearBottom.labelTop, nearBottom.labelTop + sizes.labelHeight];

    // Both are forced above the finger here; which one ends up outermost does
    // not matter, only that they do not sit on top of each other.
    const overlaps = markerSpan[0] < labelSpan[1] && labelSpan[0] < markerSpan[1];
    expect(overlaps).toBe(false);
    expect(markerSpan[1]).toBeLessThanOrEqual(380);
    expect(labelSpan[1]).toBeLessThanOrEqual(380);
  });

  // The pane can be shorter than the two surfaces plus their clearance. They
  // still must not be drawn on top of each other - unreadable beats cramped.
  it('never overlaps the two surfaces, at any pane height or finger position', () => {
    for (let paneBottom = 60; paneBottom <= 420; paneBottom += 20) {
      for (let fingerY = 0; fingerY <= paneBottom; fingerY += 10) {
        for (const draggingDown of [true, false]) {
          const tops = resolveNativePartialSurfaceTops({
            draggingDown,
            fingerY,
            ...sizes,
            paneBottom,
            paneTop: 0,
          });
          const overlaps =
            tops.markerTop < tops.labelTop + sizes.labelHeight &&
            tops.labelTop < tops.markerTop + sizes.markerHeight;

          expect({ draggingDown, fingerY, overlaps, paneBottom }).toEqual({
            draggingDown,
            fingerY,
            overlaps: false,
            paneBottom,
          });
        }
      }
    }
  });
});

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
    expect(labels[0].props.text.value).toBe('63,777');
    expect(labels[0].props.maxCharacters).toBeGreaterThanOrEqual('63,777'.length);
  });

  // Web's preview tag fills solid with the bracket colour and writes dark text
  // on it (ChartCore._drawBracketPreviewPriceAxisLabel), and so does the real
  // bracket line's tag via `label.filled`. This one drew a dark box with a
  // coloured outline, which made the tag the user is actually watching the only
  // one styled differently.
  it('fills the drag tag with the bracket colour rather than outlining a dark box', () => {
    const layer = AnimatedBracketDragPreview({
      axisFont: matchFont({ fontSize: 11 }),
      dragState: bracketDragState(),
      frame,
      pricePrecision: 0,
      resolvedPriceAxisTags: shared([]),
      sharedViewport,
    });
    const boxes = collectElementsByType(layer, NativePriceAxisTagBox);
    const labels = collectElementsByType(layer, NativePriceAxisTagAnimatedText);

    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.backgroundColor.value).toBe('#f97316');
    expect(boxes[0].props.borderColor.value).toBe('#f97316');
    expect(labels[0].props.color).toBe(DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR);
  });

  // The button fill is tinted down to sit behind label text, so stroking the
  // price line with it left the drag with no visible line at all.
  it('strokes the drag price line with the bracket colour, not the tinted button fill', () => {
    const layer = AnimatedBracketDragPreview({
      axisFont: matchFont({ fontSize: 11 }),
      dragState: bracketDragState(),
      frame,
      pricePrecision: 0,
      resolvedPriceAxisTags: shared([]),
      sharedViewport,
    });
    const lines = collectElementsByType(layer, SkiaLine);
    const priceLine = lines[0];

    expect(priceLine.props.color.value).toBe('#f97316');
    expect(priceLine.props.strokeWidth).toBeGreaterThan(1);
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
    expect(labels[0].props.text.value).toBe('63,777');
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
    expect(labels[0].props.text.value).toBe('63,777');
  });
});
