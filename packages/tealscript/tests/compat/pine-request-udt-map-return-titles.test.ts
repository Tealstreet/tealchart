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
const choose = (operation: string, imported: boolean, plain = false, _namespace = false) => {
  const chosen = plain
    ? 'value > 0 ? "Test/Directions/1.Direction.up" : value < 0 ? "Test/Directions/1.Direction.down" : "Test/Directions/1.Direction.flat"'
    : 'value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat';
  const initial = plain ? '"warmup"' : 'Direction.flat';
  const transform =
    operation === 'copy'
      ? 'values.copy().get("target")'
      : operation === 'values'
        ? 'values.values().get(0)'
        : operation === 'put'
          ? `values.put("target", Payload.new(${initial}))`
          : 'values.remove("target")';
  return `${imported ? 'export ' : ''}choose(float value) =>
    chosen = ${chosen}
    values = map.new<string, Payload>()
    values.put("target", Payload.new(chosen))
    transformed = ${transform}
    transformed.choice`;
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

// Map returns retain UDT field metadata and selected custom return types.
// Authority: reference/pine-v6-reference-v1.json enum/type/str.tostring entries and the Objects manual.
describe('requested UDT map return titles', () => {
  for (const version of [5, 6]) {
    for (const operation of ['copy', 'values', 'put', 'remove']) {
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
indicator("Requested enum UDT map returns")
${imported ? 'import Test/Directions/1 as lib' : `${declaration}\n${payload()}\n${choose(operation, false, false, namespace)}`}
requested = request.${request}("REMOTE:ALT", "1", ${prefix}choose(close))
plot(${guard(`${value} == ${prefix}Direction.up ? 7 : ${value} == ${prefix}Direction.down ? -4 : ${value} == ${prefix}Direction.flat ? 2 : 99`)}, "Identity")
plot(${guard(`str.tostring(${value}) == "rising" ? 7 : str.tostring(${value}) == "dip" ? -4 : str.tostring(${value}) == "stillness" ? 2 : 99`)}, "Title")
${lower ? 'plot(array.size(requested), "Count")' : ''}`,
                options(version, operation, lower, false, namespace),
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
indicator("Requested string UDT map returns")
import Test/Directions/1 as lib
requested = request.security("REMOTE:ALT", "1", lib.choose(close))
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
});

for (const version of [5, 6]) {
  for (const operation of ['copy', 'values', 'put', 'remove']) {
    it(`v${version} selected custom ${operation} returns different UDT string fields`, () => {
      const parameters =
        operation === 'copy' || operation === 'values'
          ? 'map<string, Payload> values, bool custom'
          : operation === 'put'
            ? 'map<string, Payload> values, string key, Payload replacement, bool custom'
            : 'map<string, Payload> values, string key, bool custom';
      const invocation =
        operation === 'copy' || operation === 'values'
          ? `values.${operation}(true)`
          : operation === 'put'
            ? 'values.put("target", Payload.new(Direction.flat), true)'
            : 'values.remove("target", true)';
      const returned =
        operation === 'copy'
          ? 'result = map.new<string, TextPayload>()\n    result.put("target", TextPayload.new(chosen))\n    result'
          : operation === 'values'
            ? 'array.from(TextPayload.new(chosen))'
            : 'TextPayload.new(chosen)';
      const selected =
        operation === 'copy'
          ? 'transformed.get("target")'
          : operation === 'values'
            ? 'transformed.get(0)'
            : 'transformed';
      const result = runCompatScript(
        `//@version=${version}
indicator("Requested custom UDT map returns")
${declaration}
${payload()}
type TextPayload
    string choice
method ${operation}(${parameters}) =>
    chosen = custom and values.size() > 0 ? "Direction.up" : "bad"
    ${returned}
choose(float value) =>
    values = map.new<string, Payload>()
    values.put("target", Payload.new(value > 0 ? Direction.up : Direction.down))
    transformed = ${invocation}
    ${selected}.choice
requested = request.security("REMOTE:ALT", "1", choose(close))
plot(str.tostring(requested) == "Direction.up" ? 1 : 0, "Plain")`,
        options(version, operation, false),
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
      expect(getPlot(result, 'Plain').values).toEqual([1, 1, 1, 1]);
    });
  }
}
