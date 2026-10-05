import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { RCI } from '../../src/runtime/codegen/ta-classes';
import type { Bar } from '../../src/runtime/context';

// Native coverage-ta-2-v1.csv bars0..41: current missing bars40/41 hold bar39.
// Later missing-window ranks are separate; this witness ends at bar41.
describe('native RCI current missing source', () => {
  it('holds the published value across missing input and restores it for intrabar replay', () => {
    const lines = readFileSync(new URL('../../oracle-probes/v2/captures/v2/coverage-ta-2-v1.csv', import.meta.url), 'utf8').split('\n');
    const headers = lines[0].split(',');
    const rows = lines.slice(1, 43).map((line) => line.split(','));
    const expected = (index: number, column: string): number | null => {
      const value = rows[index][headers.indexOf(column)];
      return value === '' ? null : Number(value);
    };
    const bars: Bar[] = rows.map((row) => ({ time: Number(row[0]) * 1000, open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: 10 }));
    const result = executeScript(parse(`//@version=6
indicator("Native RCI hold")
source = bar_index == 40 or bar_index == 41 ? na : close
plot(ta.rci(source, 14))`), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(1);
    result.plots[0].values.forEach((value, index) => {
      const native = expected(index, 'rci_len14_hole40_41');
      if (native === null) expect(value).toBeNull();
      else { expect(value).not.toBeNull(); expect(value).toBeCloseTo(native, 8); }
    });

    const machine = new RCI(14);
    bars.slice(0, 40).forEach((bar) => machine.compute(bar.close));
    const prior = machine.save();
    expect(machine.compute(bars[40].close)).toBeCloseTo(expected(40, 'rci_len14_clean')!, 8);
    expect(machine.recompute(NaN)).toBeCloseTo(expected(40, 'rci_len14_hole40_41')!, 8);
    expect(machine.recompute(bars[40].close)).toBeCloseTo(expected(40, 'rci_len14_clean')!, 8);
    machine.restore(prior);
    expect(machine.compute(NaN)).toBeCloseTo(expected(40, 'rci_len14_hole40_41')!, 8);
    expect(machine.compute(NaN)).toBeCloseTo(expected(41, 'rci_len14_hole40_41')!, 8);
  });
});
