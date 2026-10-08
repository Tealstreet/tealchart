import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 9, 1);
const minute = 60_000;

function bars(points: Array<[number, number]>): Bar[] {
  return points.map(([offset, close]) => ({
    time: start + offset * minute,
    open: close - 2,
    high: close + 4,
    low: close - 5,
    close,
    volume: 100,
  }));
}

const components = [
  {
    name: 'boolean',
    array: 'flags',
    encode: (value: string) => `str.tostring(${value}) == "true" ? 1 : str.tostring(${value}) == "false" ? -1 : 0`,
    expected: [
      [-1, null, 1],
      [1, null, -1],
      [-1, null, null],
    ],
  },
  {
    name: 'string',
    array: 'labels',
    encode: (value: string) => `${value} == "UP" ? 7 : ${value} == "DOWN" ? -4 : 0`,
    expected: [
      [-4, null, 7],
      [7, null, -4],
      [-4, null, null],
    ],
  },
  {
    name: 'color',
    array: 'colors',
    encode: (value: string) => `color.r(${value})`,
    expected: [
      [237, null, 18],
      [18, null, 237],
      [237, null, null],
    ],
  },
];

// fun_request.security_lower_tf: expression/returns allow typed tuple arrays, earliest intrabar first.
// https://www.tradingview.com/pine-script-reference/v6/#fun_request.security_lower_tf
// Signed zigzags, an empty interval and a next-bar sample reject coercion, reordering and chart-source reuse.
describe('lower timeframe tuple value types', () => {
  for (const binding of ['positional', 'named']) {
    it.each(components)(`preserves $name intrabars with ${binding} arguments`, ({ array, encode, expected }) => {
      const expression = '[close > 0, close > 0 ? "UP" : "DOWN", close > 0 ? #12AB34 : #ED4506]';
      const argumentsText =
        binding === 'named'
          ? `expression=${expression}, timeframe="1", symbol="REMOTE:ALT"`
          : `"REMOTE:ALT", "1", ${expression}`;
      const source = `//@version=6
indicator("Typed intrabar values")
[flags, labels, colors] = request.security_lower_tf(${argumentsText})
plot(array.size(${array}), "Count")
${[0, 1, 2].map((index) => `plot(array.size(${array}) > ${index} ? (${encode(`array.get(${array}, ${index})`)}) : na, "Slot ${index}")`).join('\n')}`;
      const result = runCompatScript(source, {
        bars: bars([
          [0, 900],
          [3, 700],
          [6, 800],
        ]),
        engineOptions: {
          requestDatafeed: new InMemoryRequestDatafeed([
            {
              symbol: 'REMOTE:ALT',
              timeframe: '1',
              bars: bars([
                [0, -7],
                [1, 13],
                [2, -3],
                [6, 12],
                [8, -11],
                [9, 17],
              ]),
            },
          ]),
          runtime: { timeframe: { period: '3' } },
        },
      });

      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
      expected.forEach((values, index) => {
        expect(getPlot(result, `Slot ${index}`).values).toEqual(values);
      });
    });
  }
});
