import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';

// Native CSV: oracle-probes/v2/captures/v2/coverage-collections-1-v1.csv, bars0..107.
// Original three-slot arrays retain percentile rank positions when slots are missing.
const lines = readFileSync(new URL('../../oracle-probes/v2/captures/v2/coverage-collections-1-v1.csv', import.meta.url), 'utf8').split('\n');
const headers = lines[0].split(',');
const rows = lines.slice(1, 109).map((line) => line.split(','));
const column = (name: string) => rows.map((row) => {
  const value = row[headers.indexOf(name)];
  return value === '' ? null : Number(value);
});
const bars: Bar[] = rows.map((row) => ({
  time: Number(row[0]) * 1000, open: Number(row[1]), high: Number(row[2]),
  low: Number(row[3]), close: Number(row[4]), volume: 10,
}));

describe('native array percentile rank cardinality', () => {
  it.each([
    ['linear_interpolation', 'clean', 'clean'],
    ['linear_interpolation', 'hole97', 'hole ? na : clean'],
    ['linear_interpolation', 'warm0_7', 'bar_index < 8 ? na : clean'],
    ['nearest_rank', 'clean', 'clean'],
    ['nearest_rank', 'hole97', 'hole ? na : clean'],
    ['nearest_rank', 'warm0_7', 'bar_index < 8 ? na : clean'],
  ])('matches native array percentile %s/%s bars0..107', (method, kind, source) => {
    const ast = parse(`//@version=6\nindicator("Native array percentile")\nclean = (bar_index % 17 - 8) / 4.0\nhole = bar_index % 97 == 40 or bar_index % 97 == 41 or bar_index % 97 == 42\nsource = ${source}\nitems = array.from(source[2], source[1], source)\nplot(array.percentile_${method}(items, 50))`);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(1);
    expect(result.plots[0].values).toEqual(column(`array_percentile_${method}_${kind}`));
  });
});
