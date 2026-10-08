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

// Untyped UDF parameters inherit their written call argument types.
// Authority: User-defined functions Type keywords; Enums title conversion.
describe('requested untyped UDF parameter titles', () => {
  for (const version of [5, 6]) {
    for (const request of ['security', 'security_lower_tf']) {
      const lower = request === 'security_lower_tf';
      for (const shape of ['scalar', 'udt']) {
        for (const typed of [false, true]) {
          it(`v${version} ${typed ? 'typed' : 'untyped'} ${shape} parameter through ${request}`, () => {
            const argument =
              shape === 'scalar'
                ? 'close > 0 ? Direction.up : close < 0 ? Direction.down : Direction.flat'
                : 'choose(close)';
            const result = runCompatScript(
              `//@version=${version}
indicator("Requested inferred parameter enum titles")
${declaration}
${payload()}
${choose(false)}
retain(${typed ? `${shape === 'scalar' ? 'Direction' : 'Payload'} ` : ''}value) => value
requested = request.${request}("REMOTE:ALT", "1", retain(${argument}))
extracted = ${lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested'}
value = ${shape === 'scalar' ? 'extracted' : 'na(extracted) ? na : extracted.choice'}
plot(na(value) ? na : str.tostring(value) == "rising" ? 7 : str.tostring(value) == "dip" ? -4 : str.tostring(value) == "stillness" ? 2 : 99, "Title")
plot(na(value) ? na : value == Direction.up ? 7 : value == Direction.down ? -4 : value == Direction.flat ? 2 : 99, "Identity")
${shape === 'udt' ? 'plot(na(extracted) ? na : extracted.price, "Price")' : ''}
${lower ? 'plot(array.size(requested), "Count")' : ''}`,
              options(version, lower),
            );
            expect(result.errors).toEqual([]);
            expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
            for (const title of ['Title', 'Identity'])
              expect(getPlot(result, title).values, title).toEqual(lower ? [-4, null, 7] : [-4, 7, 2, -4]);
            if (shape === 'udt')
              expect(getPlot(result, 'Price').values).toEqual(lower ? [-7, null, 12] : [-7, 13, 0, -11]);
            if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          });
        }
      }
      it(`v${version} untyped enum-spelled primitive string through ${request}`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("Requested inferred parameter string titles")
${declaration}
retain(value) => value
requested = request.${request}("REMOTE:ALT", "1", retain(close > 0 ? "Direction.up" : close < 0 ? "Direction.down" : "Direction.flat"))
extracted = ${lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested'}
plot(na(extracted) ? na : str.tostring(extracted) == "Direction.up" ? 7 : str.tostring(extracted) == "Direction.down" ? -4 : str.tostring(extracted) == "Direction.flat" ? 2 : 99, "Text")`,
          options(version, lower),
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        expect(getPlot(result, 'Text').values).toEqual(lower ? [-4, null, 7] : [-4, 7, 2, -4]);
      });
    }
  }
});
