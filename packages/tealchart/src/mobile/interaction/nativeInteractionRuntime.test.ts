import { describe, expect, it } from 'vitest';

import {
  NativeInteractionRuntime,
  axisPinchViewport,
  panViewport,
  scaleViewportPrices,
  scaleViewportTime,
  type NativeInteractionOwner,
} from './nativeInteractionRuntime';

const viewport = {
  startTime: 1_000,
  endTime: 2_000,
  priceMin: 100,
  priceMax: 200,
};

function begin(runtime: NativeInteractionRuntime, owner: NativeInteractionOwner = 'chartPan') {
  expect(runtime.begin(owner, { x: 10, y: 20 }, viewport)).toBe(true);
}

describe('native interaction runtime', () => {
  it('keeps one active owner at a time', () => {
    const runtime = new NativeInteractionRuntime(viewport);

    begin(runtime, 'chartPan');

    expect(runtime.begin('priceScale', { x: 20, y: 30 }, viewport)).toBe(false);
    expect(runtime.getSnapshot().owner).toBe('chartPan');
  });

  it('begins, updates, and commits chart pan from the start viewport', () => {
    const runtime = new NativeInteractionRuntime(viewport);

    begin(runtime, 'chartPan');

    expect(
      runtime.updateChartPan({
        delta: { x: 50, y: -10 },
        timePerPixel: 2,
        pricePerPixel: 0.5,
      }),
    ).toBe(true);

    expect(runtime.getCommittedViewport()).toEqual(viewport);
    expect(runtime.getRenderViewport()).toEqual({
      startTime: 900,
      endTime: 1_900,
      priceMin: 95,
      priceMax: 195,
    });

    expect(runtime.commit('chartPan')).toEqual({
      startTime: 900,
      endTime: 1_900,
      priceMin: 95,
      priceMax: 195,
    });
    expect(runtime.getSnapshot().owner).toBe('none');
  });

  it('cancels live chart pan without persisting the live viewport', () => {
    const runtime = new NativeInteractionRuntime(viewport);

    begin(runtime, 'chartPan');
    runtime.updateChartPan({
      delta: { x: -30, y: 20 },
      timePerPixel: 1,
      pricePerPixel: 1,
    });

    expect(runtime.cancel('chartPan')).toEqual(viewport);
    expect(runtime.getCommittedViewport()).toEqual(viewport);
    expect(runtime.getRenderViewport()).toEqual(viewport);
  });

  it('begins, updates, and commits price scale without changing time range', () => {
    const runtime = new NativeInteractionRuntime(viewport);

    begin(runtime, 'priceScale');

    expect(runtime.updatePriceScale({ deltaY: 100, sensitivity: 0.01, anchorPrice: 150 })).toBe(true);
    const live = runtime.getRenderViewport();

    expect(live.startTime).toBe(viewport.startTime);
    expect(live.endTime).toBe(viewport.endTime);
    expect(live.priceMax - live.priceMin).toBeCloseTo(100 * Math.exp(1));
    expect(runtime.commit('priceScale')).toEqual(live);
  });

  it('begins, updates, and commits chart axis pinch with independent x and y scales', () => {
    const runtime = new NativeInteractionRuntime(viewport);

    begin(runtime, 'chartPinch');

    expect(
      runtime.updateChartAxisPinch({
        scaleX: 2,
        scaleY: 0.5,
        anchorTime: 1_250,
        anchorPrice: 175,
        focalTimeRatio: 0.25,
        focalPriceRatio: 0.25,
      }),
    ).toBe(true);

    expect(runtime.getRenderViewport()).toEqual({
      startTime: 1_125,
      endTime: 1_625,
      priceMin: 25,
      priceMax: 225,
    });
    expect(runtime.commit('chartPinch')).toEqual({
      startTime: 1_125,
      endTime: 1_625,
      priceMin: 25,
      priceMax: 225,
    });
  });

  it('rejects updates and commits from a non-owner', () => {
    const runtime = new NativeInteractionRuntime(viewport);

    begin(runtime, 'chartPan');

    expect(runtime.update('priceScale', { delta: { x: 0, y: 10 } })).toBe(false);
    expect(runtime.commit('priceScale')).toBeNull();
    expect(runtime.cancel('priceScale')).toBeNull();
    expect(runtime.getSnapshot().owner).toBe('chartPan');
  });

  it('does not persist live viewport before commit', () => {
    const runtime = new NativeInteractionRuntime(viewport);

    begin(runtime, 'chartPan');
    runtime.updateChartPan({ delta: { x: 10, y: 0 }, timePerPixel: 10 });

    expect(runtime.getCommittedViewport()).toEqual(viewport);
    expect(runtime.getRenderViewport()).toEqual({
      ...viewport,
      startTime: 900,
      endTime: 1_900,
    });
  });

  it('tracks a monotonic sequence for begin, commit, cancel, and reset', () => {
    const runtime = new NativeInteractionRuntime(viewport);

    expect(runtime.getSnapshot().sequence).toBe(0);
    begin(runtime, 'chartPan');
    expect(runtime.getSnapshot().sequence).toBe(1);
    runtime.commit('chartPan');
    expect(runtime.getSnapshot().sequence).toBe(2);
    begin(runtime, 'priceScale');
    expect(runtime.getSnapshot().sequence).toBe(3);
    runtime.cancel('priceScale');
    expect(runtime.getSnapshot().sequence).toBe(4);
    runtime.reset(viewport);
    expect(runtime.getSnapshot().sequence).toBe(5);
  });

  it('rejects invalid viewport ranges before they enter runtime state', () => {
    expect(
      () =>
        new NativeInteractionRuntime({
          ...viewport,
          priceMax: Number.POSITIVE_INFINITY,
        }),
    ).toThrow('finite viewport');

    const runtime = new NativeInteractionRuntime(viewport);

    expect(() =>
      runtime.begin('chartPan', { x: 0, y: 0 }, {
        ...viewport,
        endTime: viewport.startTime,
      }),
    ).toThrow('endTime');
  });
});

