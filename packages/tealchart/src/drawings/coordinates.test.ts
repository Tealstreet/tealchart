import type { DrawingCoordinateSpace } from './coordinates';
import type {
  ArrowLineDrawing,
  ArrowMarkDownDrawing,
  ArrowMarkLeftDrawing,
  ArrowMarkRightDrawing,
  ArrowMarkUpDrawing,
  ArrowMarkerDrawing,
  ArcDrawing,
  CircleDrawing,
  CrossLineDrawing,
  CurveDrawing,
  CyclicLinesDrawing,
  DatePriceRangeDrawing,
  DateRangeDrawing,
  DisjointChannelDrawing,
  EllipseDrawing,
  ExtendedLineDrawing,
  FibChannelDrawing,
  FibExtensionDrawing,
  FibCirclesDrawing,
  FibFanDrawing,
  FibSpeedResistanceArcsDrawing,
  FibSpeedResistanceFanDrawing,
  FibRetracementDrawing,
  FibTimeZoneDrawing,
  FlagMarkDrawing,
  ForecastDrawing,
  FibWedgeDrawing,
  FibSpiralDrawing,
  TrendBasedFibTimeDrawing,
  GannBoxDrawing,
  GannFanDrawing,
  GannSquareDrawing,
  FlatTopBottomDrawing,
  HorizontalRayDrawing,
  InfoLineDrawing,
  PathDrawing,
  ParallelChannelDrawing,
  PitchforkDrawing,
  PriceRangeDrawing,
  ProjectionDrawing,
  RectangleDrawing,
  RegressionTrendDrawing,
  SignpostDrawing,
  SineLineDrawing,
  TimeCyclesDrawing,
  TriangleDrawing,
  TrendAngleDrawing,
  TrendLineDrawing,
  UserDrawing,
  UserDrawingStyle,
} from './types';

