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

// Captured input enum members retain titles in independent request tuple arrays.
// Authority: Inputs enum input, Enums titles and request tuple return entries.
describe('captured enum input titles through requests', () => {
  for (const version of [5, 6]) {
    for (const request of ['security', 'security_lower_tf']) {
      const lower = request === 'security_lower_tf';
      for (const imported of [false, true]) {
        for (const defaultMember of ['up', 'down']) {
          it(`v${version} ${imported ? 'imported' : 'local'} ${defaultMember} input through ${request}`, () => {
            const prefix = imported ? 'lib.' : '';
            const extract = lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested';
            const result = runCompatScript(
              `//@version=${version}
indicator("Captured requested enum input")
${imported ? 'import Test/Directions/1 as lib' : declaration}
selected = input.enum(${prefix}Direction.${defaultMember}, "Choice", options=[${prefix}Direction.up, ${prefix}Direction.down])
[requested, prices] = request.${request}("REMOTE:ALT", "1", [close > 0 ? selected : close < 0 ? ${prefix}Direction.down : ${prefix}Direction.flat, close])
extracted = ${extract}
plot(str.tostring(extracted) == "rising" ? 7 : str.tostring(extracted) == "dip" ? -4 : str.tostring(extracted) == "stillness" ? 2 : na(extracted) ? na : 99, "Title")
plot(extracted == ${prefix}Direction.up ? 7 : extracted == ${prefix}Direction.down ? -4 : extracted == ${prefix}Direction.flat ? 2 : na(extracted) ? na : 99, "Identity")
plot(${lower ? 'array.size(prices) > 0 ? array.get(prices, 0) : na' : 'prices'}, "Price")
${lower ? 'plot(array.size(requested), "Count")' : ''}`,
              options(version, lower),
            );
            expect(result.errors).toEqual([]);
            expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
            const up = defaultMember === 'up' ? 7 : -4;
            for (const title of ['Title', 'Identity'])
              expect(getPlot(result, title).values, title).toEqual(lower ? [-4, null, up] : [-4, up, 2, -4]);
            expect(getPlot(result, 'Price').values).toEqual(lower ? [-7, null, 12] : [-7, 13, 0, -11]);
            if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          });
        }
      }
      it(`v${version} enum-spelled string input through ${request}`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("Captured requested string input")
import Test/Directions/1 as lib
selected = input.string("Test/Directions/1.Direction.up", "Choice")
[requested, prices] = request.${request}("REMOTE:ALT", "1", [selected, close])
extracted = ${lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested'}
plot(na(extracted) ? na : str.tostring(extracted) == "Test/Directions/1.Direction.up" ? 7 : 99, "Text")
plot(${lower ? 'array.size(prices) > 0 ? array.get(prices, 0) : na' : 'prices'}, "Price")`,
          options(version, lower),
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        expect(getPlot(result, 'Text').values).toEqual(lower ? [7, null, 7] : [7, 7, 7, 7]);
        expect(getPlot(result, 'Price').values).toEqual(lower ? [-7, null, 12] : [-7, 13, 0, -11]);
      });
    }
  }
});
