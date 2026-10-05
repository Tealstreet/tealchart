import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript, type Bar } from '../../src/runtime';

// Authority: archived pine-v6-reference-v1.json (retrieved 2026-10-03).
// Expectations below are derived from the cited entries, never engine output.
// Red proofs used temporary implementation mutations in a discarded source copy:
// stale close data, lost unary sign, history offset + 1, reset local var state,
// shared UDF call-site IDs, eager and/or, switch default 0, and isfirst on all bars.
// Every test below failed a value assertion; restoring the engine passed all 14.
const bars: Bar[] = [17, 4, 23, 9, 12].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: [10, 8, 20, 14, 7][index]!,
  high: close + 20,
  low: close - 20,
  close,
  volume: [80, 30, 90, 20, 70][index]!,
}));

function run(body: string, options?: Parameters<typeof executeScript>[3], declaration = '') {
  const result = executeScript(parse(`//@version=6\nindicator("Execution contracts"${declaration})\n${body}`), bars, undefined, options);
  expect(result.errors).toEqual([]);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  return result;
}

function values(result: ReturnType<typeof run>, title: string) {
  const plot = result.plots.find((candidate) => candidate.title === title);
  expect(plot, title).toBeDefined();
  expect(plot!.values).toHaveLength(bars.length);
  return plot!.values;
}

