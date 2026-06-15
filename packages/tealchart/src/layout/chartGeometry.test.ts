import type { UnifiedPaneLayout } from '../types';

import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import {
  clampRectToBounds,
  computeLeftToolRailAvoidanceInset,
  computeLeftToolRailTop,
  computeChartGeometry,
  computePaneGeometry,
  computeTopLeftLegendRect,
  insetRect,
  intersectsRect,
  MOBILE_CHART_CHROME_METRICS,
  rect,
  WEB_CHART_CHROME_METRICS,
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
  afterEach(() => {
    clearChartStoreCache();
  });

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

  it('describes platform chrome metrics for overlay layout consumers', () => {
    const webSnapshot = computeChartGeometry({
      width: 500,
      height: 320,
      margins: { top: WEB_CHART_CHROME_METRICS.topBarHeight, right: 60, bottom: 26, left: 0 },
      paneLayout,
      topBarHeight: WEB_CHART_CHROME_METRICS.topBarHeight,
      leftToolRailWidth: WEB_CHART_CHROME_METRICS.leftToolRailWidth,
    });
    const mobileSnapshot = computeChartGeometry({
      width: 500,
      height: 320,
      margins: { top: MOBILE_CHART_CHROME_METRICS.topBarHeight, right: 60, bottom: 26, left: 0 },
      paneLayout,
      topBarHeight: MOBILE_CHART_CHROME_METRICS.topBarHeight,
      leftToolRailWidth: MOBILE_CHART_CHROME_METRICS.leftToolRailWidth,
    });

    expect(computeLeftToolRailTop(WEB_CHART_CHROME_METRICS)).toBe(40);
    expect(computeLeftToolRailTop(MOBILE_CHART_CHROME_METRICS)).toBe(44);
    expect(webSnapshot.chrome.topBar).toEqual({ x: 0, y: 0, width: 500, height: 32 });
    expect(webSnapshot.chrome.leftTools).toEqual({ x: 0, y: 32, width: 50, height: 288 });
    expect(mobileSnapshot.chrome.topBar).toEqual({ x: 0, y: 0, width: 500, height: 36 });
    expect(mobileSnapshot.chrome.leftTools).toEqual({ x: 0, y: 36, width: 52, height: 284 });
  });

  it('computes overlay insets that avoid the left drawing rail when space allows', () => {
    expect(computeLeftToolRailAvoidanceInset(WEB_CHART_CHROME_METRICS, 800, 304)).toBe(66);
    expect(computeLeftToolRailAvoidanceInset(MOBILE_CHART_CHROME_METRICS, 800, 304)).toBe(68);
    expect(computeLeftToolRailAvoidanceInset(WEB_CHART_CHROME_METRICS, 340, 304)).toBe(28);
    expect(computeLeftToolRailAvoidanceInset(MOBILE_CHART_CHROME_METRICS, 300, 304)).toBe(8);
  });

  it('tracks optional top-left legend overlay metadata without reserving canvas space', () => {
    const snapshot = computeChartGeometry({
      width: 500,
      height: 320,
      margins: { top: WEB_CHART_CHROME_METRICS.topBarHeight, right: 60, bottom: 26, left: 0 },
      paneLayout,
      topBarHeight: WEB_CHART_CHROME_METRICS.topBarHeight,
      leftToolRailWidth: WEB_CHART_CHROME_METRICS.leftToolRailWidth,
      topLeftLegend: true,
      chromeMetrics: WEB_CHART_CHROME_METRICS,
    });

    expect(computeTopLeftLegendRect(WEB_CHART_CHROME_METRICS, rect(0, 0, 500, 320))).toEqual({
      x: 12,
      y: 40,
      width: 480,
      height: 44,
    });
    expect(computeTopLeftLegendRect(WEB_CHART_CHROME_METRICS, rect(0, 0, 500, 320), 0, { avoidLeftTools: true })).toEqual({
      x: 70,
      y: 40,
      width: 430,
      height: 44,
    });
    expect(computeTopLeftLegendRect(MOBILE_CHART_CHROME_METRICS, rect(0, 0, 500, 320))).toBeNull();
    expect(snapshot.chrome.topLeftLegend).toEqual({ x: 70, y: 40, width: 430, height: 44 });
    expect(snapshot.drawable).toEqual({ x: 0, y: 0, width: 440, height: 294 });
    expect(snapshot.avoidRects).toContainEqual({ x: 70, y: 40, width: 430, height: 44 });
  });

  it('positions panes within safe-area-adjusted vertical bounds', () => {
    const snapshot = computeChartGeometry({
      width: 400,
      height: 300,
      margins: { top: 10, right: 50, bottom: 26, left: 0 },
      paneLayout,
      safeAreaInsets: { top: 20, bottom: 8 },
    });

    expect(snapshot.panes[0].top).toBe(30);
    expect(snapshot.panes[0].height).toBeCloseTo(165.2);
    expect(snapshot.panes[0].bottom).toBeCloseTo(195.2);
    expect(snapshot.panes[1].top).toBeCloseTo(195.2);
    expect(snapshot.panes[1].height).toBeCloseTo(70.8);
    expect(snapshot.panes[1].bottom).toBe(266);
    expect(snapshot.chrome.bottomTimeAxis).toEqual({ x: 0, y: 266, width: 400, height: 26 });
  });
});
