import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Authority: reference/pine-v6-reference-v1.json functions[162,163,166,167,368,369].
// Independent stimuli reproduce ta-c-integration-review-v2.json dynamic median/mode/pivothigh findings.
const cases = [
  { name: 'median', args: 'n', setup: 'n = bar_index < 5 ? 2 : 3', values: [4, 1, 8, 3, 6, 2], expected: 3 },
  { name: 'mode', args: 'n', setup: 'n = bar_index < 5 ? 2 : 3', values: [4, 1, 8, 3, 6, 2], expected: 2 },
  { name: 'median holes', args: 'n', setup: 'n = bar_index < 5 ? 2 : 3', values: [4, 1, 8, NaN, 6, 2], expected: 6 },
  { name: 'mode holes', args: 'n', setup: 'n = bar_index < 5 ? 2 : 3', values: [4, 1, 8, NaN, 6, 2], expected: 2 },
  {
    name: 'pivothigh left',
    args: 'n, 1',
    setup: 'n = bar_index < 6 ? 1 : 2',
    values: [4, 1, 8, 3, 6, 2, 9, 5],
    expected: 9,
  },
  {
    name: 'pivothigh right',
    args: '1, n',
    setup: 'n = bar_index < 6 ? 1 : 2',
    values: [4, 1, 8, 3, 6, 2, 9, 5, 4],
    expected: 9,
  },
  {
    name: 'pivothigh default-left',
    args: 'n, 1',
    setup: 'n = bar_index < 6 ? 1 : 2',
    values: [4, 1, 8, 3, 6, 2, 9, 5],
    expected: 10,
    defaultSource: true,
  },
  {
    name: 'pivothigh default-right',
    args: '1, n',
    setup: 'n = bar_index < 6 ? 1 : 2',
    values: [4, 1, 8, 3, 6, 2, 9, 5, 4],
    expected: 10,
    defaultSource: true,
  },
];

describe('documented dynamic order-statistic and pivot history', () => {
  it.each(cases.flatMap((entry) => [false, true].map((local) => ({ ...entry, local }))))(
    '$name local=$local uses source history on parameter change',
    (entry) => {
      const member = entry.name.split(' ')[0];
      const defaultSource = 'defaultSource' in entry && entry.defaultSource;
      const declaration = entry.local
        ? `f(${defaultSource ? 'int n' : 'float s, int n'}) =>\n    ta.${member}(${defaultSource ? '' : 's, '}${entry.args})\n`
        : '';
      const call = entry.local
        ? defaultSource
          ? 'f(n)'
          : 'f(src, n)'
        : `ta.${member}(${defaultSource ? '' : 'src, '}${entry.args})`;
      const source = `//@version=6\nindicator("dynamic order statistics")\nmax_bars_back(close, 10)\n${entry.setup}\nsrc = bar_index == 3 and ${entry.values.some(Number.isNaN) ? 'true' : 'false'} ? float(na) : close\n${declaration}plot(${call}, "value")`;
      const bars = entry.values.map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: 10,
        high: Number.isNaN(close) ? 11 : close + 1,
        low: Number.isNaN(close) ? 9 : close - 1,
        close: Number.isNaN(close) ? 10 : close,
        volume: 100,
      }));
      const result = runCompatScript(source, { bars });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'value').values.at(-1)).toBe(entry.expected);
    },
  );
});
