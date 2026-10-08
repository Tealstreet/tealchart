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
  const seed = plain ? '"warmup"' : 'Direction.flat';
  const helper =
    operation === 'helper'
      ? `update(Payload item, ${plain ? 'string' : 'Direction'} replacement) =>
    item.choice := replacement
    item\n`
      : '';
  const write =
    operation === 'helper' ? 'updated = update(item, chosen)\n    updated' : 'item.choice := chosen\n    item';
  return `${helper}${imported ? 'export ' : ''}choose(float value) =>
    chosen = ${chosen}
    item = Payload.new(${seed})
    ${write}`;
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

// Field reassignment preserves declared field types through UDT-returning functions.
// Authority: Objects manual changing-field-values and the enum/type reference entries.
describe('requested UDT reassigned field titles', () => {
  for (const version of [5, 6]) {
    for (const operation of ['direct', 'helper']) {
      for (const imported of [false, true]) {
        for (const request of ['security', 'security_lower_tf']) {
          it(`v${version} ${imported ? 'imported' : 'local'} ${operation} field reassignment through ${request}`, () => {
            const lower = request === 'security_lower_tf';
            const prefix = imported ? 'lib.' : '';
            const extract = lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested';
            const result = runCompatScript(
              `//@version=${version}
indicator("Requested enum UDT field reassignment")
${imported ? 'import Test/Directions/1 as lib' : `${declaration}\n${payload()}\n${choose(operation, false)}`}
requested = request.${request}("REMOTE:ALT", "1", ${prefix}choose(close))
extracted = ${extract}
plot(na(extracted) ? na : extracted.choice == ${prefix}Direction.up ? 7 : extracted.choice == ${prefix}Direction.down ? -4 : extracted.choice == ${prefix}Direction.flat ? 2 : 99, "Identity")
plot(na(extracted) ? na : str.tostring(extracted.choice) == "rising" ? 7 : str.tostring(extracted.choice) == "dip" ? -4 : str.tostring(extracted.choice) == "stillness" ? 2 : 99, "Title")
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
      it(`v${version} imported ${operation} string field reassignment retains text`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("Requested string UDT field reassignment")
import Test/Directions/1 as lib
requested = request.security("REMOTE:ALT", "1", lib.choose(close))
plot(str.tostring(requested.choice) == "Test/Directions/1.Direction.up" ? 7 : str.tostring(requested.choice) == "Test/Directions/1.Direction.down" ? -4 : str.tostring(requested.choice) == "Test/Directions/1.Direction.flat" ? 2 : 99, "Text")`,
          options(version, operation, false, true),
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        expect(getPlot(result, 'Text').values).toEqual([-4, 7, 2, -4]);
      });
    }
  }
});
