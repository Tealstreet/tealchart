import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: reference/pine-v6-reference-v1.json functions[181–184] (series-int length).
// Native CSV rows 0–95 below pin dynamic windows, source holes, and extrema offsets.
function capture(relative: string) {
  const [header, ...lines] = readFileSync(new URL(`../../oracle-probes/${relative}`, import.meta.url), 'utf8')
    .trim()
    .split('\n');
  const names = header.split(',');
  return lines
    .slice(0, 96)
    .map((line) =>
      Object.fromEntries(line.split(',').map((value, index) => [names[index], value === '' ? null : Number(value)])),
    );
}
const dynamic = capture('v2/captures/v2/coverage-tab-1-v1.csv');
const fixed = capture('captures/v1/extrema-barsago-v1.csv');
const families = ['highest', 'lowest', 'highestbars', 'lowestbars'] as const;
const barsFrom = (rows: typeof dynamic) =>
  rows.map((row) => ({
    time: Number(row.time) * 1000,
    open: Number(row.input_open),
    high: Number(row.input_high),
    low: Number(row.input_low),
    close: Number(row.input_close),
    volume: Number(row.input_volume),
  }));

describe('native extrema windows retain history across dynamic lengths', () => {
  it.each(families)('%s uses native dynamic lengths at the root', (name) => {
    const source = `//@version=6\nindicator("dynamic extrema")\np = bar_index % 16\ns = p == 0 ? 1.0 : p == 1 ? 3.0 : p == 2 ? 2.0 : p == 3 ? 8.0 : p == 4 ? 4.0 : p == 5 ? 9.0 : p == 6 ? 5.0 : p == 7 ? 11.0 : p == 8 ? 7.0 : p == 9 ? 13.0 : p == 10 ? 6.0 : p == 11 ? 15.0 : p == 12 ? 4.0 : p == 13 ? 17.0 : p == 14 ? 10.0 : 19.0\nn = p < 5 ? 2 : 3\nplot(ta.${name}(s, n), "value")`;
    const result = runCompatScript(source, { bars: barsFrom(dynamic) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual(dynamic.map((row) => row[`${name}_dynamic_builtin`]));
  });

  it.each(families)('%s counts physical bars around native missing samples', (name) => {
    const source = `//@version=6\nindicator("extrema holes")\ns = bar_index % 64 == 40 or bar_index % 64 == 41 or (bar_index % 64 >= 48 and bar_index % 64 <= 55) ? float(na) : close\nplot(ta.${name}(s, 5), "value")`;
    const result = runCompatScript(source, { bars: barsFrom(fixed) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual(fixed.map((row) => row[`${name}_len5_close_holes64`]));
  });

  it.each(families)('%s preserves growing and shrinking windows in a local function', (name) => {
    const length = (index: number) => (index % 3 === 0 ? 2 : index % 3 === 1 ? 3 : 7);
    const expected = compatibilityBars.map((_, index) => {
      const n = length(index);
      if (index + 1 < n) return null;
      const values = compatibilityBars.slice(index - n + 1, index + 1).map((bar) => bar.close);
      const best = name.startsWith('highest') ? Math.max(...values) : Math.min(...values);
      return name.endsWith('bars') ? values.lastIndexOf(best) - n + 1 : best;
    });
    const source = `//@version=6\nindicator("local extrema")\nf(s, n) =>\n    ta.${name}(s, n)\nn = bar_index % 3 == 0 ? 2 : bar_index % 3 == 1 ? 3 : 7\nplot(f(close, n), "value")`;
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual(expected);
  });
});
