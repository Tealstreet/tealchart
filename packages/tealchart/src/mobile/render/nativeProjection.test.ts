import { describe, expect, it } from 'vitest';

import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import {
  createNativeChartProjection,
  createNativeChartProjectionForPane,
  getNativePricePerPixel,
  getNativeTimePerPixel,
  nativeXToTime,
  nativeYToPrice,
  priceToNativeY,
  timeToNativeX,
} from './nativeProjection';

const viewport = {
  startTime: 1_000,
  endTime: 2_000,
  priceMin: 100,
  priceMax: 200,
};

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 500,
    height: 400,
    margins: {
      top: 10,
      right: 60,
      bottom: 30,
      left: 40,
    },
  },
  panes: [
    {
      id: 'main',
      type: 'main',
      top: 20,
      height: 240,
      yMin: 100,
      yMax: 200,
    },
    {
      id: 'rsi',
      type: 'indicator',
      top: 280,
      height: 80,
      yMin: 0,
      yMax: 100,
    },
  ],
});

describe('native chart projection', () => {
  it('round-trips time through the canonical projection', () => {
    const projection = createNativeChartProjection({ viewport, frame });
    const x = projection.timeToX(1_500);

    expect(x).toBe(timeToNativeX(1_500, viewport, frame));
    expect(projection.xToTime(x)).toBe(1_500);
    expect(nativeXToTime(x, viewport, frame)).toBe(1_500);
    expect(projection.timePerPixel).toBe(getNativeTimePerPixel(viewport, frame));
  });

  it('round-trips main-pane price through the canonical projection', () => {
    const projection = createNativeChartProjection({ viewport, frame });
    const y = projection.priceToY(150);

    expect(y).toBe(priceToNativeY(150, frame.mainPane));
    expect(projection.yToPrice(y)).toBe(150);
    expect(nativeYToPrice(y, frame.mainPane)).toBe(150);
    expect(projection.mainPane.pricePerPixel).toBe(getNativePricePerPixel(frame.mainPane));
    expect(projection.getPricePerPixel()).toBe(projection.mainPane.pricePerPixel);
  });

  it('projects candle, order label, and position label prices through the same Y contract', () => {
    const projection = createNativeChartProjection({ viewport, frame });
    const price = 163.25;

    const candleY = projection.priceToY(price);
    const orderLineY = projection.priceToY(price, 'main');
    const positionLineY = projection.mainPane.priceToY(price);

    expect(orderLineY).toBe(candleY);
    expect(positionLineY).toBe(candleY);
  });

  it('keeps indicator panes pane-local while main pane follows the viewport', () => {
    const projection = createNativeChartProjection({
      viewport: {
        ...viewport,
        priceMin: 50,
        priceMax: 250,
      },
      frame,
    });

    expect(projection.priceToY(150)).toBe(140);
    expect(projection.priceToY(50, 'rsi')).toBe(320);
    expect(projection.yToPrice(320, 'rsi')).toBe(50);
    expect(projection.getPricePerPixel('rsi')).toBe(1.25);
  });

  it('supports explicit pane ranges for future indicator live projections', () => {
    const projection = createNativeChartProjection({
      viewport,
      frame,
      paneRanges: {
        rsi: {
          yMin: -50,
          yMax: 150,
        },
      },
    });

    expect(projection.priceToY(50, 'rsi')).toBe(320);
    expect(projection.yToPrice(320, 'rsi')).toBe(50);
  });

  it('returns null when a pane projection is requested for a non-existent frame pane', () => {
    const projection = createNativeChartProjection({ viewport, frame });

    expect(createNativeChartProjectionForPane(projection, 'missing')).toBeNull();
  });

  it('exposes projection-derived pixel conversion rates for runtime transforms', () => {
    const projection = createNativeChartProjection({ viewport, frame });

    expect(projection.timePerPixel).toBeCloseTo(1_000 / frame.contentWidth);
    expect(projection.getPricePerPixel()).toBeCloseTo(100 / 240);
    expect(projection.getPricePerPixel('missing')).toBe(projection.getPricePerPixel());
  });

  it('rejects non-finite projection inputs at the projection boundary', () => {
    const projection = createNativeChartProjection({ viewport, frame });

    expect(() => projection.timeToX(Number.NaN)).toThrow('time');
    expect(() => projection.priceToY(Number.POSITIVE_INFINITY)).toThrow('price');
    expect(() =>
      createNativeChartProjection({
        viewport: {
          ...viewport,
          priceMin: Number.NaN,
        },
        frame,
      }),
    ).toThrow('pane.yMin');
  });

  it('rejects non-finite frame and pane geometry before returning rates or coordinates', () => {
    expect(() =>
      getNativeTimePerPixel(viewport, {
        ...frame,
        contentWidth: Number.NaN,
      }),
    ).toThrow('frame.contentWidth');

    expect(() =>
      priceToNativeY(150, {
        ...frame.mainPane,
        top: Number.POSITIVE_INFINITY,
      }),
    ).toThrow('pane.top');

    expect(() =>
      getNativePricePerPixel({
        ...frame.mainPane,
        height: Number.NaN,
      }),
    ).toThrow('pane.height');
  });
});
