import { describe, expect, it } from 'vitest';

import { createNativeChartFrameFromPanes, getNativePaneAtY, getNativePriceAxisPaneAt } from '../render/nativeChartFrame';
import { canBeginNativeChartPan } from './nativeTradeLineHitTest';
import { resolveNativeIndicatorPaneScaleRange } from './nativeIndicatorPaneScale';

const base = { paneHeight: 66, plotHeight: 442, startYMin: -20, startYMax: 20 };

describe('resolveNativeIndicatorPaneScaleRange', () => {
  it('scales around the range centre', () => {
    for (const translationY of [-40, -5, 5, 40]) {
      const next = resolveNativeIndicatorPaneScaleRange({ ...base, translationY });
      expect((next.yMin + next.yMax) / 2).toBeCloseTo(0, 6);
    }
  });

  it('opens the range dragging down and closes it dragging up', () => {
    const opened = resolveNativeIndicatorPaneScaleRange({ ...base, translationY: 30 });
    const closed = resolveNativeIndicatorPaneScaleRange({ ...base, translationY: -30 });

    expect(opened.yMax - opened.yMin).toBeGreaterThan(40);
    expect(closed.yMax - closed.yMin).toBeLessThan(40);
  });

  // Without normalising by pane height, the same drag would blow a short
  // indicator pane wide open while barely moving a full-height one.
  it('normalises the drag by how tall the pane is', () => {
    const shortPane = resolveNativeIndicatorPaneScaleRange({ ...base, paneHeight: 66, translationY: 20 });
    const fullPane = resolveNativeIndicatorPaneScaleRange({ ...base, paneHeight: 442, translationY: 20 });

    expect(shortPane.yMax - shortPane.yMin).toBeGreaterThan(fullPane.yMax - fullPane.yMin);
  });

  it('clamps runaway drags', () => {
    const far = resolveNativeIndicatorPaneScaleRange({ ...base, translationY: 100_000 });
    const near = resolveNativeIndicatorPaneScaleRange({ ...base, translationY: -100_000 });

    expect(far.yMax - far.yMin).toBeCloseTo(40 * 10, 6);
    expect(near.yMax - near.yMin).toBeCloseTo(40 * 0.1, 6);
  });

  it('leaves a degenerate range alone', () => {
    expect(resolveNativeIndicatorPaneScaleRange({ ...base, startYMin: 5, startYMax: 5, translationY: 30 })).toEqual({
      yMin: 5,
      yMax: 5,
    });
  });
});

describe('getNativePriceAxisPaneAt', () => {
  const frame = createNativeChartFrameFromPanes({
    dimensions: { width: 402, height: 504, margins: { top: 36, right: 64, bottom: 26, left: 0 } },
    panes: [
      { id: 'main', type: 'main', top: 36, height: 376, yMin: 0, yMax: 1 },
      { id: 'pane_1', type: 'indicator', top: 412, height: 66, yMin: 0, yMax: 100 },
    ],
  });
  const axisX = frame.priceAxisHitLeft + 4;

  it('resolves the pane the axis touch falls in', () => {
    expect(getNativePriceAxisPaneAt(frame, axisX, 200)?.id).toBe('main');
    expect(getNativePriceAxisPaneAt(frame, axisX, 440)?.id).toBe('pane_1');
  });

  it('ignores touches outside the axis band', () => {
    expect(getNativePriceAxisPaneAt(frame, frame.contentLeft + 10, 440)).toBeNull();
  });

  it('ignores touches below the last pane', () => {
    expect(getNativePriceAxisPaneAt(frame, axisX, 495)).toBeNull();
  });
});

describe('panning inside an indicator pane', () => {
  const frame = createNativeChartFrameFromPanes({
    dimensions: { width: 402, height: 504, margins: { top: 36, right: 64, bottom: 26, left: 0 } },
    panes: [
      { id: 'main', type: 'main', top: 36, height: 376, yMin: 0, yMax: 1 },
      { id: 'pane_1', type: 'indicator', top: 412, height: 66, yMin: 0, yMax: 100 },
    ],
  });
  const panArgs = {
    actionZones: [],
    orderDragZones: [],
    rows: [],
    sharedViewport: {} as never,
    frame,
    tradeLabelHeight: 18,
  };

  // Bounding this to mainPane meant a drag starting in an indicator pane began
  // no gesture at all, so those panes could not be scrolled through time.
  it('begins a pan inside an indicator pane', () => {
    expect(canBeginNativeChartPan({ ...panArgs, x: 100, y: 440 })).toBe(true);
    expect(canBeginNativeChartPan({ ...panArgs, x: 100, y: 200 })).toBe(true);
  });

  it('still refuses the price axis and the area below the panes', () => {
    expect(canBeginNativeChartPan({ ...panArgs, x: frame.priceAxisHitLeft + 4, y: 440 })).toBe(false);
    expect(canBeginNativeChartPan({ ...panArgs, x: 100, y: 495 })).toBe(false);
  });

  // A vertical drag in an indicator pane must not haul the main price viewport;
  // the gesture reads this to zero out translationY.
  it('identifies the pane a touch starts in', () => {
    expect(getNativePaneAtY(frame, 200)?.type).toBe('main');
    expect(getNativePaneAtY(frame, 440)?.type).toBe('indicator');
    expect(getNativePaneAtY(frame, 495)).toBeNull();
  });
});
