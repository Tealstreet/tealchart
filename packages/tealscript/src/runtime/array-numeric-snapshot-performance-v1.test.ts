import { describe, expect, it } from 'vitest';

import { createPineArray, sumArrayValue } from './arrays';

describe('numeric array snapshot cost', () => {
  it('reduces fifty million numeric slots within the bounded CPU budget', () => {
    const array = createPineArray<number>(5000, 1);
    let sum = 0;
    const started = process.cpuUsage();
    for (let index = 0; index < 10_000; index++) sum += sumArrayValue(array);
    const cpu = process.cpuUsage(started);
    if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
      expect(cpu.user + cpu.system).toBeLessThan(700_000);
    }
    expect(sum).toBe(50_000_000);
  });

  it('converts the original snapshot in order when conversion mutates source storage', () => {
    const array = createPineArray<unknown>();
    const conversions: string[] = [];
    array.values = [
      {
        valueOf() {
          conversions.push('first');
          array.values[1] = 99;
          return 3;
        },
      },
      {
        valueOf() {
          conversions.push('second');
          return 5;
        },
      },
      Number.NaN,
    ];
    expect(sumArrayValue(array)).toBe(8);
    expect(conversions).toEqual(['first', 'second']);
    expect(array.values[1]).toBe(99);
  });
});