describe('native viewport transform helpers', () => {
  it('pans the viewport by caller-supplied pixel conversion rates', () => {
    expect(
      panViewport(viewport, {
        delta: { x: 12, y: 4 },
        timePerPixel: 5,
        pricePerPixel: 2,
      }),
    ).toEqual({
      startTime: 940,
      endTime: 1_940,
      priceMin: 108,
      priceMax: 208,
    });
  });

  it('rejects non-finite pan transform inputs before returning a viewport', () => {
    expect(() =>
      panViewport(viewport, {
        delta: { x: 1, y: 0 },
        timePerPixel: Number.POSITIVE_INFINITY,
      }),
    ).toThrow('timePerPixel');
  });

  it('axis-pinches time without changing price when only horizontal component changes', () => {
    expect(
      axisPinchViewport(viewport, {
        scaleX: 2,
        scaleY: 1,
        anchorTime: 1_500,
        anchorPrice: 150,
        focalTimeRatio: 0.5,
        focalPriceRatio: 0.5,
      }),
    ).toEqual({
      startTime: 1_250,
      endTime: 1_750,
      priceMin: 100,
      priceMax: 200,
    });
  });

  it('axis-pinches price without changing time when only vertical component changes', () => {
    expect(
      axisPinchViewport(viewport, {
        scaleX: 1,
        scaleY: 2,
        anchorTime: 1_500,
        anchorPrice: 150,
        focalTimeRatio: 0.5,
        focalPriceRatio: 0.5,
      }),
    ).toEqual({
      startTime: 1_000,
      endTime: 2_000,
      priceMin: 125,
      priceMax: 175,
    });
  });

  it('uses focal movement as two-finger canvas pan during axis pinch', () => {
    expect(
      axisPinchViewport(viewport, {
        scaleX: 1,
        scaleY: 1,
        anchorTime: 1_500,
        anchorPrice: 150,
        focalTimeRatio: 0.75,
        focalPriceRatio: 0.25,
      }),
    ).toEqual({
      startTime: 750,
      endTime: 1_750,
      priceMin: 75,
      priceMax: 175,
    });
  });

  it('scales prices around an explicit anchor', () => {
    const next = scaleViewportPrices(viewport, {
      deltaY: Math.log(2) / 0.01,
      sensitivity: 0.01,
      anchorPrice: 125,
    });

    expect(next.priceMin).toBeCloseTo(75);
    expect(next.priceMax).toBeCloseTo(275);
  });

  it('rejects non-finite price scale outputs before returning a viewport', () => {
    expect(() =>
      scaleViewportPrices(viewport, {
        deltaY: 1_000,
        sensitivity: 1_000,
      }),
    ).toThrow('non-finite range');
  });

  it('scales time around an explicit anchor', () => {
    const next = scaleViewportTime(viewport, {
      deltaX: Math.log(0.5) / 0.01,
      sensitivity: 0.01,
      anchorTime: 1_250,
    });

    expect(next.startTime).toBeCloseTo(1_125);
    expect(next.endTime).toBeCloseTo(1_625);
  });

  it('rejects non-finite time scale inputs before returning a viewport', () => {
    expect(() =>
      scaleViewportTime(viewport, {
        deltaX: Number.NaN,
      }),
    ).toThrow('time scale deltaX');
  });
});
