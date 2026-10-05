import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';

// Native CSV: oracle-probes/v2/captures/v2/coverage-register-ta-1-v1.csv, bars0..63.
// Builtin rank columns distinguish previous-bar windows, leading NA and current NA.
const lines = readFileSync(new URL('../../oracle-probes/v2/captures/v2/coverage-register-ta-1-v1.csv', import.meta.url), 'utf8').split('\n');
const headers = lines[0].split(',');
const rows = lines.slice(1, 65).map((line) => line.split(','));
const column = (name: string) => rows.map((row) => {
  const value = row[headers.indexOf(name)];
  return value === '' ? null : Number(value);
});
const bars: Bar[] = rows.map((row) => ({
  time: Number(row[0]) * 1000, open: Number(row[1]), high: Number(row[2]),
  low: Number(row[3]), close: Number(row[4]), volume: 10,
}));

describe('native percent rank prior-bar window', () => {
  it.each([
    ['clean', 'price'],
    ['hole', 'phase == 12 or phase == 13 ? na : price'],
    ['leading', 'bar_index < 3 ? na : price'],
  ])('matches native %s bars0..63', (kind, source) => {
    const ast = parse(`//@version=6\nindicator("Native percent rank")\nphase = bar_index % 64\nprice = 10.0 + phase % 7\nsource = ${source}\nplot(ta.percentrank(source, 4))`);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(1);
    expect(result.plots[0].values).toEqual(column(`rank_${kind}_builtin`));
  });
});
