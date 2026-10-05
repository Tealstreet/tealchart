import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';

// Native v2 CSV leading-source columns, bars0..63 of register-ta-1 and ta-1.
// Missing startup slots occupy rank positions before a full finite sample count.
describe('native percentile leading-source startup', () => {
  it.each([
    ['coverage-register-ta-1-v1', 'linear_leading_builtin', 'linear_interpolation', 4, 'bar_index < 3 ? na : 10 + (bar_index % 64) % 7'],
    ['coverage-ta-1-v1', 'percentile_linear_interpolation_len14_pct75_lead0_4', 'linear_interpolation', 14, 'bar_index < 5 ? na : close'],
    ['coverage-ta-1-v1', 'percentile_nearest_rank_len14_pct75_lead0_4', 'nearest_rank', 14, 'bar_index < 5 ? na : close'],
  ] as const)('matches native %s/%s', (probe, column, method, length, source) => {
    const lines = readFileSync(new URL(`../../oracle-probes/v2/captures/v2/${probe}.csv`, import.meta.url), 'utf8').split('\n');
    const headers = lines[0].split(',');
    const rows = lines.slice(1, 65).map((line) => line.split(','));
    const bars: Bar[] = rows.map((row) => ({ time: Number(row[0]) * 1000, open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: 10 }));
    const result = executeScript(parse(`//@version=6\nindicator("Native percentile startup")\nplot(ta.percentile_${method}(${source}, ${length}, 75))`), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(1);
    result.plots[0].values.forEach((value, index) => {
      const expected = rows[index][headers.indexOf(column)];
      if (expected === '') expect(value).toBeNull();
      else { expect(value).not.toBeNull(); expect(value).toBeCloseTo(Number(expected), 8); }
    });
  });
});
