import type { NativePaneFrame } from '../render/nativeChartFrame';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  cancelNativePresentationRelease,
  createNativePresentationReleaseScheduler,
  createNativePaneRatioTarget,
  createNativeReleaseHold,
  nativePaneRangeOverridesCaughtUp,
  nativePaneRatiosCaughtUp,
  omitReleasedNativePaneRangeOverrides,
  resolveNativeReleaseHold,
  scheduleNativePresentationRelease,
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

  it('retires independent domain holds without sharing release state', () => {
    const divider = createNativeReleaseHold({ kind: 'paneDividerResize', target: { main: 0.7, macd: 0.3 }, token: 1 });
    const range = createNativeReleaseHold({ kind: 'paneRangeOverride', target: { macd: { yMin: -5, yMax: 5 } }, token: 2 });

    const nextDivider = resolveNativeReleaseHold({ hold: divider, caughtUp: true });
    const nextRange = resolveNativeReleaseHold({ hold: range, caughtUp: false });

    expect(nextDivider).toEqual({ hold: { ...divider, releaseFramesRemaining: 0 }, released: false });
    expect(nextRange).toEqual({ hold: range, released: false });
  });
});

describe('scheduleNativePresentationRelease', () => {
  function animationFrameHarness() {
    let nextId = 1;
    const callbacks = new Map<number, FrameRequestCallback>();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      callbacks.delete(id);
    });
    return {
      flushOne() {
        const [id, callback] = callbacks.entries().next().value ?? [];
        if (!id || !callback) return false;
        callbacks.delete(id);
        callback(performance.now());
        return true;
      },
    };
  }

  it('releases after real animation frames, not synchronously when the hold catches up', () => {
    const frames = animationFrameHarness();
    const scheduler = createNativePresentationReleaseScheduler();
    const release = vi.fn();

    scheduleNativePresentationRelease({ frames: 2, release, scheduler, token: 1 });

    expect(release).not.toHaveBeenCalled();
    frames.flushOne();
    expect(release).not.toHaveBeenCalled();
    frames.flushOne();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('cancels a stale scheduled release when a new interaction takes ownership', () => {
    const frames = animationFrameHarness();
    const scheduler = createNativePresentationReleaseScheduler();
    const release = vi.fn();

    scheduleNativePresentationRelease({ frames: 2, release, scheduler, token: 1 });
    cancelNativePresentationRelease(scheduler);
    frames.flushOne();

    expect(release).not.toHaveBeenCalled();
  });

  it('replaces an older release with the newest token', () => {
    const frames = animationFrameHarness();
    const scheduler = createNativePresentationReleaseScheduler();
    const first = vi.fn();
    const second = vi.fn();

    scheduleNativePresentationRelease({ frames: 2, release: first, scheduler, token: 1 });
    scheduleNativePresentationRelease({ frames: 1, release: second, scheduler, token: 2 });
    frames.flushOne();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
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

  it('requires every held pane range override to catch up before release', () => {
    expect(
      nativePaneRangeOverridesCaughtUp({
        overrides: {
          macd: { yMin: -5, yMax: 5 },
          rsi: { yMin: 20, yMax: 80 },
        },
        panes: [pane('macd', 100, -5, 5), pane('rsi', 100, 10, 90)],
      }),
    ).toBe(false);
  });

  it('matches pane divider targets after layout reaches the committed ratios', () => {
    const target = createNativePaneRatioTarget([
      { paneId: 'main', heightRatio: 0.75 },
      { paneId: 'macd', heightRatio: 0.25 },
    ]);

    expect(nativePaneRatiosCaughtUp({ panes: [pane('main', 70), pane('macd', 30)], ratios: target })).toBe(false);
    expect(nativePaneRatiosCaughtUp({ panes: [pane('main', 75), pane('macd', 25)], ratios: target })).toBe(true);
  });

  it('matches pane divider targets against only the panes in the target map', () => {
    const target = createNativePaneRatioTarget([
      { paneId: 'main', heightRatio: 0.75 },
      { paneId: 'macd', heightRatio: 0.25 },
    ]);

    expect(nativePaneRatiosCaughtUp({ panes: [pane('main', 75), pane('macd', 25), pane('rsi', 40)], ratios: target })).toBe(
      true,
    );
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
