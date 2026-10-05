import { afterEach, describe, expect, it, vi } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';
import { PivotHigh, PivotLow } from './ta-classes';

const samples = [9, 6, 8, 5, 7, 4, 8, 3, 6, 3, 3, 7];
const bars = samples.map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close, high: close + 1, low: close - 1, close, volume: 100,
}));

function compile(body: string) {
  const compiled = tryCompile(parse(`//@version=6\nindicator("Pivot window", max_bars_back=100)\n${body}`));
  expect(compiled.success, compiled.unsupported.join('\n')).toBe(true);
  return compiled;
}

type WindowSource = { size: number; capacity: number; get(offset: number): unknown };
type WindowHelper = {
  _windowTAFromSeries(source: WindowSource, className: string, args: number[], barIndex: number): number;
};

const prototype = compile('plot(ta.pivothigh(close, bar_index % 2 + 1, 1))').ScriptClass.prototype as unknown as WindowHelper;
function windowValue(source: WindowSource, className: string, args: number[]) {
  return prototype._windowTAFromSeries.call({ _deps: { PivotHigh, PivotLow } } as unknown as WindowHelper, source, className, args, 10);
}

afterEach(() => vi.restoreAllMocks());

describe('dynamic Pivot windows avoid construction and sample replay', () => {
  for (const [name, Type] of [['pivothigh', PivotHigh], ['pivotlow', PivotLow]] as const) {
    it(`evaluates ${name} once from its compiled source window`, () => {
      const compiled = compile(`plot(ta.${name}(close, bar_index % 2 + 1, 1))`);
      const replay = vi.spyOn(Type.prototype, 'compute');
      const result = executeCompiled(compiled, bars);
      expect(result?.errors).toEqual([]);
      expect(result?.plots[0].values).toHaveLength(bars.length);
      expect(replay).not.toHaveBeenCalled();
    });
  }

  it('retains replay results for both tie directions, holes, zeros and changing strengths', () => {
    const windows = [[9, 9, 7, 6, 8], [7, 9, 9, 6, 8], [9, NaN, 7, 6, 8], [9, 8, NaN, 6, 8], [0, -0, 0, 1, -1]];
    for (const Type of [PivotHigh, PivotLow]) {
      const className = Type === PivotHigh ? 'PivotHigh' : 'PivotLow';
      for (const values of windows) {
        for (const [left, right] of [[0, 0], [1, 1], [2, 1], [1, 2], [4, 1], [-1, 2], [1.5, 1.5], [NaN, 1]]) {
          const instance = new Type(left, right);
          if (left < 0) {
            const error = expect.objectContaining({
              runtimeErrorCode: 'RE10001',
              message: `Invalid value of the 'leftbars' argument (${left}) in the '${className.toLowerCase()}' function. It must be >= 0.`,
            });
            expect(() => instance.compute(values[0]!)).toThrow(error);
            expect(() => windowValue({ size: values.length, capacity: values.length, get: (offset) => values[offset] }, className, [left, right])).toThrow(error);
            continue;
          }
          const n = Number(left) + Number(right) + 1;
          const selected = values.slice(0, Number.isNaN(n) ? 0 : Math.max(0, Math.ceil(n)));
          let expected = NaN;
          if (selected.length >= n) for (let i = selected.length - 1; i >= 0; i--) expected = instance.compute(selected[i]);
          expect(windowValue({ size: values.length, capacity: values.length, get: (offset) => values[offset] }, className, [left, right])).toEqual(expected);
        }
      }
    }
  });

  it('retains all guarded reads and conversions before rejecting the pivot', () => {
    const reads: number[] = [];
    const conversions: number[] = [];
    const values = [9, 1, 8, 7];
    const source = {
      size: values.length,
      capacity: values.length,
      get(offset: number) {
        reads.push(offset);
        return { valueOf() { conversions.push(offset); return values[offset]; } };
      },
    };
    expect(windowValue(source, 'PivotHigh', [2, 1])).toBeNaN();
    // 273bf40353 reserves the available capacity before converting pivot samples.
    expect(reads).toEqual([3, 0, 1, 2, 3]);
    expect(conversions).toEqual([0, 1, 2, 3]);
    const refusing = { size: 4, capacity: 4, get(offset: number) { if (offset === 3) throw new Error('Historical offset 3 exceeds max_bars_back 2'); return values[offset]; } };
    expect(() => windowValue(refusing, 'PivotLow', [2, 1])).toThrow('Historical offset 3 exceeds max_bars_back 2');
  });

  it('pins the existing asymmetric ties, missing-slot breaks and signed pivot zero', () => {
    const high = (values: number[], left = 2) => windowValue({ size: values.length, capacity: values.length, get: (offset) => values[offset] }, 'PivotHigh', [left, 1]);
    expect(high([9, 9, 7, 6])).toBeNaN();
    expect(high([7, 9, 9, 6])).toBe(9);
    expect(high([7, 9, NaN, 10])).toBe(9);
    expect(high([NaN, 9, 7, 6])).toBe(9);
    expect(high([7, NaN, 9, 6])).toBeNaN();
    expect(Object.is(high([-1, -0, 0], 1), -0)).toBe(true);
    expect(windowValue({ size: 4, capacity: 4, get: (offset) => [-7, -9, -9, -6][offset] }, 'PivotLow', [2, 1])).toBe(-9);
  });

  it('keeps fixed-strength snapshot and repeated recompute independent', () => {
    for (const Type of [PivotHigh, PivotLow]) {
      const instance = new Type(2, 1);
      for (const value of [4, 7, NaN, 8, 3, 6]) instance.compute(value);
      const snapshot = instance.save();
      const expected = instance.compute(9);
      instance.recompute(1);
      expect(instance.recompute(9)).toEqual(expected);
      instance.restore(snapshot);
      expect(instance.compute(9)).toEqual(expected);
    }
  });

  it('retains infinite-strength refusal before any guarded source read', () => {
    const get = vi.fn(() => 1);
    for (const className of ['PivotHigh', 'PivotLow']) {
      expect(() => windowValue({ size: 10, capacity: 10, get }, className, [Infinity, 1])).toThrow('Invalid typed array length: Infinity');
    }
    expect(get).not.toHaveBeenCalled();
  });
});
