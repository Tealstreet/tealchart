import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 9, 1);
function bars(points: Array<[number, number]>): Bar[] {
  return points.map(([offset, close]) => ({
    time: start + offset * 60_000,
    open: close - 2,
    high: close + 4,
    low: close - 5,
    close,
    volume: 100,
  }));
}
const encodeFlag = (value: string) => `${value}.flag ? 1 : -1`;
const encodeText = (value: string) =>
  `${value}.textValue == "UP" ? 7 : ${value}.textValue == "DOWN" ? -4 : ${value}.textValue == "FLAT" ? 2 : 99`;

// Both request contracts permit object expressions within tuples; lower_tf returns one array per item.
// reference/pine-v6-reference-v1.json request.security/security_lower_tf expression and returns entries.
// Mixed object/scalar slots and sparse intrabars reject tuple transposition and chart-context reuse.
describe('request mixed object tuple values', () => {
  for (const method of ['security', 'security_lower_tf']) {
    const lower = method === 'security_lower_tf';
    for (const binding of ['positional', 'named']) {
      it(`preserves object and scalar tuple components through ${method} with ${binding} arguments`, () => {
        const expression =
          'Payload.new(close > 0, close > 0 ? "UP" : close < 0 ? "DOWN" : "FLAT", close > 0 ? #12AB34 : close < 0 ? #ED4506 : #7B89CD, close)';
        const tupleExpression = `[${expression}, close * 10]`;
        const args =
          binding === 'named'
            ? `expression=${tupleExpression}, symbol="REMOTE:ALT", timeframe="1"`
            : `"REMOTE:ALT", "1", ${tupleExpression}`;
        const output = lower
          ? `plot(array.size(values), "Count")
${[0, 1, 2]
  .map((index) => {
    const value = `array.get(values, ${index})`;
    return `plot(array.size(values) > ${index} ? (${encodeFlag(value)}) : na, "Flag ${index}")
plot(array.size(values) > ${index} ? (${encodeText(value)}) : na, "Text ${index}")
plot(array.size(values) > ${index} ? color.r(${value}.shade) : na, "Red ${index}")
plot(array.size(values) > ${index} ? ${value}.price : na, "Price ${index}")`;
  })
  .join('\n')}`
          : `plot(${encodeFlag('values')}, "Flag")
plot(${encodeText('values')}, "Text")
plot(color.r(values.shade), "Red")
plot(values.price, "Price")`;
        const result = runCompatScript(
          `//@version=6
indicator("Requested mixed object tuple")
type Payload
    bool flag
    string textValue
    color shade
    float price
[values, markers] = request.${method}(${args})
${output}
${lower ? `plot(array.size(markers), "Marker count")\n${[0, 1, 2].map((index) => `plot(array.size(markers) > ${index} ? array.get(markers, ${index}) : na, "Marker ${index}")`).join('\n')}` : `plot(markers, "Marker")`}`,
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
        if (lower) {
          expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          expect(getPlot(result, 'Marker count').values).toEqual([3, 0, 2]);
          [
            [-70, null, 120],
            [130, null, -110],
            [-30, null, null],
          ].forEach((values, index) => expect(getPlot(result, `Marker ${index}`).values).toEqual(values));
          const expected = {
            Flag: [
              [-1, null, 1],
              [1, null, -1],
              [-1, null, null],
            ],
            Text: [
              [-4, null, 7],
              [7, null, -4],
              [-4, null, null],
            ],
            Red: [
              [237, null, 18],
              [18, null, 237],
              [237, null, null],
            ],
            Price: [
              [-7, null, 12],
              [13, null, -11],
              [-3, null, null],
            ],
          };
          for (const [name, slots] of Object.entries(expected)) {
            slots.forEach((values, index) => expect(getPlot(result, `${name} ${index}`).values).toEqual(values));
          }
        } else {
          expect(getPlot(result, 'Marker').values).toEqual([-70, 130, 0, -110]);
          expect(getPlot(result, 'Flag').values).toEqual([-1, 1, -1, -1]);
          expect(getPlot(result, 'Text').values).toEqual([-4, 7, 2, -4]);
          expect(getPlot(result, 'Red').values).toEqual([237, 18, 123, 237]);
          expect(getPlot(result, 'Price').values).toEqual([-7, 13, 0, -11]);
        }
      });
    }
  }
});
