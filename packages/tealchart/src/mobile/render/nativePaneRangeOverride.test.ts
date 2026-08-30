import type { NativePaneFrame } from './nativeChartFrame';

import { describe, expect, it } from 'vitest';

import {
  createNativePaneRangeOverride,
  resolveNativePaneRange,
  resolveSettledNativePaneRangeOverrides,
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

  it('keeps a committed override active through intermediate frames', () => {
    const macd = pane('macd', 6, 16);
    const override = createNativePaneRangeOverride({
      committed: true,
      range: { yMin: 5, yMax: 15 },
      startYMin: 0,
      startYMax: 10,
    });

    expect(resolveNativePaneRange(macd, { macd: override })).toEqual(override);
  });

  it('holds a committed override the frame has not caught up with', () => {
    const overrides = {
      macd: createNativePaneRangeOverride({
        committed: true,
        range: { yMin: 5, yMax: 15 },
        startYMin: 0,
        startYMax: 10,
      }),
    };

    expect(resolveSettledNativePaneRangeOverrides({ overrides, panes: [pane('macd', 0, 10)] })).toEqual({
      remaining: overrides,
      settled: false,
    });
  });

  it('retires a committed override once the frame agrees', () => {
    expect(
      resolveSettledNativePaneRangeOverrides({
        overrides: {
          macd: createNativePaneRangeOverride({
            committed: true,
            range: { yMin: 5, yMax: 15 },
            startYMin: 0,
            startYMax: 10,
          }),
        },
        panes: [pane('macd', 5, 15)],
      }),
    ).toEqual({ remaining: {}, settled: true });
  });

  it('retires an override whose pane has gone', () => {
    expect(
      resolveSettledNativePaneRangeOverrides({
        overrides: { macd: { yMin: 5, yMax: 15 } },
        panes: [pane('rsi', 0, 100)],
      }),
    ).toEqual({ remaining: {}, settled: true });
  });

  // One pane settling must not drop another pane's live drag.
  it('retires panes independently', () => {
    const { remaining, settled } = resolveSettledNativePaneRangeOverrides({
      overrides: {
        macd: createNativePaneRangeOverride({
          committed: true,
          range: { yMin: 5, yMax: 15 },
          startYMin: 0,
          startYMax: 10,
        }),
        rsi: createNativePaneRangeOverride({
          committed: true,
          range: { yMin: 20, yMax: 80 },
          startYMin: 0,
          startYMax: 100,
        }),
      },
      panes: [pane('macd', 5, 15), pane('rsi', 0, 100)],
    });

    expect(settled).toBe(true);
    expect(remaining).toEqual({
      rsi: createNativePaneRangeOverride({
        committed: true,
        range: { yMin: 20, yMax: 80 },
        startYMin: 0,
        startYMax: 100,
      }),
    });
  });

  it('reports nothing settled when there is nothing to retire', () => {
    expect(resolveSettledNativePaneRangeOverrides({ overrides: {}, panes: [pane('macd', 0, 10)] })).toEqual({
      remaining: {},
      settled: false,
    });
  });
});
