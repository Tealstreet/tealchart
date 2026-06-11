import type { DrawingCoordinateSpace } from './coordinates';
import type {
  ArrowLineDrawing,
  DateRangeDrawing,
  ExtendedLineDrawing,
  PriceRangeDrawing,
  RectangleDrawing,
  TrendLineDrawing,
  UserDrawingStyle,
} from './types';

import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import {
  anchorToScreenPoint,
  drawingXToTime,
  drawingYToPrice,
  priceToDrawingY,
  resolveDateRangeRectFromAnchors,
  resolveExtendedSegment,
  resolveRaySegment,
  resolveRectFromAnchors,
  resolveUserDrawingGeometry,
  resolveUserDrawingInputPoint,
  resolveUserDrawingInputPointFromChart,
  screenPointToAnchor,
  timeToDrawingX,
} from './coordinates';

const style: UserDrawingStyle = {
  lineColor: '#fff',
  lineWidth: 1,
  lineStyle: 'solid',
};

const space: DrawingCoordinateSpace = {
  viewport: {
    startTime: 1_000,
    endTime: 3_000,
    priceMin: 90,
    priceMax: 110,
  },
  pane: {
    id: 'main',
    top: 20,
    height: 100,
    bottom: 120,
    yMin: 90,
    yMax: 110,
  },
  chartLeft: 10,
  chartRight: 210,
};

