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

// Imported UDT fields preserve their declared types through nested objects and
// collection elements. Enum titles and ordinary identity-spelled strings differ.
// Authority: reference/pine-v6-reference-v1.json type/import/enum/request entries.
describe('request nested imported UDT enum fields', () => {
  for (const kind of ['direct', 'array', 'matrix', 'map']) {
    for (const method of ['security', 'security_lower_tf']) {
      for (const binding of ['positional', 'named']) {
        it(`retains ${kind} inner UDT enum fields through ${method} with ${binding} arguments`, () => {
          const lower = method === 'security_lower_tf';
          const library = parse(`//@version=6
library("Directions")
export enum Direction
    up = "rising"
    down = "dip"
    flat = "stillness"
export type Inner
    Direction choice
    string note
    float price
export type Payload
    ${kind === 'direct' ? 'Inner' : kind === 'array' ? 'array<Inner>' : kind === 'matrix' ? 'matrix<Inner>' : 'map<string, Inner>'} child
    string note
export make(float value) =>
    inner = Inner.new(value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat, "Test/Directions/1.Direction.up", value * 10)
    ${kind === 'direct' ? 'children = inner' : kind === 'array' ? 'children = array.from(inner)' : kind === 'matrix' ? 'children = matrix.new<Inner>(1, 1, inner)' : 'children = map.new<string, Inner>()\n    map.put(children, "main", inner)'}
    Payload.new(children, "Test/Directions/1.Direction.down")`);
          const args =
            binding === 'named'
              ? 'expression=lib.make(value=close), timeframe="1", symbol="REMOTE:ALT"'
              : '"REMOTE:ALT", "1", lib.make(close)';
          const outer = lower ? 'array.get(requested, 0)' : 'requested';
          const child = `${outer}.child`;
          const inner =
            kind === 'direct'
              ? child
              : kind === 'array'
                ? `array.get(${child}, 0)`
                : kind === 'matrix'
                  ? `matrix.get(${child}, 0, 0)`
                  : `map.get(${child}, "main")`;
          const guard = (expr: string) => (lower ? `array.size(requested) > 0 ? (${expr}) : na` : expr);
          const annotation =
            binding === 'named' ? (lower ? 'array<lib.Payload> requested' : 'lib.Payload requested') : 'requested';
          const result = runCompatScript(
            `//@version=6
indicator("Requested nested imported UDT enum fields")
import Test/Directions/1 as lib
${annotation} = request.${method}(${args})
plot(${guard(`${inner}.choice == lib.Direction.up ? 7 : ${inner}.choice == lib.Direction.down ? -4 : ${inner}.choice == lib.Direction.flat ? 2 : 99`)}, "Identity")
plot(${guard(`str.tostring(${inner}.choice) == "rising" ? 7 : str.tostring(${inner}.choice) == "dip" ? -4 : str.tostring(${inner}.choice) == "stillness" ? 2 : 99`)}, "Title")
plot(${guard(`str.tostring(${inner}.note) == "Test/Directions/1.Direction.up" ? 1 : 99`)}, "Inner word")
plot(${guard(`str.tostring(${outer}.note) == "Test/Directions/1.Direction.down" ? 1 : 99`)}, "Outer word")
plot(${guard(`${inner}.price`)}, "Number")
${lower ? 'plot(array.size(requested), "Count")' : ''}`,
            {
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
                libraries: new Map([['Test/Directions/1', library]]),
                requestDatafeed: new InMemoryRequestDatafeed([
                  {
                    symbol: 'REMOTE:ALT',
                    timeframe: '1',
                    bars: lower
                      ? bars([
                          [0, -7],
                          [1, 13],
                          [2, -3],
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
            },
          );
          expect(result.errors[0]?.message).toBeUndefined();
          expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
          const codes = lower ? [-4, null, 7] : [-4, 7, 2, -4];
          expect(getPlot(result, 'Identity').values).toEqual(codes);
          expect(getPlot(result, 'Title').values).toEqual(codes);
          for (const name of ['Inner word', 'Outer word'])
            expect(getPlot(result, name).values).toEqual(codes.map((value) => (value === null ? null : 1)));
          expect(getPlot(result, 'Number').values).toEqual(lower ? [-70, null, 120] : [-70, 130, 0, -110]);
          if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
        });
      }
    }
  }
});
