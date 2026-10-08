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

// Declared UDT request expressions retain their field types and provider context.
// Authority: Other timeframes and data declared variables and enum/type reference entries.
describe('declared requested UDT field titles', () => {
  for (const version of [5, 6]) {
    for (const operation of ['declared', 'alias']) {
      for (const imported of [false, true]) {
        for (const request of ['security', 'security_lower_tf']) {
          it(`v${version} ${imported ? 'imported' : 'local'} ${operation} UDT expression through ${request}`, () => {
            const lower = request === 'security_lower_tf';
            const prefix = imported ? 'lib.' : '';
            const extract = lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested';
            const result = runCompatScript(
              `//@version=${version}
indicator("Declared requested enum UDT")
${imported ? 'import Test/Directions/1 as lib' : `${declaration}\n${payload()}\n${choose(false)}`}
${operation === 'alias' ? `original = ${prefix}choose(close)\nsource = original` : `source = ${prefix}choose(close)`}
requested = request.${request}("REMOTE:ALT", "1", source)
extracted = ${extract}
plot(na(extracted) ? na : extracted.choice == ${prefix}Direction.up ? 7 : extracted.choice == ${prefix}Direction.down ? -4 : extracted.choice == ${prefix}Direction.flat ? 2 : 99, "Identity")
plot(na(extracted) ? na : str.tostring(extracted.choice) == "rising" ? 7 : str.tostring(extracted.choice) == "dip" ? -4 : str.tostring(extracted.choice) == "stillness" ? 2 : 99, "Title")
plot(na(extracted) ? na : extracted.price, "Price")
${lower ? 'plot(array.size(requested), "Count")' : ''}`,
              options(version, lower),
            );
            expect(result.errors).toEqual([]);
            expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
            for (const title of ['Identity', 'Title'])
              expect(getPlot(result, title).values, title).toEqual(lower ? [-4, null, 7] : [-4, 7, 2, -4]);
            expect(getPlot(result, 'Price').values).toEqual(lower ? [-7, null, 12] : [-7, 13, 0, -11]);
            if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          });
        }
      }
      it(`v${version} imported ${operation} string UDT expression retains text`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("Declared requested string UDT")
import Test/Directions/1 as lib
${operation === 'alias' ? 'original = lib.choose(close)\nsource = original' : 'source = lib.choose(close)'}
requested = request.security("REMOTE:ALT", "1", source)
plot(str.tostring(requested.choice) == "Test/Directions/1.Direction.up" ? 7 : str.tostring(requested.choice) == "Test/Directions/1.Direction.down" ? -4 : str.tostring(requested.choice) == "Test/Directions/1.Direction.flat" ? 2 : 99, "Text")
plot(requested.price, "Price")`,
          options(version, false, true),
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        expect(getPlot(result, 'Text').values).toEqual([-4, 7, 2, -4]);
        expect(getPlot(result, 'Price').values).toEqual([-7, 13, 0, -11]);
      });
    }
  }
});
