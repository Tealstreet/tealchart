import type { DrawingCoordinateSpace } from './coordinates';
import type {
  ArrowLineDrawing,
  ArrowMarkDownDrawing,
  ArrowMarkUpDrawing,
  ArrowMarkerDrawing,
  CircleDrawing,
  CrossLineDrawing,
  DatePriceRangeDrawing,
  DateRangeDrawing,
  EllipseDrawing,
  ExtendedLineDrawing,
  FibExtensionDrawing,
  FibRetracementDrawing,
  HorizontalRayDrawing,
  InfoLineDrawing,
  PathDrawing,
  ParallelChannelDrawing,
  PriceRangeDrawing,
  RectangleDrawing,
  RegressionTrendDrawing,
  TriangleDrawing,
  TrendAngleDrawing,
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
  resolveBarsPatternFromAnchors,
  resolveDateRangeRectFromAnchors,
  resolveExtendedSegment,
  resolveFibExtensionFromAnchors,
  resolveFibRetracementFromAnchors,
  resolvePolylineFromAnchors,
  resolveRaySegment,
  resolveRectFromAnchors,
  resolveRiskRewardPositionFromAnchors,
  resolveTrendAngleFromSegment,
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

  it('formats screen-space trend angle labels', () => {
    expect(
      resolveTrendAngleFromSegment({
        start: { x: 10, y: 70 },
        end: { x: 110, y: 20 },
      }),
    ).toMatchObject({
      angleDegrees: 26.56505117707799,
      label: '26.6°',
      labelPoint: { x: 60, y: 41 },
    });
    expect(
      resolveTrendAngleFromSegment({
        start: { x: 110, y: 20 },
        end: { x: 10, y: 70 },
      }).label,
    ).toBe('26.6°');
    expect(
      resolveTrendAngleFromSegment({
        start: { x: 10, y: 20 },
        end: { x: 110, y: 70 },
      }).label,
    ).toBe('-26.6°');
    expect(
      resolveTrendAngleFromSegment({
        start: { x: 50, y: 20 },
        end: { x: 50, y: 80 },
      }).label,
    ).toBe('90°');
    expect(
      resolveTrendAngleFromSegment({
        start: { x: 50, y: 80 },
        end: { x: 50, y: 20 },
      }).label,
    ).toBe('90°');
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

  it('resolves long position risk and reward geometry', () => {
    const position = resolveRiskRewardPositionFromAnchors(
      'longPosition',
      { time: 1_000, price: 100 },
      { time: 3_000, price: 110 },
      { time: 3_000, price: 95 },
      space,
    );

    expect(position.profitRect).toEqual({ x: 10, y: 20, width: 200, height: 50 });
    expect(position.riskRect).toEqual({ x: 10, y: 70, width: 200, height: 25 });
    expect(position.entryLine).toEqual({ start: { x: 10, y: 70 }, end: { x: 210, y: 70 } });
    expect(position.rewardLabel).toBe('Reward +10.00 (+10.00%)');
    expect(position.riskLabel).toBe('Risk -5.00 (-5.00%)');
    expect(position.ratioLabel).toBe('R:R 2.00');
  });

  it('includes stop anchor time in risk reward horizontal extents', () => {
    const position = resolveRiskRewardPositionFromAnchors(
      'longPosition',
      { time: 1_500, price: 100 },
      { time: 2_500, price: 110 },
      { time: 3_000, price: 95 },
      space,
    );

    expect(position.entryLine).toEqual({ start: { x: 60, y: 70 }, end: { x: 210, y: 70 } });
    expect(position.stopLine).toEqual({ start: { x: 60, y: 95 }, end: { x: 210, y: 95 } });
  });

  it('resolves bars pattern candles from source bars at a placement anchor', () => {
    const pattern = resolveBarsPatternFromAnchors(
      { time: 1_000, price: 100 },
      { time: 2_000, price: 100 },
      { time: 2_000, price: 101 },
      {
        ...space,
        bars: [
          { time: 1_000, open: 100, high: 104, low: 99, close: 102, volume: 1 },
          { time: 2_000, open: 102, high: 105, low: 101, close: 101, volume: 1 },
          { time: 3_000, open: 101, high: 103, low: 100, close: 103, volume: 1 },
        ],
      },
    );

    expect(pattern.bars).toMatchObject([
      { time: 2_000, x: 110, openY: 75, highY: 55, lowY: 80, closeY: 65, up: true },
      { time: 3_000, x: 210, openY: 65, highY: 50, lowY: 70, closeY: 70, up: false },
    ]);
    expect(pattern.bars[0]?.bodyWidth).toBe(12);
    expect(pattern.bounds).toEqual({ x: 104, y: 50, width: 112, height: 30 });
    expect(pattern.placement).toEqual({ x: 110, y: 65 });
  });

  it('resolves Fibonacci retracement levels from two anchors', () => {
    const retracement = resolveFibRetracementFromAnchors({ time: 1_000, price: 90 }, { time: 3_000, price: 110 }, space);

    expect(retracement.rect).toEqual({ x: 10, y: 20, width: 200, height: 100 });
    expect(retracement.levels.map(({ ratio, label, price }) => ({ ratio, label, price }))).toEqual([
      { ratio: 0, label: '0', price: 90 },
      { ratio: 0.236, label: '0.236', price: 94.72 },
      { ratio: 0.382, label: '0.382', price: 97.64 },
      { ratio: 0.5, label: '0.5', price: 100 },
      { ratio: 0.618, label: '0.618', price: 102.36 },
      { ratio: 0.786, label: '0.786', price: 105.72 },
      { ratio: 1, label: '1', price: 110 },
      { ratio: 1.618, label: '1.618', price: 122.36 },
      { ratio: 2.618, label: '2.618', price: 142.36 },
    ]);
    expect(retracement.levels.map((level) => level.y)).toEqual([
      120,
      96.4,
      81.8,
      70,
      58.2,
      expect.closeTo(41.4),
      20,
      -41.8,
      expect.closeTo(-141.8),
    ]);
    expect(retracement.levels[3]?.segment).toEqual({ start: { x: 10, y: 70 }, end: { x: 210, y: 70 } });
  });

  it('resolves Fibonacci extension levels from two anchors', () => {
    const extension = resolveFibExtensionFromAnchors({ time: 1_000, price: 90 }, { time: 3_000, price: 110 }, space);

    expect(extension.rect).toEqual({ x: 10, y: 20, width: 200, height: 100 });
    expect(extension.levels.map(({ ratio, label, price }) => ({ ratio, label, price }))).toEqual([
      { ratio: 0, label: '0', price: 90 },
      { ratio: 0.382, label: '0.382', price: 97.64 },
      { ratio: 0.618, label: '0.618', price: 102.36 },
      { ratio: 1, label: '1', price: 110 },
      { ratio: 1.272, label: '1.272', price: 115.44 },
      { ratio: 1.414, label: '1.414', price: 118.28 },
      { ratio: 1.618, label: '1.618', price: 122.36 },
      { ratio: 2, label: '2.000', price: 130 },
      { ratio: 2.618, label: '2.618', price: 142.36 },
    ]);
    expect(extension.levels[3]?.segment).toEqual({ start: { x: 10, y: 20 }, end: { x: 210, y: 20 } });
  });

  it('resolves polylines from ordered anchors', () => {
    expect(
      resolvePolylineFromAnchors(
        [
          { time: 1_000, price: 100 },
          { time: 2_000, price: 110 },
          { time: 3_000, price: 90 },
        ],
        space,
      ),
    ).toEqual({
      points: [
        { x: 10, y: 70 },
        { x: 110, y: 20 },
        { x: 210, y: 120 },
      ],
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
    const circle: CircleDrawing = {
      ...trendLine,
      id: 'circle',
      kind: 'circle',
      points: [
        { time: 1_000, price: 110 },
        { time: 3_000, price: 90 },
      ],
    };
    const ellipse: EllipseDrawing = {
      ...trendLine,
      id: 'ellipse',
      kind: 'ellipse',
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
    const trendAngle: TrendAngleDrawing = {
      ...trendLine,
      id: 'angle',
      kind: 'trendAngle',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 110 },
      ],
    };
    const arrowMarker: ArrowMarkerDrawing = {
      ...trendLine,
      id: 'marker',
      kind: 'arrowMarker',
    };
    const arrowMarkUp: ArrowMarkUpDrawing = {
      ...trendLine,
      id: 'mark-up',
      kind: 'arrowMarkUp',
      point: { time: 2_000, price: 100 },
    };
    const arrowMarkDown: ArrowMarkDownDrawing = {
      ...trendLine,
      id: 'mark-down',
      kind: 'arrowMarkDown',
      point: { time: 2_000, price: 100 },
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
    const infoLine: InfoLineDrawing = {
      ...trendLine,
      id: 'info',
      kind: 'infoLine',
    };
    const horizontalRay: HorizontalRayDrawing = {
      ...trendLine,
      id: 'horizontal-ray',
      kind: 'horizontalRay',
      point: { time: 2_000, price: 100 },
    };
    const crossLine: CrossLineDrawing = {
      ...trendLine,
      id: 'cross-line',
      kind: 'crossLine',
      point: { time: 2_000, price: 100 },
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
    const datePriceRange: DatePriceRangeDrawing = {
      ...trendLine,
      id: 'date-price-range',
      kind: 'datePriceRange',
      points: [
        { time: 1_000, price: 110 },
        { time: 3_000, price: 90 },
      ],
    };
    const fibRetracement: FibRetracementDrawing = {
      ...trendLine,
      id: 'fib',
      kind: 'fibRetracement',
      points: [
        { time: 1_000, price: 90 },
        { time: 3_000, price: 110 },
      ],
    };
    const fibExtension: FibExtensionDrawing = {
      ...trendLine,
      id: 'fib-ext',
      kind: 'fibExtension',
      points: [
        { time: 1_000, price: 90 },
        { time: 3_000, price: 110 },
      ],
    };
    const path: PathDrawing = {
      ...trendLine,
      id: 'path',
      kind: 'path',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 110 },
        { time: 3_000, price: 90 },
      ],
    };
    const triangle: TriangleDrawing = {
      ...trendLine,
      id: 'triangle',
      kind: 'triangle',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 110 },
        { time: 3_000, price: 90 },
      ],
    };
    const channel: ParallelChannelDrawing = {
      ...trendLine,
      id: 'channel',
      kind: 'parallelChannel',
      points: [
        { time: 1_000, price: 100 },
        { time: 3_000, price: 100 },
        { time: 1_000, price: 110 },
      ],
    };
    const regressionTrend: RegressionTrendDrawing = {
      ...channel,
      id: 'regression',
      kind: 'regressionTrend',
    };

    expect(resolveUserDrawingGeometry(trendLine, space)).toMatchObject({
      kind: 'line',
      segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 70 } },
    });
    expect(resolveUserDrawingGeometry(arrowLine, space)).toMatchObject({
      kind: 'arrowLine',
      segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 70 } },
    });
    expect(resolveUserDrawingGeometry(trendAngle, space)).toMatchObject({
      kind: 'trendAngle',
      angle: {
        segment: { start: { x: 10, y: 70 }, end: { x: 110, y: 20 } },
        label: '26.6°',
        labelPoint: { x: 60, y: 41 },
      },
    });
    expect(resolveUserDrawingGeometry(arrowMarker, space)).toMatchObject({
      kind: 'arrowMarker',
      marker: {
        segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 70 } },
        points: [
          { x: 210, y: 70 },
          { x: 188, y: 79 },
          { x: 10, y: 73.5 },
          { x: 10, y: 66.5 },
          { x: 188, y: 61 },
        ],
      },
    });
    expect(resolveUserDrawingGeometry(arrowMarkUp, space)).toMatchObject({
      kind: 'arrowMark',
      mark: {
        point: { x: 110, y: 70 },
        points: [
          { x: 110, y: 70 },
          { x: 119, y: 80.8 },
          { x: 113.5, y: 80.8 },
          { x: 113.5, y: 94 },
          { x: 106.5, y: 94 },
          { x: 106.5, y: 80.8 },
          { x: 101, y: 80.8 },
        ],
      },
    });
    expect(resolveUserDrawingGeometry(arrowMarkDown, space)).toMatchObject({
      kind: 'arrowMark',
      mark: {
        point: { x: 110, y: 70 },
        points: [
          { x: 110, y: 70 },
          { x: 119, y: 59.2 },
          { x: 113.5, y: 59.2 },
          { x: 113.5, y: 46 },
          { x: 106.5, y: 46 },
          { x: 106.5, y: 59.2 },
          { x: 101, y: 59.2 },
        ],
      },
    });
    expect(resolveUserDrawingGeometry(extendedLine, space)).toMatchObject({
      kind: 'line',
      segment: { start: { x: 10, y: 82.5 }, end: { x: 210, y: 32.5 } },
    });
    expect(resolveUserDrawingGeometry(infoLine, space)).toMatchObject({
      kind: 'infoLine',
      segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 70 } },
    });
    expect(resolveUserDrawingGeometry(horizontalRay, space)).toMatchObject({
      kind: 'horizontalRay',
      segment: { start: { x: 110, y: 70 }, end: { x: 210, y: 70 } },
    });
    expect(resolveUserDrawingGeometry(crossLine, space)).toMatchObject({
      kind: 'crossLine',
      crossLine: {
        point: { x: 110, y: 70 },
        horizontal: { start: { x: 10, y: 70 }, end: { x: 210, y: 70 } },
        vertical: { start: { x: 110, y: 20 }, end: { x: 110, y: 120 } },
      },
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
    expect(resolveUserDrawingGeometry(circle, space)).toMatchObject({
      kind: 'circle',
      circle: {
        center: { x: 110, y: 70 },
        radius: 50,
        rect: { x: 10, y: 20, width: 200, height: 100 },
      },
    });
    expect(resolveUserDrawingGeometry(ellipse, space)).toMatchObject({
      kind: 'ellipse',
      ellipse: {
        center: { x: 110, y: 70 },
        radiusX: 100,
        radiusY: 50,
        rect: { x: 10, y: 20, width: 200, height: 100 },
      },
    });
    expect(resolveUserDrawingGeometry(priceRange, space)).toMatchObject({
      kind: 'priceRange',
      rect: { x: 10, y: 20, width: 200, height: 100 },
    });
    expect(resolveUserDrawingGeometry(dateRange, space)).toMatchObject({
      kind: 'dateRange',
      rect: { x: 10, y: 20, width: 200, height: 100 },
    });
    expect(resolveUserDrawingGeometry(datePriceRange, space)).toMatchObject({
      kind: 'datePriceRange',
      rect: { x: 10, y: 20, width: 200, height: 100 },
    });
    expect(resolveUserDrawingGeometry(fibRetracement, space)).toMatchObject({
      kind: 'fibRetracement',
      fib: {
        rect: { x: 10, y: 20, width: 200, height: 100 },
        levels: [
          { ratio: 0, label: '0', price: 90, y: 120 },
          { ratio: 0.236, label: '0.236', price: 94.72, y: 96.4 },
          { ratio: 0.382, label: '0.382', price: 97.64, y: 81.8 },
          { ratio: 0.5, label: '0.5', price: 100, y: 70 },
          { ratio: 0.618, label: '0.618', price: 102.36, y: 58.2 },
          { ratio: 0.786, label: '0.786', price: 105.72, y: expect.closeTo(41.4) },
          { ratio: 1, label: '1', price: 110, y: 20 },
          { ratio: 1.618, label: '1.618', price: 122.36, y: -41.8 },
          { ratio: 2.618, label: '2.618', price: 142.36, y: expect.closeTo(-141.8) },
        ],
      },
    });
    expect(resolveUserDrawingGeometry(fibExtension, space)).toMatchObject({
      kind: 'fibExtension',
      fib: {
        rect: { x: 10, y: 20, width: 200, height: 100 },
        levels: [
          { ratio: 0, label: '0', price: 90, y: 120 },
          { ratio: 0.382, label: '0.382', price: 97.64, y: 81.8 },
          { ratio: 0.618, label: '0.618', price: 102.36, y: 58.2 },
          { ratio: 1, label: '1', price: 110, y: 20 },
          { ratio: 1.272, label: '1.272', price: 115.44, y: expect.closeTo(-7.2) },
          { ratio: 1.414, label: '1.414', price: 118.28, y: expect.closeTo(-21.4) },
          { ratio: 1.618, label: '1.618', price: 122.36, y: -41.8 },
          { ratio: 2, label: '2.000', price: 130, y: -80 },
          { ratio: 2.618, label: '2.618', price: 142.36, y: expect.closeTo(-141.8) },
        ],
      },
    });
    expect(resolveUserDrawingGeometry(path, space)).toMatchObject({
      kind: 'path',
      polyline: {
        points: [
          { x: 10, y: 70 },
          { x: 110, y: 20 },
          { x: 210, y: 120 },
        ],
      },
    });
    expect(resolveUserDrawingGeometry(triangle, space)).toMatchObject({
      kind: 'triangle',
      polygon: {
        points: [
          { x: 10, y: 70 },
          { x: 110, y: 20 },
          { x: 210, y: 120 },
        ],
      },
    });
    expect(resolveUserDrawingGeometry(channel, space)).toMatchObject({
      kind: 'parallelChannel',
      channel: {
        base: { start: { x: 10, y: 70 }, end: { x: 210, y: 70 } },
        parallel: { start: { x: 10, y: 20 }, end: { x: 210, y: 20 } },
        polygon: {
          points: [
            { x: 10, y: 70 },
            { x: 210, y: 70 },
            { x: 210, y: 20 },
            { x: 10, y: 20 },
          ],
        },
      },
    });
    expect(resolveUserDrawingGeometry(regressionTrend, space)).toMatchObject({
      kind: 'regressionTrend',
      channel: {
        base: { start: { x: 10, y: 70 }, end: { x: 210, y: 70 } },
        parallel: { start: { x: 10, y: 20 }, end: { x: 210, y: 20 } },
        polygon: {
          points: [
            { x: 10, y: 70 },
            { x: 210, y: 70 },
            { x: 210, y: 20 },
            { x: 10, y: 20 },
          ],
        },
      },
    });
  });

  it('fits regression trend baselines to bar closes in the selected time range', () => {
    const regressionSpace: DrawingCoordinateSpace = {
      ...space,
      bars: [
        { time: 1_000, open: 100, high: 102, low: 98, close: 102, volume: 1 },
        { time: 2_000, open: 102, high: 104, low: 101, close: 104, volume: 1 },
        { time: 3_000, open: 104, high: 106, low: 103, close: 106, volume: 1 },
      ],
    };
    const regressionTrend: RegressionTrendDrawing = {
      id: 'regression',
      kind: 'regressionTrend',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      points: [
        { time: 1_000, price: 100 },
        { time: 3_000, price: 100 },
        { time: 1_000, price: 110 },
      ],
    };

    expect(resolveUserDrawingGeometry(regressionTrend, regressionSpace)).toMatchObject({
      kind: 'regressionTrend',
      channel: {
        base: { start: { x: 10, y: 60 }, end: { x: 210, y: 40 } },
        parallel: { start: { x: 10, y: 20 }, end: { x: 210, y: 0 } },
        polygon: {
          points: [
            { x: 10, y: 60 },
            { x: 210, y: 40 },
            { x: 210, y: 0 },
            { x: 10, y: 20 },
          ],
        },
      },
    });
  });
});
