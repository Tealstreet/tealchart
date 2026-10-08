import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { ARRAY_HELPERS, compile, MAP_HELPERS, MATRIX_HELPERS, type CompiledBarContext, UDT_HELPERS } from '../../src/runtime/codegen/compile';
import { HistoryBufferSizing } from '../../src/runtime/codegen/history';
import { divideV5ConstInts } from '../../src/runtime/codegen/runtime';
import * as ta from '../../src/runtime/codegen/ta-classes';
import { getPlot, runCompatScript } from './fixtures';

// Authority: Pine v6 series-length signatures and equivalent formulas.
const closes = [2, 5, 3, 9, 4, 12, 6, 15, 8, 16, 7, 20, 11, 23, 9, 27, 14, 30, 18, 33];
const opens = closes.map((_, i) => i % 3 === 0 ? i + 3 : i % 3 === 1 ? i + 7 : i + 1);
const bars = closes.map((close, i) => ({ time: 1700000000000 + i * 60000, open: opens[i]!, high: close + 2, low: close - 2, close, volume: 100 }));
const names = ['alma', 'bb', 'bbw', 'cci', 'cmo', 'cog', 'correlation'] as const;
type Name = typeof names[number];

function expected(name: Name, index: number, n: number): number | null {
  const q = closes.slice(Math.max(0, index + 1 - n), index + 1);
  if (q.length < n || (name === 'cmo' && index < n)) return null;
  const mean = q.reduce((sum, value) => sum + value, 0) / n;
  if (name === 'bb') return mean;
  if (name === 'bbw') return 400 * Math.sqrt(q.reduce((sum, value) => sum + (value - mean) ** 2, 0) / n) / mean;
  if (name === 'cci') return (q[n - 1]! - mean) / (0.015 * q.reduce((sum, value) => sum + Math.abs(value - mean), 0) / n);
  if (name === 'cog') return -q.reduce((sum, value, i) => sum + value * (n - i), 0) / q.reduce((sum, value) => sum + value, 0);
  if (name === 'alma') {
    const weights = q.map((_, i) => Math.exp(-((i - 0.65 * (n - 1)) ** 2) / (2 * (n / 3) ** 2)));
    return q.reduce((sum, value, i) => sum + value * weights[i]!, 0) / weights.reduce((sum, value) => sum + value, 0);
  }
  if (name === 'correlation') {
    const right = opens.slice(index + 1 - n, index + 1);
    const rightMean = right.reduce((sum, value) => sum + value, 0) / n;
    return q.reduce((sum, value, i) => sum + (value - mean) * (right[i]! - rightMean), 0)
      / Math.sqrt(q.reduce((sum, value) => sum + (value - mean) ** 2, 0) * right.reduce((sum, value) => sum + (value - rightMean) ** 2, 0));
  }
  const changes = closes.slice(index + 1 - n, index + 1).map((value, i) => value - closes[index - n + i]!);
  const gains = changes.reduce((sum, value) => sum + Math.max(value, 0), 0);
  const losses = changes.reduce((sum, value) => sum + Math.max(-value, 0), 0);
  return gains + losses === 0 ? null : 100 * (gains - losses) / (gains + losses);
}

function call(name: Name, named: boolean): string {
  const sourceName = name === 'cci' || name === 'cog' ? 'source' : 'series';
  if (name === 'correlation') return named ? 'ta.correlation(length=n, source2=other, source1=src)' : 'ta.correlation(src, other, n)';
  if (name === 'alma') return named ? 'ta.alma(sigma=3, length=n, series=src, offset=0.65)' : 'ta.alma(src, n, 0.65, 3)';
  if (name === 'bb' || name === 'bbw') return named ? `ta.${name}(mult=2, length=n, series=src)` : `ta.${name}(src, n, 2)`;
  return named ? `ta.${name}(length=n, ${sourceName}=src)` : `ta.${name}(src, n)`;
}

