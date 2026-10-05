import type { Bar } from '../../src/runtime/context';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

// Native v2 coverage-math-1-v1-attempt2.csv, headers 36..38, bars 0..107.
const capture = readFileSync(
  new URL('../../oracle-probes/v2/captures/v2/coverage-math-1-v1-attempt2.csv', import.meta.url),
);
if (
  createHash('sha256').update(capture).digest('hex') !==
  '0914d422c185c46f1a15cac447517c84e456c7fca70afab9728dd706f72b2a42'
) {
  throw new Error('Native scalar log capture hash changed');
}
const lines = capture.toString('utf8').split('\n');
const headers = lines[0].split(',');
const rows = lines.slice(1, 109).map((line) => line.split(','));
for (const kind of ['clean', 'hole97', 'warm0_7']) {
  if (headers.indexOf(`log_${kind}`) < 0) throw new Error(`Missing native log_${kind} column`);
}
const bars: Bar[] = rows.map((row) => ({
  time: Number(row[0]) * 1000,
  open: Number(row[1]),
  high: Number(row[2]),
  low: Number(row[3]),
  close: Number(row[4]),
  volume: Number(row[headers.indexOf('input_volume')]),
}));

describe('native scalar logarithm precision', () => {
  it.each([
    ['clean', 'clean'],
    ['hole97', 'hole ? na : clean'],
    ['warm0_7', 'bar_index < 8 ? na : clean'],
  ])('matches every native binary64 log_%s value', (kind, source) => {
    const ast = parse(`//@version=6
indicator("Native scalar log")
clean = (bar_index % 17 - 8) / 4.0
hole = bar_index % 97 == 40 or bar_index % 97 == 41 or bar_index % 97 == 42
source = ${source}
plot(math.log(math.abs(source) + 1), "positional")
plot(math.log(number=math.abs(source) + 1), "named")`);
    const expected = rows.map((row) => {
      const value = row[headers.indexOf(`log_${kind}`)];
      return value === '' ? null : Number(value);
    });
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(2);
    for (const plot of result.plots) expect(plot.values).toEqual(expected);
  });
});
