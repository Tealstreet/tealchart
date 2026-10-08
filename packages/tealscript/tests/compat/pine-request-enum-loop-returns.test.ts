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
const choose = (branch: string, imported: boolean, plain = false) => {
  const result = plain
    ? 'value > 0 ? "Test/Directions/1.Direction.up" : value < 0 ? "Test/Directions/1.Direction.down" : "Test/Directions/1.Direction.flat"'
    : 'value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat';
  const selected = (last: number) =>
    `${plain ? 'string' : 'Direction'} selected = counter == ${last} ? (${result}) : ${plain ? '"warmup"' : 'Direction.flat'}`;
  const prefix = `${imported ? 'export ' : ''}choose(float value) =>`;
  return branch === 'for'
    ? `${prefix}
    for counter = 0 to 2
        ${selected(2)}
        selected`
    : `${prefix}
    int counter = 0
    while counter < 3
        counter += 1
        ${selected(3)}
        selected`;
};
const options = (version: number, branch: string, lower: boolean, plain = false) => ({
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
        parse(`//@version=${version}\nlibrary("Directions")\nexport ${declaration}\n${choose(branch, true, plain)}`),
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

// Numeric for/while UDF returns retain the last evaluated enum result.
// Authority: reference/pine-v6-reference-v1.json enum/for/while entries.
describe('request enum loop returns', () => {
  for (const version of [5, 6]) {
    for (const branch of ['for', 'while']) {
      for (const imported of [false, true]) {
        for (const method of ['security', 'security_lower_tf']) {
          it(`v${version} ${imported ? 'imported' : 'local'} ${branch} enum loop return through ${method}`, () => {
            const lower = method === 'security_lower_tf';
            const namespace = imported ? 'lib.' : '';
            const chosen = lower ? 'array.get(requested, 0)' : 'requested';
            const guard = (value: string) => (lower ? `array.size(requested) > 0 ? (${value}) : na` : value);
            const result = runCompatScript(
              `//@version=${version}
indicator("Requested enum loop return")
${imported ? 'import Test/Directions/1 as lib' : `${declaration}\n${choose(branch, false)}`}
requested = request.${method}("REMOTE:ALT", "1", ${namespace}choose(close))
plot(${guard(`${chosen} == ${namespace}Direction.up ? 7 : ${chosen} == ${namespace}Direction.down ? -4 : ${chosen} == ${namespace}Direction.flat ? 2 : 99`)}, "Identity")
plot(${guard(`str.tostring(${chosen}) == "rising" ? 7 : str.tostring(${chosen}) == "dip" ? -4 : str.tostring(${chosen}) == "stillness" ? 2 : 99`)}, "Title")
${lower ? 'plot(array.size(requested), "Count")' : ''}`,
              options(version, branch, lower),
            );
            expect(result.errors[0]?.message).toBeUndefined();
            expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
            const expected = lower ? [-4, null, 7] : [-4, 7, 2, -4];
            expect(getPlot(result, 'Identity').values).toEqual(expected);
            expect(getPlot(result, 'Title').values).toEqual(expected);
            if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          });
        }
      }
      it(`v${version} imported ${branch} ordinary string return remains text`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("Requested plain loop return")
import Test/Directions/1 as lib
requested = request.security("REMOTE:ALT", "1", lib.choose(close))
plot(requested == "Test/Directions/1.Direction.up" ? 7 : requested == "Test/Directions/1.Direction.down" ? -4 : requested == "Test/Directions/1.Direction.flat" ? 2 : 99, "Identity")
plot(str.tostring(requested) == "Test/Directions/1.Direction.up" ? 7 : str.tostring(requested) == "Test/Directions/1.Direction.down" ? -4 : str.tostring(requested) == "Test/Directions/1.Direction.flat" ? 2 : 99, "Title")`,
          options(version, branch, false, true),
        );
        expect(result.errors[0]?.message).toBeUndefined();
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        for (const name of ['Identity', 'Title']) expect(getPlot(result, name).values).toEqual([-4, 7, 2, -4]);
      });
    }
  }
});
