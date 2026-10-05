import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const source = readFileSync(new URL('../../../oracle-probes/v2/primitives-sma-stdev-v1.pine', import.meta.url), 'utf8');
const csv = readFileSync(new URL('../../../oracle-probes/v2/captures/v2/primitives-sma-stdev-v1-attempt2.csv', import.meta.url), 'utf8');
const lines = csv.trim().split(/\r?\n/);
const headers = lines[0].split(',');
const rows = lines.slice(1, 97).map((line) => line.split(','));
const cell = (row: string[], name: string) => row[headers.indexOf(name)];
const title = 'mean_running_difference_len14_close_clean';

// Native v2 source/capture hashes bind the expression and binary64 prefix values.
it('preserves native precision of source-composed running-difference SMA', () => {
  expect(createHash('sha256').update(source).digest('hex')).toBe('1b89dc1fbe7fcef8ce71331791210b1026d1deb8ed71b8b85cba38adf62d80f1');
  expect(createHash('sha256').update(csv).digest('hex')).toBe('76cbb2ed98c18d43a0e41a5e8854b45250a158e3fb5452dffbe207d7168872a1');
  const bars = rows.map((row) => ({
    time: Number(cell(row, 'time')) * 1000,
    open: Number(cell(row, 'open')),
    high: Number(cell(row, 'high')),
    low: Number(cell(row, 'low')),
    close: Number(cell(row, 'close')),
    volume: 0,
  }));
  const result = executeScript(parse(source), bars);
  expect(result.errors).toEqual([]);
  expect(result.plots.find((plot) => plot.title === title)?.values).toEqual(
    rows.map((row) => cell(row, title) === '' ? null : Number(cell(row, title))),
  );
});

const branches = [
  ['if/else', `if false
        x := x
    else
        if true
            x := x + (s - r)`],
  ['for', `for i = 0 to 0
        x := x + (s - r)`],
  ['while', `i = 0
    while i < 1
        x := x + (s - r)
        i += 1`],
] as const;

// The native v5/v6 additive captures distinguish const (0) and series (1) operands.
describe.each([5, 6])('shared composition in nested control flow, v%s', (version) => {
  it.each(branches)('keeps const and series association separate inside %s', (_name, body) => {
    const result = executeScript(parse(`//@version=${version}
indicator("Nested composition")
f(s, r) =>
    float x = 1e16
    ${body}
    x
plot(f(-1e16, -1.0), "const")
plot(f(bar_index >= 0 ? -1e16 : 1e16, -1.0), "series")`), [{ time: 1788134400000, open: 1, high: 1, low: 1, close: 1, volume: 0 }]);
    expect(result.errors).toEqual([]);
    expect(result.plots.find((plot) => plot.title === 'const')?.values).toEqual([0]);
    expect(result.plots.find((plot) => plot.title === 'series')?.values).toEqual([1]);
  });
});
