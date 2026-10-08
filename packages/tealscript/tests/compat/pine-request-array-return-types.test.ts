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
    name: 'boolean',
    expression: 'array.from(close > 0, close <= 0)',
    outputs: ['array.get(values, 0) ? 1 : -1', 'array.get(values, 1) ? 1 : -1'],
    expected: [
      [-1, 1, -1, -1],
      [1, -1, 1, 1],
    ],
  },
  {
    name: 'string',
    expression:
      'array.from(close > 0 ? "UP" : close < 0 ? "DOWN" : "FLAT", close > 0 ? "POSITIVE" : close < 0 ? "NEGATIVE" : "ZERO")',
    outputs: [
      'array.get(values, 0) == "UP" ? 7 : array.get(values, 0) == "DOWN" ? -4 : array.get(values, 0) == "FLAT" ? 2 : 99',
      'array.get(values, 1) == "POSITIVE" ? 11 : array.get(values, 1) == "NEGATIVE" ? -8 : array.get(values, 1) == "ZERO" ? 3 : 99',
    ],
    expected: [
      [-4, 7, 2, -4],
      [-8, 11, 3, -8],
    ],
  },
  {
    name: 'color',
    expression:
      'array.from(close > 0 ? #12AB34 : close < 0 ? #ED4506 : #7B89CD, close > 0 ? #AA0BCC : close < 0 ? #010203 : #192A3B)',
    outputs: ['color.r(array.get(values, 0))', 'color.g(array.get(values, 1))'],
    expected: [
      [237, 18, 123, 237],
      [2, 11, 42, 2],
    ],
  },
];

// fun_request.security expression explicitly accepts arrays of series bool/string/color.
// reference/pine-v6-reference-v1.json expression and returns entries.
// Distinct slots and remote signs pin element kinds, order and advancing requested-context selection.
describe('security returns typed expression arrays', () => {
  for (const binding of ['positional', 'named']) {
    it.each(kinds)(`returns $name array contents with ${binding} arguments`, ({ expression, outputs, expected }) => {
      const args =
        binding === 'named'
          ? `timeframe="1", expression=${expression}, symbol="REMOTE:ALT"`
          : `"REMOTE:ALT", "1", ${expression}`;
      const result = runCompatScript(
        `//@version=6
indicator("Typed requested arrays")
values = request.security(${args})
plot(array.size(values), "Size")
${outputs.map((output, index) => `plot(${output}, "Slot ${index}")`).join('\n')}`,
        {
          bars: bars([900, 901, 902, 903]),
          engineOptions: {
            requestDatafeed: new InMemoryRequestDatafeed([
              {
                symbol: 'REMOTE:ALT',
                timeframe: '1',
                bars: bars([-7, 13, 0, -11]),
              },
            ]),
            runtime: { timeframe: { period: '1' } },
          },
        },
      );

      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Size').values).toEqual([2, 2, 2, 2]);
      expected.forEach((values, index) => expect(getPlot(result, `Slot ${index}`).values).toEqual(values));
    });
  }
});
