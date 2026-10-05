import type { Bar } from '../../src/runtime/context';

import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

function run(source: string, times: number[]) {
  const bars: Bar[] = times.map((time) => ({ time, open: 1, high: 2, low: 0, close: 1, volume: 10 }));
  const result = executeScript(parse(`//@version=6\nindicator("Exact IANA offset reuse")\n${source}`), bars);
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  return result.plots.map((plot) => plot.values);
}

describe('exact timestamp IANA offset reuse', () => {
  it('avoids repeating native conversion for calendar parts at the same timestamp', () => {
    const times = Array.from({ length: 100 }, (_, i) => Date.UTC(2031, 0, 1, 12, i));
    const parts = vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts');
    const started = performance.now();
    try {
      const values = run(
        `plot(hour(time, "America/Adak"))
plot(minute(time, "America/Adak"))
plot(second(time, "America/Adak"))`,
        times,
      );
      expect(values).toEqual([
        times.map((t) => new Date(t - 10 * 3600000).getUTCHours()),
        times.map((t) => new Date(t).getUTCMinutes()),
        times.map(() => 0),
      ]);
      console.log(
        JSON.stringify({
          witness: 'iana-three-parts-100-timestamps',
          nativeConversions: parts.mock.calls.length,
          elapsedMs: performance.now() - started,
        }),
      );
      expect(parts.mock.calls.length).toBeLessThanOrEqual(times.length);
    } finally {
      parts.mockRestore();
    }
  });

  it('keeps distinct DST instants and fractional-hour zones', () => {
    const times = [
      Date.UTC(2030, 2, 10, 6, 59),
      Date.UTC(2030, 2, 10, 7),
      Date.UTC(2030, 10, 3, 5, 59),
      Date.UTC(2030, 10, 3, 6),
    ];
    expect(
      run(
        `plot(hour(time, "America/New_York"))
plot(minute(time, "America/New_York"))
plot(hour(time, "Asia/Kathmandu"))
plot(minute(time, "Asia/Kathmandu"))`,
        times,
      ),
    ).toEqual([
      [1, 3, 1, 1],
      [59, 0, 59, 0],
      [12, 12, 11, 11],
      [44, 45, 44, 45],
    ]);
  });

  it('does not share an offset between zones at the same instant', () => {
    expect(
      run(
        `plot(hour(time, "America/New_York"))
plot(hour(time, "Asia/Tokyo"))`,
        [Date.UTC(2033, 0, 1, 12)],
      ),
    ).toEqual([[7], [21]]);
  });

  it('evicts old exact timestamps while preserving the recomputed result', () => {
    const times = Array.from({ length: 9000 }, (_, i) => Date.UTC(2035, 0, 1, 12, i));
    const parts = vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts');
    try {
      run('plot(hour(time, "Asia/Tokyo"))', times);
      const before = parts.mock.calls.length;
      expect(run('plot(hour(time, "Asia/Tokyo"))', [times[0]!])).toEqual([[21]]);
      expect(parts.mock.calls.length - before).toBe(1);
    } finally {
      parts.mockRestore();
    }
  });

  it('retries a failed native conversion rather than caching its UTC fallback', () => {
    const nativeParts = Intl.DateTimeFormat.prototype.formatToParts;
    const parts = vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts');
    parts.mockImplementationOnce(() => {
      throw new RangeError('Transient conversion failure');
    });
    parts.mockImplementation(function (this: Intl.DateTimeFormat, date) {
      return nativeParts.call(this, date);
    });
    try {
      const time = Date.UTC(2034, 0, 1, 12);
      expect(run(`plot(hour(time, "America/New_York"))`, [time])).toEqual([[12]]);
      expect(run(`plot(hour(time, "America/New_York"))`, [time])).toEqual([[7]]);
    } finally {
      parts.mockRestore();
    }
  });
});
