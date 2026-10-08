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
const choose = (operation: string, imported: boolean, plain = false, annotated = false) => {
  const [family] = operation.split('-');
  const chosen = plain
    ? 'value > 0 ? "Test/Directions/1.Direction.up" : value < 0 ? "Test/Directions/1.Direction.down" : "Test/Directions/1.Direction.flat"'
    : 'value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat';
  const initial = plain ? '"warmup"' : 'Direction.flat';
  const type = family === 'map' ? 'map<string, Payload>' : `${family}<Payload>`;
  const prefix = annotated ? `${type} ` : '';
  const construction =
    family === 'array'
      ? `choices = array.from(Payload.new(${initial}), Payload.new(chosen))`
      : family === 'matrix'
        ? `choices = matrix.new<Payload>(2, 1, Payload.new(${initial}))\n    choices.set(1, 0, Payload.new(chosen))`
        : `choices = map.new<string, Payload>()\n    choices.put("warmup", Payload.new(${initial}))\n    choices.put("chosen", Payload.new(chosen))`;
  const receiver =
    family === 'map'
      ? '[key, selected]'
      : family === 'matrix'
        ? annotated
          ? '[index, row]'
          : 'row'
        : annotated
          ? '[index, selected]'
          : 'selected';
  const result = family === 'matrix' ? 'row.get(0).choice' : 'selected.choice';
  return `${imported ? 'export ' : ''}choose(float value) =>
    chosen = ${chosen}
    ${prefix}${construction}
    for ${receiver} in choices
        ${result}`;
};
const options = (version: number, shape: string, lower: boolean, plain = false) => ({
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
          `//@version=${version}\nlibrary("Directions")\nexport ${declaration}\n${payload(plain, true)}\n${choose(shape, true, plain, shape.endsWith('-annotated'))}`,
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

// Collection for-in results retain the declared UDT field metadata.
// Authority: reference/pine-v6-reference-v1.json enum/type/str.tostring entries and the Objects manual.
describe('requested UDT collection loop titles', () => {
  for (const version of [5, 6]) {
    for (const operation of [
      'array-inferred',
      'array-annotated',
      'matrix-inferred',
      'matrix-annotated',
      'map-inferred',
      'map-annotated',
    ]) {
      for (const namespace of [false]) {
        for (const imported of [false, true]) {
          for (const request of ['security', 'security_lower_tf']) {
            it(`v${version} ${imported ? 'imported' : 'local'} ${namespace ? 'namespace' : 'method'} ${operation} through ${request}`, () => {
              const lower = request === 'security_lower_tf';
              const prefix = imported ? 'lib.' : '';
              const value = lower ? 'array.get(requested, 0)' : 'requested';
              const guard = (expression: string) =>
                lower ? `array.size(requested) > 0 ? (${expression}) : na` : expression;
              const result = runCompatScript(
                `//@version=${version}
indicator("Requested enum UDT collection loops")
${imported ? 'import Test/Directions/1 as lib' : `${declaration}\n${payload()}\n${choose(operation, false, false, operation.endsWith('-annotated'))}`}
requested = request.${request}("REMOTE:ALT", "1", ${prefix}choose(close))
plot(${guard(`${value} == ${prefix}Direction.up ? 7 : ${value} == ${prefix}Direction.down ? -4 : ${value} == ${prefix}Direction.flat ? 2 : 99`)}, "Identity")
plot(${guard(`str.tostring(${value}) == "rising" ? 7 : str.tostring(${value}) == "dip" ? -4 : str.tostring(${value}) == "stillness" ? 2 : 99`)}, "Title")
${lower ? 'plot(array.size(requested), "Count")' : ''}`,
                options(version, operation, lower, false),
              );
              expect(result.errors).toEqual([]);
              expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
              for (const title of ['Identity', 'Title'])
                expect(getPlot(result, title).values, title).toEqual(lower ? [-4, null, 7] : [-4, 7, 2, -4]);
              if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
            });
          }
        }
        it(`v${version} imported ${namespace ? 'namespace' : 'method'} ${operation} strings retain text`, () => {
          const result = runCompatScript(
            `//@version=${version}
indicator("Requested string UDT collection loops")
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
  }
});
