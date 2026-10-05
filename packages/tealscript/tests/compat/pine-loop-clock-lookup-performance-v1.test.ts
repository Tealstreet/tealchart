import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';

describe('loop clock lookup cost', () => {
  it.each([
    ['for i = 1 to 2000', 35],
    ['while count < 2000', 35],
    ['for value in array.new<int>(2000, 1)', 35],
    ['for [index, value] in array.new<int>(2000, 1)', 35],
  ] as const)('resolves the host clock once per execution: %s', (header, clockReads) => {
    const clock = performance;
    const now = vi.spyOn(clock, 'now').mockReturnValue(0);
    const lookup = vi.spyOn(globalThis, 'performance', 'get').mockReturnValue(clock);
    try {
      const execution = executeCompiledScript(
        parse(`//@version=6
indicator("Clock lookup")
count = 0
${header}
    count += 1
plot(count)`),
        [{ time: 60_000, open: 10, high: 11, low: 9, close: 10, volume: 100 }],
      );
      expect(execution.status).toBe('success');
      if (execution.status !== 'success') throw new Error(execution.reason);
      expect(execution.result.errors).toEqual([]);
      expect(execution.result.plots[0].values).toEqual([2000]);
      expect(lookup.mock.calls.length).toBeLessThan(20);
      expect(now.mock.calls.length).toBe(clockReads);
    } finally {
      lookup.mockRestore();
      now.mockRestore();
    }
  });
});
