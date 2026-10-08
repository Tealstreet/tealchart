import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 9, 1);
const bars = (points: Array<[number, number]>): Bar[] =>
  points.map(([offset, close]) => ({
    time: start + offset * 60_000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
  }));

// Each written untyped call inherits its own specified argument types.
// Named arguments bind by parameter name, independently of source order.
describe('requested untyped written call metadata', () => {
  for (const version of [5, 6]) {
    for (const request of ['security', 'security_lower_tf']) {
      const lower = request === 'security_lower_tf';
      for (const shape of ['enum', 'udt']) {
        it(`v${version} independent named ${shape} and string calls through ${request}`, () => {
          const chosen = 'close > 0 ? Direction.up : close < 0 ? Direction.down : Direction.flat';
          const argument = shape === 'enum' ? chosen : `Payload.new(${chosen}, close)`;
          const result = runCompatScript(
            `//@version=${version}
indicator("Requested independent named parameter titles")
enum Direction
    up = "rising"
    down = "dip"
    flat = "stillness"
type Payload
    Direction choice
    float price
retain(prefix, value) => value
[requested, words] = request.${request}("REMOTE:ALT", "1", [retain(value = ${argument}, prefix = 1), retain(prefix = 2, value = close > 0 ? "Direction.up" : close < 0 ? "Direction.down" : "Direction.flat")])
extracted = ${lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested'}
word = ${lower ? 'array.size(words) > 0 ? array.get(words, 0) : na' : 'words'}
value = ${shape === 'enum' ? 'extracted' : 'na(extracted) ? na : extracted.choice'}
plot(na(value) ? na : str.tostring(value) == "rising" ? 7 : str.tostring(value) == "dip" ? -4 : str.tostring(value) == "stillness" ? 2 : 99, "Title")
plot(na(value) ? na : value == Direction.up ? 7 : value == Direction.down ? -4 : value == Direction.flat ? 2 : 99, "Identity")
plot(na(word) ? na : str.tostring(word) == "Direction.up" ? 7 : str.tostring(word) == "Direction.down" ? -4 : str.tostring(word) == "Direction.flat" ? 2 : 99, "Text")
${shape === 'udt' ? 'plot(na(extracted) ? na : extracted.price, "Price")' : ''}
${lower ? 'plot(array.size(requested), "Count")\nplot(array.size(words), "TextCount")' : ''}`,
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
                          [2, 0],
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
          for (const title of ['Title', 'Identity', 'Text'])
            expect(getPlot(result, title).values, title).toEqual(lower ? [-4, null, 7] : [-4, 7, 2, -4]);
          if (shape === 'udt')
            expect(getPlot(result, 'Price').values).toEqual(lower ? [-7, null, 12] : [-7, 13, 0, -11]);
          if (lower) {
            expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
            expect(getPlot(result, 'TextCount').values).toEqual([3, 0, 2]);
          }
        });
      }
    }
  }
});
