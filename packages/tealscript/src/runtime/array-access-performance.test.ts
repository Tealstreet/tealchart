import { describe, expect, it } from 'vitest';

import {
  createPineArray,
  createReadOnlyPineArray,
  getArrayValue,
  popArrayValue,
  setArrayValue,
  sliceArray,
} from './arrays';

describe('array access hot path', () => {
  it('preserves floor, negative, missing and invalid index handling', () => {
    const array = createPineArray(3, 7);
    setArrayValue(array, 2, 9);
    expect(getArrayValue(array, 1.9)).toBe(7);
    expect(getArrayValue(array, -0.1)).toBe(9);
    expect(getArrayValue(array, Number.NaN)).toBeNaN();
    for (const index of [3, -4, Infinity, -Infinity]) {
      expect(() => getArrayValue(array, index)).toThrow('out of bounds');
    }
  });

  it('reads replaced and mutated storage without retaining it between calls', () => {
    const array = createPineArray(2, 1);
    expect(getArrayValue(array, 0)).toBe(1);
    array.values = [3, 4];
    expect(getArrayValue(array, 0)).toBe(3);
    array.values[0] = 5;
    expect(getArrayValue(array, 0)).toBe(5);
    setArrayValue(array, 0, 6);
    expect(getArrayValue(array, 0)).toBe(6);
    popArrayValue(array);
    expect(() => getArrayValue(array, 1)).toThrow('Array index 1 is out of bounds. Array size is 1');
  });

  it('validates invalidated views even when the requested index is missing', () => {
    const parent = createPineArray(3, 2);
    const view = sliceArray(parent, 1, 3);
    setArrayValue(parent, 1, 8);
    expect(getArrayValue(view, 0)).toBe(8);
    popArrayValue(parent);
    expect(() => getArrayValue(view, Number.NaN)).toThrow('Slice is out of bounds');
    expect(() => getArrayValue(view, 0)).toThrow('Slice is out of bounds');
  });

  it('keeps read-only arrays readable and rejects writes', () => {
    const array = createReadOnlyPineArray([2, Number.NaN]);
    expect(getArrayValue(array, 0)).toBe(2);
    expect(getArrayValue(array, 1)).toBeNaN();
    expect(() => setArrayValue(array, 0, 3)).toThrow('read-only');
  });

  const timingIt = process.env.TEALSCRIPT_PERF_ASSERT === '1' ? it : it.skip;
  timingIt('bounds CPU for mixed-array reads with intervening writes', () => {
    const arrays = Array.from({ length: 64 }, (_, index) => createPineArray(256, index + 1));
    let checksum = 0;
    const read = (count: number) => {
      for (let index = 0; index < count; index++) {
        const array = arrays[index & 63]!;
        if ((index & 4095) === 0) setArrayValue(array, (index >>> 6) & 255, (index & 255) + 1);
        checksum += getArrayValue(array, (index >>> 6) & 255)!;
      }
    };
    read(1_000_000);
    const samples: number[] = [];
    for (let sample = 0; sample < 5; sample++) {
      const start = process.cpuUsage();
      read(20_000_000);
      const cpu = process.cpuUsage(start);
      samples.push((cpu.user + cpu.system) / 1000);
    }
    const median = [...samples].sort((left, right) => left - right)[2]!;
    console.info(JSON.stringify({ arrayReadCpuMs: median, samples, checksum }));
    expect(checksum).toBeGreaterThan(0);
    expect(median).toBeLessThan(700);
  });
});
