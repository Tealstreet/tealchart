import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Authority: reference/pine-v6-reference-v1.json functions[168,169,190,208].
// Native v1 crosses/v2 coverage-tab/tad CSV rows0–95 pin source history and NA state.
function capture(name: string) {
  const [header, ...lines] = readFileSync(
    new URL(`../../oracle-probes/v2/captures/v2/${name}.csv`, import.meta.url),
    'utf8',
  )
    .trim()
    .split('\n');
  const names = header.split(',');
  return lines
    .slice(0, 96)
    .map((line) =>
      Object.fromEntries(line.split(',').map((value, index) => [names[index], value === '' ? null : Number(value)])),
    );
}
const tab = capture('coverage-tab-1-v1');
const tad = capture('coverage-tad-1-v1');
const cross = (() => {
  const [header, ...lines] = readFileSync(
    new URL('../../oracle-probes/captures/v1/na-holes-crosses-v1.csv', import.meta.url),
    'utf8',
  )
    .trim()
    .split('\n');
  const names = header.split(',');
  return lines
    .slice(0, 96)
    .map((line) =>
      Object.fromEntries(line.split(',').map((value, index) => [names[index], value === '' ? null : Number(value)])),
    );
})();
const crossPrefix = readFileSync(
  new URL('../../oracle-probes/na-holes-crosses-v1.pine', import.meta.url),
  'utf8',
).split('plot(bar_index,')[0];
const tabPrefix = readFileSync(new URL('../../oracle-probes/v2/coverage-tab-1-v1.pine', import.meta.url), 'utf8').split(
  'plot(open,',
)[0];
const cases = [
  {
    name: 'falling',
    rows: cross,
    prefix: `${crossPrefix}n = bar_index >= 0 ? 3 : 2\n`,
    source: 'hole',
    length: 'n',
    args: '',
    title: 'falling_len3_hole_builtin',
    boolean: true,
  },
  {
    name: 'linreg',
    rows: tab,
    prefix: tabPrefix,
    source: 'dyn_source',
    length: 'dynamic_length',
    args: ', 0',
    title: 'linreg_dynamic_builtin',
    boolean: false,
  },
  {
    name: 'falling',
    rows: tab,
    prefix: tabPrefix,
    source: 'fall_source',
    length: 'dynamic_length',
    args: '',
    title: 'falling_dynamic_builtin',
    boolean: true,
  },
  {
    name: 'range',
    rows: tad,
    prefix:
      '//@version=6\nindicator("dynamic range")\nwave = 50.0 + (bar_index % 11) * 2.0 + (bar_index % 3 == 0 ? 7.0 : -3.0)\nn = bar_index % 2 == 0 ? 2 : 3\n',
    source: 'wave',
    length: 'n',
    args: '',
    title: 'range_dyn_builtin',
    boolean: false,
  },
];

describe('native dynamic TA windows', () => {
  it.each(cases.flatMap((entry) => [false, true].map((local) => ({ ...entry, local }))))(
    '$name local=$local keeps prior source history',
    (entry) => {
      const call = entry.local
        ? `f(${entry.source}, ${entry.length})`
        : `ta.${entry.name}(${entry.source}, ${entry.length}${entry.args})`;
      const declaration = entry.local ? `f(float s, int n) =>\n    ta.${entry.name}(s, n${entry.args})\n` : '';
      const source = `${entry.prefix}${declaration}plot(${entry.boolean ? `${call} ? 1 : 0` : call}, "value")`;
      const bars = entry.rows.map((row) => ({
        time: Number(row.time) * 1000,
        open: Number(row.input_open),
        high: Number(row.input_high),
        low: Number(row.input_low),
        close: Number(row.input_close),
        volume: Number(row.input_volume),
      }));
      const result = runCompatScript(source, { bars });
      expect(result.errors).toEqual([]);
      const actual = getPlot(result, 'value').values;
      expect(actual).toHaveLength(entry.rows.length);
      entry.rows.forEach((row, index) => {
        const expected = row[entry.title];
        if (expected === null) expect(actual[index], `native row${index}`).toBeNull();
        else {
          expect(actual[index], `native row${index}`).not.toBeNull();
          expect(Math.abs(Number(actual[index]) - expected), `native row${index}`).toBeLessThanOrEqual(
            1e-9 * Math.max(1, Math.abs(expected)),
          );
        }
      });
    },
  );
});

it.each([false, true])('range local=%s counts documented non-na samples after source holes', (local) => {
  const declaration = local ? 'f(float s, int n) =>\n    ta.range(s, n)\n' : '';
  const call = local ? 'f(src, n)' : 'ta.range(src, n)';
  const source = `//@version=6\nindicator("dynamic range holes")\nwave = 50.0 + (bar_index % 11) * 2.0 + (bar_index % 3 == 0 ? 7.0 : -3.0)\nn = bar_index % 2 == 0 ? 2 : 3\nsrc = bar_index == 40 or bar_index == 41 ? float(na) : wave\n${declaration}plot(${call}, "value")`;
  const bars = tad.map((row) => ({
    time: Number(row.time) * 1000,
    open: Number(row.input_open),
    high: Number(row.input_high),
    low: Number(row.input_low),
    close: Number(row.input_close),
    volume: Number(row.input_volume),
  }));
  const samples: number[] = [];
  const expected = tad.map((row, index) => {
    if (index !== 40 && index !== 41) samples.push(Number(row.input_wave));
    const length = Number(row.input_length_alt2_3);
    if (samples.length < length) return null;
    const selected = samples.slice(-length);
    return Math.max(...selected) - Math.min(...selected);
  });
  const result = runCompatScript(source, { bars });
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'value').values).toEqual(expected);
});

// Authority: reference/pine-v6-reference-v1.json functions[190]; a descending run meets either horizon.
it.each([false, true])('falling local=%s preserves a descending run with growing length', (local) => {
  const declaration = local ? 'f(float s, int n) =>\n    ta.falling(s, n)\n' : '';
  const call = local ? 'f(src, n)' : 'ta.falling(src, n)';
  const result = runCompatScript(
    `//@version=6\nindicator("growing falling length")\nsrc = 10.0 - bar_index\nn = bar_index < 6 ? 2 : 6\n${declaration}plot(${call} ? 1 : 0, "value")`,
    {
      bars: tab
        .slice(0, 12)
        .map((row) => ({
          time: Number(row.time) * 1000,
          open: Number(row.input_open),
          high: Number(row.input_high),
          low: Number(row.input_low),
          close: Number(row.input_close),
          volume: Number(row.input_volume),
        })),
    },
  );
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'value').values).toEqual([0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
});
