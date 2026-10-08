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

describe('imported collection method dispatch without enums', () => {
  for (const version of [5, 6]) {
    for (const context of ['direct', 'security', 'security_lower_tf']) {
      for (const builtin of [false, true]) {
        it(`v${version} ${context} ${builtin ? 'namespace builtin control' : 'selected custom get'}`, () => {
          const lower = context === 'security_lower_tf';
          const expression =
            context === 'direct' ? 'lib.choose(close)' : `request.${context}("REMOTE:ALT", "1", lib.choose(close))`;
          const selected = builtin ? 'array.get(values, 0)' : 'values.get("custom")';
          const result = runCompatScript(
            `//@version=${version}
indicator("Imported numeric collection dispatch")
import Test/Numeric/1 as lib
requested = ${expression}
plot(${lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested'}, "Selected")`,
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
                    'Test/Numeric/1',
                    parse(`//@version=${version}
library("Numeric")
export method get(array<float> values, string marker) =>
    array.get(values, 0) + str.length(marker)
export choose(float value) =>
    values = array.from(value)
    ${selected}`),
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
          const expected = context === 'direct' ? [900, 901, 902, 903] : lower ? [-7, null, 12] : [-7, 13, 0, -11];
          expect(getPlot(result, 'Selected').values).toEqual(
            expected.map((value) => (value === null ? null : value + (builtin ? 0 : 6))),
          );
        });
      }
    }
  }
});
