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
  const local = (member: string) =>
    plain ? `string selected = "Test/Directions/1.Direction.${member}"` : `Direction selected = Direction.${member}`;
  const prefix = `${imported ? 'export ' : ''}choose(float value) =>`;
  if (!plain)
    return branch === 'if'
      ? `${prefix}
    if value > 0
        Direction selected = Direction.up
        selected`
      : `${prefix}
    switch
        value > 0 =>
            Direction selected = Direction.up
            selected`;
  if (branch === 'if')
    return `${prefix}
    if value > 0
        ${local('up')}
        selected
    else if value < 0
        ${local('down')}
        selected
    else
        ${local('flat')}
        selected`;
  return `${prefix}
    switch
        value > 0 =>
            ${local('up')}
            selected
        value < 0 =>
            ${local('down')}
            selected
        =>
            ${local('flat')}
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

// Missing enum branches return na; selected branches retain their enum titles.
// Authority: reference/pine-v6-reference-v1.json enum/if/switch entries.
describe('request enum missing branches', () => {
  for (const version of [5, 6]) {
    for (const branch of ['if', 'switch']) {
      for (const imported of [false, true]) {
        for (const method of ['security', 'security_lower_tf']) {
          it(`v${version} ${imported ? 'imported' : 'local'} ${branch} enum missing-branch return through ${method}`, () => {
            const lower = method === 'security_lower_tf';
            const namespace = imported ? 'lib.' : '';
            const chosen = lower ? 'array.get(requested, 0)' : 'requested';
            const guard = (value: string) => (lower ? `array.size(requested) > 0 ? (${value}) : na` : value);
            const result = runCompatScript(
              `//@version=${version}
indicator("Requested enum missing branch")
${imported ? 'import Test/Directions/1 as lib' : `${declaration}\n${choose(branch, false)}`}
requested = request.${method}("REMOTE:ALT", "1", ${namespace}choose(close))
plot(${guard(`na(${chosen}) ? 0 : ${chosen} == ${namespace}Direction.up ? 7 : 99`)}, "Identity")
plot(${guard(`na(${chosen}) ? 0 : str.tostring(${chosen}) == "rising" ? 7 : 99`)}, "Title")
${lower ? 'plot(array.size(requested), "Count")' : ''}`,
              options(version, branch, lower),
            );
            expect(result.errors[0]?.message).toBeUndefined();
            expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
            const expected = lower ? [0, null, 7] : [0, 7, 0, 0];
            expect(getPlot(result, 'Identity').values).toEqual(expected);
            expect(getPlot(result, 'Title').values).toEqual(expected);
            if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          });
        }
      }
      it(`v${version} imported ${branch} ordinary string return remains text`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("Requested plain missing branch control")
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
