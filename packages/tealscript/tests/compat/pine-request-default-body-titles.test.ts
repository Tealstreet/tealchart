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

// Optional defaults retain their argument types inside the called body.
// Authority: User-defined functions default arguments and Type keywords.
describe('requested untyped default body titles', () => {
  for (const version of [5, 6]) {
    for (const request of ['security', 'security_lower_tf']) {
      const lower = request === 'security_lower_tf';
      for (const shape of ['scalar', 'udt']) {
        for (const typed of [false, true]) {
          it(`v${version} ${typed ? 'typed' : 'untyped'} ${shape} omitted default body through ${request}`, () => {
            const argument = shape === 'scalar' ? 'Direction.up' : 'Payload.new(Direction.up, 12)';
            const result = runCompatScript(
              `//@version=${version}
indicator("Requested omitted default body enum titles")
${declaration}
${payload()}
render(${typed ? `${shape === 'scalar' ? 'Direction' : 'Payload'} ` : ''}value = ${argument}) => str.tostring(${shape === 'scalar' ? 'value' : 'value.choice'})
requested = request.${request}("REMOTE:ALT", "1", render())
extracted = ${lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested'}
plot(na(extracted) ? na : extracted == "rising" ? 7 : extracted == "dip" ? -4 : extracted == "stillness" ? 2 : 99, "Title")
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
      it(`v${version} omitted default primitive string body through ${request}`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("Requested omitted default body string titles")
${declaration}
render(value = "Direction.up") => str.tostring(value)
requested = request.${request}("REMOTE:ALT", "1", render())
extracted = ${lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested'}
plot(na(extracted) ? na : extracted == "Direction.up" ? 7 : 99, "Text")`,
          options(version, lower),
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        expect(getPlot(result, 'Text').values).toEqual(lower ? [7, null, 7] : [7, 7, 7, 7]);
      });
      it(`v${version} same UDF separates omitted enum from supplied string through ${request}`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("Requested mixed omitted body default titles")
${declaration}
render(value = Direction.up) => str.tostring(value)
[titles, words] = request.${request}("REMOTE:ALT", "1", [render(), render(value = "Direction.up")])
title = ${lower ? 'array.size(titles) > 0 ? array.get(titles, 0) : na' : 'titles'}
word = ${lower ? 'array.size(words) > 0 ? array.get(words, 0) : na' : 'words'}
plot(na(title) ? na : title == "rising" ? 7 : 99, "Title")
plot(na(word) ? na : word == "Direction.up" ? 7 : 99, "Text")`,
          options(version, lower),
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        for (const title of ['Title', 'Text'])
          expect(getPlot(result, title).values).toEqual(lower ? [7, null, 7] : [7, 7, 7, 7]);
      });
      for (const shape of ['scalar', 'udt']) {
        it(`v${version} outer ${shape} default forwarded to inner through ${request}`, () => {
          const argument = shape === 'scalar' ? 'Direction.up' : 'Payload.new(Direction.up, 12)';
          const supplied = shape === 'scalar' ? 'Direction.down' : 'Payload.new(Direction.down, 23)';
          const result = runCompatScript(
            `//@version=${version}
indicator("Requested forwarded omitted body default titles")
${declaration}
${payload()}
inner(value) => str.tostring(${shape === 'scalar' ? 'value' : 'value.choice'})
outer(value = ${argument}) => inner(value)
[titles, words] = request.${request}("REMOTE:ALT", "1", [outer(), outer(value = ${supplied})])
title = ${lower ? 'array.size(titles) > 0 ? array.get(titles, 0) : na' : 'titles'}
word = ${lower ? 'array.size(words) > 0 ? array.get(words, 0) : na' : 'words'}
plot(na(title) ? na : title == "rising" ? 7 : 99, "Title")
plot(na(word) ? na : word == "dip" ? -4 : 99, "Supplied")`,
            options(version, lower),
          );
          expect(result.errors).toEqual([]);
          expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
          expect(getPlot(result, 'Title').values).toEqual(lower ? [7, null, 7] : [7, 7, 7, 7]);
          expect(getPlot(result, 'Supplied').values).toEqual(lower ? [-4, null, -4] : [-4, -4, -4, -4]);
        });
      }
      it(`v${version} imported declared default remains unchanged through ${request}`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("Requested unchanged imported body default titles")
import Test/Defaults/1 as d
requested = request.${request}("REMOTE:ALT", "1", d.render())
extracted = ${lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested'}
plot(na(extracted) ? na : extracted == "rising" ? 7 : 99, "Title")`,
          options(version, lower),
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        expect(getPlot(result, 'Title').values).toEqual(lower ? [7, null, 7] : [7, 7, 7, 7]);
      });
    }
  }
});
