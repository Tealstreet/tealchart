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
const choose = (operation: string, imported: boolean, plain = false) => {
  const chosen = plain
    ? 'value > 0 ? "Test/Directions/1.Direction.up" : value < 0 ? "Test/Directions/1.Direction.down" : "Test/Directions/1.Direction.flat"'
    : 'value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat';
  const body = operation === 'field' ? 'item.choice' : 'item';
  const read = operation === 'field' ? 'item.readChoice()' : 'item.readChoice().choice';
  return `${imported ? 'export ' : ''}method readChoice(Payload item) => ${body}
${imported ? 'export ' : ''}choose(float value) =>
    chosen = ${chosen}
    item = Payload.new(chosen)
    ${read}`;
};
const options = (version: number, operation: string, lower: boolean, plain = false) => ({
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
          `//@version=${version}\nlibrary("Directions")\nexport ${declaration}\n${payload(plain, true)}\n${choose(operation, true, plain)}`,
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

// UDT receiver methods preserve selected scalar or object return field types.
// Authority: Methods manual custom-method returns and the enum/type reference entries.
describe('requested UDT receiver method return titles', () => {
  for (const version of [5, 6]) {
    for (const operation of ['field', 'object']) {
      for (const imported of [false, true]) {
        for (const request of ['security', 'security_lower_tf']) {
          it(`v${version} ${imported ? 'imported' : 'local'} ${operation} receiver method return through ${request}`, () => {
            const lower = request === 'security_lower_tf';
            const prefix = imported ? 'lib.' : '';
            const extract = lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested';
            const result = runCompatScript(
              `//@version=${version}
indicator("Requested enum UDT receiver method")
${imported ? 'import Test/Directions/1 as lib' : `${declaration}\n${payload()}\n${choose(operation, false)}`}
requested = request.${request}("REMOTE:ALT", "1", ${prefix}choose(close))
extracted = ${extract}
plot(na(extracted) ? na : extracted == ${prefix}Direction.up ? 7 : extracted == ${prefix}Direction.down ? -4 : extracted == ${prefix}Direction.flat ? 2 : 99, "Identity")
plot(na(extracted) ? na : str.tostring(extracted) == "rising" ? 7 : str.tostring(extracted) == "dip" ? -4 : str.tostring(extracted) == "stillness" ? 2 : 99, "Title")
${lower ? 'plot(array.size(requested), "Count")' : ''}`,
              options(version, operation, lower),
            );
            expect(result.errors).toEqual([]);
            expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
            for (const title of ['Identity', 'Title'])
              expect(getPlot(result, title).values, title).toEqual(lower ? [-4, null, 7] : [-4, 7, 2, -4]);
            if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          });
        }
      }
      it(`v${version} imported ${operation} receiver method strings retain text`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("Requested string UDT receiver method")
import Test/Directions/1 as lib
requested = request.security("REMOTE:ALT", "1", lib.choose(close))
plot(str.tostring(requested) == "Test/Directions/1.Direction.up" ? 7 : str.tostring(requested) == "Test/Directions/1.Direction.down" ? -4 : str.tostring(requested) == "Test/Directions/1.Direction.flat" ? 2 : 99, "Text")`,
          options(version, operation, false, true),
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        expect(getPlot(result, 'Text').values).toEqual([-4, 7, 2, -4]);
      });
    }
  }
});
