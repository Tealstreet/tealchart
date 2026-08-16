import type { NativePaneFrame } from './nativeChartFrame';

import { describe, expect, it } from 'vitest';

import { resolveSettledNativePaneRangeOverrides } from './nativePaneRangeOverride';

function pane(id: string, yMin: number, yMax: number): NativePaneFrame {
  return { id, type: 'indicator', top: 0, bottom: 100, height: 100, yMin, yMax };
}

describe('resolveSettledNativePaneRangeOverrides', () => {
  it('holds an override the frame has not caught up with', () => {
    const overrides = { macd: { yMin: 5, yMax: 15 } };

    expect(resolveSettledNativePaneRangeOverrides({ overrides, panes: [pane('macd', 0, 10)] })).toEqual({
      remaining: overrides,
      settled: false,
    });
  });

  it('retires an override once the frame agrees', () => {
    expect(
      resolveSettledNativePaneRangeOverrides({
        overrides: { macd: { yMin: 5, yMax: 15 } },
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
      overrides: { macd: { yMin: 5, yMax: 15 }, rsi: { yMin: 20, yMax: 80 } },
      panes: [pane('macd', 5, 15), pane('rsi', 0, 100)],
    });

    expect(settled).toBe(true);
    expect(remaining).toEqual({ rsi: { yMin: 20, yMax: 80 } });
  });

  it('reports nothing settled when there is nothing to retire', () => {
    expect(resolveSettledNativePaneRangeOverrides({ overrides: {}, panes: [pane('macd', 0, 10)] })).toEqual({
      remaining: {},
      settled: false,
    });
  });
});
