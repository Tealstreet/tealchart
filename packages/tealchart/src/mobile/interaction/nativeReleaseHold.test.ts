import type { NativePaneFrame } from '../render/nativeChartFrame';

import { describe, expect, it } from 'vitest';

import {
  createNativePaneRatioTarget,
  createNativeReleaseHold,
  nativePaneRangeOverridesCaughtUp,
  nativePaneRatiosCaughtUp,
  omitReleasedNativePaneRangeOverrides,
  resolveNativeReleaseHold,
} from './nativeReleaseHold';

function pane(id: string, height: number, yMin = 0, yMax = 1): NativePaneFrame {
  return { id, type: id === 'main' ? 'main' : 'indicator', top: 0, bottom: height, height, yMin, yMax };
}

describe('resolveNativeReleaseHold', () => {
  it('keeps a hold while the committed frame has not caught up', () => {
    const hold = createNativeReleaseHold({ kind: 'paneDividerResize', target: { main: 0.7 }, token: 1 });

    expect(resolveNativeReleaseHold({ hold, caughtUp: false })).toEqual({ hold, released: false });
  });

  it('waits out the configured release frames after the target catches up', () => {
    const hold = createNativeReleaseHold({ kind: 'paneRangeOverride', target: { macd: { yMin: -1, yMax: 1 } }, token: 7 });

    const first = resolveNativeReleaseHold({ hold, caughtUp: true });
    expect(first).toEqual({
      hold: { ...hold, releaseFramesRemaining: 0 },
      released: false,
    });

    expect(resolveNativeReleaseHold({ hold: first.hold, caughtUp: true })).toEqual({
      hold: null,
      released: true,
    });
  });

  it('supports immediate release when a caller explicitly asks for zero frames', () => {
    const hold = createNativeReleaseHold({ kind: 'viewport', releaseFrames: 0, target: { startTime: 0, endTime: 1 }, token: 2 });

    expect(resolveNativeReleaseHold({ hold, caughtUp: true })).toEqual({ hold: null, released: true });
  });
});

describe('native release-hold caught-up predicates', () => {
  it('matches pane range overrides only when the frame carries the committed range', () => {
    expect(
      nativePaneRangeOverridesCaughtUp({
        overrides: { macd: { yMin: -5, yMax: 5 } },
        panes: [pane('macd', 100, -1, 1)],
      }),
    ).toBe(false);
    expect(
      nativePaneRangeOverridesCaughtUp({
        overrides: { macd: { yMin: -5, yMax: 5 } },
        panes: [pane('macd', 100, -5, 5)],
      }),
    ).toBe(true);
  });

  it('matches pane divider targets after layout reaches the committed ratios', () => {
    const target = createNativePaneRatioTarget([
      { paneId: 'main', heightRatio: 0.75 },
      { paneId: 'macd', heightRatio: 0.25 },
    ]);

    expect(nativePaneRatiosCaughtUp({ panes: [pane('main', 70), pane('macd', 30)], ratios: target })).toBe(false);
    expect(nativePaneRatiosCaughtUp({ panes: [pane('main', 75), pane('macd', 25)], ratios: target })).toBe(true);
  });

  it('only removes released pane-range overrides that still match the hold target', () => {
    expect(
      omitReleasedNativePaneRangeOverrides({
        current: {
          macd: { yMin: -5, yMax: 5 },
          rsi: { yMin: 20, yMax: 80 },
        },
        released: {
          macd: { yMin: -5, yMax: 5 },
          rsi: { yMin: 10, yMax: 90 },
        },
      }),
    ).toEqual({ rsi: { yMin: 20, yMax: 80 } });
  });
});
