import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Each expected value is derived from the literal contract and fixture, not a
// second invocation of the compiled evaluator. No TradingView capture is claimed.
describe('ledger gaps 6: collection and string-history witnesses', () => {
  // https://www.tradingview.com/pine-script-docs/language/arrays/#negative-indexing
  it.each(['array.get(values, index)', 'values.get(index)'])(
    'reads all three positive and three negative coordinates via %s (201/203/204/205)',
    (read) => {
      const source = `//@version=6
indicator("Get boundaries")
values = array.from(17, -8, 43)
for index = -3 to 2
    label.new(bar_index, close, str.tostring(${read}))`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.drawings.map((drawing) => (drawing.type === 'label' ? drawing.text : null))).toEqual([
        '17',
        '-8',
        '43',
        '17',
        '-8',
        '43',
      ]);
    },
  );

  it.each([-4, 3])('refuses array.get index %i outside size3 (203/204/205)', (index) => {
    const result = runCompatScript(
      `//@version=6\nindicator("Get bounds")\nvalues = array.from(17, -8, 43)\nplot(values.get(${index}))`,
      { bars: compatibilityBars.slice(0, 1) },
    );
    expect(result.errors).toEqual([expect.objectContaining({ message: expect.stringMatching(/out of bounds/) })]);
  });

  // https://www.tradingview.com/pine-script-docs/language/type-system/#na-value
  it('recognizes unavailable string history and empty strings as missing (239)', () => {
    const source = `//@version=6
indicator("Missing string history")
message = bar_index == 0 ? "" : "defined"
plot(na(message[1]) ? 1 : 0, title="Missing")
plot(message[1] == "" ? 1 : 0, title="Empty")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([1, 1, 0]);
    expect(getPlot(result, 'Empty').values).toEqual([0, 1, 0]);
  });

  // Native854a90eda2 (insideb54) refuses direct const string = na.
  // Keep this cast/missingness control with an explicit string cast; the
  // original invalid initializer remains in the recovery archive.
  it('preserves string(na) missingness and the const string type (240)', () => {
    const source = `//@version=6
indicator("Typed string absence")
const string absent = string(na)
missing = string(absent)
empty = string("")
plot(na(missing) ? 1 : 0, title="Missing")
plot(na(empty) ? 1 : 0, title="Empty")`;
    const checked = checkProgram(parse(source));
    expect(checked.diagnostics).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'missing')?.type).toEqual({
      kind: 'string',
      qualifier: 'const',
    });
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([1, 1, 1]);
    expect(getPlot(result, 'Empty').values).toEqual([1, 1, 1]);
  });
});

describe('ledger gaps 6: runtime availability', () => {
  // https://www.tradingview.com/pine-script-docs/language/user-defined-functions/#scope-of-a-function-call
  it('isolates parameter history and persistent locals by written UDF call (217)', () => {
    const source = `//@version=6
indicator("Written call history")
past(float source) => source[1]
total(float source) =>
    var float sum = 0
    sum += source
    sum
plot(past(close), title="Past close")
plot(past(open), title="Past open")
plot(total(close), title="Close total")
plot(total(open), title="Open total")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Past close').values).toEqual([null, 102, 105]);
    expect(getPlot(result, 'Past open').values).toEqual([null, 100, 102]);
    expect(getPlot(result, 'Close total').values).toEqual([102, 207, 314]);
    expect(getPlot(result, 'Open total').values).toEqual([100, 202, 307]);
  });

  // https://www.tradingview.com/pine-script-docs/language/type-system/#simple
  it('provides simple mintick from the first runtime bar unchanged (206)', () => {
    const result = runCompatScript(
      '//@version=6\nindicator("First simple")\nsimple float tick = syminfo.mintick\nplot(tick, title="Tick")',
      {
        bars: compatibilityBars.slice(0, 3),
        engineOptions: { runtime: { syminfo: { mintick: 0.25 } } },
      },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Tick').values).toEqual([0.25, 0.25, 0.25]);
  });

  // Realtime open is the opening price while close can reflect an update (232).
  // https://www.tradingview.com/pine-script-docs/language/execution-model/#realtime-bars
  it('uses the realtime bar opening price rather than its latest close (232)', () => {
    const result = runCompatScript(
      '//@version=6\nindicator("Realtime open")\nplot(open, title="Open")\nplot(close, title="Close")\nplot(barstate.isrealtime ? 1 : 0, title="Realtime")',
      {
        bars: compatibilityBars.slice(0, 3),
        engineOptions: { realtimeLastBar: { isNew: false } },
      },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Open').values).toEqual([100, 102, 105]);
    expect(getPlot(result, 'Close').values).toEqual([102, 105, 107]);
    expect(getPlot(result, 'Realtime').values).toEqual([0, 0, 1]);
  });
});

// https://www.tradingview.com/pine-script-docs/language/execution-model/#historical-buffers
describe('ledger gaps 6: exact historical boundaries', () => {
  const bars: Bar[] = Array.from({ length: 10002 }, (_, index) => ({
    time: 1_700_000_000_000 + index * 60000,
    open: index + 17,
    high: index + 20,
    low: index + 10,
    close: index + 18,
    volume: 10,
  }));

  it.each([
    ['value = close * 2', 'value', 5000, 36],
    ['', 'open', 10000, 17],
  ] as const)('reads the maximum history of %s %s at %i (218/233)', (setup, series, depth, expected) => {
    const result = runCompatScript(
      `//@version=6\nindicator("History edge")\n${setup}\nplot(${series}[${depth}], title="Past")`,
      { bars: bars.slice(0, depth + 2) },
    );
    expect(result.errors).toEqual([]);
    const values = getPlot(result, 'Past').values;
    expect(values).toHaveLength(depth + 2);
    expect(values.slice(0, depth).every((value) => value === null)).toBe(true);
    expect(values.slice(depth)).toEqual([expected, expected + (series === 'open' ? 1 : 2)]);
  });

  it.each([
    ['value = close * 2', 'value', 5001, 5000],
    ['', 'open', 10001, 10000],
  ] as const)('refuses %s %s history beyond %i (218/233)', (setup, series, depth, maximum) => {
    const result = runCompatScript(
      `//@version=6\nindicator("History overflow")\n${setup}\nplot(${series}[${depth}], title="Past")`,
      { bars: bars.slice(0, 1) },
    );
    expect(result.errors).toEqual([
      expect.objectContaining({ message: `Historical offset ${depth} exceeds max_bars_back ${maximum}` }),
    ]);
  });
});
