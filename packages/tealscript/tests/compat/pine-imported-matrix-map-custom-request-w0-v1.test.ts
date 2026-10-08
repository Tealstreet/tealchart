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
const choose = (operation: string, _imported: boolean, builtin = false) => {
  const shape =
    operation === 'array'
      ? 'array<Direction>'
      : operation === 'matrix'
        ? 'matrix<Direction>'
        : 'map<string, Direction>';
  const member = operation === 'array' ? 'get' : operation === 'matrix' ? 'row' : 'values';
  const returned = operation === 'array' ? 'marker' : 'array.from(marker)';
  const creation =
    operation === 'array'
      ? 'values = array.from(chosen)'
      : operation === 'matrix'
        ? 'values = matrix.new<Direction>(1, 1, chosen)'
        : 'values = map.new<string, Direction>()\n    values.put("target", chosen)';
  const selected = builtin
    ? operation === 'array'
      ? 'array.get(values, 0)'
      : operation === 'matrix'
        ? 'matrix.row(values, 0).get(0)'
        : 'map.values(values).get(0)'
    : operation === 'array'
      ? 'values.get(marker)'
      : operation === 'matrix'
        ? 'values.row(marker).get(0)'
        : 'values.values(marker).get(0)';
  return `export method ${member}(${shape} values, string marker) =>
    values.${operation === 'matrix' ? 'rows' : 'size'}() > 0 and str.length(marker) > 0 ? ${returned} : ${operation === 'array' ? '"bad"' : 'array.from("bad")'}
export choose(float value) =>
    chosen = value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat
    marker = value > 0 ? "Test/Directions/1.Direction.up" : value < 0 ? "Test/Directions/1.Direction.down" : "Test/Directions/1.Direction.flat"
    ${creation}
    ${selected}`;
};
const options = (version: number, shape: string, lower: boolean, plain = false, _namespace = false) => ({
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
        parse(`//@version=${version}\nlibrary("Directions")\nexport ${declaration}\n${choose(shape, true, plain)}`),
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
});

// Imported selected methods retain their result type in requested compilation.
// Authority: Libraries/Methods manuals and reference enum/str.tostring entries.
describe('requested imported custom collection methods', () => {
  for (const version of [5, 6]) {
    for (const operation of ['matrix', 'map']) {
      for (const builtin of [false, true]) {
        for (const request of ['security', 'security_lower_tf']) {
          it(`v${version} imported ${operation} ${builtin ? 'builtin control' : 'custom method'} through ${request}`, () => {
            const lower = request === 'security_lower_tf';
            const value = lower ? 'requested.get(0)' : 'requested';
            const expected = builtin
              ? ['rising', 'dip', 'stillness']
              : [
                  'Test/Directions/1.Direction.up',
                  'Test/Directions/1.Direction.down',
                  'Test/Directions/1.Direction.flat',
                ];
            const conversion = `str.tostring(${value}) == "${expected[0]}" ? 7 : str.tostring(${value}) == "${expected[1]}" ? -4 : str.tostring(${value}) == "${expected[2]}" ? 2 : 99`;
            const result = runCompatScript(
              `//@version=${version}
indicator("Requested imported collection method")
import Test/Directions/1 as lib
requested = request.${request}("REMOTE:ALT", "1", lib.choose(close))
plot(${lower ? `array.size(requested) > 0 ? (${conversion}) : na` : conversion}, "Selected")
${lower ? 'plot(array.size(requested), "Count")' : ''}`,
              options(version, operation, lower, builtin),
            );
            expect(result.errors).toEqual([]);
            expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
            expect(getPlot(result, 'Selected').values).toEqual(lower ? [-4, null, 7] : [-4, 7, 2, -4]);
            if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          });
        }
      }
    }
  }
});
