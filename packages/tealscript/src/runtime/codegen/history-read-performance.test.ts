import { expect, it } from 'vitest';

import { HistoryBufferSizing } from './history';

it('checks repeated reads of one history series within its CPU budget', () => {
  const sizing = new HistoryBufferSizing();
  const { NumericSeries } = sizing.dependencies(500, () => false);
  const series = new NumericSeries(501, 500, 'high');
  series.push(7);
  series.push(9);
  const start = process.cpuUsage();
  let sum = 0;
  for (let i = 0; i < 10000000; i++) sum += series.get(1);
  const cpu = process.cpuUsage(start);
  const elapsed = (cpu.user + cpu.system) / 1000;
  console.log('history-read-cpu-ms', elapsed);
  expect(sum).toBe(70000000);
  if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
    expect(elapsed).toBeLessThan(600);
  }
});
