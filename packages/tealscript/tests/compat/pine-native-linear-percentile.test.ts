import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';

// Native CSV captures: clean windows, bars0..63 of register-ta-1 and ta-1.
// Both four- and fourteen-slot captures pin the native interpolation position.
describe('native linear percentile positions', () => {
  it.each([
    ['coverage-register-ta-1-v1', 'linear_clean_builtin', 4, '10 + bar_index % 7'],
    ['coverage-ta-1-v1', 'percentile_linear_interpolation_len14_pct75_clean', 14, 'close'],
  ])('matches native %s/%s', (probe, columnName, length, source) => {
    const lines = readFileSync(new URL(`../../oracle-probes/v2/captures/v2/${probe}.csv`, import.meta.url), 'utf8').split('\n');
    const headers = lines[0].split(',');
    const rows = lines.slice(1, 65).map((line) => line.split(','));
    const bars: Bar[] = rows.map((row) => ({
      time: Number(row[0]) * 1000, open: Number(row[1]), high: Number(row[2]),
      low: Number(row[3]), close: Number(row[4]), volume: 10,
    }));
    const expected = rows.map((row) => row[headers.indexOf(columnName)] === '' ? null : Number(row[headers.indexOf(columnName)]));
    const ast = parse(`//@version=6\nindicator("Native linear percentile")\nplot(ta.percentile_linear_interpolation(${source}, ${length}, 75))`);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(1);
    result.plots[0].values.forEach((value, index) => {
      if (expected[index] === null) expect(value).toBeNull();
      else expect(value).toBeCloseTo(expected[index]!, 8);
    });
  });
});