describe('Pine documented execution model', () => {
  // Reference entries bar_index, close, open, volume, var, :=.
  // Rejects reversed/skipped/duplicate executions and stale or swapped bar fields.
  it('executes historical bars once in order with current bar data', () => {
    const result = run(`var float trail = 0
trail := trail * 10 + close
plot(trail, "Trail")
plot(bar_index, "Index")
plot(open, "Open")
plot(volume, "Volume")`);
    expect(values(result, 'Trail')).toEqual([17, 174, 1763, 17639, 176402]);
    expect(values(result, 'Index')).toEqual([0, 1, 2, 3, 4]);
    expect(values(result, 'Open')).toEqual([10, 8, 20, 14, 7]);
    expect(values(result, 'Volume')).toEqual([80, 30, 90, 20, 70]);
  });

  // https://www.tradingview.com/pine-script-reference/v6/#op_:= example:
  // ':=' updates the existing outer variable for subsequent observations.
  // Rejects retroactive reassignment and applying a reassignment on the next bar.
  it('preserves earlier observations when a later statement reassigns a variable', () => {
    const result = run(`x = close
plot(x, "Before")
if close > open
    x := -close
plot(x, "After")`);
    expect(values(result, 'Before')).toEqual([17, 4, 23, 9, 12]);
    expect(values(result, 'After')).toEqual([-17, 4, -23, 9, -12]);
  });

  // https://www.tradingview.com/pine-script-reference/v6/#op_[]
  // Distinct signed spreads reject current-value, wrong-depth and builtin-close history.
  it('retains independent arithmetic-expression histories', () => {
    const result = run(`plot((close - open)[1], "Spread")
plot((open - close)[2], "Inverse")`);
    expect(values(result, 'Spread')).toEqual([null, 7, -4, 3, -5]);
    expect(values(result, 'Inverse')).toEqual([null, null, -7, 4, -3]);
  });

  // Reference entries [], math.abs. The nonmonotonic signed source rejects
  // current-call output, source history without applying abs, and shared call slots.
  it('retains histories of ordinary call results', () => {
    const result = run(`plot(math.abs(close - open)[1], "Abs")
plot(math.abs(close - open)[2], "Abs two")`);
    expect(values(result, 'Abs')).toEqual([null, 7, 4, 3, 5]);
    expect(values(result, 'Abs two')).toEqual([null, null, 7, 4, 3]);
  });

  // Reference entry []: each subscript reads the previous series value.
  // Rejects discarding the outer offset and conflating nested history with current open.
  it('retains the series produced by a nested history expression', () => {
    const result = run('plot((open[1])[1], "Nested")');
    expect(values(result, 'Nested')).toEqual([null, null, 10, 8, 20]);
  });

  // https://www.tradingview.com/pine-script-reference/v6/#kw_var example's x/y.
  // First activation is delayed; reentry spreads fall and rise. Rejects eager global
  // initialization, resetting on reentry, and max/min in place of first value.
  it('initializes a local var on its first executed bar and retains it on reentry', () => {
    const result = run(`float seen = na
if bar_index > 0 and bar_index != 2
    var float first = close - open
    seen := first
plot(seen, "First")`);
    expect(values(result, 'First')).toEqual([null, -4, null, -4, -4]);
  });

  // Reference entries var, for, :=; for's loop body executes per counter value.
  // Rejects regular locals persisting between iterations and var locals resetting
  // per iteration or per bar. Loop counters take three distinct values.
  it('reinitializes regular loop locals while retaining var loop locals', () => {
    const result = run(`float regularSum = 0
float persistentSum = 0
for i = 1 to 3
    float regular = i * 10
    var float persistent = 0
    regular := regular + 1
    persistent := persistent + i
    regularSum := regularSum + regular
    persistentSum := persistentSum + persistent
plot(regularSum, "Regular")
plot(persistentSum, "Persistent")`);
    expect(values(result, 'Regular')).toEqual([63, 63, 63, 63, 63]);
    expect(values(result, 'Persistent')).toEqual([10, 28, 46, 64, 82]);
  });

  // Reference entry []; manual user-defined-functions/#scope-of-a-function-call:
  // every written call has independent parameter/local history.
  // https://www.tradingview.com/pine-script-docs/language/user-defined-functions/
  // Rejects shared parameter buffers, current parameters and builtin-close fallback.
  it('keeps parameter histories independent at each written UDF call', () => {
    const result = run(`prior(float x) => x[1]
plot(prior(close), "Close")
plot(prior(open), "Open")`);
    expect(values(result, 'Close')).toEqual([null, 17, 4, 23, 9]);
    expect(values(result, 'Open')).toEqual([null, 10, 8, 20, 14]);
  });

  // Reference entries [], := plus the same manual written-call rule.
  // Rejects a shared local trail and recording the initializer instead of final value.
  it('records reassigned UDF locals in their own written-call histories', () => {
    const result = run(`prior(float x) =>
    local = x * 2
    local := local + 3
    local[1]
plot(prior(close), "Close")
plot(prior(open), "Open")`);
    expect(values(result, 'Close')).toEqual([null, 37, 11, 49, 21]);
    expect(values(result, 'Open')).toEqual([null, 23, 19, 43, 31]);
  });

  // Reference entry var plus the manual written-call rule, including nested calls.
  // Rejects inner state shared by both outer sites and state reset on every call.
  it('separates persistent nested UDF state for distinct outer calls', () => {
    const result = run(`accumulate(float x) =>
    var float total = 0
    total := total + x
    total
outer(float x) => accumulate(x)
plot(outer(close), "Close")
plot(outer(open), "Open")`);
    expect(values(result, 'Close')).toEqual([17, 21, 44, 53, 65]);
    expect(values(result, 'Open')).toEqual([10, 18, 38, 52, 59]);
  });

  // https://www.tradingview.com/pine-script-reference/v6/#kw_and remarks.
  // Observable RHS writes reject eager evaluation AND a RHS that is never evaluated.
  it('short circuits and only when its left operand is false', () => {
    const result = run(`var calls = array.new_int(1, 0)
touch() =>
    array.set(calls, 0, array.get(calls, 0) + 1)
    true
selected = close > open and touch()
plot(array.get(calls, 0), "Calls")
plot(selected ? 1 : 0, "Selected")`);
    expect(values(result, 'Calls')).toEqual([1, 1, 2, 2, 3]);
    expect(values(result, 'Selected')).toEqual([1, 0, 1, 0, 1]);
  });

  // https://www.tradingview.com/pine-script-reference/v6/#kw_or remarks.
  // Same discrimination as and, with the complementary branch and false RHS result.
  it('short circuits or only when its left operand is true', () => {
    const result = run(`var calls = array.new_int(1, 0)
touch() =>
    array.set(calls, 0, array.get(calls, 0) + 1)
    false
selected = close > open or touch()
plot(array.get(calls, 0), "Calls")
plot(selected ? 1 : 0, "Selected")`);
    expect(values(result, 'Calls')).toEqual([0, 1, 1, 2, 2]);
    expect(values(result, 'Selected')).toEqual([1, 0, 1, 0, 1]);
  });

  // https://www.tradingview.com/pine-script-reference/v6/#kw_switch returns/remarks.
  // Rejects fallthrough, returning an earlier statement and missing-default zero.
  it('returns the selected switch block tail and na when no block matches', () => {
    const result = run(`var calls = array.new_int(1, 0)
result = switch bar_index
    0 =>
        array.set(calls, 0, array.get(calls, 0) + 1)
        -7
    2 =>
        array.set(calls, 0, array.get(calls, 0) + 10)
        31
plot(result, "Result")
plot(array.get(calls, 0), "Calls")`);
    expect(values(result, 'Result')).toEqual([-7, null, 31, null, null]);
    expect(values(result, 'Calls')).toEqual([1, 1, 11, 11, 11]);
  });

  // Reference entries barstate.isfirst/islast/ishistory/isrealtime/isnew/
  // isconfirmed/islastconfirmedhistory. Binary weights distinguish every flag.
  // Rejects all-bars-first/last, unset historical flags and a missing closed boundary.
  it('sets historical barstate including the closed-market last boundary', () => {
    const result = run(`flags = (barstate.isfirst ? 1 : 0) + (barstate.islast ? 2 : 0) + (barstate.ishistory ? 4 : 0) + (barstate.isrealtime ? 8 : 0) + (barstate.isnew ? 16 : 0) + (barstate.isconfirmed ? 32 : 0) + (barstate.islastconfirmedhistory ? 64 : 0)
plot(flags, "Flags")`);
    expect(values(result, 'Flags')).toEqual([53, 52, 52, 52, 118]);
  });
});
