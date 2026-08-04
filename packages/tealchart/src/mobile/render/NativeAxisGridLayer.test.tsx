import { describe, expect, it } from 'vitest';

import { getNativeAxisTextCharacterCapacity } from '../utils/axisTickLayout';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { resolveNativePriceGridSlotModel } from './NativePriceGridLayer';
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
const priceLabelRight = frame.priceAxisRight - 4;
const priceLabelMaxWidth = Math.max(0, priceLabelRight - (frame.priceAxisLeft + 4));
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
        labelRight: priceLabelRight,
        maxCharacters: priceMaxCharacters,
        priceMax: 64000,
        priceMin: 63000,
        pricePrecision: 0,
      }),
    );

    expect(rows.map((row) => row.labelText)).toEqual(['63,000', '63,100', '63,200', '63,300']);
    expect(rows.every((row) => row.labelX >= frame.priceAxisLeft)).toBe(true);
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
      labelRight: priceLabelRight,
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
});
