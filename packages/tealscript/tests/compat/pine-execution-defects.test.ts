import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript, type Bar } from '../../src/runtime';

// These indicator regressions were proved red on the original engine and green
// under documented patches in a discarded copy before the production fixes.
// https://www.tradingview.com/pine-script-reference/v6/
const bars: Bar[] = [17, 4, 23, 9, 12].map((close, index) => ({
  time: (index + 1) * 60_000, open: close - 1, high: close + 2,
  low: close - 2, close, volume: 10,
}));

function run(body: string, declaration = '', options?: Parameters<typeof executeScript>[3]) {
  const result = executeScript(parse(`//@version=6\nindicator("Documented defects"${declaration})\n${body}`), bars, undefined, options);
  expect(result.errors).toEqual([]);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  return result;
}

function values(result: ReturnType<typeof run>, title: string) {
  const plot = result.plots.find((candidate) => candidate.title === title);
  expect(plot, title).toBeDefined();
  return plot!.values;
}

describe('Pine execution model documented regressions', () => {
  // Reference :=: an earlier reassignment updates the outer variable; a later
  // declaration creates a local, whose reassignment must leave the outer intact.
  // https://www.tradingview.com/pine-script-reference/v6/#op_:=
  it('EXEC-LOCAL-SHADOW: isolates a local declaration after an outer reassignment', () => {
    const result = run(`x = close
plot(x, "Before")
if bar_index != 1 and bar_index != 3
    x := -close
    x = 999
    x := x + 1
plot(x, "After")`);
    expect(values(result, 'Before')).toEqual([17, 4, 23, 9, 12]);
    expect(values(result, 'After')).toEqual([-17, 4, -23, 9, -12]);
  });

  // Reference :=: declaration creates a local only after its initializer evaluates.
  it('EXEC-LOCAL-SHADOW: resolves a shadow initializer through its enclosing scope', () => {
    const result = run(`x = close
score = 0
if true
    x = x + 5
    x := x + 7
    score := x
plot(x, "Outer")
plot(score, "Local")`);
    expect(values(result, 'Outer')).toEqual([17, 4, 23, 9, 12]);
    expect(values(result, 'Local')).toEqual([29, 16, 35, 21, 24]);
  });

  // Reference :=: each nested declaration owns a distinct local binding.
  it('EXEC-LOCAL-SHADOW: restores an enclosing local after a nested shadow', () => {
    const result = run(`x = close
inner = 0
parent = 0
if true
    x = x + 10
    if true
        x = x + 100
        x := x + 1
        inner := x
    parent := x
plot(x, "Outer")
plot(parent, "Parent")
plot(inner, "Inner")`);
    expect(values(result, 'Outer')).toEqual([17, 4, 23, 9, 12]);
    expect(values(result, 'Parent')).toEqual([27, 14, 33, 19, 22]);
    expect(values(result, 'Inner')).toEqual([128, 115, 134, 120, 123]);
  });

  // Reference tuple declarations + :=: evaluate the RHS before introducing locals.
  it('EXEC-LOCAL-SHADOW: isolates tuple declarations from earlier outer assignments', () => {
    const result = run(`pair(a) =>
    [a + 10, a + 20]
x = close
y = open
score = 0
if true
    x := -close
    [x, y] = pair(x)
    x := x + 1
    score := x + y
plot(x, "Outer X")
plot(y, "Outer Y")
plot(score, "Local")`);
    expect(values(result, 'Outer X')).toEqual([-17, -4, -23, -9, -12]);
    expect(values(result, 'Outer Y')).toEqual([16, 3, 22, 8, 11]);
    expect(values(result, 'Local')).toEqual([-3, 23, -15, 13, 7]);
  });

  // Reference := + []: local reassignment does not replace the outer series trail.
  it('EXEC-LOCAL-SHADOW: keeps the outer history after a local reassignment', () => {
    const result = run(`x = close
plot(x[1], "Before")
if true
    x := -close
    x = 999
    x := x + 1
plot(x, "After")
plot(x[1], "Prior")`);
    expect(values(result, 'Before')).toEqual([null, -17, -4, -23, -9]);
    expect(values(result, 'After')).toEqual([-17, -4, -23, -9, -12]);
    expect(values(result, 'Prior')).toEqual([null, -17, -4, -23, -9]);
  });

  // Reference := and control results: bind the local after evaluating its initializer.
  it.each(['if', 'for', 'while'])('EXEC-LOCAL-SHADOW: isolates a %s-valued local initializer', (kind) => {
    const initializer = kind === 'if' ? `if true
        x + 2` : kind === 'for' ? `for i = 1 to 2
        x + i` : `while counter < 2
        counter := counter + 1
        x + counter`;
    const result = run(`x = close
score = 0
if true
    int counter = 0
    x = ${initializer}
    x := x + 1
    score := x
plot(x, "Outer")
plot(score, "Local")`);
    expect(values(result, 'Outer')).toEqual([17, 4, 23, 9, 12]);
    expect(values(result, 'Local')).toEqual([20, 7, 26, 12, 15]);
  });

  // Reference indicator:calc_bars_count + bar_index + []: only recent historical
  // bars execute, with fresh indices and no pre-window state or history.
  // https://www.tradingview.com/pine-script-reference/v6/#fun_indicator
  // Verified 18ace021d3 projects selected values onto chart indices; preceding slots remain null.
  it('EXEC-CALC-BARS-WINDOW: limits and rebases the initial historical dataset', () => {
    const result = run(`var float trail = 0
trail := trail * 10 + close
plot(trail, "Trail")
plot(bar_index, "Index")
plot(close[1], "Prior")`, ', calc_bars_count=3');
    // Unexecuted chart positions stay unavailable in the projected host output.
    expect(values(result, 'Trail')).toEqual([null, null, 23, 239, 2402]);
    expect(values(result, 'Index')).toEqual([null, null, 0, 1, 2]);
    expect(values(result, 'Prior')).toEqual([null, null, null, 23, 9]);
    for (const count of [0, 8]) {
      const full = run('plot(close, "Close")\nplot(bar_index, "Index")', `, calc_bars_count=${count}`);
      expect(values(full, 'Close')).toEqual([17, 4, 23, 9, 12]);
      expect(values(full, 'Index')).toEqual([0, 1, 2, 3, 4]);
    }
  });

  // Reference indicator:calc_bars_count limits historical bars; realtime follows.
  it('EXEC-CALC-BARS-WINDOW: retains realtime bars and rebases host transition indices', () => {
    const body = `plot(close, "Close")
plot(bar_index, "Index")
plot(barstate.ishistory ? 1 : 0, "Historical")
plot(barstate.isrealtime ? 1 : 0, "Realtime")
plot(barstate.islastconfirmedhistory ? 1 : 0, "Boundary")`;
    const opening = run(body, ', calc_bars_count=2', { realtimeLastBar: { isNew: true } });
    expect(values(opening, 'Close')).toEqual([null, null, 23, 9, 12]);
    expect(values(opening, 'Index')).toEqual([null, null, 0, 1, 2]);
    expect(values(opening, 'Historical')).toEqual([null, null, 1, 1, 0]);
    expect(values(opening, 'Realtime')).toEqual([null, null, 0, 0, 1]);
    expect(values(opening, 'Boundary')).toEqual([null, null, 0, 1, 0]);
    const elapsed = run(body, ', calc_bars_count=2', {
      confirmedRealtimeBarStartIndex: 3,
      confirmedRealtimeBarIndex: 3,
      realtimeLastBar: { isNew: false },
    });
    expect(values(elapsed, 'Close')).toEqual([null, 4, 23, 9, 12]);
    expect(values(elapsed, 'Index')).toEqual([null, 0, 1, 2, 3]);
    expect(values(elapsed, 'Historical')).toEqual([null, 1, 1, 0, 0]);
    expect(values(elapsed, 'Realtime')).toEqual([null, 0, 0, 1, 1]);
    expect(values(elapsed, 'Boundary')).toEqual([null, 0, 1, 0, 0]);
  });

  // Reference entries indicator:max_bars_back and max_bars_back descriptions
  // call it a minimum buffer length. []'s static depth here is greater than 1.
  // Rejects treating that minimum as a refusal threshold or discarding deeper data.
  it('EXEC-MAX-BARS-MINIMUM: declaration buffer size allows a larger static reference', () => {
    const result = run('plot(close[3], "Prior")', ', max_bars_back=1');
    expect(values(result, 'Prior')).toEqual([null, null, null, 17, 4]);
  });

  // https://www.tradingview.com/pine-script-reference/v6/#var_barstate.islast
  // Last-confirmed historical is not last when a realtime bar follows it.
  // Rejects conflating the two flags; checks opening AND subsequent realtime ticks.
  it('EXEC-ISLAST-PREDECESSOR: marks only the realtime bar as last', () => {
    for (const isNew of [true, false]) {
      const result = run(`plot(barstate.islast ? 1 : 0, "Last")
plot(barstate.islastconfirmedhistory ? 1 : 0, "Confirmed boundary")
plot(barstate.isnew ? 1 : 0, "New")`, '', { realtimeLastBar: { isNew } });
      expect(values(result, 'Last')).toEqual([0, 0, 0, 0, 1]);
      expect(values(result, 'Confirmed boundary')).toEqual([0, 0, 0, 1, 0]);
      expect(values(result, 'New')).toEqual([1, 1, 1, 1, isNew ? 1 : 0]);
    }
  });

  // Reference for/while: direct var/varip initialization stops after the first
  // iteration; regular initialization, reassignment, and UDF wrapping run fully.
  // https://www.tradingview.com/pine-script-reference/v6/#kw_for
  for (const mode of ['var', 'varip']) {
    it(`EXEC-PERSISTENT-LOOP-INITIALIZER: ${mode} for result stops after one iteration`, () => {
      const result = run(`int executed = 0
${mode} float first = for i = 2 to 4
    executed := executed + i
    i * 7
regular = for j = 2 to 4
    j * 7
${mode} float assigned = 0
assigned := for k = 2 to 4
    k * 7
whole() =>
    for n = 2 to 4
        n * 7
${mode} float wrapped = whole()
plot(first, "First")
plot(executed, "Executed")
plot(regular, "Regular")
plot(assigned, "Assigned")
plot(wrapped, "Wrapped")`);
      expect(values(result, 'First')).toEqual([14, 14, 14, 14, 14]);
      expect(values(result, 'Executed')).toEqual([2, 0, 0, 0, 0]);
      for (const title of ['Regular', 'Assigned', 'Wrapped']) {
        expect(values(result, title)).toEqual([28, 28, 28, 28, 28]);
      }
    });

    // Reference for...in remarks also stop direct persistent initialization after one iteration.
    it(`EXEC-PERSISTENT-LOOP-INITIALIZER: ${mode} for-in and UDF-local initializers stop after one iteration`, () => {
      const result = run(`int executed = 0
${mode} float first = for [index, value] in array.from(2, 4, 6)
    executed := executed + value + index
    value * 7
sample() =>
    int count = 0
    ${mode} float local = for i = 2 to 4
        count := count + i
        i * 7
    [local, count]
[local, count] = sample()
plot(first, "First")
plot(executed, "Executed")
plot(local, "Local")
plot(count, "Count")`);
      for (const title of ['First', 'Local']) {
        expect(values(result, title)).toEqual([14, 14, 14, 14, 14]);
      }
      for (const title of ['Executed', 'Count']) {
        expect(values(result, title)).toEqual([2, 0, 0, 0, 0]);
      }
    });

    // Reference for remarks: stopping after one iteration also applies to continue.
    it(`EXEC-PERSISTENT-LOOP-INITIALIZER: ${mode} initializer does not continue into a second iteration`, () => {
      const result = run(`int executed = 0
${mode} float first = for i = 1 to 3
    executed := executed + 1
    if i == 1
        continue
    i * 7
plot(first, "First")
plot(executed, "Executed")`);
      expect(values(result, 'First')).toEqual([null, null, null, null, null]);
      expect(values(result, 'Executed')).toEqual([1, 0, 0, 0, 0]);
    });

    // https://www.tradingview.com/pine-script-reference/v6/#kw_while remarks.
    // A counter side effect also discriminates stopping execution from merely
    // returning the first value after running the entire loop.
    it(`EXEC-PERSISTENT-LOOP-INITIALIZER: ${mode} while result stops after one iteration`, () => {
      const result = run(`int counter = 0
${mode} float first = while counter < 3
    counter := counter + 1
    counter * 7
plot(first, "First")
plot(counter, "Counter")`);
      expect(values(result, 'First')).toEqual([7, 7, 7, 7, 7]);
      expect(values(result, 'Counter')).toEqual([1, 0, 0, 0, 0]);
    });
  }
});
