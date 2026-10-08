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

// request.security_lower_tf permits collections within object fields.
// reference/pine-v6-reference-v1.json request expression/returns entries.
// Two cells per typed field distinguish collection contents from object admission.
describe('request UDT collection field values', () => {
  for (const method of ['security', 'security_lower_tf']) {
    const lower = method === 'security_lower_tf';
    for (const binding of ['positional', 'named']) {
      it(`preserves typed collection fields through ${method} with ${binding} arguments`, () => {
        const expression = `Payload.new(array.from(close > 0, close <= 0), array.from(close > 0 ? "UP" : close < 0 ? "DOWN" : "FLAT", close > 0 ? "LEFT" : close < 0 ? "RIGHT" : "EVEN"), array.from(close > 0 ? #12AB34 : close < 0 ? #ED4506 : #7B89CD, #013579), array.from(close, close * 10))`;
        const args =
          binding === 'named'
            ? `expression=${expression}, timeframe="1", symbol="REMOTE:ALT"`
            : `"REMOTE:ALT", "1", ${expression}`;
        const plots: string[] = lower ? ['plot(array.size(values), "Count")'] : [];
        for (const outer of lower ? [0, 1, 2] : [0]) {
          const object = lower ? `array.get(values, ${outer})` : 'values';
          const prefix = lower ? `${outer} ` : '';
          const guard = (expr: string) => (lower ? `array.size(values) > ${outer} ? (${expr}) : na` : expr);
          for (const field of ['flags', 'words', 'shades', 'prices']) {
            plots.push(`plot(${guard(`array.size(${object}.${field})`)}, "${prefix}${field} Size")`);
          }
          for (const inner of [0, 1]) {
            const flag = `array.get(${object}.flags, ${inner})`;
            const word = `array.get(${object}.words, ${inner})`;
            const red = `color.r(array.get(${object}.shades, ${inner}))`;
            const price = `array.get(${object}.prices, ${inner})`;
            const wordCode =
              inner === 0
                ? `${word} == "UP" ? 7 : ${word} == "DOWN" ? -4 : ${word} == "FLAT" ? 2 : 99`
                : `${word} == "LEFT" ? 11 : ${word} == "RIGHT" ? -8 : ${word} == "EVEN" ? 3 : 99`;
            plots.push(`plot(${guard(`${flag} ? 1 : -1`)}, "${prefix}Flag ${inner}")`);
            plots.push(`plot(${guard(wordCode)}, "${prefix}Text ${inner}")`);
            plots.push(`plot(${guard(red)}, "${prefix}Red ${inner}")`);
            plots.push(`plot(${guard(price)}, "${prefix}Price ${inner}")`);
          }
        }
        const result = runCompatScript(
          `//@version=6
indicator("Requested object collection fields")
type Payload
    array<bool> flags
    array<string> words
    array<color> shades
    array<float> prices
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
        const expectedPrices = lower
          ? [
              [-7, null, 12],
              [13, null, -11],
              [-3, null, null],
            ]
          : [[-7, 13, 0, -11]];
        for (const [outer, prices] of expectedPrices.entries()) {
          const prefix = lower ? `${outer} ` : '';
          const vector = (fn: (price: number) => number) => prices.map((price) => (price === null ? null : fn(price)));
          for (const field of ['flags', 'words', 'shades', 'prices']) {
            expect(getPlot(result, `${prefix}${field} Size`).values).toEqual(vector(() => 2));
          }
          for (const inner of [0, 1]) {
            expect(getPlot(result, `${prefix}Flag ${inner}`).values).toEqual(
              vector((price) => (price > 0 !== (inner === 1) ? 1 : -1)),
            );
            expect(getPlot(result, `${prefix}Text ${inner}`).values).toEqual(
              vector((price) =>
                inner === 0 ? (price > 0 ? 7 : price < 0 ? -4 : 2) : price > 0 ? 11 : price < 0 ? -8 : 3,
              ),
            );
            expect(getPlot(result, `${prefix}Red ${inner}`).values).toEqual(
              vector((price) => (inner === 1 ? 1 : price > 0 ? 18 : price < 0 ? 237 : 123)),
            );
            expect(getPlot(result, `${prefix}Price ${inner}`).values).toEqual(
              vector((price) => price * (inner === 0 ? 1 : 10)),
            );
          }
        }
      });
    }
  }
});
