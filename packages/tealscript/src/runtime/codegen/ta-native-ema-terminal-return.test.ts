import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

// Native coverage-tab-1-v1.csv: literal official EMA function, whose
// terminal reassignment is the function result. CSV cells are the authority.
const capture = new URL('../../../oracle-probes/v2/captures/v2/coverage-tab-1-v1.csv', import.meta.url);
const [header, ...records] = readFileSync(capture, 'utf8').trim().split(/\r?\n/);
const columns = header.split(',');
const rows = records.slice(0, 64).map((record) => record.split(','));
const cell = (row: string[], name: string) => row[columns.indexOf(name)];
const bars = rows.map((row) => ({
  time: Number(cell(row, 'time')) * 1000,
  open: Number(cell(row, 'open')),
  high: Number(cell(row, 'high')),
  low: Number(cell(row, 'low')),
  close: Number(cell(row, 'close')),
  volume: Number(cell(row, 'input_volume')),
}));

const literal = `pine_ema(src, length) =>
    alpha = 2 / (length + 1)
    sum = 0.0
    sum := na(sum[1]) ? src : alpha * src + (1 - alpha) * nz(sum[1])`;

describe('Native terminal reassignment function results', () => {
  it.each([
    ['clean', 'pine_ema(close, 15)', 'ema_official_terminal_assignment'],
    [
      'holes',
      'pine_ema(bar_index == 40 or bar_index == 41 ? float(na) : close, 14)',
      'ema_hole_literal_official_function',
    ],
  ])('%s EMA literal matches the captured function result', (_name, call, column) => {
    const result = executeScript(
      parse(`//@version=6\nindicator("EMA literal result")\n${literal}\nplot(${call})`),
      bars,
    );
    expect(result.errors).toEqual([]);
    rows.forEach((row, index) => {
      const value = cell(row, column);
      expect(result.plots[0].values[index], `native bar ${index}`).toBe(value === '' ? null : Number(value));
    });
  });

  it.each([5, 6])('v%i returns the assigned value through nested calls and compound assignments', (version) => {
    const result = executeScript(
      parse(`//@version=${version}
indicator("Terminal assigned identifier")
advance(x) =>
    value = x
    value += 2
wrapper(x) =>
    value = advance(x)
    value := value * 3
named(x) =>
    named = 0
    named := x + 1
plot(wrapper(bar_index))
plot(named(bar_index))`),
      bars.slice(0, 3),
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([6, 9, 12]);
    expect(result.plots[1].values).toEqual([1, 2, 3]);
  });
});
