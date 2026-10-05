import type { Bar } from '../../src/runtime';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime';

// TV v1 source8804e16917c6: CCI clean, two interior holes and three initial holes.
describe('ledger959 native CCI source-hole recovery', () => {
  it('matches the captured physical recovery window without expanding across holes', () => {
    const csv = readFileSync(
      new URL('../../oracle-probes/captures/v1/na-holes-oscillators-v1.csv', import.meta.url),
      'utf8',
    );
    expect(createHash('sha256').update(csv).digest('hex')).toBe(
      '3023fb721431d8aee85b5c61c6e39680266ba8b4835c5c9b979cc09297caab9e',
    );
    const [header, ...lines] = csv.trimEnd().split('\n');
    const columns = header.split(',');
    const rows = lines.slice(0, 60).map((line) => line.split(','));
    const cell = (row: string[], column: string) => row[columns.indexOf(column)];
    const bars: Bar[] = rows.map((row) => ({
      time: Number(cell(row, 'time')) * 1000,
      open: Number(cell(row, 'input_open')),
      high: Number(cell(row, 'input_high')),
      low: Number(cell(row, 'input_low')),
      close: Number(cell(row, 'input_close')),
      volume: Number(cell(row, 'input_volume')),
    }));
    const result = executeScript(
      parse(`//@version=6
indicator("Native CCI recovery")
s_clean = close
s_nahole_bar40_41 = bar_index == 40 or bar_index == 41 ? na : close
s_nastart_bar0_2 = bar_index < 3 ? na : close
plot(ta.cci(s_clean, 14), title="cci_len14_clean")
plot(ta.cci(s_nahole_bar40_41, 14), title="cci_len14_nahole_bar40_41")
plot(ta.cci(s_nastart_bar0_2, 14), title="cci_len14_nastart_bar0_2")`),
      bars,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(3);
    for (const plot of result.plots) {
      expect(plot.values).toHaveLength(rows.length);
      for (const [index, row] of rows.entries()) {
        const expected = cell(row, plot.title!);
        if (expected === '') expect.soft(plot.values[index], `${plot.title} bar${index}`).toBeNull();
        else expect.soft(plot.values[index], `${plot.title} bar${index}`).toBeCloseTo(Number(expected), 7);
      }
    }
  });
});
