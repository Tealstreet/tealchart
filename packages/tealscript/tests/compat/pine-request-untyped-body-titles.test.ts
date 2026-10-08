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
describe('requested untyped UDF body titles', () => {
  for (const version of [5, 6]) {
    for (const request of ['security', 'security_lower_tf']) {
      const lower = request === 'security_lower_tf';
      it(`v${version} nested untyped body calls keep caller argument types through ${request}`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("Requested nested untyped body enum and string titles")
${declaration}
convert(value) => str.tostring(value)
render(value) => convert(value)
[titles, words] = request.${request}("REMOTE:ALT", "1", [render(close > 0 ? Direction.up : close < 0 ? Direction.down : Direction.flat), render(close > 0 ? "Direction.up" : close < 0 ? "Direction.down" : "Direction.flat")])
title = ${lower ? 'array.size(titles) > 0 ? array.get(titles, 0) : na' : 'titles'}
word = ${lower ? 'array.size(words) > 0 ? array.get(words, 0) : na' : 'words'}
plot(na(title) ? na : title == "rising" ? 7 : title == "dip" ? -4 : title == "stillness" ? 2 : 99, "Title")
plot(na(word) ? na : word == "Direction.up" ? 7 : word == "Direction.down" ? -4 : word == "Direction.flat" ? 2 : 99, "Text")`,
          options(version, lower),
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        for (const output of ['Title', 'Text'])
          expect(getPlot(result, output).values).toEqual(lower ? [-4, null, 7] : [-4, 7, 2, -4]);
      });
      for (const output of ['Title', 'Text']) {
        it(`v${version} mixed written-call ${output} conversion through ${request}`, () => {
          const result = runCompatScript(
            `//@version=${version}
indicator("Requested mixed untyped body enum and string titles")
${declaration}
render(value) => str.tostring(value)
[titles, words] = request.${request}("REMOTE:ALT", "1", [render(value = close > 0 ? Direction.up : close < 0 ? Direction.down : Direction.flat), render(close > 0 ? "Direction.up" : close < 0 ? "Direction.down" : "Direction.flat")])
title = ${lower ? 'array.size(titles) > 0 ? array.get(titles, 0) : na' : 'titles'}
word = ${lower ? 'array.size(words) > 0 ? array.get(words, 0) : na' : 'words'}
plot(na(title) ? na : title == "rising" ? 7 : title == "dip" ? -4 : title == "stillness" ? 2 : 99, "Title")
plot(na(word) ? na : word == "Direction.up" ? 7 : word == "Direction.down" ? -4 : word == "Direction.flat" ? 2 : 99, "Text")`,
            options(version, lower),
          );
          expect(result.errors).toEqual([]);
          expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
          expect(getPlot(result, output).values).toEqual(lower ? [-4, null, 7] : [-4, 7, 2, -4]);
        });
      }
      for (const shape of ['scalar', 'udt']) {
        for (const typed of [false, true]) {
          it(`v${version} ${typed ? 'typed' : 'untyped'} ${shape} body conversion through ${request}`, () => {
            const argument =
              shape === 'scalar'
                ? 'close > 0 ? Direction.up : close < 0 ? Direction.down : Direction.flat'
                : 'choose(close)';
            const result = runCompatScript(
              `//@version=${version}
indicator("Requested inferred parameter body enum titles")
${declaration}
${payload()}
${choose(false)}
render(${typed ? `${shape === 'scalar' ? 'Direction' : 'Payload'} ` : ''}value) => str.tostring(${shape === 'scalar' ? 'value' : 'value.choice'})
requested = request.${request}("REMOTE:ALT", "1", render(${argument}))
extracted = ${lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested'}
value = extracted
plot(na(value) ? na : str.tostring(value) == "rising" ? 7 : str.tostring(value) == "dip" ? -4 : str.tostring(value) == "stillness" ? 2 : 99, "Title")
${lower ? 'plot(array.size(requested), "Count")' : ''}`,
              options(version, lower),
            );
            expect(result.errors).toEqual([]);
            expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
            expect(getPlot(result, 'Title').values).toEqual(lower ? [-4, null, 7] : [-4, 7, 2, -4]);
            if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          });
        }
      }
      it(`v${version} untyped enum-spelled primitive string through ${request}`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("Requested inferred parameter body string titles")
${declaration}
render(value) => str.tostring(value)
requested = request.${request}("REMOTE:ALT", "1", render(close > 0 ? "Direction.up" : close < 0 ? "Direction.down" : "Direction.flat"))
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
