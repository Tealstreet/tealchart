import { describe, expect, it } from 'vitest';

import { HistoryBufferSizing } from './history';

describe('guarded history dispatch across execution contexts', () => {
  it('reuses each history read target across independently constructed dependencies', () => {
    const numericTargets = new Set();
    const valueTargets = new Set();
    for (let context = 0; context < 12; context++) {
      const sizing = new HistoryBufferSizing();
      const deps = sizing.dependencies(499, () => false);
      const numeric = new deps.NumericSeries(500, 499, 'close');
      const value = new deps.ValueSeries(500, 499, 'local');
      numeric.push(context);
      value.push(`context-${context}`);
      numericTargets.add(numeric.get);
      valueTargets.add(value.get);
      expect(numeric.get(0)).toBe(context);
      expect(value.get(0)).toBe(`context-${context}`);
    }
    expect(numericTargets.size).toBe(1);
    expect(valueTargets.size).toBe(1);
  });

  it('keeps identical history keys isolated between sizing owners', () => {
    const small = new HistoryBufferSizing(0, 3);
    const large = new HistoryBufferSizing(0, 9);
    const smallDeps = small.dependencies(499, () => false);
    const largeDeps = large.dependencies(499, () => false);
    const first = new smallDeps.NumericSeries(500, 499, 'close');
    const second = new largeDeps.ValueSeries(500, 499, 'close');
    for (let index = 0; index < 10; index++) {
      first.push(index);
      second.push(`v${index}`);
    }
    expect(first.get(3)).toBe(6);
    expect(() => first.get(4)).toThrow('Historical offset 4 exceeds max_bars_back 3');
    expect(second.get(9)).toBe('v0');
    expect(small.maxBarsBack).toBe(3);
    expect(large.maxBarsBack).toBe(9);
  });

  it('retains the realtime callback attached to each dependency set', () => {
    const sizing = new HistoryBufferSizing();
    let realtime = false;
    const live = sizing.dependencies(499, () => realtime);
    const historical = sizing.dependencies(499, () => false);
    const numeric = new live.NumericSeries(500, 499, 'live');
    const value = new historical.ValueSeries(500, 499, 'historical');
    numeric.push(17);
    value.push('value');
    numeric.get(1);
    realtime = true;
    expect(() => numeric.get(2)).toThrow('Historical offset 2 exceeds max_bars_back 1');
    expect(value.get(100)).toBeNaN();
    expect(numeric.get(0)).toBe(17);
    expect(sizing.maxBarsBack).toBe(100);
  });

  it('restarts the growing owner and keeps another owner allocation independent', () => {
    const sizing = new HistoryBufferSizing();
    const other = new HistoryBufferSizing();
    const deps = sizing.dependencies(1, () => false);
    const otherDeps = other.dependencies(1, () => false);
    const untouched = new otherDeps.ValueSeries(2, 1, 'same-key');
    untouched.push('unchanged');
    let attempts = 0;
    const result = sizing.run(() => {
      attempts++;
      const series = new deps.NumericSeries(2, 1, 'same-key');
      for (let index = 0; index < 50; index++) series.push(index);
      return series.get(40);
    });
    expect(attempts).toBe(2);
    expect(result).toBe(9);
    expect(sizing.maxBarsBack).toBe(40);
    expect(untouched.get(0)).toBe('unchanged');
    // Confirmed bd5fdae6b2 reserves 244 discovery slots independently per owner.
    expect(untouched.capacity).toBe(244);
    expect(other.maxBarsBack).toBe(0);
  });

  it('normalizes repeated fractional offsets and still observes a realtime transition', () => {
    const sizing = new HistoryBufferSizing();
    let realtime = false;
    let callbacks = 0;
    const deps = sizing.dependencies(9, () => {
      callbacks++;
      return realtime;
    });
    const series = new deps.NumericSeries(10, 9, 'fractional');
    for (let index = 0; index < 10; index++) series.push(index);
    expect(series.get(4.9)).toBe(5);
    expect(series.get(3.9)).toBe(6);
    expect(series.get(-0.9)).toBe(9);
    expect(series.get(NaN)).toBeNaN();
    realtime = true;
    expect(series.get(4.9)).toBe(5);
    expect(() => series.get(5)).toThrow('Historical offset 5 exceeds max_bars_back 4');
    expect(callbacks).toBe(6);
    expect(sizing.maxBarsBack).toBe(4);
  });

  it('preserves offset coercion when an already-required range is read', () => {
    const sizing = new HistoryBufferSizing();
    const deps = sizing.dependencies(9, () => false);
    const series = new deps.ValueSeries(10, 9, 'coercion');
    for (let index = 0; index < 10; index++) series.push(`v${index}`);
    expect(series.get(4)).toBe('v5');
    let coercions = 0;
    const offset = {
      valueOf() {
        coercions++;
        return 2.9;
      },
    };
    expect(series.get(offset as unknown as number)).toBe('v7');
    // Discovery checking, the capacity guard and the underlying read coerce this object.
    expect(coercions).toBe(3);
    expect(sizing.maxBarsBack).toBe(4);
  });

  it('retains the discovery prefix in an old instance after a shared allocation grows', () => {
    const sizing = new HistoryBufferSizing();
    const deps = sizing.dependencies(1, () => false);
    let stale: InstanceType<typeof deps.ValueSeries> | undefined;
    let attempts = 0;
    const value = sizing.run(() => {
      attempts++;
      const series = new deps.ValueSeries(2, 1, 'shared');
      if (attempts === 1) stale = series;
      for (let index = 0; index < 60; index++) series.push(`v${index}`);
      return series.get(40);
    });
    expect(value).toBe('v19');
    expect(attempts).toBe(2);
    expect(stale?.get(40)).toBe('v19');
  });
});
