import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const capture = readFileSync(
  new URL('../../../oracle-probes/v2/captures/v2/coverage-tab-1-v1.csv', import.meta.url),
  'utf8',
)
  .trim()
  .split(/\r?\n/);
const headers = capture[0].split(',');
const rows = capture.slice(1, 97).map((row) => row.split(','));
const cell = (row: string[], name: string) => row[headers.indexOf(name)];
const bars = rows.map((row) => ({
  time: Number(cell(row, 'time')) * 1000,
  open: Number(cell(row, 'open')),
  high: Number(cell(row, 'high')),
  low: Number(cell(row, 'low')),
  close: Number(cell(row, 'close')),
  volume: Number(cell(row, 'input_volume')),
}));
const source = readFileSync(new URL('../../../oracle-probes/v2/coverage-tab-1-v1.pine', import.meta.url), 'utf8');
const titles = ['ema_hole_first_seed_hold_state_emit_na', 'ema_hole_sma_seed_hold_state_emit_na'];

describe('Captured source-composed EMA constant quotient precision', () => {
  it.each(titles)('%s preserves every native prefix value', (title) => {
    const result = executeScript(parse(source), bars);
    expect(result.errors).toEqual([]);
    const values = result.plots.find((plot) => plot.title === title)?.values;
    expect(values).toEqual(rows.map((row) => (cell(row, title) === '' ? null : Number(cell(row, title)))));
  });

  it('preserves physical holes and finite recovery', () => {
    const result = executeScript(parse(source), bars);
    expect(result.errors).toEqual([]);
    for (const title of titles) {
      const values = result.plots.find((plot) => plot.title === title)!.values;
      expect(values.slice(40, 42)).toEqual([null, null]);
      expect(Number.isFinite(values[42])).toBe(true);
    }
  });

  it.each([4, 5, 6])('keeps input and series quotients unrounded in v%s', (version) => {
    const result = executeScript(
      parse(`//@version=${version}
${version < 5 ? 'study' : 'indicator'}("Runtime quotient controls")
x = ${version < 5 ? 'input(2.0)' : 'input.float(2.0)'}
plot(x / 15.0, "input")
plot(close / 15.0, "series")`),
      bars.slice(0, 3),
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([2 / 15, 2 / 15, 2 / 15]);
    expect(result.plots[1].values).toEqual(bars.slice(0, 3).map((bar) => bar.close / 15));
  });

  it.each([4, 5])('preserves legacy signed const int truncation in v%s', (version) => {
    const result = executeScript(
      parse(`//@version=${version}
${version === 4 ? 'study' : 'indicator'}("Legacy quotient controls")
plot(-5 / 2, "negative")
plot(5 / 2, "positive")`),
      bars.slice(0, 1),
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values[0])).toEqual([-2, 2]);
  });

  it('folds a constant quotient initializer and keeps builtin rounding ties', () => {
    const result = executeScript(
      parse(`//@version=6
indicator("Shared rounding controls")
const float coefficient = 2.0 / 15
plot(coefficient, "const")
plot(math.round(-1.25, 1), "negative tie")
plot(math.round(1.25, 1), "positive tie")`),
      bars.slice(0, 1),
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values[0])).toEqual([0.1333333333333333, -1.3, 1.3]);
  });
});
