import { describe, expect, it } from 'vitest';

import { generatePriceMarkers } from '../../rendering/axisMarkers';
import { getNativePriceGridSlot, getNativePriceGridSlotCount, getNativePriceGridSpacing } from './nativeGridSlots';

function visiblePrices(priceMin: number, priceMax: number, priceHeight: number): number[] {
  const prices: number[] = [];
  for (let index = 0; index < getNativePriceGridSlotCount(priceHeight); index += 1) {
    const slot = getNativePriceGridSlot({ index, priceMin, priceMax, priceHeight });
    if (slot.visible) prices.push(slot.price);
  }
  return prices;
}

describe('native price grid spacing', () => {
  // The ladder steps by up to 2.5x and the old acceptance window was 2x wide,
  // so a step could clear it - and the downward fallback then answered with the
  // coarsest spacing going, leaving one label on the axis.
  it('fills the axis on ranges that fall between two ladder steps', () => {
    // spacing 20 overshoots at 16 labels, spacing 50 is the finest that fits.
    expect(getNativePriceGridSpacing(104_352.5, 104_647.5, 380)).toBe(50);
    expect(visiblePrices(104_352.5, 104_647.5, 380).length).toBe(5);
  });

  it('never returns a near-empty axis across a sweep of price magnitudes', () => {
    const priceHeight = 380;
    const maxLabels = Math.floor(priceHeight / 24);

    for (const mid of [0.0312, 0.87, 3.27, 47.2, 487.5, 3120, 63_400, 104_500]) {
      for (let fraction = 0.002; fraction <= 0.6; fraction *= 1.09) {
        const range = mid * fraction;
        const prices = visiblePrices(mid - range / 2, mid + range / 2, priceHeight);

        expect(prices.length).toBeLessThanOrEqual(maxLabels);
        expect(prices.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  // Two copies of one algorithm; the point of fixing both was that they agree.
  it('agrees with the web axis marker generator', () => {
    const priceHeight = 380;

    for (const [priceMin, priceMax] of [
      [104_352.5, 104_647.5],
      [469.3, 516.8],
      [62_700, 63_400],
      [0.0312, 0.0359],
      [3.1, 9.7],
    ]) {
      const web = generatePriceMarkers({ startTime: 0, endTime: 1, priceMax, priceMin }, priceHeight);

      expect(web.length).toBeGreaterThan(1);
      expect(getNativePriceGridSpacing(priceMin, priceMax, priceHeight)).toBeCloseTo(web[1] - web[0], 10);
    }
  });

  it('has a slot for every marker the spacing produces', () => {
    for (const [priceMin, priceMax] of [
      [104_352.5, 104_647.5],
      [469.3, 516.8],
      [0.0312, 0.0359],
    ]) {
      const priceHeight = 380;
      const spacing = getNativePriceGridSpacing(priceMin, priceMax, priceHeight);
      const firstMarker = Math.floor(priceMin / spacing) * spacing;
      const needed = Math.floor((priceMax + spacing * 0.01 - firstMarker) / spacing) + 1;

      expect(getNativePriceGridSlotCount(priceHeight)).toBeGreaterThanOrEqual(needed);
    }
  });
});
