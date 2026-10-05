import { describe, expect, it, vi } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import type { Bar } from '../context';

function run(source: string, times: number[]) {
  const bars: Bar[] = times.map((time) => ({ time, open: 1, high: 2, low: 0, close: 1, volume: 10 }));
  const result = executeScript(parse(`//@version=6\nindicator("Timezone cache")\n${source}`), bars);
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  return result.plots.map((plot) => plot.values);
}

describe('IANA timezone formatter reuse', () => {
  it('constructs one formatter for repeated calendar parts in one timezone', () => {
    const timezone = 'America/Nuuk';
    const formatter = vi.spyOn(Intl, 'DateTimeFormat');
    try {
      run(`plot(hour(time, "${timezone}"))\nplot(minute(time, "${timezone}"))\nplot(second(time, "${timezone}"))`,
        Array.from({ length: 100 }, (_, index) => Date.UTC(2024, 0, 1, 12, index)));
      expect(formatter.mock.calls.filter(([, options]) => options?.timeZone === timezone)).toHaveLength(1);
    } finally {
      formatter.mockRestore();
    }
  });

  it('preserves spring and autumn DST transitions and fractional-hour zones', () => {
    const times = [
      Date.UTC(2024, 2, 10, 6, 59), Date.UTC(2024, 2, 10, 7),
      Date.UTC(2024, 10, 3, 5, 59), Date.UTC(2024, 10, 3, 6),
    ];
    expect(run(`plot(hour(time, "America/New_York"))
plot(minute(time, "America/New_York"))
plot(hour(time, "Asia/Kathmandu"))
plot(minute(time, "Asia/Kathmandu"))
plot(hour(time, "UTC"))`, times)).toEqual([
      [1, 3, 1, 1], [59, 0, 59, 0], [12, 12, 11, 11], [44, 45, 44, 45], [6, 7, 5, 6],
    ]);
  });

  it('retains invalid-zone UTC fallback and midnight calendar boundaries', () => {
    expect(run(`plot(hour(time, "Invalid/Timezone"))
plot(dayofmonth(time, "Asia/Tokyo"))
plot(hour(time, "Asia/Tokyo"))`, [Date.UTC(2024, 0, 1, 14, 59), Date.UTC(2024, 0, 1, 15)])).toEqual([
      [14, 15], [1, 2], [23, 0],
    ]);
  });
});
