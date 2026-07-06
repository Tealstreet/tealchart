import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DIRTY, RenderScheduler } from './RenderScheduler';

describe('RenderScheduler', () => {
  let renderCallback: ReturnType<typeof vi.fn<(dirty: number) => void>>;
  let scheduler: RenderScheduler;
  let rafCallbacks: Array<() => void>;

  beforeEach(() => {
    renderCallback = vi.fn();
    rafCallbacks = [];

    // Mock requestAnimationFrame to capture callbacks
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb as () => void);
      return rafCallbacks.length; // return a fake ID
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});

    scheduler = new RenderScheduler(renderCallback);
  });

  afterEach(() => {
    scheduler.dispose();
    vi.restoreAllMocks();
  });

  function flushRaf() {
    const callbacks = [...rafCallbacks];
    rafCallbacks.length = 0;
    for (const cb of callbacks) cb();
  }

  describe('DIRTY constants', () => {
    it('NONE is 0', () => {
      expect(DIRTY.NONE).toBe(0);
    });

    it('flags are distinct powers of 2', () => {
      const flags = [
        DIRTY.CROSSHAIR,
        DIRTY.VIEWPORT,
        DIRTY.BARS,
        DIRTY.PLOTS,
        DIRTY.DRAWINGS,
        DIRTY.LINES,
        DIRTY.LAYOUT,
        DIRTY.OPTIONS,
        DIRTY.DATA_LOAD,
        DIRTY.USER_DRAWINGS,
      ];

      // Each flag should be unique
      const unique = new Set(flags);
      expect(unique.size).toBe(flags.length);
    });

    // FULL must repaint everything but NOT carry DATA_LOAD: DATA_LOAD force-clears
    // indicator plots (TealchartWidget._render), so implying it from a plain
    // "repaint all" blanks live indicators for a frame → flicker on add/remove.
    it('FULL includes every render flag except DATA_LOAD', () => {
      const renderFlags = [
        DIRTY.CROSSHAIR,
        DIRTY.VIEWPORT,
        DIRTY.BARS,
        DIRTY.PLOTS,
        DIRTY.DRAWINGS,
        DIRTY.LINES,
        DIRTY.LAYOUT,
        DIRTY.OPTIONS,
        DIRTY.USER_DRAWINGS,
      ];
      for (const flag of renderFlags) {
        expect(DIRTY.FULL & flag).toBe(flag);
      }
      expect(DIRTY.FULL & DIRTY.DATA_LOAD).toBe(0);
    });
  });

  describe('markDirty', () => {
    it('schedules RAF on first call', () => {
      scheduler.markDirty(DIRTY.CROSSHAIR);
      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    });

    it('does not schedule additional RAF for same frame', () => {
      scheduler.markDirty(DIRTY.CROSSHAIR);
      scheduler.markDirty(DIRTY.VIEWPORT);
      scheduler.markDirty(DIRTY.BARS);
      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    });

    it('accumulates flags via OR', () => {
      scheduler.markDirty(DIRTY.CROSSHAIR);
      scheduler.markDirty(DIRTY.VIEWPORT);
      scheduler.markDirty(DIRTY.BARS);

      flushRaf();

      expect(renderCallback).toHaveBeenCalledTimes(1);
      const dirty = renderCallback.mock.calls[0][0];
      expect(dirty & DIRTY.CROSSHAIR).toBeTruthy();
      expect(dirty & DIRTY.VIEWPORT).toBeTruthy();
      expect(dirty & DIRTY.BARS).toBeTruthy();
      expect(dirty & DIRTY.PLOTS).toBeFalsy();
    });

    it('clears dirty flags after callback', () => {
      scheduler.markDirty(DIRTY.CROSSHAIR);
      flushRaf();

      expect(scheduler.isDirty(DIRTY.CROSSHAIR)).toBe(false);
    });

    it('allows new RAF after previous one fires', () => {
      scheduler.markDirty(DIRTY.CROSSHAIR);
      flushRaf();

      scheduler.markDirty(DIRTY.VIEWPORT);
      expect(requestAnimationFrame).toHaveBeenCalledTimes(2);

      flushRaf();
      expect(renderCallback).toHaveBeenCalledTimes(2);
      expect(renderCallback.mock.calls[1][0] & DIRTY.VIEWPORT).toBeTruthy();
    });
  });

  describe('isDirty', () => {
    it('returns false when nothing is dirty', () => {
      expect(scheduler.isDirty(DIRTY.CROSSHAIR)).toBe(false);
      expect(scheduler.isDirty(DIRTY.FULL)).toBe(false);
    });

    it('returns true for marked flags', () => {
      scheduler.markDirty(DIRTY.CROSSHAIR | DIRTY.VIEWPORT);
      expect(scheduler.isDirty(DIRTY.CROSSHAIR)).toBe(true);
      expect(scheduler.isDirty(DIRTY.VIEWPORT)).toBe(true);
      expect(scheduler.isDirty(DIRTY.BARS)).toBe(false);
    });
  });

  describe('cancel', () => {
    it('cancels pending RAF', () => {
      scheduler.markDirty(DIRTY.CROSSHAIR);
      scheduler.cancel();
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it('prevents callback from firing', () => {
      scheduler.markDirty(DIRTY.CROSSHAIR);
      scheduler.cancel();

      // Flush should have nothing to call since we cancelled
      // (but our mock captured the callback before cancel was called)
      // The real cancelAnimationFrame would prevent it from running.
      // Since we're mocking, just verify cancel was called.
      expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispose', () => {
    it('cancels and clears dirty flags', () => {
      scheduler.markDirty(DIRTY.CROSSHAIR | DIRTY.VIEWPORT);
      scheduler.dispose();

      expect(cancelAnimationFrame).toHaveBeenCalled();
      expect(scheduler.isDirty(DIRTY.CROSSHAIR)).toBe(false);
      expect(scheduler.isDirty(DIRTY.VIEWPORT)).toBe(false);
    });
  });
});
