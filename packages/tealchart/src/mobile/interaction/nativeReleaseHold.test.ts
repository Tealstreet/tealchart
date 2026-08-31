import type { NativePaneFrame } from '../render/nativeChartFrame';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createNativePaneGeometrySignature,
  createNativeReleaseHold,
  nativePaneDividerBandsCaughtUp,
  nativePaneRatiosCaughtUp,
  resolveNativeReleaseHold,
} from './nativeReleaseHold';

function pane(id: string, height: number, yMin = 0, yMax = 1): NativePaneFrame {
  return { id, type: id === 'main' ? 'main' : 'indicator', top: 0, bottom: height, height, yMin, yMax };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveNativeReleaseHold', () => {
  it('keeps a hold while the committed frame has not caught up', () => {
    const hold = createNativeReleaseHold({ kind: 'paneDividerResize', target: { main: 0.7 }, token: 1 });

    expect(resolveNativeReleaseHold({ hold, caughtUp: false })).toEqual({ hold, released: false });
  });

  it('waits out the configured release frames after the target catches up', () => {
    const hold = createNativeReleaseHold({ kind: 'paneMaximizeLegend', target: { macd: 0.25 }, token: 7 });

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

  it('retires independent domain holds without sharing release state', () => {
    const divider = createNativeReleaseHold({ kind: 'paneDividerResize', target: { main: 0.7, macd: 0.3 }, token: 1 });
    const range = createNativeReleaseHold({ kind: 'paneMaximizeLegend', target: { macd: 0.25 }, token: 2 });

    const nextDivider = resolveNativeReleaseHold({ hold: divider, caughtUp: true });
    const nextRange = resolveNativeReleaseHold({ hold: range, caughtUp: false });

    expect(nextDivider).toEqual({ hold: { ...divider, releaseFramesRemaining: 0 }, released: false });
    expect(nextRange).toEqual({ hold: range, released: false });
  });
});

describe('createNativePaneGeometrySignature', () => {
  it('matches itself across sub-pixel drift so an echo can be compared by value', () => {
    expect(createNativePaneGeometrySignature([{ height: 144.4, id: 'main', top: 36.2 }])).toBe(
      createNativePaneGeometrySignature([{ height: 144, id: 'main', top: 36 }]),
    );
  });

  it('changes when a divider moves', () => {
    const before = createNativePaneGeometrySignature([
      { height: 185, id: 'main', top: 36 },
      { height: 33, id: 'macd', top: 221 },
    ]);
    const after = createNativePaneGeometrySignature([
      { height: 73, id: 'main', top: 36 },
      { height: 145, id: 'macd', top: 109 },
    ]);

    expect(before).not.toBe(after);
  });
});

describe('native release-hold caught-up predicates', () => {
  it('matches pane ratio targets after layout reaches the committed ratios', () => {
    const ratios = { macd: 0.25, main: 0.75 };

    expect(nativePaneRatiosCaughtUp({ panes: [pane('main', 70), pane('macd', 30)], ratios })).toBe(false);
    expect(nativePaneRatiosCaughtUp({ panes: [pane('main', 75), pane('macd', 25)], ratios })).toBe(true);
  });

  it('matches pane ratio targets against only the panes the target names', () => {
    const ratios = { macd: 0.25, main: 0.75 };

    expect(nativePaneRatiosCaughtUp({ panes: [pane('main', 75), pane('macd', 25), pane('rsi', 40)], ratios })).toBe(true);
  });

  it('matches pane divider release bands only after committed pane pixels catch up', () => {
    const bands = [
      { height: 144, paneId: 'main', top: 20 },
      { height: 110, paneId: 'macd', top: 164 },
    ];

    expect(
      nativePaneDividerBandsCaughtUp({
        bands,
        panes: [
          { id: 'main', height: 200, top: 20 },
          { id: 'macd', height: 54, top: 220 },
        ],
      }),
    ).toBe(false);
    expect(
      nativePaneDividerBandsCaughtUp({
        bands,
        panes: [
          { id: 'main', height: 144, top: 20 },
          { id: 'macd', height: 110, top: 164 },
        ],
      }),
    ).toBe(true);
  });
});
