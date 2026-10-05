import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';

const bars = Array.from({ length: 2 }, (_, index) => ({ time: index * 60000, open: 1, high: 1, low: 1, close: 1, volume: 1 }));

describe('sampled loop deadline clock', () => {
  it.each([
    ['for i = 1 to 12001', 380],
    ['while count < 12001', 380],
    ['for value in array.new<int>(12001, 1)', 380],
    ['for [index, value] in array.new<int>(12001, 1)', 380],
  ] as const)('bounds clock reads across bars: %s', (header, clockReads) => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    try {
      const execution = executeCompiledScript(parse(`//@version=6
indicator("Sampled clock")
count = 0
${header}
    count += 1
plot(count)`), bars);
      expect(execution.status).toBe('success');
      if (execution.status !== 'success') throw new Error(execution.reason);
      expect(execution.result.errors).toEqual([]);
      expect(execution.result.plots[0].values).toEqual([12001, 12001]);
      expect(now.mock.calls.length).toBe(clockReads);
    } finally {
      now.mockRestore();
    }
  });

  it('preserves descending integer history loops and rejects a reassigned negative index', () => {
    const data = [1, 2, 3].map((close, index) => ({ ...bars[0], time: index * 60000, close }));
    const descending = executeCompiledScript(parse(`//@version=6
indicator("Descending history")
float total = 0
for i = 2 to 0
    total += nz(close[i])
plot(total)`), data);
    expect(descending.status).toBe('success');
    if (descending.status !== 'success') throw new Error(descending.reason);
    expect(descending.result.errors).toEqual([]);
    expect(descending.result.plots[0].values).toEqual([1, 3, 6]);
    const changed = executeCompiledScript(parse(`//@version=6
indicator("Changed history counter")
float total = 0
for i = 0 to 2
    if i == 1
        i := -1
    total += nz(close[i])
plot(total)`), data);
    expect(changed.status).toBe('success');
    if (changed.status !== 'success') throw new Error(changed.reason);
    expect(changed.result.errors[0]?.message).toContain('Historical offset -1 is invalid');
  });
  it.each([
    'for total = 0 to 2\n    total += 1',
    'for i = 0 to 2\n    for total = 0 to 2\n        total += 1',
  ])('preserves a global shadowed by a loop counter: %s', (loop) => {
    const execution = executeCompiledScript(parse(`//@version=6
indicator("Counter shadow")
float total = 407
${loop}
plot(total)`), bars);
    expect(execution.status).toBe('success');
    if (execution.status !== 'success') throw new Error(execution.reason);
    expect(execution.result.errors).toEqual([]);
    expect(execution.result.plots[0].values).toEqual([407, 407]);
  });

});
