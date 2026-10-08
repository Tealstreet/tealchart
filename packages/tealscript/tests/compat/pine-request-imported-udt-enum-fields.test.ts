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
export type Payload
    Direction choice
    string note
    float price
export make(float value) =>
    Payload.new(value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat, "Direction.up", value * 10)
`);

// Request expressions permit objects with enum fields; imported exported UDTs
// retain their declared field types and enum titles. Ordinary strings stay text.
// Authority: reference/pine-v6-reference-v1.json import, enum and request entries.
describe('request imported UDT enum fields', () => {
  for (const method of ['security', 'security_lower_tf']) {
    for (const binding of ['positional', 'named']) {
      it(`retains imported UDT fields through ${method} with ${binding} arguments`, () => {
        const lower = method === 'security_lower_tf';
        const args =
          binding === 'named'
            ? 'expression=lib.make(value=close), timeframe="1", symbol="REMOTE:ALT"'
            : '"REMOTE:ALT", "1", lib.make(close)';
        const plots = lower ? ['plot(array.size(values), "Count")'] : [];
        for (const index of lower ? [0, 1, 2] : [0]) {
          const object = lower ? `array.get(values, ${index})` : 'values';
          const direction = `${object}.choice`;
          const prefix = lower ? `${index} ` : '';
          const guard = (expr: string) => (lower ? `array.size(values) > ${index} ? (${expr}) : na` : expr);
          plots.push(
            `plot(${guard(`${direction} == lib.Direction.up ? 7 : ${direction} == lib.Direction.down ? -4 : ${direction} == lib.Direction.flat ? 2 : 99`)}, "${prefix}Identity")`,
          );
          plots.push(
            `plot(${guard(`str.tostring(${direction}) == "rising" ? 7 : str.tostring(${direction}) == "dip" ? -4 : str.tostring(${direction}) == "stillness" ? 2 : 99`)}, "${prefix}Title")`,
          );
          plots.push(`plot(${guard(`str.tostring(${object}.note) == "Direction.up" ? 1 : 0`)}, "${prefix}Word")`);
          plots.push(`plot(${guard(`${object}.price`)}, "${prefix}Number")`);
        }
        const declaration =
          binding === 'named' ? (lower ? 'array<lib.Payload> values' : 'lib.Payload values') : 'values';
        const result = runCompatScript(
          `//@version=6
indicator("Requested imported UDT enum fields")
import Test/Directions/1 as lib
${declaration} = request.${method}(${args})
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
        if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
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
          expect(getPlot(result, `${prefix}Identity`).values).toEqual(values);
          expect(getPlot(result, `${prefix}Title`).values).toEqual(values);
          expect(getPlot(result, `${prefix}Word`).values).toEqual(values.map((value) => (value === null ? null : 1)));
          expect(getPlot(result, `${prefix}Number`).values).toEqual(expectedNumbers[index]);
        }
      });
    }
  }
  for (const lower of [false, true]) {
    it(`preserves imported ordinary string and numeric fields with lower ${lower}`, () => {
      const result = runCompatScript(
        `//@version=6
indicator("Requested imported UDT plain fields")
import Test/Directions/1 as lib
values = request.${lower ? 'security_lower_tf' : 'security'}("REMOTE:ALT", "1", lib.make(close))
plot(str.tostring(${lower ? 'array.get(values, 0)' : 'values'}.note) == "Direction.up" ? 1 : 0, "Word")
plot(${lower ? 'array.get(values, 0)' : 'values'}.price, "Number")`,
        {
          bars: bars([
            [0, 900],
            [1, 901],
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
      expect(result.errors[0]?.message).toBeUndefined();
      expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
      expect(getPlot(result, 'Word').values).toEqual([1, 1]);
      expect(getPlot(result, 'Number').values).toEqual([-70, 130]);
    });
  }
});
