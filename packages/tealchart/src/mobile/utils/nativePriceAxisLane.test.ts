import { describe, expect, it } from 'vitest';

import {
  DEFAULT_NATIVE_PRICE_AXIS_WIDTH,
  createNativePriceAxisLane,
  createNativePriceAxisLaneWidth,
  getNativePriceAxisLaneUsableWidth,
  measureNativePriceAxisTagWidth,
} from './nativePriceAxisLane';
import { NATIVE_PRICE_AXIS_COUNTDOWN_SAMPLE } from './priceAxisTagLayout';
import { measureNativeTradeLinePriceLabelWidth } from './tradeLineLayout';

describe('native price-axis lane', () => {
  it('does not reserve for fake six-digit prices before actual labels are measured', () => {
    const textWidth = (text: string) => text.length * 7;
    const laneWidth = createNativePriceAxisLaneWidth({ pricePrecision: 0.000001, textWidth });
    const usableWidth = getNativePriceAxisLaneUsableWidth(laneWidth);
    const fakeCapacityWidth = measureNativeTradeLinePriceLabelWidth('999,999.000000', textWidth);

    expect(laneWidth).toBeGreaterThanOrEqual(DEFAULT_NATIVE_PRICE_AXIS_WIDTH);
    expect(usableWidth).toBeLessThan(fakeCapacityWidth);
  });

  it('grows from actual measured labels', () => {
    const textWidth = (text: string) => text.length * 7;
    const laneWidth = createNativePriceAxisLaneWidth({
      pricePrecision: 0.000001,
      measurementTexts: ['0.747370', '0.770000'],
      textWidth,
    });
    const usableWidth = getNativePriceAxisLaneUsableWidth(laneWidth);

    expect(usableWidth).toBeGreaterThanOrEqual(measureNativeTradeLinePriceLabelWidth('0.770000', textWidth));
    expect(usableWidth).toBeLessThan(measureNativeTradeLinePriceLabelWidth('999,999.000000', textWidth));
  });

  it('reserves enough lane width for two-line price-axis countdown tags', () => {
    const textWidth = (text: string) => text.length * 7;
    const laneWidth = createNativePriceAxisLaneWidth({ pricePrecision: 0, textWidth });
    const usableWidth = getNativePriceAxisLaneUsableWidth(laneWidth);

    expect(usableWidth).toBeGreaterThanOrEqual(measureNativePriceAxisTagWidth(NATIVE_PRICE_AXIS_COUNTDOWN_SAMPLE, textWidth));
  });

  it('only grows low-precision markets when semantic tag samples require it', () => {
    const width = createNativePriceAxisLaneWidth({ pricePrecision: 0 });

    expect(width).toBeGreaterThanOrEqual(DEFAULT_NATIVE_PRICE_AXIS_WIDTH);
    expect(getNativePriceAxisLaneUsableWidth(width)).toBeGreaterThanOrEqual(
      measureNativePriceAxisTagWidth(NATIVE_PRICE_AXIS_COUNTDOWN_SAMPLE),
    );
  });

  it('derives drawable lane bounds from the same inset contract as the reserved margin', () => {
    const lane = createNativePriceAxisLane({
      priceAxisLeft: 310,
      dimensions: { width: 390 },
    });

    expect(lane).toEqual({
      left: 311,
      right: 389,
      width: 78,
    });
  });
});
