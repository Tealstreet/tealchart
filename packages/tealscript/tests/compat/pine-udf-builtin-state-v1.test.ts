import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { compile, ARRAY_HELPERS, MAP_HELPERS, MATRIX_HELPERS, UDT_HELPERS, type CompiledBarContext } from '../../src/runtime/codegen/compile';
import * as runtimeDependencies from '../../src/runtime/codegen';
import { divideV5ConstInts } from '../../src/runtime/codegen/runtime';
import { HistoryBufferSizing } from '../../src/runtime/codegen/history';
import type { Bar } from '../../src/runtime/context';
import { getPlot, runCompatScript } from './fixtures';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json.
// Each written UDF call owns independent history: language/user-defined-functions/#scope-of-a-function-call.
const bars: Bar[] = [8, -3, 12, 0, -7].map((close, index) => ({
  time: index * 60_000, open: 1, high: Math.max(1, close), low: Math.min(1, close), close, volume: 100,
}));

function run(body: string) {
  const result = runCompatScript(`//@version=6\nindicator("UDF builtin state")\n${body}`, { bars });
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  return result;
}

describe('stateful builtins in independent nested UDF calls', () => {
  // Reference math.sum: rolling sum of the last length non-na observations.
  // Proof: unchanged master and unscoped-ID mutant failed; restored implementation passed.
  it.each([
    ['positional', 'math.sum(x, 3)'],
    ['named', 'math.sum(source=x, length=3)'],
  ])('%s math.sum keeps each outer call history separate', (_label, expression) => {
    const result = run(`inner(float x) => ${expression}\nouter(float x) => inner(x)\nplot(outer(close), "a")\nplot(outer(100 - close), "b")`);
    expect(getPlot(result, 'a').values).toEqual([null, null, 17, 9, 5]);
    expect(getPlot(result, 'b').values).toEqual([null, null, 283, 291, 295]);
  });

  // Reference fixnan: nearest previous non-na value; different hole streams reject shared memory.
  // Proof: unchanged master and shared-memory mutant failed; restored implementation passed.
  it('fixnan remembers values separately across nested callers', () => {
    const result = run(`inner(float x) => fixnan(x)\nouter(float x) => inner(x)\na = bar_index == 0 ? 8 : bar_index == 3 ? -2 : na\nb = bar_index == 0 ? 50 : na\nplot(outer(a), "a")\nplot(outer(b), "b")`);
    expect(getPlot(result, 'a').values).toEqual([8, 8, 8, -2, -2]);
    expect(getPlot(result, 'b').values).toEqual([50, 50, 50, 50, 50]);
  });

  // Reference math.random seed: repeated seed produces a repeatable sequence, not an exact RNG oracle.
  // Proof: unchanged master and unscoped-ID mutant failed; restored implementation passed.
  it('seeded random callers each advance their own sequence', () => {
    const result = run('inner() => math.random(0, 1, 17)\nouter() => inner()\nplot(outer(), "a")\nplot(outer(), "b")');
    const a = getPlot(result, 'a').values;
    expect(a.every((value) => value !== null && value >= 0 && value < 1)).toBe(true);
    expect(new Set(a).size).toBeGreaterThan(1);
    expect(getPlot(result, 'b').values).toEqual(a);
  });

  // Official TradingView/ta/14 kama export; each written UDF call owns independent history.
  // Source: https://www.tradingview.com/script/BICzyhq0-ta/.
  // Proof: unscoped-ID mutant failed; restored implementation passed.
  it('official library kama callers match independent global calls', () => {
    const result = run('import TradingView/ta/14 as tvta\ninner(float x) => tvta.kama(x, 2, 2, 3)\nouter(float x) => inner(x)\nplot(tvta.kama(close, 2, 2, 3), "first")\nplot(tvta.kama(100 - close, 2, 2, 3), "second")\nplot(outer(close), "a")\nplot(outer(100 - close), "b")');
    expect(getPlot(result, 'a').values).toEqual(getPlot(result, 'first').values);
    expect(getPlot(result, 'b').values).toEqual(getPlot(result, 'second').values);
  });

  // Reference fixnan and varip rollback Remarks; root and nested UDF memory must snapshot independently.
  // Proof: omitting root fixnan snapshot failed; restored implementation passed.
  it('fixnan UDF memory survives rollback of an unconfirmed update', () => {
    for (const caller of ['outer', 'inner']) {
      const compiled = compile(parse(`//@version=6\nindicator("Rollback")\ninner(float x) => fixnan(x)\nouter(float x) => inner(x)\nplot(${caller}(close), "a")\nplot(${caller}(-close), "b")`), 4);
      expect(compiled.success).toBe(true);
      const script = new compiled.ScriptClass({ ...runtimeDependencies,
        ...new HistoryBufferSizing(4, 4).dependencies(4, () => false), constIntDivide: divideV5ConstInts, maxBarsBack: 4,
        _arr: ARRAY_HELPERS, _map: MAP_HELPERS, _mtx: MATRIX_HELPERS, _udt: UDT_HELPERS });
      const output = new Map<string, unknown>();
      const tick = (index: number, close: number) => {
        output.clear();
        const context: Partial<CompiledBarContext> = {
          bar: { ...bars[index], close }, barIndex: index, lastBarIndex: index, isFirstTick: true,
          plot(_index, _name, _callIndex, value, named, extraArgs) { output.set(named.title ?? String(extraArgs[0]), value); },
        };
        script.onBar(context as CompiledBarContext);
        return [output.get('a'), output.get('b')];
      };
      expect(tick(0, 8)).toEqual([8, -8]);
      const committed = script.save();
      expect(tick(1, 100)).toEqual([100, -100]);
      script.restore(committed);
      expect(tick(1, NaN)).toEqual([8, -8]);
    }
  });
});
