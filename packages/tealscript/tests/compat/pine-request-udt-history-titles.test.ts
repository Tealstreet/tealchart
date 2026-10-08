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
    ${plain ? 'string' : 'Direction'} choice`;
const choose = (imported: boolean, plain = false) => {
  const chosen = plain
    ? 'value > 0 ? "Test/Directions/1.Direction.up" : value < 0 ? "Test/Directions/1.Direction.down" : "Test/Directions/1.Direction.flat"'
    : 'value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat';
  return `${imported ? 'export ' : ''}choose(float value) =>
    chosen = ${chosen}
    Payload.new(chosen)`;
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

// Read object history before accessing fields, retaining the stored enum type.
// Authority: v6 migration UDT history and Arrays manual history-referencing sections.
describe('requested UDT history field titles', () => {
  for (const version of [5, 6]) {
    for (const imported of [false, true]) {
      for (const request of ['security', 'security_lower_tf']) {
        it(`v${version} ${imported ? 'imported' : 'local'} object history through ${request}`, () => {
          const lower = request === 'security_lower_tf';
          const prefix = imported ? 'lib.' : '';
          const previous = lower
            ? 'na(previous) ? na : array.size(previous) > 0 ? array.get(previous, 0) : na'
            : 'previous';
          const result = runCompatScript(
            `//@version=${version}
indicator("Requested enum UDT history")
${imported ? 'import Test/Directions/1 as lib' : `${declaration}\n${payload()}\n${choose(false)}`}
requested = request.${request}("REMOTE:ALT", "1", ${prefix}choose(close))
previous = requested[1]
extracted = ${previous}
plot(na(extracted) ? na : extracted.choice == ${prefix}Direction.up ? 7 : extracted.choice == ${prefix}Direction.down ? -4 : extracted.choice == ${prefix}Direction.flat ? 2 : 99, "Identity")
plot(na(extracted) ? na : str.tostring(extracted.choice) == "rising" ? 7 : str.tostring(extracted.choice) == "dip" ? -4 : str.tostring(extracted.choice) == "stillness" ? 2 : 99, "Title")
${lower ? 'plot(na(previous) ? na : array.size(previous), "Previous count")' : ''}`,
            options(version, lower),
          );
          expect(result.errors).toEqual([]);
          expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
          for (const title of ['Identity', 'Title'])
            expect(getPlot(result, title).values, title).toEqual(lower ? [null, -4, null] : [null, -4, 7, 2]);
          if (lower) expect(getPlot(result, 'Previous count').values).toEqual([null, 3, 0]);
        });
      }
    }
    for (const request of ['security', 'security_lower_tf']) {
      it(`v${version} imported string object history through ${request}`, () => {
        const lower = request === 'security_lower_tf';
        const previous = lower
          ? 'na(previous) ? na : array.size(previous) > 0 ? array.get(previous, 0) : na'
          : 'previous';
        const result = runCompatScript(
          `//@version=${version}
indicator("Requested string UDT history")
import Test/Directions/1 as lib
requested = request.${request}("REMOTE:ALT", "1", lib.choose(close))
previous = requested[1]
extracted = ${previous}
plot(na(extracted) ? na : str.tostring(extracted.choice) == "Test/Directions/1.Direction.up" ? 7 : str.tostring(extracted.choice) == "Test/Directions/1.Direction.down" ? -4 : str.tostring(extracted.choice) == "Test/Directions/1.Direction.flat" ? 2 : 99, "Text")`,
          options(version, lower, true),
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        expect(getPlot(result, 'Text').values).toEqual(lower ? [null, -4, null] : [null, -4, 7, 2]);
      });
    }
  }
});