describe('user drawing coordinates', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('maps time and price values to screen coordinates and back', () => {
    expect(timeToDrawingX(2_000, space)).toBe(110);
    expect(drawingXToTime(110, space)).toBe(2_000);
    expect(priceToDrawingY(100, space)).toBe(70);
    expect(drawingYToPrice(70, space)).toBe(100);
  });

  it('maps anchors to screen points and back', () => {
    const point = anchorToScreenPoint({ time: 2_000, price: 100 }, space);

    expect(point).toEqual({ x: 110, y: 70 });
    expect(screenPointToAnchor(point, space)).toEqual({ time: 2_000, price: 100 });
  });

  it('resolves screen input points against computed panes', () => {
    const panes = [
      space.pane,
      {
        id: 'rsi',
        top: 120,
        height: 80,
        bottom: 200,
        yMin: 0,
        yMax: 100,
      },
    ];

    expect(
      resolveUserDrawingInputPoint({
        point: { x: 110, y: 160 },
        viewport: space.viewport,
        panes,
        chartLeft: space.chartLeft,
        chartRight: space.chartRight,
      }),
    ).toEqual({
      paneId: 'rsi',
      anchor: { time: 2_000, price: 50 },
    });
  });

  it('rejects input points outside chart bounds and pane bounds', () => {
    expect(
      resolveUserDrawingInputPoint({
        point: { x: 9, y: 70 },
        viewport: space.viewport,
        panes: [space.pane],
        chartLeft: space.chartLeft,
        chartRight: space.chartRight,
      }),
    ).toBeNull();

    expect(
      resolveUserDrawingInputPoint({
        point: { x: 210, y: 70 },
        viewport: space.viewport,
        panes: [space.pane],
        chartLeft: space.chartLeft,
        chartRight: space.chartRight,
      }),
    ).toBeNull();

    expect(
      resolveUserDrawingInputPoint({
        point: { x: 110, y: 120 },
        viewport: space.viewport,
        panes: [space.pane],
        chartLeft: space.chartLeft,
        chartRight: space.chartRight,
      }),
    ).toBeNull();
  });

  it('resolves chart-bound input points from margins', () => {
    expect(
      resolveUserDrawingInputPointFromChart({
        point: { x: 110, y: 70 },
        viewport: space.viewport,
        panes: [space.pane],
        width: 250,
        margins: { left: 10, right: 40 },
      }),
    ).toEqual({
      paneId: 'main',
      anchor: { time: 2_000, price: 100 },
    });
  });

  it('extends non-vertical segments to chart bounds', () => {
    const segment = resolveExtendedSegment({ x: 100, y: 100 }, { x: 200, y: 0 }, 'both', 0, 300);

    expect(segment.start).toEqual({ x: 0, y: 200 });
    expect(segment.end).toEqual({ x: 300, y: -100 });
  });

  it('leaves vertical extended segments finite', () => {
    const segment = resolveExtendedSegment({ x: 100, y: 100 }, { x: 100, y: 0 }, 'both', 0, 300);

    expect(segment).toEqual({ start: { x: 100, y: 100 }, end: { x: 100, y: 0 } });
  });

  it('extends rays toward the second anchor direction', () => {
    expect(resolveRaySegment({ x: 100, y: 100 }, { x: 200, y: 50 }, 0, 300).end).toEqual({
      x: 300,
      y: 0,
    });
    expect(resolveRaySegment({ x: 100, y: 100 }, { x: 50, y: 50 }, 0, 300).start).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('extends vertical rays toward the second anchor direction', () => {
    expect(resolveRaySegment({ x: 100, y: 60 }, { x: 100, y: 40 }, 0, 300, 20, 120).end).toEqual({
      x: 100,
      y: 20,
    });
    expect(resolveRaySegment({ x: 100, y: 60 }, { x: 100, y: 80 }, 0, 300, 20, 120).end).toEqual({
      x: 100,
      y: 120,
    });
  });

  it('resolves rectangles from unordered anchors', () => {
    const rect = resolveRectFromAnchors({ time: 3_000, price: 90 }, { time: 1_000, price: 110 }, space);

    expect(rect).toEqual({ x: 10, y: 20, width: 200, height: 100 });
  });

  it('resolves date ranges across the full pane height', () => {
    expect(resolveDateRangeRectFromAnchors({ time: 3_000, price: 90 }, { time: 1_000, price: 110 }, space)).toEqual({
      x: 10,
      y: 20,
      width: 200,
      height: 100,
    });
  });

  it('resolves drawing geometry by kind', () => {
    const trendLine: TrendLineDrawing = {
      id: 'line',
      kind: 'trendLine',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      points: [
        { time: 1_000, price: 100 },
        { time: 3_000, price: 100 },
      ],
      extend: 'none',
    };
    const rectangle: RectangleDrawing = {
      ...trendLine,
      id: 'rect',
      kind: 'rectangle',
      points: [
        { time: 1_000, price: 110 },
        { time: 3_000, price: 90 },
      ],
    };
    const arrowLine: ArrowLineDrawing = {
      ...trendLine,
      id: 'arrow',
      kind: 'arrowLine',
    };
    const extendedLine: ExtendedLineDrawing = {
      ...trendLine,
      id: 'extended',
      kind: 'extendedLine',
      points: [
        { time: 1_500, price: 100 },
        { time: 2_500, price: 105 },
      ],
    };
    const priceRange: PriceRangeDrawing = {
      ...trendLine,
      id: 'range',
      kind: 'priceRange',
      points: [
        { time: 1_000, price: 110 },
        { time: 3_000, price: 90 },
      ],
    };
    const dateRange: DateRangeDrawing = {
      ...trendLine,
      id: 'date-range',
      kind: 'dateRange',
      points: [
        { time: 1_000, price: 95 },
        { time: 3_000, price: 105 },
      ],
    };

    expect(resolveUserDrawingGeometry(trendLine, space)).toMatchObject({
      kind: 'line',
      segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 70 } },
    });
    expect(resolveUserDrawingGeometry(arrowLine, space)).toMatchObject({
      kind: 'arrowLine',
      segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 70 } },
    });
    expect(resolveUserDrawingGeometry(extendedLine, space)).toMatchObject({
      kind: 'line',
      segment: { start: { x: 10, y: 82.5 }, end: { x: 210, y: 32.5 } },
    });
    expect(
      resolveUserDrawingGeometry(
        {
          ...extendedLine,
          points: [
            { time: 2_000, price: 95 },
            { time: 2_000, price: 105 },
          ],
        },
        space,
      ),
    ).toMatchObject({
      kind: 'line',
      segment: { start: { x: 110, y: 20 }, end: { x: 110, y: 120 } },
    });
    expect(resolveUserDrawingGeometry(rectangle, space)).toMatchObject({
      kind: 'rectangle',
      rect: { x: 10, y: 20, width: 200, height: 100 },
    });
    expect(resolveUserDrawingGeometry(priceRange, space)).toMatchObject({
      kind: 'priceRange',
      rect: { x: 10, y: 20, width: 200, height: 100 },
    });
    expect(resolveUserDrawingGeometry(dateRange, space)).toMatchObject({
      kind: 'dateRange',
      rect: { x: 10, y: 20, width: 200, height: 100 },
    });
  });
});
