import type { Bar } from '../../types';
import type { NativeChartProjection } from './nativeProjection';

import { describe, expect, it } from 'vitest';

import { getNativeBarInterval, getNativeVisibleBars } from './nativeVisibleBars';

function makeBars(count: number, step = 60_000, start = 1_700_000_000_000): Bar[] {
  return Array.from({ length: count }, (_, index) => ({
    time: start + index * step,
    open: 100 + index,
    high: 102 + index,
    low: 99 + index,
    close: 101 + index,
    volume: 10 + index,
  }));
}

function makeProjection(startTime: number, endTime: number): NativeChartProjection {
  return {
    viewport: { startTime, endTime, priceMin: 0, priceMax: 1 },
    timeToX: (time: number) => time - startTime,
  } as unknown as NativeChartProjection;
}

describe('getNativeVisibleBars', () => {
  const bars = makeBars(10);

  it('returns the candidate window with source indexes intact', () => {
    // The window overscans by a full viewport either side, so a 3-bar viewport
    // in the middle carries its neighbours too.
    const visible = getNativeVisibleBars(bars, makeProjection(bars[4]!.time, bars[6]!.time));

    expect(visible.map((bar) => bar.sourceIndex)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(visible[0]).toMatchObject({ time: bars[2]!.time, close: bars[2]!.close });
  });

  it('projects x and stamps the shared bar interval', () => {
    const visible = getNativeVisibleBars(bars, makeProjection(bars[0]!.time, bars[1]!.time));

    expect(visible[0]?.x).toBe(0);
    expect(visible[1]?.x).toBe(60_000);
    expect(new Set(visible.map((bar) => bar.interval))).toEqual(new Set([60_000]));
  });

  it('clips at both ends of the history', () => {
    expect(getNativeVisibleBars(bars, makeProjection(bars[0]!.time, bars[1]!.time))[0]?.sourceIndex).toBe(0);
    const tail = getNativeVisibleBars(bars, makeProjection(bars[8]!.time, bars[9]!.time));
    expect(tail[tail.length - 1]?.sourceIndex).toBe(9);
  });

  it('returns nothing for a window past the history and for no bars at all', () => {
    expect(getNativeVisibleBars(bars, makeProjection(bars[9]!.time + 10_000_000, bars[9]!.time + 10_060_000))).toEqual(
      [],
    );
    expect(getNativeVisibleBars([], makeProjection(0, 1))).toEqual([]);
  });

  it('keeps every bar sharing a timestamp', () => {
    const duplicated: Bar[] = [...makeBars(2), { ...makeBars(1)[0]!, time: makeBars(2)[1]!.time }];
    const visible = getNativeVisibleBars(duplicated, makeProjection(duplicated[1]!.time, duplicated[2]!.time));

    // The lower bound has to land on the FIRST bar sharing the timestamp.
    expect(visible.map((bar) => bar.sourceIndex)).toEqual([1, 2]);
  });

  it('handles a single bar and a window that ends before the history starts', () => {
    const single = makeBars(1);
    expect(getNativeVisibleBars(single, makeProjection(single[0]!.time, single[0]!.time))[0]?.sourceIndex).toBe(0);
    expect(getNativeVisibleBars(bars, makeProjection(bars[0]!.time - 10_000_000, bars[0]!.time - 9_000_000))).toEqual(
      [],
    );
  });

  it('drops bars with an unusable timestamp instead of ending the scan on them', () => {
    const corrupt: Bar[] = [...makeBars(4)];
    corrupt[1] = { ...corrupt[1]!, time: Number.NaN };
    const visible = getNativeVisibleBars(corrupt, makeProjection(corrupt[0]!.time, corrupt[3]!.time));

    expect(visible.map((bar) => bar.sourceIndex)).toEqual([0, 2, 3]);
  });

  it('draws nothing for a viewport with a non-finite bound', () => {
    expect(getNativeVisibleBars(bars, makeProjection(Number.NaN, bars[3]!.time))).toEqual([]);
  });

  it('keeps working when a gap makes the history unevenly spaced', () => {
    const gapped: Bar[] = [...makeBars(3), ...makeBars(3, 60_000, 1_700_000_000_000 + 3_600_000)];
    const visible = getNativeVisibleBars(gapped, makeProjection(gapped[3]!.time, gapped[5]!.time));

    expect(visible.map((bar) => bar.time)).toEqual([gapped[3]!.time, gapped[4]!.time, gapped[5]!.time]);
  });
});

describe('getNativeBarInterval', () => {
  it('takes the smallest positive gap, bounded by the fallback', () => {
    expect(getNativeBarInterval(makeBars(4), 999_999)).toBe(60_000);
    expect(getNativeBarInterval(makeBars(4), 1_000)).toBe(1_000);
    expect(getNativeBarInterval([], 5_000)).toBe(5_000);
  });
});
