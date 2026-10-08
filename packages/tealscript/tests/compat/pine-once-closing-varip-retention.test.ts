import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

const counterSource = `//@version=6
indicator("Closing update counters")
var int rollbackCount = 0
varip int retainedCount = 0
varip int tickCount = 0
varip int confirmedCount = 0
if barstate.isrealtime
    tickCount += 1
    once
        rollbackCount += 1
        retainedCount += 1
    once barstate.isconfirmed
        confirmedCount += 1
plot(rollbackCount, "Rollback")
plot(retainedCount, "Retained")
plot(confirmedCount, "Confirmed")
plot(tickCount, "Ticks")`;

const bar = (index: number) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: 10,
  high: 11,
  low: 9,
  close: 10,
  volume: 100,
});

describe('closing realtime updates retain varip counters', () => {
  it('retains intrabar counters through repeated, closing and next-bar updates', () => {
    const compiled = tryCompile(parse(counterSource));
    expect(compiled.success).toBe(true);
    const bars = [bar(0), bar(1)];
    const intrabarState = new Map<number, { before: unknown; after: unknown }>();
    const updates = [
      { name: 'first', nextBar: false, confirmed: false, isNew: true, expected: [1, 1, 0, 1] },
      { name: 'repeated', nextBar: false, confirmed: false, isNew: false, expected: [1, 2, 0, 2] },
      { name: 'closing', nextBar: false, confirmed: true, isNew: false, expected: [1, 3, 1, 3] },
      { name: 'next bar', nextBar: true, confirmed: false, isNew: true, expected: [1, 3, 1, 4] },
    ];
    for (const update of updates) {
      if (update.nextBar) bars.push(bar(2));
      const result = executeCompiled(compiled, bars, undefined, {
        intrabarState,
        realtimeLastBar: update.confirmed ? undefined : { isNew: update.isNew },
        confirmedRealtimeBarStartIndex: 1,
        confirmedRealtimeBarIndex: update.name === 'closing' || update.nextBar ? 1 : undefined,
      });
      if (!result) throw new Error('Compiled counter script was not executed');
      expect(result.errors, update.name).toEqual([]);
      expect(result.plots.map((plot) => plot.title)).toEqual(['Rollback', 'Retained', 'Confirmed', 'Ticks']);
      for (const plot of result.plots) expect(plot.values, plot.title).toHaveLength(bars.length);
      expect(
        result.plots.map((plot) => plot.values[bars.length - 1]),
        update.name,
      ).toEqual(update.expected);
    }
  });

  it('retains the prior update on an explicit closing tick without once', () => {
    const compiled = tryCompile(
      parse(`//@version=6
indicator("Closing update")
varip int updates = 0
if barstate.isrealtime
    updates += 1
plot(updates, "Updates")`),
    );
    expect(compiled.success).toBe(true);
    const intrabarState = new Map<number, { before: unknown; after: unknown }>();
    const values: unknown[] = [];
    for (let tick = 1; tick <= 3; tick++) {
      const result = executeCompiled(compiled, [bar(0), bar(1)], undefined, {
        intrabarState,
        realtimeLastBar: tick === 3 ? undefined : { isNew: tick === 1 },
        confirmedRealtimeBarStartIndex: 1,
        confirmedRealtimeBarIndex: tick === 3 ? 1 : undefined,
      });
      if (!result) throw new Error('Compiled closing script was not executed');
      expect(result.errors).toEqual([]);
      values.push(result.plots[0].values[1]);
    }
    expect(values).toEqual([1, 2, 3]);
  });
});
