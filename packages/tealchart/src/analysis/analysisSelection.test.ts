import { describe, expect, it } from 'vitest';

import { AnalysisSelection, analysisSelectionTimeAtX, analysisSelectionXAtTime } from './analysisSelection';

const frame = {
  identity: 'TEST:1:1',
  timeRange: { from: 1000, to: 2000 },
  projectionLeft: 20,
  projectionRight: 1020,
  plot: { left: 20, top: 36, width: 940, height: 400 },
};

describe('analysis range selection', () => {
  it('maps native candle anchors across session gaps without extrapolating blank space', () => {
    const native = {
      ...frame,
      timeRange: { from: 1000, to: 8000 },
      timeAnchors: [
        { time: 1000, x: 20 },
        { time: 2000, x: 420 },
        { time: 8000, x: 820 },
      ],
    };
    expect(analysisSelectionTimeAtX(native, 620)).toBe(5000);
    expect(analysisSelectionXAtTime(native, 5000)).toBe(620);
    expect(analysisSelectionTimeAtX(native, 960)).toBe(8000);
    expect(analysisSelectionTimeAtX(native, -100)).toBe(1000);
    expect(analysisSelectionXAtTime(native, 9000)).toBe(820);
    const selector = new AnalysisSelection(() => {});
    selector.updateFrame(native);
    expect(selector.start()).toBe(true);
    expect(selector.begin(620, 100)).toBe(true);
    selector.end(20);
    expect(selector.getState().range).toEqual({ from: 1000, to: 5000 });
  });

  it('clones frozen native anchors and cancels when their current projection changes', () => {
    const native = {
      ...frame,
      timeRange: { from: 1000, to: 8000 },
      timeAnchors: [
        { time: 1000, x: -20 },
        { time: 2000, x: 420 },
        { time: 8000, x: 820 },
      ],
    };
    const selector = new AnalysisSelection(() => {});
    selector.updateFrame(native);
    selector.start();
    native.timeAnchors[1].time = 3000;
    expect(selector.begin(420, 100)).toBe(true);
    selector.end(820);
    expect(selector.getState().range).toEqual({ from: 2000, to: 8000 });
    selector.updateFrame(native);
    expect(selector.getState()).toMatchObject({ active: false, message: expect.stringContaining('chart changed') });
  });

  it.each(
    [
      [],
      new Array<{ time: number; x: number }>(2),
      [{ time: 1000, x: 20 }],
      [
        { time: -1, x: 20 },
        { time: 2000, x: 420 },
      ],
      [
        { time: 1000, x: NaN },
        { time: 2000, x: 420 },
      ],
      [
        { time: 1000, x: 20 },
        { time: Infinity, x: 420 },
      ],
      [
        { time: 1000, x: 20 },
        { time: 1000, x: 420 },
      ],
      [
        { time: 2000, x: 20 },
        { time: 1000, x: 420 },
      ],
      [
        { time: 1000, x: 20 },
        { time: 2000, x: 20 },
      ],
      [
        { time: 1000, x: 420 },
        { time: 2000, x: 20 },
      ],
      [
        { time: 1000, x: -Number.MAX_VALUE },
        { time: 2000, x: Number.MAX_VALUE },
      ],
    ].map((timeAnchors) => ({ timeAnchors })),
  )('visibly refuses invalid native anchors (%j)', ({ timeAnchors }) => {
    const selector = new AnalysisSelection(() => {});
    selector.updateFrame({ ...frame, timeAnchors });
    expect(selector.start()).toBe(false);
    expect(selector.getState()).toMatchObject({ active: false, message: expect.stringContaining('not ready') });
    expect(selector.begin(120, 100)).toBe(false);
    selector.end(520);
    expect(selector.getState().range).toBeUndefined();
  });

  it('uses the candle projection width while clipping input to the main plot before the price axis', () => {
    expect(analysisSelectionTimeAtX(frame, 520)).toBe(1500);
    expect(analysisSelectionXAtTime(frame, 1500)).toBe(520);
    expect(analysisSelectionTimeAtX(frame, 1020)).toBe(1940);
    const selector = new AnalysisSelection(() => {});
    selector.updateFrame(frame);
    selector.start();
    expect(selector.begin(500, 20)).toBe(false);
    expect(selector.begin(990, 100)).toBe(false);
    expect(selector.begin(520, 100)).toBe(true);
    selector.end(120);
    expect(selector.getState().range).toEqual({ from: 1100, to: 1500 });
  });

  it('freezes geometry and cancels with a visible reason when market/scale/layout changes', () => {
    const selector = new AnalysisSelection(() => {});
    selector.updateFrame(frame);
    selector.start();
    selector.begin(520, 100);
    selector.updateFrame({ ...frame, identity: 'OTHER:1:2' });
    selector.end(800);
    expect(selector.getState()).toMatchObject({ active: false, message: expect.stringContaining('chart changed') });
    selector.start();
    selector.begin(520, 100);
    selector.updateFrame({ ...frame, identity: 'OTHER:1:2', plot: { ...frame.plot, height: 200 } });
    expect(selector.getState().active).toBe(false);
    selector.cancel();
    expect(selector.getState()).toEqual({ active: false });
  });

  it('reports unavailable geometry and refuses malformed coordinates or a zero-width selection', () => {
    const selector = new AnalysisSelection(() => {});
    expect(selector.start()).toBe(false);
    expect(selector.getState().message).toContain('not ready');
    selector.updateFrame(frame);
    selector.start();
    expect(selector.begin(NaN, 100)).toBe(false);
    selector.begin(520, 100);
    selector.end(520);
    expect(selector.getState()).toMatchObject({ active: true, message: expect.stringContaining('Drag across') });
    selector.cancel();
    selector.selectRange({ from: 1000, to: 1500 });
    expect(selector.getState()).toEqual({ active: false });
  });
});
