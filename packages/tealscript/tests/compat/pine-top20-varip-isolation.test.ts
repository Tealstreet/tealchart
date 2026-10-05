import { describe, expect, it } from 'vitest';

import { workerPlots } from './ledgerGaps24Worker';

// https://www.tradingview.com/pine-script-docs/language/objects/#creating-objects
// Field-level varip controls rollback independently of the reference declaration.
describe('TOP20 job4 documented varip isolation', () => {
  it.each(['var', 'varip'])('%s references preserve only marked UDT fields', async (mode) => {
    const values = await workerPlots(`type Counter
    int bars = 0
    varip int ticks = 0
${mode} Counter counter = Counter.new()
counter.bars += 1
counter.ticks += 1
plot(counter.bars, "bars")
plot(counter.ticks, "ticks")`);
    expect(values('bars')).toEqual([1, 2, 2, 2, 2, 3]);
    expect(values('ticks')).toEqual([1, 2, 3, 4, 5, 6]);
  });

  // https://www.tradingview.com/pine-script-docs/language/variable-declarations/#varip
  // https://www.tradingview.com/pine-script-docs/language/arrays/#using-var-and-varip-keywords
  it('carries scalar, array and point mutations across ticks and bars unless explicitly reset', async () => {
    const values = await workerPlots(`varip int ticks = 0
varip int resetTicks = 0
varip array<int> counts = array.new<int>(1, 0)
varip chart.point point = chart.point.new(0, 0, 0)
if barstate.isnew
    resetTicks := 0
ticks += 1
resetTicks += 1
counts.set(0, counts.get(0) + 1)
point.price += 1
plot(ticks, "ticks")
plot(resetTicks, "reset")
plot(counts.get(0), "array")
plot(point.price, "point")`);
    for (const title of ['ticks', 'array', 'point']) expect(values(title)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(values('reset')).toEqual([1, 1, 2, 3, 4, 1]);
  });

  it('retains first unconfirmed conditional initialization and subsequent assignments', async () => {
    const values = await workerPlots(`int output = 0
if barstate.isrealtime and close < 10
    varip int ticks = 0
    ticks += 1
    output := ticks
plot(output, "output")`);
    expect(values('output')).toEqual([0, 0, 1, 2, 0, 3]);
  });
});