import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import {
  anchorToScreenPoint,
  drawingXToTime,
  drawingYToPrice,
  priceToDrawingY,
  resolveAnchoredVwapFromAnchor,
  resolveArcFromAnchors,
  resolveBarsPatternFromAnchors,
  resolveCurveFromAnchors,
  resolveDateRangeRectFromAnchors,
  resolveDisjointChannelFromAnchors,
  resolveExtendedSegment,
  resolveFibExtensionFromAnchors,
  resolveFibRetracementFromAnchors,
  resolveFlatTopBottomFromAnchors,
  resolvePitchforkFromAnchors,
  resolvePitchfanFromAnchors,
  resolvePolylineFromAnchors,
  resolveRaySegment,
  resolveRectFromAnchors,
  resolveRiskRewardPositionFromAnchors,
  resolveRotatedRectangleFromAnchors,
  resolveTrendAngleFromSegment,
  resolveUserDrawingGeometry,
  resolveUserDrawingInputPoint,
  resolveUserDrawingInputPointFromChart,
  resolveAbcdPatternFromAnchors,
  resolveElliottCorrectiveWaveFromAnchors,
  resolveElliottImpulseWaveFromAnchors,
  resolveElliottTriangleWaveFromAnchors,
  resolveHeadShouldersPatternFromAnchors,
  resolveThreeDrivesPatternFromAnchors,
  resolveTrianglePatternFromAnchors,
  resolveXabcdPatternFromAnchors,
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

  it('resolves XABCD pattern polylines and labels from five anchors', () => {
    expect(
      resolveXabcdPatternFromAnchors(
        [
          { time: 1_000, price: 100 },
          { time: 1_500, price: 110 },
          { time: 2_000, price: 95 },
          { time: 2_500, price: 105 },
          { time: 3_000, price: 90 },
        ],
        space,
      ),
    ).toEqual({
      polyline: {
        points: [
          { x: 10, y: 70 },
          { x: 60, y: 20 },
          { x: 110, y: 95 },
          { x: 160, y: 45 },
          { x: 210, y: 120 },
        ],
      },
      labels: [
        { text: 'X', point: { x: 10, y: 70 } },
        { text: 'A', point: { x: 60, y: 20 } },
        { text: 'B', point: { x: 110, y: 95 } },
        { text: 'C', point: { x: 160, y: 45 } },
        { text: 'D', point: { x: 210, y: 120 } },
      ],
    });
  });

  it('resolves three drives pattern polylines and labels from five anchors', () => {
    expect(
      resolveThreeDrivesPatternFromAnchors(
        [
          { time: 1_000, price: 100 },
          { time: 1_500, price: 110 },
          { time: 2_000, price: 95 },
          { time: 2_500, price: 105 },
          { time: 3_000, price: 90 },
        ],
        space,
      ),
    ).toEqual({
      polyline: {
        points: [
          { x: 10, y: 70 },
          { x: 60, y: 20 },
          { x: 110, y: 95 },
          { x: 160, y: 45 },
          { x: 210, y: 120 },
        ],
      },
      labels: [
        { text: '1', point: { x: 10, y: 70 } },
        { text: 'A', point: { x: 60, y: 20 } },
        { text: '2', point: { x: 110, y: 95 } },
        { text: 'C', point: { x: 160, y: 45 } },
        { text: '3', point: { x: 210, y: 120 } },
      ],
    });
  });

  it('resolves head and shoulders pattern polylines, neckline, and labels from five anchors', () => {
    expect(
      resolveHeadShouldersPatternFromAnchors(
        [
          { time: 1_000, price: 100 },
          { time: 1_500, price: 90 },
          { time: 2_000, price: 110 },
          { time: 2_500, price: 90 },
          { time: 3_000, price: 100 },
        ],
        space,
      ),
    ).toEqual({
      polyline: {
        points: [
          { x: 10, y: 70 },
          { x: 60, y: 120 },
          { x: 110, y: 20 },
          { x: 160, y: 120 },
          { x: 210, y: 70 },
        ],
      },
      neckline: { start: { x: 60, y: 120 }, end: { x: 160, y: 120 } },
      labels: [
        { text: 'LS', point: { x: 10, y: 70 } },
        { text: 'N1', point: { x: 60, y: 120 } },
        { text: 'H', point: { x: 110, y: 20 } },
        { text: 'N2', point: { x: 160, y: 120 } },
        { text: 'RS', point: { x: 210, y: 70 } },
      ],
    });
  });

  it('resolves Elliott impulse wave polylines and labels from five anchors', () => {
    expect(
      resolveElliottImpulseWaveFromAnchors(
        [
          { time: 1_000, price: 100 },
          { time: 1_500, price: 80 },
          { time: 2_000, price: 120 },
          { time: 2_500, price: 90 },
          { time: 3_000, price: 130 },
        ],
        space,
      ),
    ).toEqual({
      polyline: {
        points: [
          { x: 10, y: 70 },
          { x: 60, y: 170 },
          { x: 110, y: -30 },
          { x: 160, y: 120 },
          { x: 210, y: -80 },
        ],
      },
      labels: [
        { text: '1', point: { x: 10, y: 70 } },
        { text: '2', point: { x: 60, y: 170 } },
        { text: '3', point: { x: 110, y: -30 } },
        { text: '4', point: { x: 160, y: 120 } },
        { text: '5', point: { x: 210, y: -80 } },
      ],
    });
  });

  it('resolves Elliott corrective wave polylines and labels from three anchors', () => {
    expect(
      resolveElliottCorrectiveWaveFromAnchors(
        [
          { time: 1_000, price: 100 },
          { time: 1_500, price: 80 },
          { time: 2_000, price: 120 },
        ],
        space,
      ),
    ).toEqual({
      polyline: {
        points: [
          { x: 10, y: 70 },
          { x: 60, y: 170 },
          { x: 110, y: -30 },
        ],
      },
      labels: [
        { text: 'A', point: { x: 10, y: 70 } },
        { text: 'B', point: { x: 60, y: 170 } },
        { text: 'C', point: { x: 110, y: -30 } },
      ],
    });
  });

  it('resolves Elliott triangle wave polylines and labels from five anchors', () => {
    expect(
      resolveElliottTriangleWaveFromAnchors(
        [
          { time: 1_000, price: 100 },
          { time: 1_500, price: 120 },
          { time: 2_000, price: 90 },
          { time: 2_500, price: 110 },
          { time: 3_000, price: 95 },
        ],
        space,
      ),
    ).toEqual({
      polyline: {
        points: [
          { x: 10, y: 70 },
          { x: 60, y: -30 },
          { x: 110, y: 120 },
          { x: 160, y: 20 },
          { x: 210, y: 95 },
        ],
      },
      labels: [
        { text: 'A', point: { x: 10, y: 70 } },
        { text: 'B', point: { x: 60, y: -30 } },
        { text: 'C', point: { x: 110, y: 120 } },
        { text: 'D', point: { x: 160, y: 20 } },
        { text: 'E', point: { x: 210, y: 95 } },
      ],
    });
  });

  it('resolves ABCD pattern polylines and labels from four anchors', () => {
    expect(
      resolveAbcdPatternFromAnchors(
        [
          { time: 1_000, price: 100 },
          { time: 1_500, price: 110 },
          { time: 2_000, price: 95 },
          { time: 2_500, price: 105 },
        ],
        space,
      ),
    ).toEqual({
      polyline: {
        points: [
          { x: 10, y: 70 },
          { x: 60, y: 20 },
          { x: 110, y: 95 },
          { x: 160, y: 45 },
        ],
      },
      labels: [
        { text: 'A', point: { x: 10, y: 70 } },
        { text: 'B', point: { x: 60, y: 20 } },
        { text: 'C', point: { x: 110, y: 95 } },
        { text: 'D', point: { x: 160, y: 45 } },
      ],
    });
  });

  it('resolves triangle pattern boundaries, fill polygon, and labels from four anchors', () => {
    expect(
      resolveTrianglePatternFromAnchors(
        [
          { time: 1_000, price: 110 },
          { time: 1_500, price: 90 },
          { time: 2_000, price: 105 },
          { time: 2_500, price: 95 },
        ],
        space,
      ),
    ).toEqual({
      points: [
        { x: 10, y: 20 },
        { x: 60, y: 120 },
        { x: 110, y: 45 },
        { x: 160, y: 95 },
      ],
      polygon: {
        points: [
          { x: 10, y: 20 },
          { x: 110, y: 45 },
          { x: 160, y: 95 },
          { x: 60, y: 120 },
        ],
      },
      boundaries: [
        { start: { x: 10, y: 20 }, end: { x: 110, y: 45 } },
        { start: { x: 60, y: 120 }, end: { x: 160, y: 95 } },
      ],
      labels: [
        { text: 'A', point: { x: 10, y: 20 } },
        { text: 'B', point: { x: 60, y: 120 } },
        { text: 'C', point: { x: 110, y: 45 } },
        { text: 'D', point: { x: 160, y: 95 } },
      ],
    });
  });

  it('resolves quadratic curves from start, control, and end anchors', () => {
    const curve = resolveCurveFromAnchors(
      { time: 1_000, price: 100 },
      { time: 2_000, price: 110 },
      { time: 3_000, price: 100 },
      space,
    );

    expect(curve.start).toEqual({ x: 10, y: 70 });
    expect(curve.control).toEqual({ x: 110, y: 20 });
    expect(curve.end).toEqual({ x: 210, y: 70 });
    expect(curve.points).toHaveLength(49);
    expect(curve.points[24]).toEqual({ x: 110, y: 45 });
  });

  it('resolves circular arcs through start, middle, and end anchors', () => {
    const arc = resolveArcFromAnchors(
      { time: 1_000, price: 94 },
      { time: 2_000, price: 100 },
      { time: 3_000, price: 94 },
      space,
    );

    expect(arc.start).toEqual({ x: 10, y: 100 });
    expect(arc.through).toEqual({ x: 110, y: 70 });
    expect(arc.end).toEqual({ x: 210, y: 100 });
    expect(arc.center.x).toBeCloseTo(110);
    expect(arc.center.y).toBeCloseTo(251.6667);
    expect(arc.points).toHaveLength(97);
    expect(arc.points[48]?.x).toBeCloseTo(110);
    expect(arc.points[48]?.y).toBeCloseTo(70);
  });

  it('resolves rotated rectangles with perpendicular width', () => {
    expect(
      resolveRotatedRectangleFromAnchors(
        { time: 10, price: 50 },
        { time: 90, price: 50 },
        { time: 10, price: 80 },
        {
          ...space,
          viewport: { startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 },
          pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 100 },
          chartLeft: 0,
          chartRight: 100,
        },
      ),
    ).toEqual({
      base: { start: { x: 10, y: 50 }, end: { x: 90, y: 50 } },
      parallel: { start: { x: 10, y: 20 }, end: { x: 90, y: 20 } },
      polygon: {
        points: [
          { x: 10, y: 50 },
          { x: 90, y: 50 },
          { x: 90, y: 20 },
          { x: 10, y: 20 },
        ],
      },
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
    const arrowMarkLeft: ArrowMarkLeftDrawing = {
      ...trendLine,
      id: 'mark-left',
      kind: 'arrowMarkLeft',
      point: { time: 2_000, price: 100 },
    };
    const arrowMarkRight: ArrowMarkRightDrawing = {
      ...trendLine,
      id: 'mark-right',
      kind: 'arrowMarkRight',
      point: { time: 2_000, price: 100 },
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
    const signpost: SignpostDrawing = {
      ...trendLine,
      id: 'signpost',
      kind: 'signpost',
      point: { time: 2_000, price: 100 },
      text: 'Signal',
      textAlign: 'center',
    };
    const flagMark: FlagMarkDrawing = {
      ...trendLine,
      id: 'flag',
      kind: 'flagMark',
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
    const forecast: ForecastDrawing = {
      ...trendLine,
      id: 'forecast',
      kind: 'forecast',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 110 },
      ],
    };
    const projection: ProjectionDrawing = {
      ...trendLine,
      id: 'projection',
      kind: 'projection',
      points: [
        { time: 1_000, price: 100 },
        { time: 1_500, price: 105 },
        { time: 2_000, price: 110 },
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
    const fibFan: FibFanDrawing = {
      ...trendLine,
      id: 'fib-fan',
      kind: 'fibFan',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 90 },
      ],
    };
    const fibSpeedResistanceFan: FibSpeedResistanceFanDrawing = {
      ...trendLine,
      id: 'fib-speed-fan',
      kind: 'fibSpeedResistanceFan',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 90 },
      ],
    };
    const fibSpeedResistanceArcs: FibSpeedResistanceArcsDrawing = {
      ...trendLine,
      id: 'fib-speed-arcs',
      kind: 'fibSpeedResistanceArcs',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 90 },
      ],
    };
    const fibCircles: FibCirclesDrawing = {
      ...trendLine,
      id: 'fib-circles',
      kind: 'fibCircles',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 90 },
      ],
    };
    const fibWedge: FibWedgeDrawing = {
      ...trendLine,
      id: 'fib-wedge',
      kind: 'fibWedge',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 100 },
        { time: 2_000, price: 90 },
      ],
    };
    const fibSpiral: FibSpiralDrawing = {
      ...trendLine,
      id: 'fib-spiral',
      kind: 'fibSpiral',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 100 },
      ],
    };
    const fibChannel: FibChannelDrawing = {
      ...trendLine,
      id: 'fib-channel',
      kind: 'fibChannel',
      points: [
        { time: 1_000, price: 100 },
        { time: 3_000, price: 100 },
        { time: 1_000, price: 110 },
      ],
    };
    const fibTimeZone: FibTimeZoneDrawing = {
      ...trendLine,
      id: 'fib-time-zone',
      kind: 'fibTimeZone',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 100 },
      ],
    };
    const cyclicLines: CyclicLinesDrawing = {
      ...trendLine,
      id: 'cyclic-lines',
      kind: 'cyclicLines',
      points: [
        { time: 1_500, price: 100 },
        { time: 2_000, price: 100 },
      ],
    };
    const timeCycles: TimeCyclesDrawing = {
      ...trendLine,
      id: 'time-cycles',
      kind: 'timeCycles',
      points: [
        { time: 1_500, price: 100 },
        { time: 2_000, price: 110 },
      ],
    };
    const sineLine: SineLineDrawing = {
      ...trendLine,
      id: 'sine-line',
      kind: 'sineLine',
      points: [
        { time: 1_500, price: 100 },
        { time: 2_000, price: 110 },
      ],
    };
    const trendBasedFibTime: TrendBasedFibTimeDrawing = {
      ...trendLine,
      id: 'trend-fib-time',
      kind: 'trendBasedFibTime',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 100 },
        { time: 3_000, price: 90 },
      ],
    };
    const gannFan: GannFanDrawing = {
      ...trendLine,
      id: 'gann-fan',
      kind: 'gannFan',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 90 },
      ],
    };
    const gannBox: GannBoxDrawing = {
      ...trendLine,
      id: 'gann-box',
      kind: 'gannBox',
      points: [
        { time: 1_000, price: 110 },
        { time: 3_000, price: 90 },
      ],
    };
    const gannSquare: GannSquareDrawing = {
      ...trendLine,
      id: 'gann-square',
      kind: 'gannSquare',
      points: [
        { time: 1_000, price: 110 },
        { time: 2_000, price: 90 },
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
    const polyline: UserDrawing = {
      ...trendLine,
      id: 'polyline',
      kind: 'polyline',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 110 },
        { time: 3_000, price: 90 },
      ],
    };
    const curve: CurveDrawing = {
      ...trendLine,
      id: 'curve',
      kind: 'curve',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 110 },
        { time: 3_000, price: 100 },
      ],
    };
    const arc: ArcDrawing = {
      ...trendLine,
      id: 'arc',
      kind: 'arc',
      points: [
        { time: 1_000, price: 94 },
        { time: 2_000, price: 100 },
        { time: 3_000, price: 94 },
      ],
    };
    const rotatedRectangle: UserDrawing = {
      ...trendLine,
      id: 'rotated',
      kind: 'rotatedRectangle',
      points: [
        { time: 1_000, price: 100 },
        { time: 3_000, price: 100 },
        { time: 1_000, price: 110 },
      ],
    };
    const pitchfork: PitchforkDrawing = {
      ...trendLine,
      id: 'pitchfork',
      kind: 'pitchfork',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 110 },
        { time: 2_000, price: 90 },
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
    const pitchfan: UserDrawing = {
      ...trendLine,
      id: 'pitchfan',
      kind: 'pitchfan',
      points: [
        { time: 1_000, price: 100 },
        { time: 2_000, price: 110 },
        { time: 2_000, price: 90 },
      ],
    };
    const regressionTrend: RegressionTrendDrawing = {
      ...channel,
      id: 'regression',
      kind: 'regressionTrend',
    };
    const flatTopBottom: FlatTopBottomDrawing = {
      ...trendLine,
      id: 'flat',
      kind: 'flatTopBottom',
      points: [
        { time: 1_000, price: 100 },
        { time: 3_000, price: 110 },
        { time: 2_000, price: 95 },
      ],
    };
    const disjointChannel: DisjointChannelDrawing = {
      ...trendLine,
      id: 'disjoint',
      kind: 'disjointChannel',
      points: [
        { time: 1_000, price: 100 },
        { time: 3_000, price: 110 },
        { time: 1_000, price: 95 },
        { time: 3_000, price: 90 },
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
    expect(resolveUserDrawingGeometry(arrowMarkLeft, space)).toMatchObject({
      kind: 'arrowMark',
      mark: {
        point: { x: 110, y: 70 },
        points: [
          { x: 110, y: 70 },
          { x: 120.8, y: 79 },
          { x: 120.8, y: 73.5 },
          { x: 134, y: 73.5 },
          { x: 134, y: 66.5 },
          { x: 120.8, y: 66.5 },
          { x: 120.8, y: 61 },
        ],
      },
    });
    expect(resolveUserDrawingGeometry(arrowMarkRight, space)).toMatchObject({
      kind: 'arrowMark',
      mark: {
        point: { x: 110, y: 70 },
        points: [
          { x: 110, y: 70 },
          { x: 99.2, y: 79 },
          { x: 99.2, y: 73.5 },
          { x: 86, y: 73.5 },
          { x: 86, y: 66.5 },
          { x: 99.2, y: 66.5 },
          { x: 99.2, y: 61 },
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
    expect(resolveUserDrawingGeometry(signpost, space)).toMatchObject({
      kind: 'signpost',
      point: { x: 110, y: 70 },
    });
    expect(resolveUserDrawingGeometry(flagMark, space)).toMatchObject({
      kind: 'icon',
      icon: {
        name: 'flag',
        center: { x: 110, y: 70 },
        points: [
          { x: 101, y: 61 },
          { x: 119, y: 61 },
          { x: 113.15, y: 70 },
          { x: 119, y: 79 },
          { x: 101, y: 79 },
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
      infoMetrics: { deltaMs: 2_000, barCount: null, label: '0.00 (0.00%) / 2 seconds' },
    });
    expect(
      resolveUserDrawingGeometry(infoLine, {
        ...space,
        bars: [
          { time: 1_000, open: 100, high: 105, low: 95, close: 102, volume: 100 },
          { time: 2_000, open: 102, high: 106, low: 98, close: 104, volume: 100 },
          { time: 3_000, open: 104, high: 108, low: 100, close: 106, volume: 100 },
          { time: 4_000, open: 106, high: 110, low: 102, close: 108, volume: 100 },
        ],
      }),
    ).toMatchObject({
      kind: 'infoLine',
      infoMetrics: { deltaMs: 2_000, barCount: 3, label: '0.00 (0.00%) / 3 bars, 2 seconds' },
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
      dateMetrics: { deltaMs: 2_000, barCount: null, label: '2 seconds' },
    });
    expect(resolveUserDrawingGeometry(datePriceRange, space)).toMatchObject({
      kind: 'datePriceRange',
      rect: { x: 10, y: 20, width: 200, height: 100 },
      dateMetrics: { deltaMs: 2_000, barCount: null, label: '2 seconds' },
    });
    expect(
      resolveUserDrawingGeometry(dateRange, {
        ...space,
        bars: [
          { time: 1_000, open: 100, high: 105, low: 95, close: 102, volume: 100 },
          { time: 2_000, open: 102, high: 106, low: 98, close: 104, volume: 100 },
          { time: 3_000, open: 104, high: 108, low: 100, close: 106, volume: 100 },
          { time: 4_000, open: 106, high: 110, low: 102, close: 108, volume: 100 },
        ],
      }),
    ).toMatchObject({
      kind: 'dateRange',
      dateMetrics: { deltaMs: 2_000, barCount: 3, label: '3 bars, 2 seconds' },
    });
    expect(resolveUserDrawingGeometry(forecast, space)).toMatchObject({
      kind: 'forecast',
      forecast: {
        source: { x: 10, y: 70 },
        target: { x: 110, y: 20 },
        segment: { start: { x: 10, y: 70 }, end: { x: 110, y: 20 } },
        labelPoint: { x: 60, y: 41 },
        sourceLabel: 'Source 100.00',
        targetLabel: 'Target 110.00',
        changeLabel: '+10.00 (+10.00%) / 1 second',
      },
    });
    expect(resolveUserDrawingGeometry(projection, space)).toMatchObject({
      kind: 'projection',
      projection: {
        start: { x: 10, y: 70 },
        pivot: { x: 60, y: 45 },
        target: { x: 110, y: 20 },
        baseSegment: { start: { x: 10, y: 70 }, end: { x: 60, y: 45 } },
        projectionSegment: { start: { x: 60, y: 45 }, end: { x: 110, y: 20 } },
        labelPoint: { x: 85, y: 28.5 },
        startLabel: 'Start 100.00',
        pivotLabel: 'Pivot 105.00',
        targetLabel: 'Target 110.00',
        changeLabel: '+5.00 (+4.76%) / 500 ms',
      },
    });
    const barSpace: DrawingCoordinateSpace = {
      ...space,
      bars: [
        { time: 1_000, open: 100, high: 105, low: 95, close: 102, volume: 100 },
        { time: 1_500, open: 102, high: 106, low: 98, close: 104, volume: 100 },
        { time: 2_000, open: 104, high: 108, low: 100, close: 106, volume: 100 },
        { time: 2_500, open: 106, high: 110, low: 102, close: 108, volume: 100 },
      ],
    };
    expect(resolveUserDrawingGeometry(forecast, barSpace)).toMatchObject({
      kind: 'forecast',
      forecast: {
        changeLabel: '+10.00 (+10.00%) / 3 bars, 1 second',
      },
    });
    expect(resolveUserDrawingGeometry(projection, barSpace)).toMatchObject({
      kind: 'projection',
      projection: {
        changeLabel: '+5.00 (+4.76%) / 2 bars, 500 ms',
      },
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
    expect(resolveUserDrawingGeometry(fibFan, space)).toMatchObject({
      kind: 'fibFan',
      fibFan: {
        origin: { x: 10, y: 70 },
        targetStart: { x: 110, y: 70 },
        targetEnd: { x: 110, y: 120 },
        rays: expect.arrayContaining([
          { ratio: 0, target: { x: 110, y: 70 }, segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 70 } } },
          {
            ratio: 0.5,
            target: { x: 110, y: 95 },
            segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 120 } },
          },
          { ratio: 1, target: { x: 110, y: 120 }, segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 170 } } },
        ]),
      },
    });
    expect(resolveUserDrawingGeometry(fibSpeedResistanceFan, space)).toMatchObject({
      kind: 'fibSpeedResistanceFan',
      fibSpeedResistanceFan: {
        origin: { x: 10, y: 70 },
        targetStart: { x: 110, y: 70 },
        targetEnd: { x: 110, y: 120 },
        rays: [
          {
            ratio: 1 / 3,
            target: { x: 110, y: expect.closeTo(86.67) },
            segment: { start: { x: 10, y: 70 }, end: { x: 210, y: expect.closeTo(103.33) } },
          },
          {
            ratio: 2 / 3,
            target: { x: 110, y: expect.closeTo(103.33) },
            segment: { start: { x: 10, y: 70 }, end: { x: 210, y: expect.closeTo(136.67) } },
          },
          { ratio: 1, target: { x: 110, y: 120 }, segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 170 } } },
        ],
      },
    });
    expect(resolveUserDrawingGeometry(fibSpeedResistanceArcs, space)).toMatchObject({
      kind: 'fibSpeedResistanceArcs',
      fibSpeedResistanceArcs: {
        center: { x: 10, y: 70 },
        reference: { x: 110, y: 120 },
        baseRadius: expect.closeTo(111.8),
        arcs: [
          expect.objectContaining({ ratio: 1 / 3, radius: expect.closeTo(37.27), startAngle: 0, endAngle: expect.closeTo(0.46) }),
          expect.objectContaining({ ratio: 2 / 3, radius: expect.closeTo(74.54), startAngle: 0, endAngle: expect.closeTo(0.46) }),
          expect.objectContaining({ ratio: 1, radius: expect.closeTo(111.8), startAngle: 0, endAngle: expect.closeTo(0.46) }),
        ],
      },
    });
    expect(resolveUserDrawingGeometry(fibCircles, space)).toMatchObject({
      kind: 'fibCircles',
      fibCircles: {
        center: { x: 10, y: 70 },
        baseRadius: expect.closeTo(111.8),
        circles: expect.arrayContaining([
          expect.objectContaining({ ratio: 0.236, radius: expect.closeTo(26.39) }),
          expect.objectContaining({ ratio: 1, radius: expect.closeTo(111.8) }),
          expect.objectContaining({ ratio: 2.618, radius: expect.closeTo(292.7) }),
        ]),
      },
    });
    expect(resolveUserDrawingGeometry(fibWedge, space)).toMatchObject({
      kind: 'fibWedge',
      fibWedge: {
        center: { x: 10, y: 70 },
        lower: { x: 110, y: 70 },
        upper: { x: 110, y: 120 },
        baseRadius: expect.closeTo(111.8),
        boundaries: [
          { start: { x: 10, y: 70 }, end: { x: 110, y: 70 } },
          { start: { x: 10, y: 70 }, end: { x: 110, y: 120 } },
        ],
        arcs: expect.arrayContaining([
          expect.objectContaining({ ratio: 0.236, radius: expect.closeTo(26.39), startAngle: 0, endAngle: expect.closeTo(0.46) }),
          expect.objectContaining({ ratio: 1, radius: expect.closeTo(111.8), startAngle: 0, endAngle: expect.closeTo(0.46) }),
          expect.objectContaining({ ratio: 2.618, radius: expect.closeTo(292.7), startAngle: 0, endAngle: expect.closeTo(0.46) }),
        ]),
      },
    });
    expect(resolveUserDrawingGeometry(fibSpiral, space)).toMatchObject({
      kind: 'fibSpiral',
      fibSpiral: {
        center: { x: 10, y: 70 },
        reference: { x: 110, y: 70 },
        baseRadius: 100,
        startAngle: 0,
        points: expect.arrayContaining([
          { x: 110, y: 70 },
          { x: expect.closeTo(10), y: expect.closeTo(231.8) },
        ]),
      },
    });
    expect(resolveUserDrawingGeometry(gannFan, space)).toMatchObject({
      kind: 'gannFan',
      gannFan: {
        origin: { x: 10, y: 70 },
        reference: { x: 110, y: 120 },
        rays: expect.arrayContaining([
          {
            ratio: 0.125,
            target: { x: 110, y: 76.25 },
            segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 82.5 } },
          },
          { ratio: 1, target: { x: 110, y: 120 }, segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 170 } } },
          { ratio: 2, target: { x: 110, y: 170 }, segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 270 } } },
        ]),
      },
    });
    expect(resolveUserDrawingGeometry(gannBox, space)).toMatchObject({
      kind: 'gannBox',
      gannBox: {
        rect: { x: 10, y: 20, width: 200, height: 100 },
        levels: expect.arrayContaining([
          expect.objectContaining({
            ratio: 0.5,
            horizontal: { start: { x: 10, y: 70 }, end: { x: 210, y: 70 } },
            vertical: { start: { x: 110, y: 20 }, end: { x: 110, y: 120 } },
          }),
        ]),
        angles: expect.arrayContaining([
          { start: { x: 10, y: 20 }, end: { x: 210, y: 120 } },
          { start: { x: 10, y: 120 }, end: { x: 210, y: 20 } },
        ]),
      },
    });
    expect(resolveUserDrawingGeometry(gannSquare, space)).toMatchObject({
      kind: 'gannSquare',
      gannBox: {
        rect: { x: 10, y: 20, width: 100, height: 100 },
        levels: expect.arrayContaining([
          expect.objectContaining({
            ratio: 0.5,
            horizontal: { start: { x: 10, y: 70 }, end: { x: 110, y: 70 } },
            vertical: { start: { x: 60, y: 20 }, end: { x: 60, y: 120 } },
          }),
        ]),
      },
    });
    expect(resolveUserDrawingGeometry(fibChannel, space)).toMatchObject({
      kind: 'fibChannel',
      fibChannel: {
        base: { start: { x: 10, y: 70 }, end: { x: 210, y: 70 } },
        polygon: {
          points: [
            { x: 10, y: 70 },
            { x: 210, y: 70 },
            { x: 210, y: 20 },
            { x: 10, y: 20 },
          ],
        },
        levels: expect.arrayContaining([
          { ratio: 0, segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 70 } } },
          { ratio: 0.5, segment: { start: { x: 10, y: 45 }, end: { x: 210, y: 45 } } },
          { ratio: 1, segment: { start: { x: 10, y: 20 }, end: { x: 210, y: 20 } } },
          { ratio: 2, segment: { start: { x: 10, y: -30 }, end: { x: 210, y: -30 } } },
        ]),
      },
    });
    expect(resolveUserDrawingGeometry(fibTimeZone, space)).toMatchObject({
      kind: 'fibTimeZone',
      fibTimeZone: {
        levels: expect.arrayContaining([
          { ratio: 0, time: 1_000, x: 10, segment: { start: { x: 10, y: 20 }, end: { x: 10, y: 120 } } },
          { ratio: 1, time: 2_000, x: 110, segment: { start: { x: 110, y: 20 }, end: { x: 110, y: 120 } } },
          { ratio: 2, time: 3_000, x: 210, segment: { start: { x: 210, y: 20 }, end: { x: 210, y: 120 } } },
        ]),
      },
    });
    expect(resolveUserDrawingGeometry(trendBasedFibTime, space)).toMatchObject({
      kind: 'trendBasedFibTime',
      trendBasedFibTime: {
        levels: expect.arrayContaining([
          { ratio: 0, time: 3_000, x: 210, segment: { start: { x: 210, y: 20 }, end: { x: 210, y: 120 } } },
          { ratio: 1, time: 4_000, x: 310, segment: { start: { x: 310, y: 20 }, end: { x: 310, y: 120 } } },
          { ratio: 2, time: 5_000, x: 410, segment: { start: { x: 410, y: 20 }, end: { x: 410, y: 120 } } },
        ]),
      },
    });
    expect(resolveUserDrawingGeometry(cyclicLines, space)).toMatchObject({
      kind: 'cyclicLines',
      cyclicLines: {
        interval: 500,
        levels: expect.arrayContaining([
          { ratio: -1, time: 1_000, x: 10, segment: { start: { x: 10, y: 20 }, end: { x: 10, y: 120 } } },
          { ratio: 0, time: 1_500, x: 60, segment: { start: { x: 60, y: 20 }, end: { x: 60, y: 120 } } },
          { ratio: 1, time: 2_000, x: 110, segment: { start: { x: 110, y: 20 }, end: { x: 110, y: 120 } } },
          { ratio: 3, time: 3_000, x: 210, segment: { start: { x: 210, y: 20 }, end: { x: 210, y: 120 } } },
        ]),
      },
    });
    expect(resolveUserDrawingGeometry(timeCycles, space)).toMatchObject({
      kind: 'timeCycles',
      timeCycles: {
        baseline: { x: 60, y: 70 },
        peak: { x: 110, y: 20 },
        interval: 500,
        cycles: expect.arrayContaining([
          expect.objectContaining({
            ratio: 0,
            startTime: 1_500,
            endTime: 2_000,
            startBoundary: { start: { x: 60, y: 20 }, end: { x: 60, y: 120 } },
            endBoundary: { start: { x: 110, y: 20 }, end: { x: 110, y: 120 } },
            points: expect.arrayContaining([{ x: 85, y: 20 }]),
          }),
        ]),
      },
    });
    expect(
      resolveUserDrawingGeometry(
        { ...timeCycles, points: [{ time: 2_000, price: 100 }, { time: 1_500, price: 110 }] },
        space,
      ),
    ).toMatchObject({
      kind: 'timeCycles',
      timeCycles: {
        cycles: expect.arrayContaining([
          expect.objectContaining({
            ratio: -1,
            startTime: 1_500,
            endTime: 2_000,
          }),
        ]),
      },
    });
    expect(resolveUserDrawingGeometry(sineLine, space)).toMatchObject({
      kind: 'sineLine',
      sineLine: {
        baseline: { x: 60, y: 70 },
        amplitudePoint: { x: 110, y: 20 },
        cycleLength: 2_000,
        points: expect.arrayContaining([
          { x: 60, y: 70 },
          { x: 110, y: 20 },
        ]),
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
    expect(resolveUserDrawingGeometry(polyline, space)).toMatchObject({
      kind: 'path',
      polyline: {
        points: [
          { x: 10, y: 70 },
          { x: 110, y: 20 },
          { x: 210, y: 120 },
        ],
      },
    });
    expect(resolveUserDrawingGeometry(curve, space)).toMatchObject({
      kind: 'curve',
      curve: {
        start: { x: 10, y: 70 },
        control: { x: 110, y: 20 },
        end: { x: 210, y: 70 },
      },
    });
    expect(resolveUserDrawingGeometry(arc, space)).toMatchObject({
      kind: 'arc',
      arc: {
        start: { x: 10, y: 100 },
        through: { x: 110, y: 70 },
        end: { x: 210, y: 100 },
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
    expect(resolvePitchforkFromAnchors(pitchfork.points[0], pitchfork.points[1], pitchfork.points[2], space)).toMatchObject({
      median: { start: { x: 10, y: 70 }, end: { x: 210, y: 70 } },
      upper: { start: { x: 110, y: 20 }, end: { x: 210, y: 20 } },
      lower: { start: { x: 110, y: 120 }, end: { x: 210, y: 120 } },
      midpoint: { x: 110, y: 70 },
    });
    expect(resolveUserDrawingGeometry(pitchfork, space)).toMatchObject({
      kind: 'pitchfork',
      pitchfork: {
        median: { start: { x: 10, y: 70 }, end: { x: 210, y: 70 } },
        upper: { start: { x: 110, y: 20 }, end: { x: 210, y: 20 } },
        lower: { start: { x: 110, y: 120 }, end: { x: 210, y: 120 } },
        midpoint: { x: 110, y: 70 },
      },
    });
    expect(resolvePitchfanFromAnchors(pitchfan.points[0], pitchfan.points[1], pitchfan.points[2], space)).toMatchObject({
      origin: { x: 10, y: 70 },
      targetStart: { x: 110, y: 20 },
      targetEnd: { x: 110, y: 120 },
      rays: [
        { ratio: 0, target: { x: 110, y: 20 }, segment: { start: { x: 10, y: 70 }, end: { x: 210, y: -30 } } },
        {
          ratio: 0.236,
          target: { x: 110, y: expect.closeTo(43.6) },
          segment: { start: { x: 10, y: 70 }, end: { x: 210, y: expect.closeTo(17.2) } },
        },
        {
          ratio: 0.382,
          target: { x: 110, y: expect.closeTo(58.2) },
          segment: { start: { x: 10, y: 70 }, end: { x: 210, y: expect.closeTo(46.4) } },
        },
        { ratio: 0.5, target: { x: 110, y: 70 }, segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 70 } } },
        { ratio: 0.618, target: { x: 110, y: 81.8 }, segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 93.6 } } },
        {
          ratio: 0.786,
          target: { x: 110, y: expect.closeTo(98.6) },
          segment: { start: { x: 10, y: 70 }, end: { x: 210, y: expect.closeTo(127.2) } },
        },
        { ratio: 1, target: { x: 110, y: 120 }, segment: { start: { x: 10, y: 70 }, end: { x: 210, y: 170 } } },
      ],
    });
    expect(resolveUserDrawingGeometry(pitchfan, space)).toMatchObject({ kind: 'pitchfan' });
    expect(
      resolvePitchforkFromAnchors(
        { time: 2_000, price: 100 },
        { time: 2_000, price: 110 },
        { time: 2_000, price: 90 },
        space,
      ),
    ).toMatchObject({
      median: { start: { x: 110, y: 70 }, end: { x: 210, y: 70 } },
      upper: { start: { x: 110, y: 20 }, end: { x: 210, y: 20 } },
      lower: { start: { x: 110, y: 120 }, end: { x: 210, y: 120 } },
      midpoint: { x: 110, y: 70 },
    });
    expect(resolvePitchforkFromAnchors(pitchfork.points[0], pitchfork.points[1], pitchfork.points[2], space, 'schiff')).toMatchObject({
      median: { start: { x: 10, y: 45 }, end: { x: 210, y: 95 } },
      upper: { start: { x: 110, y: 20 }, end: { x: 210, y: 45 } },
      lower: { start: { x: 110, y: 120 }, end: { x: 210, y: 145 } },
      origin: { x: 10, y: 45 },
      midpoint: { x: 110, y: 70 },
    });
    expect(
      resolvePitchforkFromAnchors(pitchfork.points[0], pitchfork.points[1], pitchfork.points[2], space, 'modifiedSchiff'),
    ).toMatchObject({
      median: { start: { x: 60, y: 45 }, end: { x: 210, y: 120 } },
      upper: { start: { x: 110, y: 20 }, end: { x: 210, y: 70 } },
      lower: { start: { x: 110, y: 120 }, end: { x: 210, y: 170 } },
      origin: { x: 60, y: 45 },
      midpoint: { x: 110, y: 70 },
    });
    expect(resolvePitchforkFromAnchors(pitchfork.points[0], pitchfork.points[1], pitchfork.points[2], space, 'inside')).toMatchObject({
      median: { start: { x: 60, y: 45 }, end: { x: 210, y: 270 } },
      upper: { start: { x: 10, y: 70 }, end: { x: 210, y: 370 } },
      lower: { start: { x: 110, y: 20 }, end: { x: 210, y: 170 } },
      origin: { x: 60, y: 45 },
      midpoint: { x: 110, y: 120 },
    });
    expect(resolveUserDrawingGeometry(rotatedRectangle, space)).toMatchObject({
      kind: 'rotatedRectangle',
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
    expect(resolveUserDrawingGeometry(flatTopBottom, space)).toMatchObject({
      kind: 'flatTopBottom',
      channel: {
        base: { start: { x: 10, y: 70 }, end: { x: 210, y: 20 } },
        parallel: { start: { x: 10, y: 95 }, end: { x: 210, y: 95 } },
        polygon: {
          points: [
            { x: 10, y: 70 },
            { x: 210, y: 20 },
            { x: 210, y: 95 },
            { x: 10, y: 95 },
          ],
        },
      },
    });
    expect(resolveUserDrawingGeometry(disjointChannel, space)).toMatchObject({
      kind: 'disjointChannel',
      channel: {
        base: { start: { x: 10, y: 70 }, end: { x: 210, y: 20 } },
        parallel: { start: { x: 10, y: 95 }, end: { x: 210, y: 120 } },
        polygon: {
          points: [
            { x: 10, y: 70 },
            { x: 210, y: 20 },
            { x: 210, y: 120 },
            { x: 10, y: 95 },
          ],
        },
      },
    });
  });

  it('resolves flat top and bottom channels from a sloped edge and flat anchor', () => {
    expect(
      resolveFlatTopBottomFromAnchors(
        { time: 1_000, price: 100 },
        { time: 3_000, price: 110 },
        { time: 2_000, price: 95 },
        space,
      ),
    ).toEqual({
      base: { start: { x: 10, y: 70 }, end: { x: 210, y: 20 } },
      parallel: { start: { x: 10, y: 95 }, end: { x: 210, y: 95 } },
      polygon: {
        points: [
          { x: 10, y: 70 },
          { x: 210, y: 20 },
          { x: 210, y: 95 },
          { x: 10, y: 95 },
        ],
      },
    });
  });

  it('resolves disjoint channels from two independent rails', () => {
    expect(
      resolveDisjointChannelFromAnchors(
        { time: 1_000, price: 100 },
        { time: 3_000, price: 110 },
        { time: 1_000, price: 95 },
        { time: 3_000, price: 90 },
        space,
      ),
    ).toEqual({
      base: { start: { x: 10, y: 70 }, end: { x: 210, y: 20 } },
      parallel: { start: { x: 10, y: 95 }, end: { x: 210, y: 120 } },
      polygon: {
        points: [
          { x: 10, y: 70 },
          { x: 210, y: 20 },
          { x: 210, y: 120 },
          { x: 10, y: 95 },
        ],
      },
    });
  });

  it('resolves anchored VWAP curves from the selected anchor forward', () => {
    const vwapSpace: DrawingCoordinateSpace = {
      ...space,
      bars: [
        { time: 1_000, open: 98, high: 102, low: 96, close: 99, volume: 10 },
        { time: 2_000, open: 100, high: 104, low: 98, close: 100, volume: 20 },
        { time: 3_000, open: 102, high: 106, low: 100, close: 105, volume: 10 },
      ],
    };

    expect(resolveAnchoredVwapFromAnchor({ time: 2_000, price: 100 }, vwapSpace)).toEqual({
      anchor: { x: 110, y: 70 },
      points: [
        { x: 110, y: expect.closeTo(66.6667) },
        { x: 210, y: expect.closeTo(61.6667) },
      ],
    });
    expect(
      resolveUserDrawingGeometry(
        {
          id: 'vwap',
          kind: 'anchoredVwap',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          point: { time: 2_000, price: 100 },
        },
        vwapSpace,
      ),
    ).toMatchObject({
      kind: 'anchoredVwap',
      vwap: {
        anchor: { x: 110, y: 70 },
        points: [
          { x: 110, y: expect.closeTo(66.6667) },
          { x: 210, y: expect.closeTo(61.6667) },
        ],
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
