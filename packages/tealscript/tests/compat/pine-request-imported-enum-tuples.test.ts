import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
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
const library = parse(`//@version=6
library("Directions")
export enum Direction
    up = "rising"
    down = "dip"
    flat = "stillness"
choose(float value) =>
    value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat
word(float value) =>
    value > 0 ? "Direction.up" : value < 0 ? "Direction.down" : "Direction.flat"
export sample(float value) =>
    [choose(value), word(value), value * 10]
`);

// Request tuple expressions retain each member's type and requested context.
// reference/pine-v6-reference-v1.json request/enum/import entries specify these
// observable contracts, including title conversion and lower_tf array members.
describe('request imported mixed enum tuples', () => {
  for (const method of ['security', 'security_lower_tf']) {
    for (const binding of ['positional', 'named']) {
      it(`retains all imported tuple components through ${method} with ${binding} arguments`, () => {
        const lower = method === 'security_lower_tf';
        const args =
          binding === 'named'
            ? 'expression=lib.sample(value=close), timeframe="1", symbol="REMOTE:ALT"'
            : '"REMOTE:ALT", "1", lib.sample(close)';
        const plots = lower
          ? [
              'plot(array.size(directions), "Count")',
              'plot(array.size(words), "Word count")',
              'plot(array.size(numbers), "Number count")',
            ]
          : [];
        for (const index of lower ? [0, 1, 2] : [0]) {
          const direction = lower ? `array.get(directions, ${index})` : 'directions';
          const word = lower ? `array.get(words, ${index})` : 'words';
          const number = lower ? `array.get(numbers, ${index})` : 'numbers';
          const prefix = lower ? `${index} ` : '';
          const guard = (expr: string) => (lower ? `array.size(directions) > ${index} ? (${expr}) : na` : expr);
          plots.push(
            `plot(${guard(`${direction} == lib.Direction.up ? 7 : ${direction} == lib.Direction.down ? -4 : ${direction} == lib.Direction.flat ? 2 : 99`)}, "${prefix}Identity")`,
          );
          plots.push(
            `plot(${guard(`str.tostring(${direction}) == "rising" ? 7 : str.tostring(${direction}) == "dip" ? -4 : str.tostring(${direction}) == "stillness" ? 2 : 99`)}, "${prefix}Title")`,
          );
          plots.push(
            `plot(${guard(`str.tostring(${word}) == "Direction.up" ? 7 : str.tostring(${word}) == "Direction.down" ? -4 : str.tostring(${word}) == "Direction.flat" ? 2 : 99`)}, "${prefix}Word")`,
          );
          plots.push(`plot(${guard(number)}, "${prefix}Number")`);
        }
        const result = runCompatScript(
          `//@version=6
indicator("Requested imported mixed enum tuple")
import Test/Directions/1 as lib
[directions, words, numbers] = request.${method}(${args})
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
              libraries: new Map([['Test/Directions/1', library]]),
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
        expect(result.errors[0]?.message).toBeUndefined();
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        if (lower) {
          for (const title of ['Count', 'Word count', 'Number count'])
            expect(getPlot(result, title).values).toEqual([3, 0, 2]);
        }
        const expected = lower
          ? [
              [-4, null, 7],
              [7, null, -4],
              [-4, null, null],
            ]
          : [[-4, 7, 2, -4]];
        const expectedNumbers = lower
          ? [
              [-70, null, 120],
              [130, null, -110],
              [-30, null, null],
            ]
          : [[-70, 130, 0, -110]];
        for (const [index, values] of expected.entries()) {
          const prefix = lower ? `${index} ` : '';
          for (const title of ['Identity', 'Title', 'Word'])
            expect(getPlot(result, `${prefix}${title}`).values).toEqual(values);
          expect(getPlot(result, `${prefix}Number`).values).toEqual(expectedNumbers[index]);
        }
      });
    }
  }
});
