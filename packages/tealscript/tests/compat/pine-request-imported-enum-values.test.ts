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
export choose(float value) =>
    value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat
export word(float value) =>
    value > 0 ? "Direction.up" : value < 0 ? "Direction.down" : "Direction.flat"
export type Side
    float up
export value(Side Direction) =>
    Direction.up
`);

// Imported exported functions are valid request expressions; enum conversion
// uses the declared titles while ordinary enum-spelled strings retain their text.
// Authority: reference/pine-v6-reference-v1.json import, request and enum entries.
describe('request imported enum function values', () => {
  for (const requested of [false, true]) {
    it(`preserves a library parameter shadowing its enum name with requested ${requested}`, () => {
      const result = runCompatScript(
        `//@version=6
indicator("Imported enum parameter shadow")
import Test/Directions/1 as lib
value = ${requested ? 'request.security("REMOTE:ALT", "1", lib.value(lib.Side.new(close)))' : 'lib.value(lib.Side.new(close))'}
plot(value, "Value")
plot(str.tostring(value) == "-7" ? -7 : str.tostring(value) == "13" ? 13 : 99, "Text")`,
        {
          bars: bars([
            [0, -7],
            [1, 13],
          ]),
          engineOptions: {
            libraries: new Map([['Test/Directions/1', library]]),
            requestDatafeed: new InMemoryRequestDatafeed([
              {
                symbol: 'REMOTE:ALT',
                timeframe: '1',
                bars: bars([
                  [0, -7],
                  [1, 13],
                ]),
              },
            ]),
            runtime: { timeframe: { period: '1' } },
          },
        },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
      expect(getPlot(result, 'Value').values).toEqual([-7, 13]);
      expect(getPlot(result, 'Text').values).toEqual([-7, 13]);
    });
  }
  for (const collision of [false, true]) {
    it(`resolves the library enum in direct exported calls with chart collision ${collision}`, () => {
      const result = runCompatScript(
        `//@version=6
indicator("Direct imported enum values")
import Test/Directions/1 as lib
${collision ? 'enum Direction\n    up = "chart rising"\n    down = "chart dip"\n    flat = "chart flat"' : ''}
direction = lib.choose(close)
plot(direction == lib.Direction.up ? 7 : direction == lib.Direction.down ? -4 : 2, "Identity")
plot(str.tostring(direction) == "rising" ? 7 : str.tostring(direction) == "dip" ? -4 : 2, "Title")`,
        {
          bars: bars([
            [0, -7],
            [1, 13],
            [2, 0],
            [3, -11],
          ]),
          engineOptions: { libraries: new Map([['Test/Directions/1', library]]) },
        },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
      expect(getPlot(result, 'Identity').values).toEqual([-4, 7, 2, -4]);
      expect(getPlot(result, 'Title').values).toEqual([-4, 7, 2, -4]);
    });

    it(`preserves ordinary imported function strings with chart collision ${collision}`, () => {
      const result = runCompatScript(
        `//@version=6
indicator("Direct imported string values")
import Test/Directions/1 as lib
${collision ? 'enum Direction\n    up = "chart rising"\n    down = "chart dip"\n    flat = "chart flat"' : ''}
word = lib.word(close)
plot(str.tostring(word) == "Direction.up" ? 7 : str.tostring(word) == "Direction.down" ? -4 : 2, "Word")`,
        {
          bars: bars([
            [0, -7],
            [1, 13],
            [2, 0],
            [3, -11],
          ]),
          engineOptions: { libraries: new Map([['Test/Directions/1', library]]) },
        },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
      expect(getPlot(result, 'Word').values).toEqual([-4, 7, 2, -4]);
    });
  }
  for (const method of ['security', 'security_lower_tf']) {
    for (const binding of ['positional', 'named']) {
      it(`retains imported enum and string returns through ${method} with ${binding} arguments`, () => {
        const lower = method === 'security_lower_tf';
        const request = (expression: string) =>
          binding === 'named'
            ? `request.${method}(expression=${expression}, timeframe="1", symbol="REMOTE:ALT")`
            : `request.${method}("REMOTE:ALT", "1", ${expression})`;
        const plots = lower ? ['plot(array.size(directions), "Count")', 'plot(array.size(words), "Word count")'] : [];
        for (const index of lower ? [0, 1, 2] : [0]) {
          const direction = lower ? `array.get(directions, ${index})` : 'directions';
          const word = lower ? `array.get(words, ${index})` : 'words';
          const prefix = lower ? `${index} ` : '';
          const guard = (expression: string) =>
            lower ? `array.size(directions) > ${index} ? (${expression}) : na` : expression;
          plots.push(
            `plot(${guard(`${direction} == lib.Direction.up ? 7 : ${direction} == lib.Direction.down ? -4 : ${direction} == lib.Direction.flat ? 2 : 99`)}, "${prefix}Identity")`,
          );
          plots.push(
            `plot(${guard(`str.tostring(${direction}) == "rising" ? 7 : str.tostring(${direction}) == "dip" ? -4 : str.tostring(${direction}) == "stillness" ? 2 : 99`)}, "${prefix}Title")`,
          );
          plots.push(
            `plot(${guard(`str.tostring(${word}) == "Direction.up" ? 7 : str.tostring(${word}) == "Direction.down" ? -4 : str.tostring(${word}) == "Direction.flat" ? 2 : 99`)}, "${prefix}Word")`,
          );
        }
        const result = runCompatScript(
          `//@version=6
indicator("Requested imported enum values")
import Test/Directions/1 as lib
directions = ${request('lib.choose(close)')}
words = ${request('lib.word(close)')}
plot(lib.choose(close) == lib.Direction.up ? 1 : 0, "Chart control")
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
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        expect(getPlot(result, 'Chart control').values).toEqual(lower ? [1, 1, 1] : [1, 1, 1, 1]);
        if (lower) {
          expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          expect(getPlot(result, 'Word count').values).toEqual([3, 0, 2]);
        }
        const expected = lower
          ? [
              [-4, null, 7],
              [7, null, -4],
              [-4, null, null],
            ]
          : [[-4, 7, 2, -4]];
        for (const [index, values] of expected.entries()) {
          const prefix = lower ? `${index} ` : '';
          expect(getPlot(result, `${prefix}Identity`).values).toEqual(values);
          expect(getPlot(result, `${prefix}Title`).values).toEqual(values);
          expect(getPlot(result, `${prefix}Word`).values).toEqual(values);
        }
      });
    }
  }
});
