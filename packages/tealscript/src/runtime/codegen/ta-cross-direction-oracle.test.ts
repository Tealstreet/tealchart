import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import { Cross, Crossover, Crossunder, Falling, Rising } from './ta-classes';

// Small hand-built examples of the state transitions observed in TradingView's
// v6 na-holes-crosses capture. No captured prices or CSV fixtures are imported.
describe('TradingView cross and consecutive-direction semantics', () => {
  it.each([
    ['crossover', Crossover, [0, 0, 1, 0, 0, 0, 0]],
    ['crossunder', Crossunder, [0, 0, 0, 0, 1, 0, 1]],
    ['cross', Cross, [0, 0, 1, 0, 1, 0, 1]],
  ] as const)('%s retains the last complete pair across holes in either operand', (_name, Type, expected) => {
    const instance = new Type();
    const a = [0, NaN, 1, 5, -1, 0, -1];
    const b = [0, 0, 0, NaN, 0, 0, 0];
    expect(a.map((value, i) => Number(instance.compute(value, b[i])))).toEqual(expected);
  });

  it.each([Crossover, Crossunder, Cross])('restores cross state before replacing a missing bar', (Type) => {
    const instance = new Type();
    instance.compute(0, 0);
    instance.compute(NaN, 0);
    const saved = instance.save();
    expect(instance.compute(1, 0)).toBe(Type !== Crossunder);
    instance.restore(saved);
    expect(instance.compute(-1, 0)).toBe(Type !== Crossover);
    expect(instance.recompute(1, NaN)).toBe(false);
    expect(instance.recompute(1, 0)).toBe(Type !== Crossunder);
  });

  it.each([
    ['rising', Rising, [-1, -2, -1, 0, 1, 2, NaN, NaN, 3, 2, 1, 0]],
    ['falling', Falling, [1, 2, 1, 0, -1, -2, NaN, NaN, -3, -2, -1, 0]],
  ] as const)('%s counts strict adjacent changes and holds through missing comparisons', (_name, Type, source) => {
    const instance = new Type(3);
    expect(source.map(value => Number(instance.compute(value))))
      .toEqual([0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0]);
  });

  it.each([Rising, Falling])('resets direction on equality and restores counters for recompute', (Type) => {
    const instance = new Type(2);
    const sign = Type === Rising ? 1 : -1;
    instance.compute(0);
    instance.compute(sign);
    const saved = instance.save();
    expect(instance.compute(2 * sign)).toBe(true);
    expect(instance.recompute(sign)).toBe(false);
    expect(instance.recompute(NaN)).toBe(false);
    instance.restore({ ...saved, length: 2 });
    expect(instance.compute(2 * sign)).toBe(true);
    expect(instance.compute(NaN)).toBe(true);
    expect(instance.compute(3 * sign)).toBe(true);
    expect(instance.compute(3 * sign)).toBe(false);
  });

  it('uses the corrected state through compiled builtin calls', () => {
    const closes = [-1, -2, -1, 0, 1, 2, 3, 4, 5];
    const bars = closes.map((close, i) => ({ time: i * 60000, open: 0, high: 6, low: -3, close, volume: 1 }));
    const result = executeScript(parse(`//@version=6
indicator("small cross and direction oracle")
source = bar_index == 6 ? na : close
level = bar_index == 3 ? na : open
plot(ta.crossover(source, level) ? 1 : 0, "up")
plot(ta.crossunder(source, level) ? 1 : 0, "down")
plot(ta.cross(source, level) ? 1 : 0, "either")
plot(ta.rising(source, 3) ? 1 : 0, "rising")
plot(ta.falling(-source, 3) ? 1 : 0, "falling")`), bars);
    expect(result.errors).toEqual([]);
    const values = Object.fromEntries(result.plots.map(plot => [plot.title, plot.values]));
    expect(values.up).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 0]);
    expect(values.down).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(values.either).toEqual(values.up);
    expect(values.rising).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 1]);
    expect(values.falling).toEqual(values.rising);
  });
});
