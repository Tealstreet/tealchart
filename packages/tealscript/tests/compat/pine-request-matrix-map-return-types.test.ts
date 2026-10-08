import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 9, 1);
function bars(closes: number[]): Bar[] {
  return closes.map((close, index) => ({
    time: start + index * 60_000,
    open: close - 2,
    high: close + 4,
    low: close - 5,
    close,
    volume: 100,
  }));
}
const kinds = [
  {
    name: 'matrix of string',
    body: `    values = matrix.new<string>(1, 2, close > 0 ? "UP" : close < 0 ? "DOWN" : "FLAT")
    matrix.set(values, 0, 1, close > 0 ? "POSITIVE" : close < 0 ? "NEGATIVE" : "ZERO")
    values`,
    sizes: ['matrix.rows(values)', 'matrix.columns(values)'],
    expectedSizes: [1, 2],
    outputs: [
      'matrix.get(values, 0, 0) == "UP" ? 7 : matrix.get(values, 0, 0) == "DOWN" ? -4 : matrix.get(values, 0, 0) == "FLAT" ? 2 : 99',
      'matrix.get(values, 0, 1) == "POSITIVE" ? 11 : matrix.get(values, 0, 1) == "NEGATIVE" ? -8 : matrix.get(values, 0, 1) == "ZERO" ? 3 : 99',
    ],
    expected: [
      [-4, 7, 2, -4],
      [-8, 11, 3, -8],
    ],
  },
  {
    name: 'matrix of color',
    body: `    values = matrix.new<color>(1, 2, close > 0 ? #12AB34 : close < 0 ? #ED4506 : #7B89CD)
    matrix.set(values, 0, 1, close > 0 ? #AA0BCC : close < 0 ? #010203 : #192A3B)
    values`,
    sizes: ['matrix.rows(values)', 'matrix.columns(values)'],
    expectedSizes: [1, 2],
    outputs: ['color.r(matrix.get(values, 0, 0))', 'color.g(matrix.get(values, 0, 1))'],
    expected: [
      [237, 18, 123, 237],
      [2, 11, 42, 2],
    ],
  },
  {
    name: 'map of boolean',
    body: `    values = map.new<string, bool>()
    map.put(values, "positive", close > 0)
    map.put(values, "nonpositive", close <= 0)
    values`,
    sizes: ['map.size(values)'],
    expectedSizes: [2],
    outputs: ['map.get(values, "positive") ? 1 : -1', 'map.get(values, "nonpositive") ? 1 : -1'],
    expected: [
      [-1, 1, -1, -1],
      [1, -1, 1, 1],
    ],
  },
  {
    name: 'map of string',
    body: `    values = map.new<string, string>()
    map.put(values, "direction", close > 0 ? "UP" : close < 0 ? "DOWN" : "FLAT")
    map.put(values, "sign", close > 0 ? "POSITIVE" : close < 0 ? "NEGATIVE" : "ZERO")
    values`,
    sizes: ['map.size(values)'],
    expectedSizes: [2],
    outputs: [
      'map.get(values, "direction") == "UP" ? 7 : map.get(values, "direction") == "DOWN" ? -4 : map.get(values, "direction") == "FLAT" ? 2 : 99',
      'map.get(values, "sign") == "POSITIVE" ? 11 : map.get(values, "sign") == "NEGATIVE" ? -8 : map.get(values, "sign") == "ZERO" ? 3 : 99',
    ],
    expected: [
      [-4, 7, 2, -4],
      [-8, 11, 3, -8],
    ],
  },
];

// request.security expression accepts matrices/maps of series bool/string/color and UDF calls.
// reference/pine-v6-reference-v1.json expression and returns entries.
// Different remote/chart signs and two distinct cells/keys pin typed content and context selection.
describe('security returns typed matrices and maps', () => {
  for (const binding of ['positional', 'named']) {
    it.each(kinds)(
      `returns $name contents with ${binding} arguments`,
      ({ body, sizes, expectedSizes, outputs, expected }) => {
        const args =
          binding === 'named' ? 'expression=make(), timeframe="1", symbol="REMOTE:ALT"' : '"REMOTE:ALT", "1", make()';
        const result = runCompatScript(
          `//@version=6
indicator("Typed requested matrices and maps")
make() =>
${body}
values = request.security(${args})
${sizes.map((expression, index) => `plot(${expression}, "Size ${index}")`).join('\n')}
${outputs.map((expression, index) => `plot(${expression}, "Value ${index}")`).join('\n')}`,
          {
            bars: bars([900, 901, 902, 903]),
            engineOptions: {
              requestDatafeed: new InMemoryRequestDatafeed([
                { symbol: 'REMOTE:ALT', timeframe: '1', bars: bars([-7, 13, 0, -11]) },
              ]),
              runtime: { timeframe: { period: '1' } },
            },
          },
        );
        expect(result.errors).toEqual([]);
        expectedSizes.forEach((size, index) =>
          expect(getPlot(result, `Size ${index}`).values).toEqual([size, size, size, size]),
        );
        expected.forEach((values, index) => expect(getPlot(result, `Value ${index}`).values).toEqual(values));
      },
    );
  }
});
