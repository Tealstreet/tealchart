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
const choose = (_operation: string, imported: boolean, plain = false, namespace = false) => {
  const chosen = plain
    ? 'value > 0 ? "Test/Directions/1.Direction.up" : value < 0 ? "Test/Directions/1.Direction.down" : "Test/Directions/1.Direction.flat"'
    : 'value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat';
  return `${imported ? 'export ' : ''}choose(float value) =>
    chosen = ${chosen}
    original = Payload.new(chosen)
    copied = ${namespace ? 'Payload.copy(id = original)' : 'Payload.copy(original)'}
    copied.choice`;
};
const options = (version: number, shape: string, lower: boolean, plain = false, namespace = false) => ({
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
          `//@version=${version}\nlibrary("Directions")\nexport ${declaration}\n${payload(plain, true)}\n${choose(shape, true, plain, namespace)}`,
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

// Static UDT copies preserve scalar fields in their defining library.
// Authority: reference/pine-v6-reference-v1.json enum/type/str.tostring entries and the Objects manual.
describe('requested static UDT copy values', () => {
  for (const version of [5, 6]) {
    for (const operation of ['copy']) {
      for (const namespace of [false, true]) {
        for (const imported of [false, true]) {
          it(`v${version} ${imported ? 'imported' : 'local'} ${namespace ? 'named' : 'positional'} copy strings retain text`, () => {
            const result = runCompatScript(
              `//@version=${version}
indicator("Requested string static UDT copies")
${imported ? 'import Test/Directions/1 as lib' : `${declaration}\n${payload(true)}\n${choose(operation, false, true, namespace)}`}
requested = request.security("REMOTE:ALT", "1", ${imported ? 'lib.' : ''}choose(close))
plot(str.tostring(requested) == "Test/Directions/1.Direction.up" ? 7 : str.tostring(requested) == "Test/Directions/1.Direction.down" ? -4 : str.tostring(requested) == "Test/Directions/1.Direction.flat" ? 2 : 99, "Text")`,
              options(version, operation, false, true, namespace),
            );
            expect(result.errors).toEqual([]);
            expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
            expect(getPlot(result, 'Text').values).toEqual([-4, 7, 2, -4]);
          });
        }
      }
    }
  }
});
