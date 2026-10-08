import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 9, 1);
const bars = (points: Array<[number, number]>): Bar[] =>
  points.map(([offset, close]) => ({
    time: start + offset * 60_000,
    open: close - 2,
    high: close + 4,
    low: close - 5,
    close,
    volume: 100,
  }));
const code = (value: string) =>
  `${value} == Direction.up ? 7 : ${value} == Direction.down ? -4 : ${value} == Direction.flat ? 2 : 99`;
const title = (value: string) =>
  `str.tostring(${value}) == "rising" ? 7 : str.tostring(${value}) == "dip" ? -4 : str.tostring(${value}) == "stillness" ? 2 : 99`;

// Request expressions permit objects and collections within their fields.
// reference/pine-v6-reference-v1.json enum entry specifies str.tostring titles.
// A lookalike string field distinguishes enum metadata from runtime string content.
describe('request enum object field transport', () => {
  for (const method of ['security', 'security_lower_tf']) {
    const lower = method === 'security_lower_tf';
    for (const binding of ['positional', 'named']) {
      for (const shape of ['scalar', 'array']) {
        const array = shape === 'array';
        it(`preserves ${shape} enum field identity and titles through ${method} with ${binding} arguments`, () => {
          const direction = 'close > 0 ? Direction.up : close < 0 ? Direction.down : Direction.flat';
          const expression = `Payload.new(${array ? `array.from(${direction}, Direction.flat)` : direction}, "Direction.up")`;
          const args =
            binding === 'named'
              ? `expression=${expression}, timeframe="1", symbol="REMOTE:ALT"`
              : `"REMOTE:ALT", "1", ${expression}`;
          const plots = lower ? ['plot(array.size(values), "Count")'] : [];
          for (const index of lower ? [0, 1, 2] : [0]) {
            const object = lower ? `array.get(values, ${index})` : 'values';
            const prefix = lower ? `${index} ` : '';
            const guard = (expr: string) => (lower ? `array.size(values) > ${index} ? (${expr}) : na` : expr);
            for (const inner of array ? [0, 1] : [0]) {
              const value = array ? `array.get(${object}.choices, ${inner})` : `${object}.direction`;
              plots.push(`plot(${guard(code(value))}, "${prefix}Code ${inner}")`);
              plots.push(`plot(${guard(title(value))}, "${prefix}Title ${inner}")`);
            }
            if (array) plots.push(`plot(${guard(`array.size(${object}.choices)`)}, "${prefix}Field size")`);
            plots.push(`plot(${guard(`str.tostring(${object}.note) == "Direction.up" ? 1 : 0`)}, "${prefix}Plain")`);
          }
          const result = runCompatScript(
            `//@version=6
indicator("Requested enum object fields")
enum Direction
    up = "rising"
    down = "dip"
    flat = "stillness"
type Payload
    ${array ? 'array<Direction> choices' : 'Direction direction'}
    string note
values = request.${method}(${args})
${plots.join('\n')}`,
            {
              bars: lower
                ? bars([
                    [0, 900],
                    [3, 700],
                    [6, 800],
                  ])
                : bars([
                    [0, 900],
                    [1, 901],
                    [2, 902],
                    [3, 903],
                  ]),
              engineOptions: {
                requestDatafeed: new InMemoryRequestDatafeed([
                  {
                    symbol: 'REMOTE:ALT',
                    timeframe: '1',
                    bars: lower
                      ? bars([
                          [0, -7],
                          [1, 13],
                          [2, -3],
                          [6, 12],
                          [8, -11],
                          [9, 17],
                        ])
                      : bars([
                          [0, -7],
                          [1, 13],
                          [2, 0],
                          [3, -11],
                        ]),
                  },
                ]),
                runtime: { timeframe: { period: lower ? '3' : '1' } },
              },
            },
          );
          expect(result.errors).toEqual([]);
          if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          const expected = lower
            ? [
                [-4, null, 7],
                [7, null, -4],
                [-4, null, null],
              ]
            : [[-4, 7, 2, -4]];
          for (const [index, values] of expected.entries()) {
            const prefix = lower ? `${index} ` : '';
            const fixed = (value: number) => values.map((item) => (item === null ? null : value));
            expect(getPlot(result, `${prefix}Code 0`).values).toEqual(values);
            expect(getPlot(result, `${prefix}Title 0`).values).toEqual(values);
            expect(getPlot(result, `${prefix}Plain`).values).toEqual(fixed(1));
            if (array) {
              expect(getPlot(result, `${prefix}Field size`).values).toEqual(fixed(2));
              expect(getPlot(result, `${prefix}Code 1`).values).toEqual(fixed(2));
              expect(getPlot(result, `${prefix}Title 1`).values).toEqual(fixed(2));
            }
          }
        });
      }
    }
  }
});
