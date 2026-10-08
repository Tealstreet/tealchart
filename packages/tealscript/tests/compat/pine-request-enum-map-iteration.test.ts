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
const choose = (form: string, imported: boolean, plain = false) => {
  const choice = plain
    ? 'value > 0 ? "Test/Directions/1.Direction.up" : value < 0 ? "Test/Directions/1.Direction.down" : "Test/Directions/1.Direction.flat"'
    : 'value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat';
  const types = plain ? 'string, string' : form === 'key' ? 'Direction, string' : 'string, Direction';
  const first =
    form === 'key'
      ? plain
        ? '"warmup", "first"'
        : 'Direction.flat, "first"'
      : plain
        ? '"first", "warmup"'
        : '"first", Direction.flat';
  const last = form === 'key' ? `${choice}, "last"` : `"last", ${choice}`;
  return `${imported ? 'export ' : ''}choose(float value) =>
    map<${types}> choices = map.new<${types}>()
    choices.put(${first})
    choices.put(${last})
    for [key, selected] in choices
        ${form === 'key' ? 'key' : 'selected'}`;
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

// Map for-in binds key/value types and retains the final enum result.
// Authority: reference/pine-v6-reference-v1.json enum/for-in/map entries.
describe('request enum map iteration', () => {
  for (const version of [5, 6]) {
    for (const branch of ['key', 'value']) {
      for (const imported of [false, true]) {
        for (const method of ['security', 'security_lower_tf']) {
          it(`v${version} ${imported ? 'imported' : 'local'} ${branch} enum map iterator return through ${method}`, () => {
            const lower = method === 'security_lower_tf';
            const namespace = imported ? 'lib.' : '';
            const chosen = lower ? 'array.get(requested, 0)' : 'requested';
            const guard = (value: string) => (lower ? `array.size(requested) > 0 ? (${value}) : na` : value);
            const result = runCompatScript(
              `//@version=${version}
indicator("Requested enum map iteration")
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
indicator("Requested plain map iteration")
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
