import { describe, expect, it, vi } from 'vitest';

import { createPineArray, getArrayValue, pushArrayValue } from './arrays';

describe('short-lived numeric array append cost', () => {
  it('keeps ten million append operations within the bounded CPU budget', () => {
    const getters = new Set();
    let size = 0;
    const start = process.cpuUsage();
    for (let batch = 0; batch < 2000; batch++) {
      const array = createPineArray<number>();
      getters.add(Object.getOwnPropertyDescriptor(array, 'values')?.get);
      for (let index = 0; index < 5000; index++) pushArrayValue(array, index + 0.1);
      size += array.values.length;
    }
    const cpu = process.cpuUsage(start);
    if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
      expect(cpu.user + cpu.system).toBeLessThan(800_000);
    }
    expect(size).toBe(10_000_000);
    expect(getters.size).toBe(1);
  });

  it('avoids hash lookups while appending to owning arrays', () => {
    const array = createPineArray<number>();
    const lookup = vi.spyOn(WeakMap.prototype, 'get');
    let calls: number;
    try {
      pushArrayValue(array, 7);
      pushArrayValue(array, 11);
      calls = lookup.mock.calls.filter(([key]) => key === array).length;
    } finally {
      lookup.mockRestore();
    }
    expect(calls).toBe(0);
    expect(array.values).toEqual([7, 11]);
  });

  it('preserves independent host storage after copying enumerable array fields', () => {
    const original = createPineArray<number>();
    pushArrayValue(original, 7);
    const copied = { ...original, values: [19] };
    pushArrayValue(copied, 23);
    expect(getArrayValue(copied, 0)).toBe(19);
    expect(getArrayValue(copied, 1)).toBe(23);
    expect(original.values).toEqual([7]);
    original.values = [31];
    pushArrayValue(original, 37);
    expect(original.values).toEqual([31, 37]);
    expect(Object.keys(original)).toEqual(['__tealscriptArray', 'elementType', 'values']);
  });
});
