import { describe, expect, it } from 'vitest';

import { createPineArray, getArrayValue, setArrayValue } from './arrays';

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json entries[949,958]: array.get/array.set.
// CPU guard preserves the canonical d4592a03ad storage fix for the 804 regression.
describe('array search storage regression', () => {
  const timingIt = process.env.TEALSCRIPT_PERF_ASSERT === '1' ? it : it.skip;
  timingIt('bounds mixed-array read CPU with intervening writes', () => {
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
    expect(checksum).toBe(3282500000);
    expect(median).toBeLessThan(700);
  });
});
