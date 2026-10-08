import type { Bar, ExecutionResult } from '../../src/runtime';

import { beforeAll, describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 9, 1);
const bars = (closes: number[]): Bar[] =>
  closes.map((close, index) => ({
    time: start + index * 60_000,
    open: close - 2,
    high: close + 4,
    low: close - 5,
    close,
    volume: 100,
  }));
const declarations = `enum Direction
    up = "rising"
    down = "dip"
    flat = "stillness"`;
const direction = 'close > 0 ? Direction.up : close < 0 ? Direction.down : Direction.flat';
function setup(kind: string) {
  return kind === 'matrix'
    ? `make() =>
    values = matrix.new<Direction>(1, 2, Direction.flat)
    matrix.set(values, 0, 0, ${direction})
    values`
    : `make() =>
    values = map.new<string, Direction>()
    map.put(values, "main", ${direction})
    map.put(values, "flat", Direction.flat)
    values`;
}
function run(source: string) {
  return runCompatScript(
    `//@version=6
indicator("Requested enum collection titles")
${declarations}
${source}`,
    {
      bars: bars([900, 901, 902, 903]),
      engineOptions: {
        requestDatafeed: new InMemoryRequestDatafeed([
          { symbol: 'REMOTE:ALT', timeframe: '1', bars: bars([-7, 13, 0, -11]) },
        ]),
        runtime: { timeframe: { period: '1' } },
      },
    },
  );
}
const code = (value: string) =>
  `${value} == Direction.up ? 7 : ${value} == Direction.down ? -4 : ${value} == Direction.flat ? 2 : 99`;
const title = (value: string) =>
  `str.tostring(${value}) == "rising" ? 7 : str.tostring(${value}) == "dip" ? -4 : str.tostring(${value}) == "stillness" ? 2 : 99`;

// The enum entry specifies str.tostring titles, not the qualified member spelling.
// reference/pine-v6-reference-v1.json security accepts matrix/map enum expressions.
// Selected custom string returns must retain their plain string representation.
describe('request matrix and map enum titles', () => {
  for (const kind of ['matrix', 'map']) {
    for (const binding of ['positional', 'named']) {
      for (const annotation of [false, true]) {
        describe(`${kind} with ${binding} arguments, explicit type ${annotation}`, () => {
          let result: ExecutionResult;
          beforeAll(() => {
            const args =
              binding === 'named'
                ? 'expression=make(), symbol="REMOTE:ALT", timeframe="1"'
                : '"REMOTE:ALT", "1", make()';
            const get =
              kind === 'matrix'
                ? binding === 'named'
                  ? 'matrix.get(column=0, id=values, row=0)'
                  : 'matrix.get(values, 0, 0)'
                : binding === 'named'
                  ? 'map.get(key="main", id=values)'
                  : 'map.get(values, "main")';
            const other = kind === 'matrix' ? 'values.get(0, 1)' : 'values.get("flat")';
            result = run(`${setup(kind)}
${annotation ? (kind === 'matrix' ? 'matrix<Direction> ' : 'map<string, Direction> ') : ''}values = request.security(${args})
value = ${get}
plot(${code('value')}, "Code")
plot(${title('value')}, "Title")
plot(${title(get)}, "Inline title")
plot(${code(other)}, "Other code")
plot(${title(other)}, "Other title")`);
            expect(result.errors).toEqual([]);
          });
          it('preserves requested enum identities', () => {
            expect(getPlot(result, 'Code').values).toEqual([-4, 7, 2, -4]);
            expect(getPlot(result, 'Other code').values).toEqual([2, 2, 2, 2]);
          });
          it('preserves documented enum titles', () => {
            expect(getPlot(result, 'Title').values).toEqual([-4, 7, 2, -4]);
            expect(getPlot(result, 'Inline title').values).toEqual([-4, 7, 2, -4]);
            expect(getPlot(result, 'Other title').values).toEqual([2, 2, 2, 2]);
          });
        });
      }
    }
    it(`preserves selected ${kind} custom get string returns`, () => {
      const signature =
        kind === 'matrix'
          ? 'matrix<Direction> values, string marker, bool custom'
          : 'map<string, Direction> values, string marker, bool custom';
      const result = run(`${setup(kind)}
method get(${signature}) => marker
values = request.security("REMOTE:ALT", "1", make())
custom = values.get("Direction.up", true)
plot(str.tostring(custom) == "Direction.up" ? 1 : 0, "Plain bound")
plot(str.tostring(values.get("Direction.up", true)) == "Direction.up" ? 1 : 0, "Plain inline")`);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Plain bound').values).toEqual([1, 1, 1, 1]);
      expect(getPlot(result, 'Plain inline').values).toEqual([1, 1, 1, 1]);
    });
  }
});
