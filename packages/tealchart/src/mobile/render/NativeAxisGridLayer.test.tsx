import type { ReactElement, ReactNode } from 'react';

import { Glyphs, Path as SkiaPath, Line as SkiaLine } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

// The layers are invoked as plain functions here, outside any renderer, so
// React's own useMemo has no dispatcher to bind to. Evaluating it eagerly is
// what a memo does on first render, which is all this test needs.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, useMemo: <T,>(factory: () => T) => factory() };
});

import { getNativeAxisTextCharacterCapacity } from '../utils/axisTickLayout';
import { NativeIndicatorPaneAxisLayerImpl } from './NativeIndicatorPaneAxisLayer';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { NativePriceGridLayer, resolveNativePriceGridSlotModel } from './NativePriceGridLayer';

/** First matching node's props, rendering intermediate components as it goes. */
function firstPropsByType(node: ReactNode, type: unknown): Record<string, unknown> | null {
  if (node === null || node === undefined || typeof node === 'boolean') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = firstPropsByType(child, type);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== 'object' || !('props' in node)) return null;

  const element = node as ReactElement<Record<string, unknown>>;
  if (element.type === type) return element.props;
  if (typeof element.type === 'function') {
    return firstPropsByType((element.type as (props: unknown) => ReactNode)(element.props), type);
  }
  return firstPropsByType(element.props.children as ReactNode, type);
}

/** Counts nodes of a type, rendering intermediate components as it goes. */
function countByType(node: ReactNode, type: unknown, seen = { total: 0 }): number {
  if (node === null || node === undefined || typeof node === 'boolean') return seen.total;
  if (Array.isArray(node)) {
    for (const child of node) countByType(child, type, seen);
    return seen.total;
  }
  if (typeof node !== 'object' || !('props' in node)) return seen.total;

  const element = node as ReactElement<{ children?: ReactNode }>;
  if (element.type === type) {
    seen.total += 1;
  } else if (typeof element.type === 'function') {
    countByType((element.type as (props: unknown) => ReactNode)(element.props), type, seen);
    return seen.total;
  }
  countByType(element.props.children, type, seen);
  return seen.total;
}
import { resolveNativeTimeGridSlotModel } from './NativeTimeGridLayer';

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 390,
    height: 420,
    margins: { bottom: 32, left: 62, right: 76, top: 24 },
  },
  panes: [{ id: 'main', type: 'main', top: 24, height: 364, yMin: 63000, yMax: 64000 }],
});

const characterWidth = 7;
const priceLabelLeft = frame.priceAxisLeft + 4;
const priceLabelRight = frame.priceAxisRight - 4;
const priceLabelMaxWidth = Math.max(0, priceLabelRight - priceLabelLeft);
const priceMaxCharacters = getNativeAxisTextCharacterCapacity(priceLabelMaxWidth, characterWidth);
const timeMaxCharacters = Math.min(8, getNativeAxisTextCharacterCapacity(frame.contentWidth, characterWidth));

