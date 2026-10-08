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

// The reference type example guards a requested UDT with na(secBar) before reads.
// reference/pine-v6-reference-v1.json type and request expression/returns entries.
// Missing expression values remain intrabar elements; absent bars remain absent.
describe('request conditional missing object values', () => {
  for (const method of ['security', 'security_lower_tf']) {
    const lower = method === 'security_lower_tf';
    for (const binding of ['positional', 'named']) {
      it(`preserves missing object slots through ${method} with ${binding} arguments`, () => {
        const expression = 'close > 0 ? Payload.new(close, "PRESENT") : na';
        const args =
          binding === 'named'
            ? `expression=${expression}, symbol="REMOTE:ALT", timeframe="1"`
            : `"REMOTE:ALT", "1", ${expression}`;
        const plots = lower ? ['plot(array.size(values), "Count")'] : [];
        for (const index of lower ? [0, 1, 2] : [0]) {
          const object = lower ? `array.get(values, ${index})` : 'values';
          const prefix = lower ? `${index} ` : '';
          const guard = (expr: string) => (lower ? `array.size(values) > ${index} ? (${expr}) : na` : expr);
          plots.push(`plot(${guard(`na(${object}) ? 1 : 0`)}, "${prefix}Missing")`);
          plots.push(`plot(${guard(`na(${object}) ? na : ${object}.price`)}, "${prefix}Price")`);
          plots.push(`plot(${guard(`na(${object}) ? na : ${object}.word == "PRESENT" ? 7 : 99`)}, "${prefix}Word")`);
        }
        const result = runCompatScript(
          `//@version=6
indicator("Requested missing object slots")
type Payload
    float price
    string word
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
        if (lower) {
          expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          const missing = [
            [1, null, 0],
            [0, null, 1],
            [1, null, null],
          ];
          const prices = [
            [null, null, 12],
            [13, null, null],
            [null, null, null],
          ];
          const words = [
            [null, null, 7],
            [7, null, null],
            [null, null, null],
          ];
          for (const index of [0, 1, 2]) {
            expect(getPlot(result, `${index} Missing`).values).toEqual(missing[index]);
            expect(getPlot(result, `${index} Price`).values).toEqual(prices[index]);
            expect(getPlot(result, `${index} Word`).values).toEqual(words[index]);
          }
        } else {
          expect(getPlot(result, 'Missing').values).toEqual([1, 0, 1, 1]);
          expect(getPlot(result, 'Price').values).toEqual([null, 13, null, null]);
          expect(getPlot(result, 'Word').values).toEqual([null, 7, null, null]);
        }
      });
    }
  }
});
