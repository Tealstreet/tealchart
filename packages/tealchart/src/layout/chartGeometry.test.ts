import type { UnifiedPaneLayout } from '../types';

import { describe, expect, it } from 'vitest';

import {
  clampRectToBounds,
  computeChartGeometry,
  computePaneGeometry,
  insetRect,
  intersectsRect,
  rect,
} from './chartGeometry';

const paneLayout: UnifiedPaneLayout = {
  timeAxisHeight: 26,
  panes: [
    {
      id: 'main',
      type: 'main',
      heightRatio: 0.7,
      yMin: 10,
      yMax: 20,
      fixedRange: false,
    },
    {
      id: 'pane_1',
      type: 'indicator',
      heightRatio: 0.3,
      yMin: 0,
      yMax: 100,
      fixedRange: true,
      indicatorIds: ['rsi'],
    },
  ],
};

describe('chart geometry', () => {
  it('normalizes rect dimensions and applies insets', () => {
    expect(rect(1, 2, -10, 20)).toEqual({ x: 1, y: 2, width: 0, height: 20 });
    expect(insetRect(rect(0, 0, 100, 80), { top: 10, right: 20, bottom: 5, left: 4 })).toEqual({
      x: 4,
      y: 10,
      width: 76,
      height: 65,
    });
  });

  it('detects intersections and clamps overlays inside bounds', () => {
    expect(intersectsRect(rect(0, 0, 10, 10), rect(9, 9, 10, 10))).toBe(true);
    expect(intersectsRect(rect(0, 0, 10, 10), rect(10, 10, 10, 10))).toBe(false);
    expect(clampRectToBounds(rect(80, -5, 40, 20), rect(0, 0, 100, 50))).toEqual({
      x: 60,
      y: 0,
      width: 40,
      height: 20,
    });
  });

  it('computes pane positions with existing time-axis and top-margin semantics', () => {
    const panes = computePaneGeometry({ paneLayout, height: 526, topOffset: 12 });

    expect(panes[0].id).toBe('main');
    expect(panes[0].top).toBe(12);
    expect(panes[0].height).toBeCloseTo(341.6);
    expect(panes[0].bottom).toBeCloseTo(353.6);
    expect(panes[1].id).toBe('pane_1');
    expect(panes[1].top).toBeCloseTo(353.6);
    expect(panes[1].height).toBeCloseTo(146.4);
    expect(panes[1].bottom).toBe(500);
  });

  it('keeps canvas full-size while computing reserve and overlay chrome geometry', () => {
    const snapshot = computeChartGeometry({
      width: 800,
      height: 600,
      margins: { top: 10, right: 64, bottom: 26, left: 0 },
      paneLayout,
      topBarHeight: 40,
      leftToolRailWidth: 48,
      chrome: {
        topBar: 'overlay',
        leftTools: 'overlay',
        rightPriceAxis: 'hybrid',
        bottomTimeAxis: 'hybrid',
      },
    });

    expect(snapshot.canvas).toEqual({ x: 0, y: 0, width: 800, height: 600 });
    expect(snapshot.chrome.topBar).toEqual({ x: 0, y: 0, width: 800, height: 40 });
    expect(snapshot.chrome.leftTools).toEqual({ x: 0, y: 40, width: 48, height: 560 });
    expect(snapshot.chrome.rightPriceAxis).toEqual({ x: 736, y: 0, width: 64, height: 600 });
    expect(snapshot.chrome.bottomTimeAxis).toEqual({ x: 0, y: 574, width: 800, height: 26 });
    expect(snapshot.drawable).toEqual({ x: 0, y: 0, width: 736, height: 574 });
    expect(snapshot.avoidRects).toHaveLength(4);
  });

  it('can reserve top and left chrome without shrinking the backing canvas', () => {
    const snapshot = computeChartGeometry({
      width: 400,
      height: 300,
      margins: { top: 0, right: 50, bottom: 26, left: 0 },
      paneLayout,
      topBarHeight: 32,
      leftToolRailWidth: 44,
      chrome: {
        topBar: 'reserve',
        leftTools: 'reserve',
        rightPriceAxis: 'reserve',
        bottomTimeAxis: 'reserve',
      },
    });

    expect(snapshot.canvas).toEqual({ x: 0, y: 0, width: 400, height: 300 });
    expect(snapshot.drawable).toEqual({ x: 44, y: 32, width: 306, height: 242 });
  });
});
