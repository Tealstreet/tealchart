import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { ARRAY_HELPERS, compile, MAP_HELPERS, MATRIX_HELPERS, UDT_HELPERS, type CompiledBarContext } from '../../src/runtime/codegen/compile';
import * as dependencies from '../../src/runtime/codegen/index';
import { divideV5ConstInts } from '../../src/runtime/codegen/runtime';

// Conditional structures / once-on-the-realtime-bar: unconfirmed activation rolls back until close.
describe('once realtime rollback', () => {
  it('repeats open-tick side effects, commits at close, and stays inactive on the next bar', () => {
    const compiled = compile(parse(`//@version=6
indicator("Once rollback")
varip int activations = 0
once close > 30
    activations += 1
    log.info("activation")
plot(activations)`));
    expect(compiled.success, compiled.unsupported.join('; ')).toBe(true);
    const script = new compiled.ScriptClass({
      ...dependencies, constIntDivide: divideV5ConstInts, maxBarsBack: 500, historyCheck() {},
      _arr: ARRAY_HELPERS, _map: MAP_HELPERS, _mtx: MATRIX_HELPERS, _udt: UDT_HELPERS,
    });
    const plots: unknown[] = [];
    const logs: unknown[] = [];
    const tick = (barIndex: number, close: number, confirmed: boolean, first: boolean, historical = false) => {
      const context: Partial<CompiledBarContext> = {
        bar: { time: (barIndex + 1) * 60_000, open: close, high: close + 1, low: close - 1, close, volume: 100 },
        barIndex, lastBarIndex: barIndex, isFirstTick: first,
        barstate: { isfirst: barIndex === 0, islast: true, ishistory: historical, isrealtime: !historical,
          isnew: first, isconfirmed: confirmed, islastconfirmedhistory: historical },
        syminfo: {}, timeframe: {}, chart: {},
        plot(_index, _name, _call, value) { plots.push(value); },
        logInfo(args) { logs.push(args[0]); },
        drawingCount() { return 0; },
        markDrawingsPersistentFrom() {},
        markPersistentRuntimeValue() {},
      };
      script.onBar(context as CompiledBarContext);
    };
    tick(0, 10, true, true, true);
    tick(1, 20, true, true, true);
    const historical = script.save();
    tick(2, 31, false, true);
    script.restore(historical);
    tick(2, 32, false, false);
    script.restore(historical);
    tick(2, 33, true, false);
    const closing = script.save();
    script.restore(closing);
    tick(3, 40, false, true);

    expect(plots).toEqual([0, 0, 1, 2, 3, 3]);
    expect(logs).toEqual(['activation', 'activation', 'activation']);
  });
});
