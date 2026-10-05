import { expect, it } from 'vitest';
import { ValueWhen } from './ta-classes';

it('keeps fixed-occurrence matches efficient without losing rollback or missing slots', () => {
  const previous = new ValueWhen(1);
  const start = process.cpuUsage();
  let value = NaN;
  for (let i = 0; i < 40_000; i++) value = previous.compute(true, i);
  const cpu = process.cpuUsage(start);
  expect(value).toBe(39_998);
  if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
    expect((cpu.user + cpu.system) / 1000).toBeLessThan(150);
  }

  const saved = previous.save();
  expect(previous.compute(true, NaN)).toBe(39_999);
  expect(previous.recompute(false, 100_000)).toBe(39_998);
  expect(previous.recompute(true, -0)).toBe(39_999);
  expect(previous.compute(true, 20)).toBe(-0);
  previous.restore(saved);
  expect(previous.compute(false, 1)).toBe(39_998);
  expect(previous.compute(true, NaN)).toBe(39_999);
  expect(previous.compute(true, 30)).toBeNaN();
  previous.restore(saved);
  expect(previous.compute(true, 40)).toBe(39_999);

  const older = new ValueWhen(3);
  expect([10, 20, NaN, 40, 50, 60].map((source) => older.compute(true, source)))
    .toEqual([NaN, NaN, NaN, 10, 20, NaN]);
  expect(older.compute(false, 70)).toBeNaN();
  expect(older.compute(true, 80)).toBe(40);
  expect(new ValueWhen(0).compute(true, -0)).toBe(-0);
  expect(() => new ValueWhen(-1).compute(false, 1)).toThrow("It must be >= 0");
});
