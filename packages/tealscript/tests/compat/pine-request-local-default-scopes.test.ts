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
const payload = (plain = false, imported = false) => `${imported ? 'export ' : ''}type Payload
    ${plain ? 'string' : 'Direction'} choice
    float price`;
const choose = (imported: boolean, plain = false) => {
  const chosen = plain
    ? 'value > 0 ? "Test/Directions/1.Direction.up" : value < 0 ? "Test/Directions/1.Direction.down" : "Test/Directions/1.Direction.flat"'
    : 'value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat';
  return `${imported ? 'export ' : ''}choose(float value) =>
    chosen = ${chosen}
    Payload.new(chosen, value)`;
};
const options = (version: number, lower: boolean, plain = false) => ({
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
        parse(
          `//@version=${version}\nlibrary("Directions")\nexport ${declaration}\n${payload(plain, true)}\n${choose(true, plain)}`,
        ),
      ],
      [
        'Test/Facade/1',
        parse(
          `//@version=${version}\nlibrary("Facade")\nimport Test/Directions/1 as dep\nexport choose(float value) =>\n    dep.choose(value)`,
        ),
      ],
      [
        'Test/Defaults/1',
        parse(
          `//@version=${version}\nlibrary("Defaults")\nexport ${declaration}\nexport render(Direction value = Direction.up) => str.tostring(value)`,
        ),
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

// Defaults resolve in the declared function's scope rather than its caller.
// Authority: User-defined functions header and function-scope rules.
describe('local default defining scope', () => {
  for (const version of [5, 6]) {
    for (const request of ['direct', 'security', 'security_lower_tf']) {
      const lower = request === 'security_lower_tf';
      for (const shape of ['scalar', 'udt']) {
        it(`v${version} caller ${shape} name shadow preserves default through ${request}`, () => {
          const defaultValue = shape === 'scalar' ? 'Direction.up' : 'Payload.new(Direction.up, 12)';
          const result = runCompatScript(
            `//@version=${version}
indicator("Requested local default defining scope")
${declaration}
${payload()}
render(value = ${defaultValue}) => str.tostring(${shape === 'scalar' ? 'value' : 'value.choice'})
observe(float ${shape === 'scalar' ? 'Direction' : 'Payload'}) => render()
requested = ${request === 'direct' ? 'observe(close)' : `request.${request}("REMOTE:ALT", "1", observe(close))`}
value = ${lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested'}
plot(na(value) ? na : value == "rising" ? 7 : 99, "Title")
${lower ? 'plot(array.size(requested), "Count")' : ''}`,
            options(version, lower),
          );
          expect(result.errors).toEqual([]);
          expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
          expect(getPlot(result, 'Title').values).toEqual(lower ? [7, null, 7] : [7, 7, 7, 7]);
          if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
        });
      }
    }
  }
});