describe('native axis grid layers', () => {
  it('resolves price-axis labels and grid rows from one viewport snapshot', () => {
    const rows = Array.from({ length: 4 }, (_, index) =>
      resolveNativePriceGridSlotModel({
        characterWidth,
        frame,
        index,
        labelMaxWidth: priceLabelMaxWidth,
        labelLeft: priceLabelLeft,
        maxCharacters: priceMaxCharacters,
        priceMax: 64000,
        priceMin: 63000,
        pricePrecision: 0,
      }),
    );

    expect(rows.map((row) => row.labelText)).toEqual(['63,000', '63,100', '63,200', '63,300']);
    expect(rows.every((row) => row.labelX >= frame.priceAxisLeft)).toBe(true);
    expect(
      rows.every(
        (row) => row.labelX === priceLabelLeft + (priceLabelMaxWidth - row.labelText.length * characterWidth) / 2,
      ),
    ).toBe(true);
    expect(rows.every((row) => row.labelY >= frame.mainPane.top)).toBe(true);
    expect(rows.every((row) => row.lineStart.y === row.lineEnd.y)).toBe(true);
    expect(rows.every((row) => row.lineEnd.x === frame.priceAxisRight)).toBe(true);
  });

  it('keeps price-axis labels at symbol precision for small-priced markets', () => {
    const row = resolveNativePriceGridSlotModel({
      characterWidth,
      frame,
      index: 0,
      labelMaxWidth: priceLabelMaxWidth,
      labelLeft: priceLabelLeft,
      maxCharacters: 16,
      priceMax: 0.08,
      priceMin: 0.06,
      pricePrecision: 0.000001,
    });

    expect(row.labelText).toBe('0.060000');
  });

  it('resolves time-axis labels and grid rows from one viewport snapshot', () => {
    const rows = Array.from({ length: 3 }, (_, index) =>
      resolveNativeTimeGridSlotModel({
        characterWidth,
        endTime: 16 * 60 * 60 * 1_000,
        frame,
        index,
        maxCharacters: timeMaxCharacters,
        startTime: 0,
      }),
    );

    expect(rows.filter((row) => row.visible).length).toBeGreaterThanOrEqual(2);
    expect(rows.every((row) => row.labelText !== '')).toBe(true);
    expect(rows.every((row) => row.labelX >= frame.contentLeft)).toBe(true);
    expect(rows.every((row) => row.lineStart.x === row.lineEnd.x)).toBe(true);
  });

  it('lets time-axis labels clamp against the canvas edge, not the price-label lane start', () => {
    const rightEdgeLabel = resolveNativeTimeGridSlotModel({
      characterWidth,
      endTime: 16 * 60 * 60 * 1_000,
      frame,
      index: 4,
      maxCharacters: timeMaxCharacters,
      startTime: 0,
    });

    expect(rightEdgeLabel.visible).toBe(true);
    expect(rightEdgeLabel.lineStart.x).toBe(frame.contentRight);
    expect(rightEdgeLabel.labelX).toBeGreaterThan(frame.priceAxisLeft);
    expect(rightEdgeLabel.labelX + rightEdgeLabel.labelText.length * characterWidth).toBeLessThanOrEqual(
      frame.contentRight,
    );
  });

  it('extends time-grid placement through the transparent price-label lane', () => {
    const rows = Array.from({ length: 5 }, (_, index) =>
      resolveNativeTimeGridSlotModel({
        characterWidth,
        endTime: 16 * 60 * 60 * 1_000,
        frame,
        index,
        maxCharacters: timeMaxCharacters,
        startTime: 0,
      }),
    );

    expect(rows.some((row) => row.visible && row.lineStart.x > frame.priceAxisLeft)).toBe(true);
    expect(rows.every((row) => row.lineStart.x <= frame.contentRight)).toBe(true);
  });

  it('derives time-axis label positions from the viewport range', () => {
    const firstViewportLabel = resolveNativeTimeGridSlotModel({
      characterWidth,
      endTime: 16 * 60 * 60 * 1_000,
      frame,
      index: 0,
      maxCharacters: timeMaxCharacters,
      startTime: 0,
    });
    const shiftedViewportLabel = resolveNativeTimeGridSlotModel({
      characterWidth,
      endTime: 17 * 60 * 60 * 1_000,
      frame,
      index: 0,
      maxCharacters: timeMaxCharacters,
      startTime: 1 * 60 * 60 * 1_000,
    });

    expect(firstViewportLabel.lineStart.x).toBeLessThan(shiftedViewportLabel.lineStart.x);
  });

  it('derives time-grid spacing from the viewport range', () => {
    const createLineXs = (startTime: number, endTime: number) =>
      Array.from({ length: 3 }, (_, index) =>
        resolveNativeTimeGridSlotModel({
          characterWidth,
          endTime,
          frame,
          index,
          maxCharacters: timeMaxCharacters,
          startTime,
        }),
      ).map((row) => row.lineStart.x);

    const narrowXs = createLineXs(0, 12 * 60 * 60 * 1_000);
    const wideXs = createLineXs(0, 16 * 60 * 60 * 1_000);

    expect(narrowXs[1] - narrowXs[0]).toBeGreaterThan(wideXs[1] - wideXs[0]);
  });

  // The point of merging the lines: mount and unmount happen on the React commit
  // and cannot be made late, so an element count that tracks pane height changes
  // the tree a frame before the canvas geometry follows it. One path per layer
  // makes the count invariant - the geometry moves inside the path instead.
  it('keeps the grid-line element count fixed as pane heights change', () => {
    const axisFont = {
      measureText: () => ({ width: 7 }),
      getSize: () => 10,
      getGlyphIDs: (text: string) => Array.from(text, (character) => character.codePointAt(0) ?? 0),
      getGlyphWidths: (ids: number[]) => ids.map((id) => (id >= 48 && id <= 57 ? 7 : 3)),
    } as never;
    const sharedViewport = {
      startTime: { value: 0 },
      endTime: { value: 60_000 },
      priceMin: { value: 63_000 },
      priceMax: { value: 64_000 },
    } as never;

    const framed = (mainHeight: number, indicatorHeight: number) =>
      createNativeChartFrameFromPanes({
        dimensions: frame.dimensions,
        panes: [
          { id: 'main', type: 'main', top: 24, height: mainHeight, yMin: 63000, yMax: 64000 },
          { id: 'pane_1', type: 'indicator', top: 24 + mainHeight, height: indicatorHeight, yMin: 0, yMax: 100 },
        ],
      });

    const priceGrid = (target: ReturnType<typeof framed>) =>
      NativePriceGridLayer({
        axisFont,
        frame: target,
        gridColor: '#222831',
        pricePrecision: 0.1,
        sharedViewport,
        showAxisLabels: false,
        showGridLines: true,
        textColor: '#adb1b8',
      });
    const paneAxis = (target: ReturnType<typeof framed>) =>
      NativeIndicatorPaneAxisLayerImpl({
        axisFont,
        frame: target,
        gridColor: '#222831',
        showAxisLabels: false,
        showGridLines: true,
        textColor: '#adb1b8',
      });

    const open = framed(264, 100);
    const maximized = framed(364, 0);

    for (const render of [priceGrid, paneAxis]) {
      expect(countByType(render(open), SkiaPath)).toBe(1);
      expect(countByType(render(maximized), SkiaPath)).toBe(1);
      expect(countByType(render(open), SkiaLine)).toBe(0);
    }
  });

  // The merged path passes zeroed label inputs, since it needs geometry only.
  // If that ever moved a line, the grid would silently drift off its labels.
  it('draws merged grid lines at the same y as the per-slot resolver', () => {
    const rows = Array.from({ length: 4 }, (_, index) =>
      resolveNativePriceGridSlotModel({
        characterWidth,
        frame,
        index,
        labelMaxWidth: priceLabelMaxWidth,
        labelLeft: priceLabelLeft,
        maxCharacters: priceMaxCharacters,
        priceMax: 64_000,
        priceMin: 63_000,
        pricePrecision: 0.1,
      }),
    );
    const zeroed = Array.from({ length: 4 }, (_, index) =>
      resolveNativePriceGridSlotModel({
        characterWidth: 0,
        frame,
        index,
        labelMaxWidth: 0,
        labelLeft: 0,
        maxCharacters: 0,
        priceMax: 64_000,
        priceMin: 63_000,
        pricePrecision: 0.1,
      }),
    );

    expect(zeroed.map((row) => row.visible)).toEqual(rows.map((row) => row.visible));
    expect(zeroed.map((row) => row.lineStart)).toEqual(rows.map((row) => row.lineStart));
    expect(zeroed.map((row) => row.lineEnd)).toEqual(rows.map((row) => row.lineEnd));
  });

  // slotCounts is indexed by position in the unfiltered indicator-pane list, so
  // a collapsed pane in the middle would misalign every count after it.
  it('keeps per-pane slot counts aligned when one pane collapses', () => {
    const axisFont = {
      measureText: () => ({ width: 7 }),
      getSize: () => 10,
      getGlyphIDs: (text: string) => Array.from(text, (character) => character.codePointAt(0) ?? 0),
      getGlyphWidths: (ids: number[]) => ids.map((id) => (id >= 48 && id <= 57 ? 7 : 3)),
    } as never;
    const threePanes = createNativeChartFrameFromPanes({
      dimensions: frame.dimensions,
      panes: [
        { id: 'main', type: 'main', top: 24, height: 200, yMin: 63000, yMax: 64000 },
        { id: 'pane_1', type: 'indicator', top: 224, height: 0, yMin: 0, yMax: 100 },
        { id: 'pane_2', type: 'indicator', top: 224, height: 164, yMin: 0, yMax: 50 },
      ],
    });
    const labels = NativeIndicatorPaneAxisLayerImpl({
      axisFont,
      frame: threePanes,
      gridColor: '#222831',
      showAxisLabels: true,
      showGridLines: false,
      textColor: '#adb1b8',
    });

    // slotCounts is indexed against the unfiltered pane list, so a misalignment
    // would lay pane_2's ticks out against pane_1's zero height - which is what
    // asserting on the glyph positions catches and a node count would not.
    const glyphs = firstPropsByType(labels, Glyphs)?.glyphs as { value: Array<{ pos: { y: number } }> };
    const ys = glyphs.value.map((glyph) => glyph.pos.y);

    // If the counts misindexed, pane_2's ticks would be resolved against pane_1's
    // zero height, where every slot reports invisible - so the axis would come
    // back empty. Spanning several rows is what proves they used their own pane.
    expect(ys.length).toBeGreaterThan(0);
    expect(new Set(ys).size).toBeGreaterThan(1);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(224);
    expect(Math.max(...ys)).toBeLessThanOrEqual(224 + 164);
  });
});
