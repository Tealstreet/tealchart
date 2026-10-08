import type { CompiledBarContext } from '../../src/runtime/codegen/compile';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { ARRAY_HELPERS, compile, MAP_HELPERS, MATRIX_HELPERS, UDT_HELPERS } from '../../src/runtime/codegen/compile';
import { HistoryBufferSizing } from '../../src/runtime/codegen/history';
import { divideV5ConstInts } from '../../src/runtime/codegen/runtime';
import * as ta from '../../src/runtime/codegen/ta-classes';

// Execution-model time series commit the final value of each bar; [] reads prior bars.
// Small max_bars_back forces repeated ring wrap before subsequent assignments.
function liveScript(body: string, maxBarsBack = 4) {
  const compiled = compile(parse(`//@version=6\nindicator("State contract")\n${body}`), maxBarsBack);
  expect(compiled.success).toBe(true);
  const script = new compiled.ScriptClass({
    ...new HistoryBufferSizing(maxBarsBack, maxBarsBack).dependencies(maxBarsBack, () => false),
    constIntDivide: divideV5ConstInts,
    maxBarsBack,
    _arr: ARRAY_HELPERS,
    _map: MAP_HELPERS,
    _mtx: MATRIX_HELPERS,
    _udt: UDT_HELPERS,
    ...ta,
  });
  const output = new Map<string, unknown>();
  function tick(index: number, close: number, realtime = false) {
    output.clear();
    const context: Partial<CompiledBarContext> = {
      bar: { close, open: 1, high: Math.max(close, 1), low: Math.min(close, 1), volume: 100, time: index * 60_000 },
      barIndex: index,
      lastBarIndex: index,
      // Each rollback restores the PREVIOUS closed bar, so the opened bar needs
      // a fresh storage slot even when this is its second market update.
      isFirstTick: true,
      barstate: {
        isfirst: index === 0,
        islast: true,
        ishistory: !realtime,
        isrealtime: realtime,
        isnew: !realtime,
        isconfirmed: !realtime,
        islastconfirmedhistory: !realtime,
      },
      syminfo: {},
      timeframe: {},
      chart: {},
      plot(_index, _function, _callIndex, value, named, extraArgs) {
        output.set(named.title ?? String(extraArgs[0]), value);
      },
      drawingCount() {
        return 0;
      },
      markDrawingsPersistentFrom() {},
      markPersistentRuntimeValue() {},
    };
    script.onBar(context as CompiledBarContext);
    return new Map(output);
  }
  return { script, tick };
}

describe('same-bar history writes after ring wrap', () => {
  it('multiple writes replace the current slot without shifting previous bars', () => {
    const { tick } = liveScript(
      'float value = close\nvalue += 1\nvalue += 2\nplot(value, "current")\nplot(value[1], "previous")\nplot(value[2], "older")',
      2,
    );
    const samples = [8, -3, 12, 0, -7, 19, -2, 4];
    const rows = samples.map((close, index) => {
      const plots = tick(index, close);
      return ['current', 'previous', 'older'].map((name) => plots.get(name));
    });
    expect(rows).toEqual([
      [11, NaN, NaN],
      [0, 11, NaN],
      [15, 0, 11],
      [3, 15, 0],
      [-4, 3, 15],
      [22, -4, 3],
      [1, 22, -4],
      [7, 1, 22],
    ]);
  });
});
