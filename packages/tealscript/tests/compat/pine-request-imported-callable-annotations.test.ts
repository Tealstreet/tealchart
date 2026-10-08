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
const functionSource = (form: string, converted: boolean) => {
  const name = converted ? 'title' : 'relay';
  const result = (expression: string) => (converted ? `str.tostring(${expression})` : expression);
  if (form === 'enum parameter') return `export ${name}(Direction value) => ${result('value')}`;
  if (form === 'UDT parameter') return `export ${name}(Payload value) => ${result('value.choice')}`;
  const local =
    form === 'enum local'
      ? 'Direction selected = value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat'
      : 'Payload selected = wrap(value)';
  return `export ${name}(float value) =>\n    ${local}\n    ${result(form === 'enum local' ? 'selected' : 'selected.choice')}`;
};
const librarySource = (version: number, form: string) => `//@version=${version}
library("Directions")
export enum Direction
    up = "rising"
    down = "dip"
    flat = "stillness"
export type Payload
    Direction choice
export wrap(float value) => Payload.new(value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat)
${functionSource(form, false)}
${functionSource(form, true)}
export plain(string note) => note`;
const options = (version: number, form: string, lower: boolean) => ({
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
    libraries: new Map([['Test/Directions/1', parse(librarySource(version, form))]]),
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
});

// Exported callable annotations resolve types in their defining library.
// Enum titles and ordinary strings keep distinct conversion behavior.
// Authority: reference/pine-v6-reference-v1.json import/type/enum entries.
describe('request imported callable annotations', () => {
  for (const version of [5, 6]) {
    for (const form of ['enum parameter', 'UDT parameter', 'enum local', 'UDT local']) {
      for (const method of ['security', 'security_lower_tf']) {
        for (const binding of ['positional', 'named']) {
          it(`v${version} ${form} through ${method} with ${binding} arguments`, () => {
            const lower = method === 'security_lower_tf';
            const value =
              form === 'enum parameter'
                ? 'close > 0 ? lib.Direction.up : close < 0 ? lib.Direction.down : lib.Direction.flat'
                : form === 'UDT parameter'
                  ? 'lib.wrap(close)'
                  : 'close';
            const argument = `${binding === 'named' ? 'value=' : ''}${value}`;
            const expression = `[lib.relay(${argument}), lib.title(${argument})]`;
            const args =
              binding === 'named'
                ? `expression=${expression}, symbol="REMOTE:ALT", timeframe="1"`
                : `"REMOTE:ALT", "1", ${expression}`;
            const chosen = lower ? 'array.get(requested, 0)' : 'requested';
            const converted = lower ? 'array.get(converted, 0)' : 'converted';
            const guard = (expr: string) => (lower ? `array.size(requested) > 0 ? (${expr}) : na` : expr);
            const result = runCompatScript(
              `//@version=${version}
indicator("Requested imported callable annotations")
import Test/Directions/1 as lib
[requested, converted] = request.${method}(${args})
plot(${guard(`${chosen} == lib.Direction.up ? 7 : ${chosen} == lib.Direction.down ? -4 : ${chosen} == lib.Direction.flat ? 2 : 99`)}, "Identity")
plot(${guard(`str.tostring(${chosen}) == "rising" ? 7 : str.tostring(${chosen}) == "dip" ? -4 : str.tostring(${chosen}) == "stillness" ? 2 : 99`)}, "Title")
plot(${guard(`${converted} == "rising" ? 7 : ${converted} == "dip" ? -4 : ${converted} == "stillness" ? 2 : 99`)}, "Library title")
${lower ? 'plot(array.size(requested), "Count")' : ''}`,
              options(version, form, lower),
            );
            expect(result.errors[0]?.message).toBeUndefined();
            expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
            const codes = lower ? [-4, null, 7] : [-4, 7, 2, -4];
            expect(getPlot(result, 'Identity').values).toEqual(codes);
            expect(getPlot(result, 'Title').values).toEqual(codes);
            expect(getPlot(result, 'Library title').values).toEqual(codes);
            if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          });
        }
      }
    }
    for (const method of ['security', 'security_lower_tf']) {
      it(`v${version} ordinary typed string parameter through ${method}`, () => {
        const lower = method === 'security_lower_tf';
        const chosen = lower ? 'array.get(requested, 0)' : 'requested';
        const guard = (expr: string) => (lower ? `array.size(requested) > 0 ? (${expr}) : na` : expr);
        const result = runCompatScript(
          `//@version=${version}
indicator("Requested imported typed plain string")
import Test/Directions/1 as lib
requested = request.${method}("REMOTE:ALT", "1", lib.plain(note="Test/Directions/1.Direction.up"))
plot(${guard(`${chosen} == "Test/Directions/1.Direction.up" ? 1 : 99`)}, "Raw")
plot(${guard(`str.tostring(${chosen}) == "Test/Directions/1.Direction.up" ? 1 : 99`)}, "Title")`,
          options(version, 'enum parameter', lower),
        );
        expect(result.errors[0]?.message).toBeUndefined();
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        const expected = lower ? [1, null, 1] : [1, 1, 1, 1];
        for (const name of ['Raw', 'Title']) expect(getPlot(result, name).values).toEqual(expected);
      });
    }
  }
});
