import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
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
const declaration = `enum Direction
    up = "rising"
    down = "dip"
    flat = "stillness"`;
const choose = (imported: boolean) => `${imported ? 'export ' : ''}choose(float value) =>
    value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat`;

// Requested UDF history follows requested bars and retains enum conversion.
// Missing initial history and empty intrabar arrays remain distinct.
describe('request enum expression history', () => {
  for (const version of [5, 6]) {
    for (const imported of [false, true]) {
      for (const method of ['security', 'security_lower_tf']) {
        for (const binding of ['positional', 'named']) {
          it(`v${version} ${imported ? 'imported' : 'local'} enum UDF history through ${method} with ${binding} arguments`, () => {
            const lower = method === 'security_lower_tf';
            const namespace = imported ? 'lib.' : '';
            const expression = `${namespace}choose(${binding === 'named' ? 'value=' : ''}close)[1]`;
            const args =
              binding === 'named'
                ? `expression=${expression}, timeframe="1", symbol="REMOTE:ALT"`
                : `"REMOTE:ALT", "1", ${expression}`;
            const chosen = lower ? 'array.get(requested, 0)' : 'requested';
            const guard = (value: string) => (lower ? `array.size(requested) > 0 ? (${value}) : na` : value);
            const result = runCompatScript(
              `//@version=${version}
indicator("Requested enum expression history")
${imported ? 'import Test/Directions/1 as lib' : `${declaration}\n${choose(false)}`}
requested = request.${method}(${args})
plot(${guard(`na(${chosen}) ? 0 : ${chosen} == ${namespace}Direction.up ? 7 : ${chosen} == ${namespace}Direction.down ? -4 : ${chosen} == ${namespace}Direction.flat ? 2 : 99`)}, "Identity")
plot(${guard(`na(${chosen}) ? 0 : str.tostring(${chosen}) == "rising" ? 7 : str.tostring(${chosen}) == "dip" ? -4 : str.tostring(${chosen}) == "stillness" ? 2 : 99`)}, "Title")
${lower ? 'plot(array.size(requested), "Count")' : ''}`,
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
                  libraries: new Map([
                    [
                      'Test/Directions/1',
                      parse(`//@version=${version}\nlibrary("Directions")\nexport ${declaration}\n${choose(true)}`),
                    ],
                  ]),
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
            const expected = lower ? [0, null, -4] : [0, -4, 7, 2];
            for (const title of ['Identity', 'Title']) expect(getPlot(result, title).values).toEqual(expected);
            if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          });
        }
      }
    }
  }
});
