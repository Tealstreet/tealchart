import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json functions[173].
// Native v2 coverage-math-2-v1.csv rows0–191 include the hole97 growth witness at bar137.
const [header, ...lines] = readFileSync(
  new URL('../../oracle-probes/v2/captures/v2/coverage-math-2-v1.csv', import.meta.url),
  'utf8',
)
  .trim()
  .split('\n');
const names = header.split(',');
const rows = lines
  .slice(0, 192)
  .map((line) =>
    Object.fromEntries(line.split(',').map((value, index) => [names[index], value === '' ? null : Number(value)])),
  );
const bars = rows.map((row) => ({
  time: Number(row.time) * 1000,
  open: Number(row.input_open),
  high: Number(row.input_high),
  low: Number(row.input_low),
  close: Number(row.input_close),
  volume: Number(row.input_volume),
}));
const cases = [
  ['clean', 'sum_dynamic_len1to5_clean'],
  ['holes', 'sum_dynamic_len1to5_hole97'],
  ['warm', 'sum_dynamic_len1to5_warm0_7'],
] as const;

describe('native dynamic math.sum source retention', () => {
  it.each(cases.flatMap(([source, title]) => [false, true].map((local) => ({ source, title, local }))))(
    '$source local=$local retains non-na samples when length grows',
    ({ source, title, local }) => {
      const declaration = local ? 'f(float s, int n) =>\n    math.sum(s, n)\n' : '';
      const call = local ? `f(${source}, n)` : `math.sum(${source}, n)`;
      const script = `//@version=6\nindicator("dynamic sum", max_bars_back=200)\nb = bar_index\nclean = (b % 17 - 8) / 4.0\nholes = b % 97 == 40 or b % 97 == 41 or b % 97 == 42 ? float(na) : clean\nwarm = b < 8 ? float(na) : clean\nn = b % 5 + 1\n${declaration}plot(${call}, "value")`;
      const result = runCompatScript(script, { bars });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'value').values).toEqual(rows.map((row) => row[title]));
    },
  );
});

// The same documented sum rule applies when the expression executes in a requested context.
it('retains dynamic sum history in request.security', () => {
  const requestDatafeed = new InMemoryRequestDatafeed([{ symbol: 'NATIVE', timeframe: '2', bars }]);
  const script =
    '//@version=6\nindicator("requested dynamic sum", max_bars_back=200)\nb = bar_index\nclean = (b % 17 - 8) / 4.0\nholes = b % 97 == 40 or b % 97 == 41 or b % 97 == 42 ? float(na) : clean\nn = b % 5 + 1\nplot(request.security("NATIVE", "2", math.sum(holes, n)), "value")';
  const result = runCompatScript(script, {
    bars,
    engineOptions: { requestDatafeed, runtime: { timeframe: { period: '2' } } },
  });
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'value').values).toEqual(rows.map((row) => row.sum_dynamic_len1to5_hole97));
});
