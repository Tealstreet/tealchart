import { describe, expect, it } from 'vitest';

import {
  DEFAULT_NATIVE_PRICE_AXIS_WIDTH,
  createNativePriceAxisLane,
  createNativePriceAxisLaneWidth,
  getNativePriceAxisLaneUsableWidth,
  measureNativePriceAxisTagWidth,
} from './nativePriceAxisLane';
import { NATIVE_PRICE_AXIS_COUNTDOWN_SAMPLE } from './priceAxisTagLayout';
import {
  getNativeTradeLinePriceLabelCapacityText,
  measureNativeTradeLinePriceLabelWidth,
} from './tradeLineLayout';

describe('native price-axis lane', () => {
  it('reserves enough lane width for configured trade-line price tags', () => {
    const textWidth = (text: string) => text.length * 7;
    const laneWidth = createNativePriceAxisLaneWidth({ pricePrecision: 2, textWidth });
    const usableWidth = getNativePriceAxisLaneUsableWidth(laneWidth);
    const capacityText = getNativeTradeLinePriceLabelCapacityText(2);

    expect(laneWidth).toBeGreaterThan(DEFAULT_NATIVE_PRICE_AXIS_WIDTH);
    expect(usableWidth).toBeGreaterThanOrEqual(measureNativeTradeLinePriceLabelWidth(`-${capacityText}`, textWidth));
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
