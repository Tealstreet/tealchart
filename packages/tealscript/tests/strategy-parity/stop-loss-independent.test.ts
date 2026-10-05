// @vitest-environment node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeScript, type Bar } from '../../src/runtime';

const ENTRY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'corpus/005-stop-loss-only');

// Geometry derived from source + committed bars before CSV/runtime consultation.
// SHA256 9794a23e29c51175015f5db2a329cde49e5d69c76f100020c0d3c3dc125c8d8d.
// Provenance LIMIT: meta.json's engine-derived count/net totals were seen before
// freeze. Aggregate agreement is disclosed-contaminated, NOT corroboration.
// This test asserts price/timing/gap geometry; it makes no aggregate-parity claim.
// Default market-entry next-bar-open timing:
// https://www.tradingview.com/pine-script-docs/concepts/strategies/#orders-and-trades
// Default closing calculation / no fill-triggered recalculation:
// https://www.tradingview.com/pine-script-docs/concepts/strategies/#calc_on_order_fills
// Stop crossing inside the bar fills at its crossed level under default OHLC
// assumptions. If an INTERBAR gap crosses a price-based level, fill is the next
// OPEN, not that level. This committed input has NO active-stop gap crossing.
// https://www.tradingview.com/pine-script-docs/concepts/strategies/#broker-emulator
// This is conditional documented geometry, weaker than an external TV trace.
describe('005-stop-loss-only documented nongap geometry', () => {
  it('fills the first eligible stop crossing at bar 4 and does not exercise opening-gap repricing', () => {
    const source = fs.readFileSync(path.join(ENTRY_DIR, 'strategy.pine'), 'utf-8');
    const bars: Bar[] = JSON.parse(fs.readFileSync(path.join(ENTRY_DIR, 'bars.json'), 'utf-8'));
    const stopPrice = 96.25; // Source: entry OPEN100.25 minus4.
    expect(bars[1]!.open).toBe(100.25);
    for (const index of [2, 3, 4]) {
      // Every active-order interbar segment remains ABOVE the stop, including
      // prev close98.06 -> open97.95 on the exit bar. These are not stop gaps.
      expect(bars[index - 1]!.close).toBeGreaterThan(stopPrice);
      expect(bars[index]!.open).toBeGreaterThan(stopPrice);
    }
    expect(bars[2]!.low).toBeGreaterThan(stopPrice);
    expect(bars[3]!.low).toBeGreaterThan(stopPrice);
    expect(bars[4]).toMatchObject({ open: 97.95, high: 98.33, low: 96.21, close: 96.58 });
    expect(bars[4]!.low).toBeLessThan(stopPrice);

    const result = executeScript(parse(source), bars);
    expect(result.errors).toEqual([]);
    expect(result.strategy!.closedTrades[0]).toMatchObject({
      direction: 'long', qty: 2, entryOrderId: 'Long', exitOrderId: 'SL',
      entryBarIndex: 1, entryTime: 1700000060000, entryPrice: 100.25,
      exitBarIndex: 4, exitTime: 1700000240000, exitPrice: stopPrice,
    });
  });
});
