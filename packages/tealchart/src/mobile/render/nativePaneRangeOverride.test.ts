import type { NativePaneFrame } from './nativeChartFrame';

import { describe, expect, it } from 'vitest';

import {
  createNativePaneRangeOverride,
  resolveNativePaneRange,
} from './nativePaneRangeOverride';

function pane(id: string, yMin: number, yMax: number): NativePaneFrame {
  return { id, type: 'indicator', top: 0, bottom: 100, height: 100, yMin, yMax };
}

describe('native pane range overrides', () => {
  it('uses a live override even when the frame happens to match it', () => {
    const macd = pane('macd', 5, 15);

    expect(resolveNativePaneRange(macd, { macd: { yMin: 10, yMax: 20, committed: false } })).toEqual({
      yMin: 10,
      yMax: 20,
      committed: false,
    });
  });

  it('uses a committed override while React still renders the drag-start frame', () => {
    const macd = pane('macd', 0, 10);
    const override = createNativePaneRangeOverride({
      committed: true,
      range: { yMin: 5, yMax: 15 },
      startYMin: 0,
      startYMax: 10,
    });

    expect(resolveNativePaneRange(macd, { macd: override })).toEqual(override);
  });

  it('ignores a committed override once the frame catches up', () => {
    const macd = pane('macd', 5, 15);
    const override = createNativePaneRangeOverride({
      committed: true,
      range: { yMin: 5, yMax: 15 },
      startYMin: 0,
      startYMax: 10,
    });

    expect(resolveNativePaneRange(macd, { macd: override })).toEqual({ yMin: 5, yMax: 15 });
  });

  it('keeps a stale committed override inert after the frame moves past its start and target ranges', () => {
    const macd = pane('macd', 6, 16);
    const override = createNativePaneRangeOverride({
      committed: true,
      range: { yMin: 5, yMax: 15 },
      startYMin: 0,
      startYMax: 10,
    });

    expect(resolveNativePaneRange(macd, { macd: override })).toEqual({ yMin: 6, yMax: 16 });
  });
});
