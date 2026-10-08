import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript, type CompiledExecutionOptions } from '../../src/runtime/codegen/execute';
import type { Bar } from '../../src/runtime/context';

const bars: Bar[] = [10, 20, 30, 40].map((close, index) => ({
  time: (index + 1) * 60_000, open: close - 1, high: close + 2, low: close - 2, close, volume: 100,
}));

function values(body: string, options?: CompiledExecutionOptions, version = 6) {
  const execution = executeCompiledScript(parse(`//@version=${version}
indicator("Control flow contracts")
${body}`), bars, undefined, options);
  if (execution.status !== 'success') throw new Error(execution.reason);
  expect(execution.result.errors).toEqual([]);
  return execution.result.plots.map((plot) => plot.values);
}

describe('Pine control flow reference contracts', () => {
  // https://www.tradingview.com/pine-script-reference/v6/ entries[3].
  // Rank1823: an unselected numeric branch returns na.
  it('returns na on each unselected numeric if branch', () => {
    expect(values(`value = if bar_index % 2 == 0
    close + 7
plot(value)`)).toEqual([[17, null, 37, null]]);
  });

  // https://www.tradingview.com/pine-script-reference/v6/ entries[4].
  // Rank1824: the selected block returns its final statement, including nested structures.
  it('returns the selected switch block nested if and for tails', () => {
    expect(values(`value = switch bar_index
    0 =>
        if close > 0
            17
        else
            -17
    1 =>
        for i = 1 to 3
            i * 11
    => -23
plot(value)`)).toEqual([[17, 33, -23, -23]]);
  });

  // kw_once description and detailedDesc[0]: first closed activation persists; omitted condition is true.
  it('deactivates once after its first true historical condition', () => {
    expect(values(`var int activations = 0
once bar_index >= 1
    activations += 1
plot(activations)`)).toEqual([[0, 1, 1, 1]]);
  });

  it('activates an omitted once condition on the first historical bar only', () => {
    expect(values(`var int activations = 0
once
    activations += 7
plot(activations)`)).toEqual([[7, 7, 7, 7]]);
  });

  // kw_for detailedDesc: the counter is local, while := can update outer variables.
  it('keeps the loop counter local to its loop', () => {
    expect(values(`i = 31
for i = 1 to 3
    ignored = i * 2
plot(i)`)).toEqual([[31, 31, 31, 31]]);
  });

  it('reassigns an outer variable from each loop iteration', () => {
    expect(values(`sum = 7
for i = 1 to 3
    sum += i * 2
plot(sum)`)).toEqual([[19, 19, 19, 19]]);
  });

  // kw_for/kw_while detailedDesc: break and continue retain the last evaluated return expression.
  it.each(['for', 'while'])('retains the last evaluated %s tail across continue and break', (kind) => {
    const loop = kind === 'for' ? 'for i = 1 to 5' : 'while i < 5';
    const increment = kind === 'while' ? '    i += 1\n' : '';
    expect(values(`i = 0
value = ${loop}
${increment}    if i == 2
        continue
    if i == 4
        break
    i * 11
plot(value)`)).toEqual([[33, 33, 33, 33]]);
  });

  it('returns na when a while loop never iterates', () => {
    expect(values(`value = while false
    17
plot(value)`)).toEqual([[null, null, null, null]]);
  });

  it('returns na when every iteration skips its return expression', () => {
    expect(values(`value = for i = 1 to 3
    continue
    i * 11
plot(value)`)).toEqual([[null, null, null, null]]);
  });

  // v6 migration "Dynamic for loop boundaries": v6 reevaluates to_num; v5 evaluates it once.
  it.each([[6, 2], [5, 4]])('uses the version %i end boundary policy', (version, count) => {
    expect(values(`bound = 4
count = 0
for i = 1 to bound
    count += 1
    bound := 2
plot(count)`, undefined, version)).toEqual([[count, count, count, count]]);
  });

  // barstate.ishistory and execution-model: realtime closing ticks remain realtime.
  it('keeps confirmed realtime bars distinct from historical bars', () => {
    expect(values(`plot(barstate.ishistory ? 1 : 0)
plot(barstate.isrealtime ? 1 : 0)
plot(barstate.isconfirmed ? 1 : 0)`, { confirmedRealtimeBarIndex: 3 }))
      .toEqual([[1, 1, 1, 0], [0, 0, 0, 1], [1, 1, 1, 1]]);
  });

  it.each([true, false])('keeps history and realtime exclusive on open ticks (isNew=%s)', (isNew) => {
    expect(values(`plot(barstate.ishistory == barstate.isrealtime ? 1 : 0)
plot(barstate.ishistory ? 1 : 0)
plot(barstate.isrealtime ? 1 : 0)`, { realtimeLastBar: { isNew } }))
      .toEqual([[0, 0, 0, 0], [1, 1, 1, 0], [0, 0, 0, 1]]);
  });

  // Strategies calc_on_every_history_tick: every historical OHLC execution stays confirmed and historical.
  it('keeps every historical strategy tick historical and confirmed', () => {
    const execution = executeCompiledScript(parse(`//@version=6
strategy("Historical tick flags", calc_on_every_history_tick=true)
log.info(str.tostring(barstate.ishistory) + ":" + str.tostring(barstate.isrealtime) + ":" + str.tostring(barstate.isconfirmed))
plot(close)`), bars.slice(0, 2));
    if (execution.status !== 'success') throw new Error(execution.reason);
    expect(execution.result.errors).toEqual([]);
    expect(execution.result.logs.map((log) => log.message)).toEqual(Array.from({ length: 8 }, () => 'true:false:true'));
  });
});
