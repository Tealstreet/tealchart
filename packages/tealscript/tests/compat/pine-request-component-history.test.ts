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

const encodeFlag = (value: string) =>
  `str.tostring(${value}) == "true" ? 1 : str.tostring(${value}) == "false" ? -1 : 99`;
const encodeLabel = (value: string) => `na(${value}) ? 99 : ${value} == "UP" ? 7 : ${value} == "DOWN" ? -4 : 2`;

// Request expression history evaluates in its requested context; tuple returns preserve member types.
// fun_request.security/security_lower_tf and the [] history operator in pine-v6-reference-v1.json.
// Signed requested bars and a skipped chart interval distinguish requested physical history from chart history.
describe('request tuple component history', () => {
  for (const method of ['security', 'security_lower_tf']) {
    const lower = method === 'security_lower_tf';
    for (const binding of ['positional', 'named']) {
      it(`preserves boolean, string and color history in ${method} with ${binding} arguments`, () => {
        const expression = '[flag[1], textValue[1], shade[1], close[1]]';
        const args =
          binding === 'named'
            ? `expression=${expression}, timeframe="1", symbol="REMOTE:ALT"`
            : `"REMOTE:ALT", "1", ${expression}`;
        const output = lower
          ? `plot(array.size(flags), "Count")
${[0, 1, 2]
  .map(
    (index) => `plot(array.size(flags) > ${index} ? (${encodeFlag(`array.get(flags, ${index})`)}) : na, "Flag ${index}")
plot(array.size(labels) > ${index} ? (${encodeLabel(`array.get(labels, ${index})`)}) : na, "Label ${index}")
plot(array.size(colors) > ${index} ? color.r(array.get(colors, ${index})) : na, "Red ${index}")
plot(array.size(prices) > ${index} ? array.get(prices, ${index}) : na, "Price ${index}")`,
  )
  .join('\n')}`
          : `plot(${encodeFlag('flags')}, "Flag")
plot(${encodeLabel('labels')}, "Label")
plot(color.r(colors), "Red")
plot(prices, "Price")`;
        const result = runCompatScript(
          `//@version=6
indicator("Requested component history")
flag = close > 0
textValue = close > 0 ? "UP" : close < 0 ? "DOWN" : "FLAT"
shade = close > 0 ? #12AB34 : close < 0 ? #ED4506 : #7B89CD
[flags, labels, colors, prices] = request.${method}(${args})
${output}`,
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
                        [2, -3],
                        [3, 0],
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
          const expected = {
            Flag: [
              [-1, null, -1],
              [-1, null, 1],
              [1, null, null],
            ],
            Label: [
              [99, null, -4],
              [-4, null, 7],
              [7, null, null],
            ],
            Red: [
              [null, null, 237],
              [237, null, 18],
              [18, null, null],
            ],
            Price: [
              [null, null, -3],
              [-7, null, 12],
              [13, null, null],
            ],
          };
          for (const [name, slots] of Object.entries(expected)) {
            slots.forEach((values, index) => expect(getPlot(result, `${name} ${index}`).values).toEqual(values));
          }
        } else {
          expect(getPlot(result, 'Flag').values).toEqual([-1, -1, 1, -1]);
          expect(getPlot(result, 'Label').values).toEqual([99, -4, 7, -4]);
          expect(getPlot(result, 'Red').values).toEqual([null, 237, 18, 237]);
          expect(getPlot(result, 'Price').values).toEqual([null, -7, 13, -3]);
        }
      });
    }
  }
});
