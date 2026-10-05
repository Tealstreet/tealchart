import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import type { SourceSeriesSMA } from './sma-source-history';
import { SMA } from './ta-classes';

const bars = Array.from({ length: 600 }, (_, index) => ({ time: index * 60000, open: 1, high: 1, low: 1, close: index + 1, volume: 1 }));

describe('fixed-length compiled SMA history', () => {
  it.each([
    ['input', 'length = input.int(20)'],
    ['simple', 'f(simple int n) => n\nlength = f(input.int(20))'],
    ['literal', 'length = 20'],
  ])('retains only the fixed %s window and no full before-current arrays', (_, declaration) => {
    const instances: SourceSeriesSMA[] = [];
    const original = SMA.sourceHistory;
    const factory = vi.spyOn(SMA, 'sourceHistory').mockImplementation((...args) => {
      const instance = original(...args);
      instances.push(instance);
      return instance;
    });
    try {
      const result = executeScript(parse(`//@version=6
indicator("Fixed SMA history")
${declaration}
plot(ta.sma(close, length))`), bars);
      expect(result.errors).toEqual([]);
      expect(result.plots[0].values.at(-1)).toBe(590.5);
      expect(instances).toHaveLength(1);
      const snapshot = instances[0].save();
      expect(snapshot.state.raw).toHaveLength(21);
      expect(snapshot.state.realized).toHaveLength(21);
      expect(snapshot.beforeCurrent).toBeNull();
    } finally {
      factory.mockRestore();
    }
  });


  it('restores fixed windows exactly after eviction, missing samples and repeated realtime replacements', () => {
    const fixed = SMA.sourceHistory(0, true);
    const dynamic = SMA.sourceHistory(501);
    const samples: number[] = [];
    const series = { get length() { return samples.length; }, get: (offset: number) => samples[samples.length - 1 - offset] };
    for (let index = 0; index < 80; index++) {
      const fixedCommitted = fixed.save();
      const dynamicCommitted = dynamic.save();
      samples.push(index % 7 === 0 ? NaN : Math.sin(index / 3) * 100 + index);
      expect(fixed.compute(series, 20, index)).toBe(dynamic.compute(series, 20, index));
      const close = samples[index];
      for (const replacement of [1234567.89, NaN, close, close]) {
        samples[index] = replacement;
        expect(fixed.compute(series, 20, index)).toBe(dynamic.compute(series, 20, index));
      }
      fixed.restore(fixedCommitted);
      dynamic.restore(dynamicCommitted);
      expect(fixed.compute(series, 20, index)).toBe(dynamic.compute(series, 20, index));
    }
  });

  it('keeps expanded source history for a genuinely series length', () => {
    const instances: SourceSeriesSMA[] = [];
    const original = SMA.sourceHistory;
    const factory = vi.spyOn(SMA, 'sourceHistory').mockImplementation((...args) => {
      const instance = original(...args);
      instances.push(instance);
      return instance;
    });
    try {
      const result = executeScript(parse(`//@version=6
indicator("Series SMA history")
length = bar_index % 2 == 0 ? 20 : 40
plot(ta.sma(close, length))`), bars);
      expect(result.errors).toEqual([]);
      expect(instances[0].save().state.raw).toHaveLength(501);
      expect(instances[0].save().beforeCurrent).not.toBeNull();
    } finally {
      factory.mockRestore();
    }
  });
});