describe('Series-length TA keeps intervening source samples', () => {
  for (const name of names) {
    it(`${name} preserves fixed input-length execution`, () => {
      const expression = call(name, false);
      const body = name === 'bb' ? `[m, u, l] = ${expression}\nplot(m, "value")` : `plot(${expression}, "value")`;
      const source = `//@version=6\nindicator("Input window")\nsrc=close\nother=open\nn=input.int(3)\n${body}`;
      expect(compile(parse(source)).generatedCode).not.toContain('_historyTAFromSeries');
      const result = runCompatScript(source, { bars });
      expect(result.errors).toEqual([]);
      const values = getPlot(result, 'value').values;
      expect(values).toHaveLength(bars.length);
      values.forEach((value, index) => {
        const target = expected(name, index, 3);
        if (target === null) expect(value).toBeNull();
        else expect(value).toBeCloseTo(target, 9);
      });
    });
    for (const form of ['positional', 'named', 'function', 'growth'] as const) {
      it(`${name} retains source history for ${form} calls`, () => {
        const expression = call(name, form === 'named');
        const definition = form === 'function' ? `window(src, other, n) =>\n    ${expression}\n` : '';
        const selected = form === 'function' ? 'window(src, other, n)' : expression;
        const body = name === 'bb' ? `[m, u, l] = ${selected}\nplot(m, "value")\nplot(u, "upper")\nplot(l, "lower")` : `plot(${selected}, "value")`;
        const lengths = bars.map((_, i) => form === 'growth' ? (i < 10 ? 3 : 7) : (i % 2 === 0 ? 3 : 4));
        const length = form === 'growth' ? 'bar_index < 10 ? 3 : 7' : 'bar_index % 2 == 0 ? 3 : 4';
        const result = runCompatScript(`//@version=6\nindicator("Dynamic windows")\n${definition}src=close\nother=open\nn=${length}\n${body}`, { bars });
        expect(result.errors).toEqual([]);
        const values = getPlot(result, 'value').values;
        expect(values).toHaveLength(bars.length);
        values.forEach((value, i) => {
          const target = expected(name, i, lengths[i]!);
          if (target === null) expect(value, `bar${i}`).toBeNull();
          else expect(value, `bar${i}`).toBeCloseTo(target, 9);
        });
        if (name === 'bb') {
          for (const [title, direction] of [['upper', 1], ['lower', -1]] as const) {
            getPlot(result, title).values.forEach((value, i) => {
              const n = lengths[i]!;
              const basis = expected(name, i, n);
              if (basis === null) expect(value).toBeNull();
              else {
                const q = closes.slice(i + 1 - n, i + 1);
                const deviation = Math.sqrt(q.reduce((sum, sample) => sum + (sample - basis) ** 2, 0) / n);
                expect(value).toBeCloseTo(basis + direction * 2 * deviation, 9);
              }
            });
          }
        }
      });
    }
    for (const scoped of [false, true]) {
      it(`${name} replaces provisional samples and restores ${scoped ? 'function' : 'root'} snapshots`, () => {
        const expression = call(name, false);
        const definition = scoped ? `window(src, other, n) =>\n    ${expression}\n` : '';
        const selected = scoped ? 'window(src, other, n)' : expression;
        const body = name === 'bb' ? `[m, u, l] = ${selected}\nplot(m, "value")` : `plot(${selected}, "value")`;
        const compiled = compile(parse(`//@version=6\nindicator("Window rollback")\n${definition}src=close\nother=open\nn=bar_index % 2 == 0 ? 3 : 4\n${body}`));
        expect(compiled.success).toBe(true);
        const deps = { ...ta, constIntDivide: divideV5ConstInts, ...new HistoryBufferSizing(500, 500).dependencies(500, () => false), maxBarsBack: 500, _arr: ARRAY_HELPERS, _map: MAP_HELPERS, _udt: UDT_HELPERS, _mtx: MATRIX_HELPERS };
        const instance = new compiled.ScriptClass(deps);
        let output: unknown;
        const context = (index: number, close = closes[index]!, isFirstTick = true) => ({
          bar: { ...bars[index], close }, barIndex: index, lastBarIndex: bars.length - 1, isFirstTick,
          plot: (_index: number, _name: string, _call: number, value: unknown) => { output = value; },
          markPersistentRuntimeValue: () => {},
        } as unknown as CompiledBarContext);
        for (let index = 0; index < 8; index++) instance.onBar(context(index));
        const snapshot = instance.save();
        instance.onBar(context(8, 999));
        instance.onBar(context(8, closes[8], false));
        expect(output).toBeCloseTo(expected(name, 8, 3)!, 9);
        instance.restore(snapshot);
        instance.onBar(context(8));
        expect(output).toBeCloseTo(expected(name, 8, 3)!, 9);
        instance.onBar(context(9));
        expect(output).toBeCloseTo(expected(name, 9, 4)!, 9);
      });
    }
  }
});
