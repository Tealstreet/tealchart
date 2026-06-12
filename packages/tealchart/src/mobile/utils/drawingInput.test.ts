import type { ChartDimensions, PaneInfo } from './coordinates';

import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../../state/chartState';
import { resolveMobileUserDrawingInputPoint } from './drawingInput';

const dimensions: ChartDimensions = {
  width: 320,
  height: 240,
  margins: {
    top: 0,
    right: 40,
    bottom: 24,
    left: 8,
  },
};

const panes: PaneInfo[] = [
  {
    id: 'main',
    type: 'main',
    top: 0,
    height: 144,
    yMin: 90,
    yMax: 110,
  },
  {
    id: 'macd',
    type: 'indicator',
    top: 144,
    height: 72,
    yMin: -10,
    yMax: 10,
  },
];

describe('mobile user drawing input resolver', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('normalizes mobile pane info before resolving anchors', () => {
    expect(
      resolveMobileUserDrawingInputPoint({
        point: { x: 144, y: 180 },
        viewport: {
          startTime: 1_000,
          endTime: 3_000,
          priceMin: 90,
          priceMax: 110,
        },
        dimensions,
        panes,
      }),
    ).toEqual({
      paneId: 'macd',
      anchor: { time: 2_000, price: 0 },
      position: { x: 0.5, y: 0.5 },
      bars: undefined,
    });
  });

  it('rejects points in mobile chart margins', () => {
    expect(
      resolveMobileUserDrawingInputPoint({
        point: { x: 300, y: 180 },
        viewport: {
          startTime: 1_000,
          endTime: 3_000,
          priceMin: 90,
          priceMax: 110,
        },
        dimensions,
        panes,
      }),
    ).toBeNull();
  });
});
