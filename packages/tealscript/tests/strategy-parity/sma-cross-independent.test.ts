// @vitest-environment node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeScript, type Bar } from '../../src/runtime';

const ENTRY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'corpus/001-sma-cross');

// Independent documentation + integer-cents arithmetic, frozen before consulting
// the baseline CSV or runtime. No engine/helper derives these literal expectations.
// SMA: https://www.tradingview.com/pine-script-reference/v6/#fun_ta.sma
// Crosses: #fun_ta.crossover and #fun_ta.crossunder at that same reference.
// If C[i] is close in cents, fast-slow = (5*sum3 - 3*sum5)/1500.
// Entry: current difference > 0, previous <= 0; exit: current < 0, previous >= 0.
// Timing/entry/exit prices: default close calculation, market entry and market
// strategy.close fill at the NEXT bar OPEN (no process_orders_on_close override).
// https://www.tradingview.com/pine-script-docs/concepts/strategies/#order-types
// https://www.tradingview.com/pine-script-docs/concepts/strategies/#strategyclose-and-strategyclose_all
// https://www.tradingview.com/pine-script-docs/language/declaration-statements/
// Fees: 0.1% of each fill notional; unit quantity/point value, same currency.
// https://www.tradingview.com/pine-script-docs/concepts/strategies/#commission
// Columns: entry SIGNAL bar, exit SIGNAL bar, entry/exit OPEN prices,
// total entry+exit commission, commission-inclusive closed P/L. Zero-based bars.
// Working derivation: ~/cs/docs/tealscript-parity-archive/001-sma-cross-independent-derivation-20261002.txt
// This corroborates ONE historical input under those assumptions, not a TV trace.
const EXPECTED_TRADES = [
  [13, 14, 92.68, 89.90, 0.18258, -2.96258],
  [18, 26, 92.80, 99.83, 0.19263, 6.83737],
  [28, 33, 101.11, 102.32, 0.20343, 1.00657],
  [35, 38, 104.58, 103.66, 0.20824, -1.12824],
  [40, 45, 103.31, 104.38, 0.20769, 0.86231],
  [51, 53, 104.54, 102.15, 0.20669, -2.59669],
  [56, 57, 101.19, 100.73, 0.20192, -0.66192],
  [61, 63, 99.55, 101.86, 0.20141, 2.10859],
  [64, 66, 100.81, 99.73, 0.20054, -1.28054],
  [69, 70, 99.37, 99.91, 0.19928, 0.34072],
  [83, 97, 90.42, 96.70, 0.18712, 6.09288],
  [102, 105, 98.94, 97.34, 0.19628, -1.79628],
  [107, 109, 97.67, 97.67, 0.19534, -0.19534],
  [111, 113, 99.65, 96.62, 0.19627, -3.22627],
  [117, 125, 97.22, 101.12, 0.19834, 3.70166],
  [147, 156, 91.70, 93.14, 0.18484, 1.25516],
  [159, 165, 97.37, 95.62, 0.19299, -1.94299],
  [168, 172, 99.72, 99.47, 0.19919, -0.44919],
  [182, 184, 97.35, 94.65, 0.19200, -2.89200],
] as const;

describe('001-sma-cross independent documented trade oracle', () => {
  it('fills all 19 documented crossings at next-bar opens with independently derived fees', () => {
    const source = fs.readFileSync(path.join(ENTRY_DIR, 'strategy.pine'), 'utf-8');
    const bars: Bar[] = JSON.parse(fs.readFileSync(path.join(ENTRY_DIR, 'bars.json'), 'utf-8'));
    const result = executeScript(parse(source), bars);
    expect(result.errors).toEqual([]);
    expect(result.strategy).toBeDefined();
    const ledger = result.strategy!;
    expect(ledger.closedTrades).toHaveLength(19);
    for (const [index, expected] of EXPECTED_TRADES.entries()) {
      const [entrySignal, exitSignal, entryPrice, exitPrice, commission, net] = expected;
      const trade = ledger.closedTrades[index]!;
      expect(trade).toMatchObject({
        direction: 'long', qty: 1, entryOrderId: 'Long',
        entryBarIndex: entrySignal + 1, exitBarIndex: exitSignal + 1,
        entryTime: 1700000000000 + (entrySignal + 1) * 60000,
        exitTime: 1700000000000 + (exitSignal + 1) * 60000,
        entryPrice, exitPrice,
      });
      expect(trade.commission).toBeCloseTo(commission, 10);
      // Runtime records gross profit and commission separately. Assert net
      // explicitly; the frozen CSV's Profit column contains gross, not this net.
      expect(trade.profit - trade.commission).toBeCloseTo(net, 10);
    }
    expect(ledger.openTrades).toHaveLength(1);
    expect(ledger.openTrades[0]).toMatchObject({
      direction: 'long', qty: 1, entryOrderId: 'Long',
      entryBarIndex: 191, entryTime: 1700011460000, entryPrice: 94.12,
    });
    expect(ledger.openTrades[0]!.commission).toBeCloseTo(0.09412, 10);
    expect(ledger.closedTrades.reduce((sum, trade) => sum + trade.profit - trade.commission, 0))
      .toBeCloseTo(3.07322, 10);
    // The open entry fee has already been charged: 3.07322 - 0.09412.
    expect(ledger.netProfit).toBeCloseTo(2.97910, 10);
  });
});
