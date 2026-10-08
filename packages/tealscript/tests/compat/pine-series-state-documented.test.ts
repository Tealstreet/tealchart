import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { compile, ARRAY_HELPERS, MAP_HELPERS, MATRIX_HELPERS, UDT_HELPERS, type CompiledBarContext } from '../../src/runtime/codegen/compile';
import { divideV5ConstInts } from '../../src/runtime/codegen/runtime';
import { HistoryBufferSizing } from '../../src/runtime/codegen/history';
import * as ta from '../../src/runtime/codegen/ta-classes';
import { getPlot, runCompatScript } from './fixtures';

// Every case cites entries in:
// https://www.tradingview.com/pine-script-reference/v6/.
// Supporting scope/rollback authority: language/execution-model/#time-series-in-scopes.

// Exercise generated Pine programs, not isolated Series/TA helper arithmetic.
function liveScript(body: string, maxBarsBack = 4) {
  const compiled = compile(parse(`//@version=6\nindicator("State contract")\n${body}`), maxBarsBack);
  expect(compiled.success).toBe(true);
  const script = new compiled.ScriptClass({
    ...new HistoryBufferSizing(maxBarsBack, maxBarsBack).dependencies(maxBarsBack, () => false),
    constIntDivide: divideV5ConstInts, maxBarsBack,
    _arr: ARRAY_HELPERS, _map: MAP_HELPERS, _mtx: MATRIX_HELPERS, _udt: UDT_HELPERS, ...ta,
  });
  const output = new Map<string, unknown>();
  function tick(index: number, close: number, realtime = false) {
    output.clear();
    const context: Partial<CompiledBarContext> = {
      bar: { close, open: 1, high: Math.max(close, 1), low: Math.min(close, 1), volume: 100, time: index * 60_000 },
      barIndex: index, lastBarIndex: index,
      // Each rollback restores the PREVIOUS closed bar, so the opened bar needs
      // a fresh storage slot even when this is its second market update.
      isFirstTick: true,
      barstate: { isfirst: index === 0, islast: true, ishistory: !realtime, isrealtime: realtime,
        isnew: !realtime, isconfirmed: !realtime, islastconfirmedhistory: !realtime },
      syminfo: {}, timeframe: {}, chart: {},
      plot(_index, _function, _callIndex, value, named, extraArgs) { output.set(named.title ?? String(extraArgs[0]), value); },
      drawingCount() { return 0; },
      markDrawingsPersistentFrom() {}, markPersistentRuntimeValue() {},
    };
    script.onBar(context as CompiledBarContext);
    return new Map(output);
  }
  return { script, tick };
}

