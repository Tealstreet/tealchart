import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

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
const code = (value: string) =>
  `str.tostring(${value}) == "Direction.up" ? 7 : str.tostring(${value}) == "Direction.down" ? -4 : str.tostring(${value}) == "Direction.flat" ? 2 : 99`;

// request.security admits string matrices/maps; str.tostring preserves strings.
// reference/pine-v6-reference-v1.json request expression and str.tostring entries.
// An enum with matching identities distinguishes a string result from an enum title.
describe('request plain collection string conversion', () => {
  for (const kind of ['matrix', 'map']) {
    for (const binding of ['positional', 'named']) {
      it(`keeps ${kind} strings with ${binding} request and get arguments`, () => {
        const expression = 'close > 0 ? "Direction.up" : close < 0 ? "Direction.down" : "Direction.flat"';
        const setup =
          kind === 'matrix'
            ? `make() =>
    values = matrix.new<string>(1, 2, "Direction.up")
    matrix.set(values, 0, 0, ${expression})
    values`
            : `make() =>
    values = map.new<string, string>()
    map.put(values, "main", ${expression})
    map.put(values, "other", "Direction.up")
    values`;
        const args =
          binding === 'named' ? 'expression=make(), timeframe="1", symbol="REMOTE:ALT"' : '"REMOTE:ALT", "1", make()';
        const get =
          kind === 'matrix'
            ? binding === 'named'
              ? 'matrix.get(column=0, id=values, row=0)'
              : 'matrix.get(values, 0, 0)'
            : binding === 'named'
              ? 'map.get(key="main", id=values)'
              : 'map.get(values, "main")';
        const other = kind === 'matrix' ? 'values.get(0, 1)' : 'values.get("other")';
        const annotation = binding === 'named' ? (kind === 'matrix' ? 'matrix<string> ' : 'map<string, string> ') : '';
        const result = runCompatScript(
          `//@version=6
indicator("Requested plain collection strings")
enum Direction
    up = "rising"
    down = "dip"
    flat = "stillness"
${setup}
${annotation}values = request.security(${args})
value = ${get}
plot(${code('value')}, "Bound")
plot(${code(get)}, "Inline")
plot(${code(other)}, "Other")`,
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
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Bound').values).toEqual([-4, 7, 2, -4]);
        expect(getPlot(result, 'Inline').values).toEqual([-4, 7, 2, -4]);
        expect(getPlot(result, 'Other').values).toEqual([7, 7, 7, 7]);
      });
    }
  }
});
