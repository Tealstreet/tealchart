import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 9, 1);
const bars = (points: Array<[number, number]>): Bar[] =>
  points.map(([offset, close]) => ({
    time: start + offset * 60_000,
    open: close - 2,
    high: close + 4,
    low: close - 5,
    close,
    volume: 100,
  }));
const code = (value: string) =>
  `${value} == lib.Direction.up ? 7 : ${value} == lib.Direction.down ? -4 : ${value} == lib.Direction.flat ? 2 : 99`;
const title = (value: string) =>
  `str.tostring(${value}) == "rising" ? 7 : str.tostring(${value}) == "dip" ? -4 : str.tostring(${value}) == "stillness" ? 2 : 99`;

// Request expressions support objects; lower_tf permits their collection fields.
// reference/pine-v6-reference-v1.json enum entry specifies str.tostring titles.
// Enum fields and an ordinary lookalike string preserve distinct conversion rules.
describe('request imported UDT enum collection fields', () => {
  for (const method of ['security', 'security_lower_tf']) {
    const lower = method === 'security_lower_tf';
    for (const binding of ['positional', 'named']) {
      for (const kind of ['array', 'matrix', 'map']) {
        it(`preserves ${kind} enum fields through ${method} with ${binding} arguments`, () => {
          const direction = 'value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat';
          const factory =
            kind === 'array'
              ? `export make(float value) =>
    choices = array.from(${direction}, Direction.flat)
    Payload.new(choices, "Direction.up")`
              : kind === 'matrix'
                ? `export make(float value) =>
    choices = matrix.new<Direction>(1, 2, Direction.flat)
    matrix.set(choices, 0, 0, ${direction})
    Payload.new(choices, "Direction.up")`
                : `export make(float value) =>
    choices = map.new<string, Direction>()
    map.put(choices, "main", ${direction})
    map.put(choices, "flat", Direction.flat)
    Payload.new(choices, "Direction.up")`;
          const args =
            binding === 'named'
              ? 'expression=lib.make(value=close), symbol="REMOTE:ALT", timeframe="1"'
              : '"REMOTE:ALT", "1", lib.make(close)';
          const plots = lower ? ['plot(array.size(values), "Count")'] : [];
          for (const index of lower ? [0, 1, 2] : [0]) {
            const object = lower ? `array.get(values, ${index})` : 'values';
            const field = `${object}.choices`;
            const prefix = lower ? `${index} ` : '';
            const guard = (expr: string) => (lower ? `array.size(values) > ${index} ? (${expr}) : na` : expr);
            const main =
              kind === 'array'
                ? binding === 'named'
                  ? `array.get(index=0, id=${field})`
                  : `array.get(${field}, 0)`
                : kind === 'matrix'
                  ? binding === 'named'
                    ? `matrix.get(column=0, id=${field}, row=0)`
                    : `matrix.get(${field}, 0, 0)`
                  : binding === 'named'
                    ? `map.get(key="main", id=${field})`
                    : `map.get(${field}, "main")`;
            const other =
              kind === 'array' ? `${field}.get(1)` : kind === 'matrix' ? `${field}.get(0, 1)` : `${field}.get("flat")`;
            plots.push(`plot(${guard(code(main))}, "${prefix}Code")`);
            plots.push(`plot(${guard(title(main))}, "${prefix}Title")`);
            plots.push(`plot(${guard(code(other))}, "${prefix}Other code")`);
            plots.push(`plot(${guard(title(other))}, "${prefix}Other title")`);
            plots.push(
              `plot(${guard(kind === 'array' ? `array.size(${field})` : kind === 'matrix' ? `matrix.columns(${field})` : `map.size(${field})`)}, "${prefix}Size")`,
            );
            if (kind === 'matrix') plots.push(`plot(${guard(`matrix.rows(${field})`)}, "${prefix}Rows")`);
            plots.push(`plot(${guard(`str.tostring(${object}.note) == "Direction.up" ? 1 : 0`)}, "${prefix}Plain")`);
          }
          const library = parse(`//@version=6
library("Directions")
export enum Direction
    up = "rising"
    down = "dip"
    flat = "stillness"
export type Payload
    ${kind === 'array' ? 'array<Direction>' : kind === 'matrix' ? 'matrix<Direction>' : 'map<string, Direction>'} choices
    string note
${factory}`);
          const declaration =
            binding === 'named' ? (lower ? 'array<lib.Payload> values' : 'lib.Payload values') : 'values';
          const result = runCompatScript(
            `//@version=6
indicator("Requested imported UDT enum collection fields")
import Test/Directions/1 as lib
${declaration} = request.${method}(${args})
${plots.join('\n')}`,
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
          if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          const expected = lower
            ? [
                [-4, null, 7],
                [7, null, -4],
                [-4, null, null],
              ]
            : [[-4, 7, 2, -4]];
          for (const [index, values] of expected.entries()) {
            const prefix = lower ? `${index} ` : '';
            const fixed = (value: number) => values.map((item) => (item === null ? null : value));
            expect(getPlot(result, `${prefix}Code`).values).toEqual(values);
            expect(getPlot(result, `${prefix}Title`).values).toEqual(values);
            expect(getPlot(result, `${prefix}Other code`).values).toEqual(fixed(2));
            expect(getPlot(result, `${prefix}Other title`).values).toEqual(fixed(2));
            expect(getPlot(result, `${prefix}Size`).values).toEqual(fixed(2));
            if (kind === 'matrix') expect(getPlot(result, `${prefix}Rows`).values).toEqual(fixed(1));
            expect(getPlot(result, `${prefix}Plain`).values).toEqual(fixed(1));
          }
        });
      }
    }
  }
});
