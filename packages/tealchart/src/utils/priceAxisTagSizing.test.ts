import { describe, expect, it } from 'vitest';

import { PriceAxisTagWidthCache } from './priceAxisTagSizing';

describe('PriceAxisTagWidthCache', () => {
  it('only grows cached widths for a stable tag key', () => {
    const cache = new PriceAxisTagWidthCache();

    expect(cache.resolve('priceLine:last-trade', 64.2)).toBe(65);
    expect(cache.resolve('priceLine:last-trade', 58.9)).toBe(65);
    expect(cache.resolve('priceLine:last-trade', 70.1)).toBe(71);
  });

  it('keeps separate widths per tag key', () => {
    const cache = new PriceAxisTagWidthCache();

    expect(cache.resolve('order:1', 80)).toBe(80);
    expect(cache.resolve('position:1', 42)).toBe(42);
    expect(cache.resolve('order:1', 60)).toBe(80);
  });
});
