import type { CompiledBarContext } from '../../src/runtime/codegen/compile';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { ARRAY_HELPERS, compile, MAP_HELPERS, MATRIX_HELPERS, UDT_HELPERS } from '../../src/runtime/codegen/compile';
import { HistoryBufferSizing } from '../../src/runtime/codegen/history';
import { divideV5ConstInts } from '../../src/runtime/codegen/runtime';
import * as ta from '../../src/runtime/codegen/ta-classes';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Official v6 ROC/change references use source[length] with series-int length.
// Changing the offset must not change which physical source bars are recorded.
const source = `src = switch bar_index
    0 => 10.0
    1 => 20.0
    2 => float(na)
    3 => 40.0
    4 => 50.0
    => 60.0
length = 2 + bar_index % 2`;

const calls = [
  ['roc', 'ta.roc(src, length)', '100 * (src - src[length]) / src[length]', [null, null, null, 300, null, null]],
  ['change', 'ta.change(src, length)', 'src - src[length]', [null, null, null, 30, null, null]],
] as const;

describe('dynamic ROC/change physical source history', () => {
  it.each(calls)('uses raw endpoints for %s', (_name, call, oracle, expected) => {
    const result = runCompatScript(
      `//@version=6
indicator("Dynamic lag")
${source}
plot(${call}, "VALUE")
plot(${oracle}, "REFERENCE")`,
      { bars: compatibilityBars.slice(0, 6) },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'VALUE').values).toEqual(expected);
    expect(getPlot(result, 'VALUE').values).toEqual(getPlot(result, 'REFERENCE').values);
  });

  it.each(calls)('keeps two UDF call histories independent for %s', (name, _call, oracle) => {
    const result = runCompatScript(
      `//@version=6
indicator("Scoped dynamic lag")
f(float src, int length) => ta.${name}(source=src, length=length)
${source}
plot(f(src, length), "A")
plot(f(src + 100, length), "B")
plot(${oracle}, "A_REFERENCE")
shifted = src + 100
plot(${oracle.replaceAll('src', 'shifted')}, "B_REFERENCE")`,
      { bars: compatibilityBars.slice(0, 6) },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'A').values).toEqual(getPlot(result, 'A_REFERENCE').values);
    expect(getPlot(result, 'B').values).toEqual(getPlot(result, 'B_REFERENCE').values);
  });

  it('retains dynamic boolean-change comparison', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Boolean lag")
src = bar_index % 3 == 1
length = 1 + bar_index % 2
plot(ta.change(src, length) ? 1 : 0, "CHANGE")`,
      { bars: compatibilityBars.slice(0, 6) },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'CHANGE').values).toEqual([0, 0, 1, 1, 1, 0]);
  });

  it('keeps ROC zero-denominator publication missing', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Zero lag")
src = bar_index == 0 ? 0.0 : 10.0
length = 1 + bar_index % 2
plot(ta.roc(src, length), "ROC")`,
      { bars: compatibilityBars.slice(0, 4) },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'ROC').values).toEqual([null, null, 0, 0]);
  });

  it.each(['root', 'scoped'])('replaces same-bar samples and restores %s history', (scope) => {
    const wrapper = scope === 'scoped' ? 'f(float src, int length) => [ta.roc(src,length), ta.change(src,length)]' : '';
    const value = scope === 'scoped' ? 'f(close,length)' : '[ta.roc(close,length), ta.change(close,length)]';
    const compiled = compile(
      parse(`//@version=6
indicator("Lag rollback")
${wrapper}
length = 1 + bar_index % 2
[r,c] = ${value}
plot(r)
plot(c)`),
      50,
    );
    expect(compiled.success).toBe(true);
    const script = new compiled.ScriptClass({
      ...new HistoryBufferSizing(50, 50).dependencies(50, () => false),
      maxBarsBack: 50,
      constIntDivide: divideV5ConstInts,
      _arr: ARRAY_HELPERS,
      _map: MAP_HELPERS,
      _mtx: MATRIX_HELPERS,
      _udt: UDT_HELPERS,
      ...ta,
    });
    const tick = (barIndex: number, close: number, isFirstTick = true) => {
      const values: unknown[] = [];
      const ctx: Partial<CompiledBarContext> = {
        bar: { ...compatibilityBars[barIndex], close },
        barIndex,
        lastBarIndex: barIndex,
        isFirstTick,
        barstate: {
          isfirst: barIndex === 0,
          islast: true,
          ishistory: true,
          isrealtime: false,
          isnew: isFirstTick,
          isconfirmed: true,
          islastconfirmedhistory: true,
        },
        syminfo: {},
        timeframe: {},
        chart: {},
        plot(index, _function, _call, output) {
          values[index] = typeof output === 'number' && Number.isNaN(output) ? null : output;
        },
      };
      script.onBar(ctx as CompiledBarContext);
      return values;
    };
    expect(tick(0, 10)).toEqual([null, null]);
    expect(tick(1, 20)).toEqual([null, null]);
    const snapshot = script.save();
    expect(tick(2, 30)).toEqual([50, 10]);
    expect(tick(2, 40, false)).toEqual([100, 20]);
    expect(tick(3, 50)).toEqual([150, 30]);
    script.restore(snapshot);
    expect(tick(2, 60)).toEqual([200, 40]);
    expect(tick(3, 70)).toEqual([250, 50]);
  });
});
