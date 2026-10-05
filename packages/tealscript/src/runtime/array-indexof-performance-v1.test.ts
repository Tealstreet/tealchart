import { expect, it } from 'vitest';

import { createPineArray, indexOfArrayValue, pushArrayValue, setArrayValue, sliceArray } from './arrays';

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json entries[1011,943].
it('maintains first-match searches across append, mutation, missing values and host aliases', () => {
  const array = createPineArray<number>();
  for (let i = 0; i < 32768; i++) pushArrayValue(array, i);
  let checksum = 0;
  const start = process.cpuUsage();
  for (let i = 0; i < 16384; i++) checksum += indexOfArrayValue(array, 32767);
  const cpu = process.cpuUsage(start);
  expect(checksum).toBe(32767 * 16384);
  if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
    expect((cpu.user + cpu.system) / 1000).toBeLessThan(150);
  }
  pushArrayValue(array, 32767);
  expect(indexOfArrayValue(array, 32767)).toBe(32767);
  setArrayValue(array, 32767, -7);
  expect(indexOfArrayValue(array, 32767)).toBe(32768);
  const values = array.values;
  for (let i = 0; i < 64; i++) expect(indexOfArrayValue(array, -7)).toBe(32767);
  values[0] = -7;
  expect(indexOfArrayValue(array, -7)).toBe(0);
  setArrayValue(array, 1, Number.NaN);
  expect(indexOfArrayValue(array, Number.NaN)).toBe(-1);
  const view = sliceArray(array, 0, 3);
  expect(indexOfArrayValue(view, -7)).toBe(0);
  setArrayValue(view, 0, 99);
  expect(indexOfArrayValue(array, 99)).toBe(0);
}, 30000);