describe('documented series state contracts', () => {
  // Reference: [] previous values; supporting execution-model call histories.
  // Red proof: emitUserFunctionCall uses callSiteId=0 for every call; failed/restored/passed.
  it('UDF call sites have independent parameter histories', () => {
    const result = runCompatScript(`//@version=6
indicator("Call sites")
previous(float x) => nz(x[1], 999)
plot(previous(close), "a")
plot(previous(-close), "b")`);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(getPlot(result, 'a').values).toEqual([999, 102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110]);
    expect(getPlot(result, 'b').values).toEqual([999, -102, -105, -107, -103, -99, -100, -104, -109, -108, -111, -110]);
  });

  // Reference: ta.sma explicit sum/length example and [];
  // supporting execution model: local scopes only evaluate when reached.
  // Inverse proof: isolated emitter uses SMA.compute at the reached call,

  // bypassing global source history. Raw assertion GREEN; copy discarded.
  // Disjoint skipped values reject advancing the window on unexecuted calls.
  it('conditional-sma-global-history: conditional TA invocation advances only on reached bars', () => {
    const { tick } = liveScript('float x = na\nif bar_index == 0 or bar_index == 2 or bar_index == 4\n    x := ta.sma(close, 2)\nplot(x, "value")');
    expect([tick(0, 8).get('value'), tick(1, 1000).get('value'), tick(2, -4).get('value'),
      tick(3, -1000).get('value'), tick(4, 12).get('value')]).toEqual([NaN, NaN, 2, NaN, 4]);
  });

  // Reference: var one-time initialization, varip Remarks eliminate rollback.
  // Red proof var: omit generated var restoration; failed/restored/passed.
  it('var rolls back intrabar changes to the last committed value', () => {
    const { script, tick } = liveScript('var float total = 0\ntotal += close\nplot(total, "value")');
    expect(tick(0, 8).get('value')).toBe(8);
    const committed = script.save();
    expect(tick(1, 100, true).get('value')).toBe(108);
    script.restore(committed);
    expect(tick(1, -3, true).get('value')).toBe(5);
  });

  // Reference: varip Remarks explicitly eliminate rollback.
  // Red proof varip: restore varip alongside var; failed/restored/passed.
  it('varip keeps intrabar changes through rollback', () => {
    const { script, tick } = liveScript('varip float total = 0\ntotal += close\nplot(total, "value")');
    expect(tick(0, 8).get('value')).toBe(8);
    const committed = script.save();
    expect(tick(1, 100, true).get('value')).toBe(108);
    script.restore(committed);
    expect(tick(1, -3, true).get('value')).toBe(105);
  });

  // Reference: var, [], varip rollback Remarks; supporting execution model commit.
  // Red proof: ValueSeries.restore omits restoring head; failed/restored/passed.
  it('rollback then commit stores only the final realtime value in history', () => {
    const { script, tick } = liveScript('x = close\nplot(x[1], "previous")\nplot(x, "current")');
    tick(0, 8);
    const committed = script.save();
    tick(1, 100, true);
    script.restore(committed);
    const settled = tick(1, -3, true);
    expect(settled.get('previous')).toBe(8);
    expect(settled.get('current')).toBe(-3);
    expect(tick(2, 12).get('previous')).toBe(-3);
  });

  // Reference: [] and max_bars_back; supporting historical-buffer limits.
  // Red proof: NumericSeries ring get reads head instead of head+offset;
  // failed/restored/passed. Multiple wraps and zero/negative data reject stale slots.
  it('bounded history retains the correct prior values after ring eviction', () => {
    const { tick } = liveScript('plot(close[2], "value")', 2);
    const samples = [8, -3, 12, 0, -7, 19, -2, 4];
    expect(samples.map((close, index) => tick(index, close).get('value'))).toEqual([NaN, NaN, 8, -3, 12, 0, -7, 19]);
  });

  // Reference: max_bars_back buffer sizing and []; supporting error docs explain
  // that realtime buffers cannot grow after historical sizing.
  // Red proof: NumericSeries.get drops maxOffset check; failed/restored/passed.
  it('realtime history cannot resize a declared buffer on demand', () => {
    const { tick } = liveScript('offset = barstate.isrealtime ? 3 : 1\nplot(close[offset], "value")', 2);
    tick(0, 8); tick(1, -3); tick(2, 12);
    expect(() => tick(3, -7, true)).toThrow(/Historical offset 3 exceeds max_bars_back 2/);
  });

  // Reference: fixnan nearest previous non-na series value, plus varip rollback
  // Remarks as the documented contrast; each textual call owns separate state.
  // Red proof: generated fixnan restoration omitted; failed/restored/passed.
  it('fixnan call sites stay separate and discard intrabar remembered samples', () => {
    const { script, tick } = liveScript('a = fixnan(close)\nb = fixnan(-close)\nplot(a, "a")\nplot(b, "b")');
    const initial = tick(0, 8);
    expect([initial.get('a'), initial.get('b')]).toEqual([8, -8]);
    const committed = script.save();
    tick(1, 100, true);
    script.restore(committed);
    const missing = tick(1, NaN, true);
    expect([missing.get('a'), missing.get('b')]).toEqual([8, -8]);
    const recovery = tick(2, -3);
    expect([recovery.get('a'), recovery.get('b')]).toEqual([-3, 3]);
  });
});
