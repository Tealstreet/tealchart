import { describe, expect, it } from 'vitest';

import {
  formatNativePriceAxisTickWorklet,
  formatNativePriceAxisTickWithPrecisionWorklet,
  formatNativeTradeLinePriceWorklet,
  getNativePriceAxisTickDecimalsWorklet,
  getNativeTradeLinePriceDecimalsWorklet,
  normalizeNativePricePrecisionToTickSizeWorklet,
} from './nativePriceFormat';

describe('native price format worklets', () => {
  it('matches native trade-line decimal precision semantics', () => {
    expect(getNativeTradeLinePriceDecimalsWorklet(1)).toBe(0);
    expect(getNativeTradeLinePriceDecimalsWorklet(0.1)).toBe(1);
    expect(getNativeTradeLinePriceDecimalsWorklet(0.01)).toBe(2);
    expect(getNativeTradeLinePriceDecimalsWorklet(1e-4)).toBe(4);
  });

  it('normalizes decimal-count precision inputs to tick-size precision', () => {
    expect(normalizeNativePricePrecisionToTickSizeWorklet(0)).toBe(1);
    expect(normalizeNativePricePrecisionToTickSizeWorklet(2)).toBe(0.01);
    expect(normalizeNativePricePrecisionToTickSizeWorklet(6)).toBe(0.000001);
    expect(normalizeNativePricePrecisionToTickSizeWorklet(0.0001)).toBe(0.0001);
  });

  it('formats grouped prices for worklet-driven labels', () => {
    expect(formatNativeTradeLinePriceWorklet(63777, 0.1)).toBe('63,777.0');
    expect(formatNativeTradeLinePriceWorklet(60424, 0)).toBe('60,424');
    expect(formatNativeTradeLinePriceWorklet(Number.NaN, 0.01)).toBe('0.00');
  });

  it('formats price-axis ticks from tick spacing instead of symbol precision', () => {
    expect(getNativePriceAxisTickDecimalsWorklet(500)).toBe(0);
    expect(getNativePriceAxisTickDecimalsWorklet(0.5)).toBe(1);
    expect(getNativePriceAxisTickDecimalsWorklet(0.01)).toBe(2);
    expect(getNativePriceAxisTickDecimalsWorklet(1e-4)).toBe(4);

    expect(formatNativePriceAxisTickWorklet(63777, 500)).toBe('63,777');
    expect(formatNativePriceAxisTickWorklet(1.25, 0.25)).toBe('1.25');
  });

  it('formats price-axis ticks with at least symbol precision', () => {
    expect(formatNativePriceAxisTickWithPrecisionWorklet(0.07, 0.01, 0.000001)).toBe('0.070000');
    expect(formatNativePriceAxisTickWithPrecisionWorklet(0.07, 0.01, 0.0001)).toBe('0.0700');
    expect(formatNativePriceAxisTickWithPrecisionWorklet(63777, 500, 0.1)).toBe('63,777.0');
  });
});
