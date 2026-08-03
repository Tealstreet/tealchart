import { describe, expect, it } from 'vitest';

import {
  createNativeChartFrame,
  nativeXToTime,
  nativeYToPrice,
  priceToNativeY,
  timeToNativeX,
  type ChartDimensions,
  type PaneInfo,
} from './coordinates';
import { isPointInNativePlot, isPointInNativePriceAxis } from '../render/nativeChartFrame';

const dimensions: ChartDimensions = {
  width: 390,
  height: 520,
  margins: { bottom: 32, left: 8, right: 52, top: 20 },
};

const mainPane: PaneInfo = {
  id: 'main',
  type: 'main',
  top: 0,
  height: 300,
  yMin: 63000,
  yMax: 66000,
};

describe('native chart frame coordinates', () => {
  it('maps prices with the main pane height used by chart pan commits', () => {
    const frame = createNativeChartFrame(dimensions, mainPane);

    expect(priceToNativeY(66000, frame)).toBe(0);
    expect(priceToNativeY(64500, frame)).toBe(150);
    expect(priceToNativeY(63000, frame)).toBe(300);
    expect(nativeYToPrice(180, frame)).toBe(64200);
  });

  it('maps time over the explicit time content width used by the renderer', () => {
    const frame = createNativeChartFrame(dimensions, mainPane);
    const viewport = {
      startTime: 1_000,
      endTime: 2_000,
      priceMin: 63000,
      priceMax: 66000,
    };

    expect(frame.contentLeft).toBe(dimensions.margins.left);
    expect(frame.contentRight).toBe(dimensions.width);
    expect(frame.priceAxisLeft).toBe(dimensions.width - dimensions.margins.right);
    expect(frame.priceAxisRight).toBe(dimensions.width);
    expect(frame.priceAxisHitLeft).toBe(dimensions.width - 28);
    expect(frame.contentRight).toBe(dimensions.width);
    expect(frame.contentWidth).toBe(dimensions.width - dimensions.margins.left);
    expect(timeToNativeX(1_500, viewport, frame)).toBe(199);
    expect(nativeXToTime(199, viewport, frame)).toBe(1_500);
  });

  it('keeps native time content independent from the transparent price-axis lane', () => {
    const frame = createNativeChartFrame(dimensions, mainPane);
    const widePriceLaneFrame = createNativeChartFrame(
      {
        ...dimensions,
        margins: { ...dimensions.margins, right: 96 },
      },
      mainPane,
    );

    expect(frame.contentRight).toBe(frame.priceAxisRight);
    expect(frame.priceAxisLeft).toBeLessThan(frame.contentRight);
    expect(frame.priceAxisHitLeft).toBeGreaterThan(frame.priceAxisLeft);
    expect(widePriceLaneFrame.contentRight).toBe(frame.contentRight);
    expect(widePriceLaneFrame.contentWidth).toBe(frame.contentWidth);
    expect(widePriceLaneFrame.priceAxisLeft).toBe(dimensions.width - 96);
    expect(widePriceLaneFrame.priceAxisHitLeft).toBe(frame.priceAxisHitLeft);
  });

  it('separates transparent price-label lane taps from the fixed price-scale strip', () => {
    const frame = createNativeChartFrame(dimensions, mainPane);

    expect(isPointInNativePlot(frame, frame.priceAxisLeft + 1, 120)).toBe(true);
    expect(isPointInNativePlot(frame, frame.priceAxisHitLeft, 120)).toBe(false);
    expect(isPointInNativePriceAxis(frame, frame.priceAxisHitLeft, 120)).toBe(true);
    expect(isPointInNativePriceAxis(frame, frame.priceAxisHitLeft - 1, 120)).toBe(false);
  });
});
