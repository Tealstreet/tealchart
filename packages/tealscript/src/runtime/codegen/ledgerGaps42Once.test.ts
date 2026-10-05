import type { CompiledBarContext } from './compile';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { ARRAY_HELPERS, compile, MAP_HELPERS, MATRIX_HELPERS, UDT_HELPERS } from './compile';
import { HistoryBufferSizing } from './history';
import { divideV5ConstInts } from './runtime';
import * as ta from './ta-classes';

describe('ledger row1678 once state at compiled rollback boundaries', () => {
  it('reconsiders open-bar activation and retains closing-bar deactivation', () => {
    // kw_once: an open-bar execution rolls back; closing execution deactivates it.
    // This exercises the compiled save/restore API, not a captured host tick stream.
    const compiled = compile(
      parse(`//@version=6
indicator("Once rollback")
var int count = 0
once close > 10
    count += 1
plot(count)`),
    );
    if (!compiled.success) throw new Error(compiled.unsupported.join(', '));
    const instance = new compiled.ScriptClass({
      ...new HistoryBufferSizing(10, 10).dependencies(10, () => false),
      constIntDivide: divideV5ConstInts,
      maxBarsBack: 10,
      _arr: ARRAY_HELPERS,
      _map: MAP_HELPERS,
      _udt: UDT_HELPERS,
      _mtx: MATRIX_HELPERS,
      ...ta,
    });
    const observed: unknown[] = [];
    const tick = (barIndex: number, close: number, confirmed: boolean) => {
      const context: Partial<CompiledBarContext> = {
        bar: { open: close, high: close, low: close, close, volume: 1, time: barIndex * 60_000 },
        barIndex,
        lastBarIndex: barIndex,
        isFirstTick: true,
        barstate: {
          isfirst: barIndex === 0,
          islast: true,
          ishistory: barIndex === 0,
          isrealtime: barIndex > 0,
          isnew: true,
          isconfirmed: confirmed,
          islastconfirmedhistory: barIndex === 0,
        },
        syminfo: {},
        timeframe: {},
        chart: {},
        drawingCount() {
          return 0;
        },
        markDrawingsPersistentFrom() {},
        markPersistentRuntimeValue() {},
        plot(_index: number, _name: string, _callIndex: number, value: unknown) {
          observed.push(value);
        },
      };
      instance.onBar(context as CompiledBarContext);
    };

    tick(0, 5, true);
    const committed = instance.save();
    tick(1, 11, false);
    instance.restore(committed);
    tick(1, 9, false);
    instance.restore(committed);
    tick(1, 12, true);
    const closed = instance.save();
    instance.restore(closed);
    tick(2, 13, false);
    expect(observed).toEqual([0, 1, 0, 1, 1]);
  });
});
