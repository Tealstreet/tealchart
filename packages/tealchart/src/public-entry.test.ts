import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { clearChartStoreCache } from './state/chartState';
import {
  formatTrendAngleDegrees,
  normalizeUserDrawingFontFamily,
  normalizeUserDrawingOpacity,
  resolveAnchoredVwapFromAnchor,
  resolveCircleFromAnchors,
  resolveDisjointChannelFromAnchors,
  resolveEllipseFromAnchors,
  resolveFlatTopBottomFromAnchors,
  resolveUserDrawingDateRangeMetrics,
  resolveUserDrawingInfoLineMetrics,
  resolveUserDrawingPriceRangeMetrics,
  resolveRiskRewardPositionFromAnchors,
  resolveRegressionTrendFromAnchors,
  resolveUserDrawingRiskRewardMetrics,
  resolveUserDrawingTextEditMetrics,
  resolveUserDrawingTextLabelLayout,
  resolveUserDrawingVisualPriceRangeMetrics,
  setUserDrawingTextAlign,
  splitUserDrawingTextLines,
  USER_DRAWING_FONT_FAMILIES,
  USER_DRAWING_FONT_FAMILY_DESCRIPTORS,
  USER_DRAWING_OPACITY_DESCRIPTORS,
  USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS,
  resolveBarsPatternFromAnchors,
} from './index';
import {
  resolveMobileUserDrawingMeasurementLabelPosition,
  resolveMobileUserDrawingRiskRewardLabelPosition,
} from './mobile/utils/drawingRenderModel';
import type {
  MobileUserDrawingDatePriceRangePrimitive,
  MobileUserDrawingAnchoredVwapPrimitive,
  MobileUserDrawingBarsPatternPrimitive,
  MobileUserDrawingDisjointChannelPrimitive,
  MobileUserDrawingLinePrimitive,
  MobileUserDrawingMeasurementLabelPosition,
  MobileUserDrawingMeasurementLabelTarget,
  MobileUserDrawingParallelChannelPrimitive,
  MobileUserDrawingRegressionTrendPrimitive,
  MobileUserDrawingFlatTopBottomPrimitive,
  MobileUserDrawingRiskRewardLabelPosition,
  MobileUserDrawingRiskRewardPositionPrimitive,
} from './mobile/utils/drawingRenderModel';
import type {
  ArrowLineDrawing,
  ArrowMarkDownDrawing,
  ArrowMarkUpDrawing,
  ArrowMarkerDrawing,
  AnchoredVwapDrawing,
  BarsPatternDrawing,
  CircleDrawing,
  DatePriceRangeDrawing,
  DateRangeDrawing,
  DisjointChannelDrawing,
  EllipseDrawing,
  ExtendedLineDrawing,
  FlatTopBottomDrawing,
  InfoLineDrawing,
  LongPositionDrawing,
  PathDrawing,
  ParallelChannelDrawing,
  PriceRangeDrawing,
  RegressionTrendDrawing,
  ShortPositionDrawing,
  TriangleDrawing,
  TrendAngleDrawing,
  UserDrawingFontFamily,
  UserDrawingFontFamilyDescriptor,
  UserDrawingFontSize,
  UserDrawingHitTestTextMeasure,
  UserDrawingInfoLineMetrics,
  UserDrawingTextLabelLayout,
  UserDrawingOpacityDescriptor,
  UserDrawingDateRangeMetrics,
  UserDrawingPriceRangeMetrics,
  UserDrawingRiskRewardMetrics,
  UserDrawingStyleToggleDescriptor,
  DrawingScreenRiskRewardPosition,
  DrawingScreenBarsPattern,
} from './index';

type NonNever<T> = [T] extends [never] ? never : T;

describe('tealchart public entries', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('exports shared and native drawing text alignment helpers', () => {
    expect(setUserDrawingTextAlign).toBeTypeOf('function');
    expect(resolveRegressionTrendFromAnchors).toBeTypeOf('function');
    expect(resolveFlatTopBottomFromAnchors).toBeTypeOf('function');
    expect(resolveDisjointChannelFromAnchors).toBeTypeOf('function');
    expect(resolveAnchoredVwapFromAnchor).toBeTypeOf('function');
    const nativeEntry = readFileSync(resolve(__dirname, 'index.native.ts'), 'utf8');
    expect(nativeEntry).toContain('setMobileUserDrawingTextAlign');
    expect(nativeEntry).toContain('resolveMobileUserDrawingInfoLineLabelPosition');
    expect(nativeEntry).toContain('resolveMobileUserDrawingMeasurementLabelPosition');
    expect(nativeEntry).toContain('resolveMobileUserDrawingRiskRewardLabelPosition');
    expect(nativeEntry).toContain('resolveMobileUserDrawingTrendAngleLabelPosition');
    expect(nativeEntry).toContain('MobileUserDrawingInfoLineLabelPosition');
    expect(nativeEntry).toContain('MobileUserDrawingMeasurementLabelPosition');
    expect(nativeEntry).toContain('MobileUserDrawingMeasurementLabelTarget');
    expect(nativeEntry).toContain('MobileUserDrawingRiskRewardLabelPosition');
    expect(nativeEntry).toContain('MobileUserDrawingTrendAngleLabelPosition');
    expect(nativeEntry).toContain('MobileUserDrawingArrowMarkerPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingArrowMarkPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingAnchoredVwapPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingBarsPatternPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingCirclePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingCrossLinePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingEllipsePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingTrendAnglePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingTrianglePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingParallelChannelPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingRegressionTrendPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingFlatTopBottomPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingDisjointChannelPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingDatePriceRangePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingRiskRewardPositionPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingLinePrimitive');
  });

  it('exports usable native channel primitive aliases', () => {
    const clip = { x: 0, y: 0, width: 100, height: 100 };
    const channelPrimitive: NonNever<MobileUserDrawingParallelChannelPrimitive> = {
      kind: 'parallelChannel',
      id: 'channel',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      points: [],
      base: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
      parallel: { start: { x: 0, y: 1 }, end: { x: 1, y: 2 } },
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const regressionPrimitive: NonNever<MobileUserDrawingRegressionTrendPrimitive> = {
      ...channelPrimitive,
      kind: 'regressionTrend',
      id: 'regression',
    };
    const flatPrimitive: NonNever<MobileUserDrawingFlatTopBottomPrimitive> = {
      ...channelPrimitive,
      kind: 'flatTopBottom',
      id: 'flat',
    };
    const disjointPrimitive: NonNever<MobileUserDrawingDisjointChannelPrimitive> = {
      ...channelPrimitive,
      kind: 'disjointChannel',
      id: 'disjoint',
    };
    const linePrimitive: NonNever<MobileUserDrawingLinePrimitive> = {
      kind: 'line',
      id: 'ray',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      start: { x: 0, y: 5 },
      end: { x: 10, y: 5 },
      arrowHead: null,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const datePricePrimitive: NonNever<MobileUserDrawingDatePriceRangePrimitive> = {
      kind: 'datePriceRange',
      id: 'date-price',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      rect: { x: 0, y: 0, width: 10, height: 10 },
      priceLabelPoint: { x: 5, y: 5 },
      priceLabel: '+1.00 (+1.00%)',
      dateLabelPoint: { x: 5, y: 8 },
      dateLabel: '1 minute',
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const riskRewardPrimitive: NonNever<MobileUserDrawingRiskRewardPositionPrimitive> = {
      kind: 'riskRewardPosition',
      id: 'long',
      tool: 'longPosition',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      profitRect: { x: 0, y: 0, width: 10, height: 5 },
      riskRect: { x: 0, y: 5, width: 10, height: 5 },
      entryLine: { start: { x: 0, y: 5 }, end: { x: 10, y: 5 } },
      targetLine: { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
      stopLine: { start: { x: 0, y: 10 }, end: { x: 10, y: 10 } },
      rewardLabelPoint: { x: 5, y: 2.5 },
      riskLabelPoint: { x: 5, y: 7.5 },
      ratioLabelPoint: { x: 5, y: 3 },
      rewardLabel: 'Reward +1.00 (+1.00%)',
      riskLabel: 'Risk -1.00 (-1.00%)',
      ratioLabel: 'R:R 1.00',
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const barsPatternPrimitive: NonNever<MobileUserDrawingBarsPatternPrimitive> = {
      kind: 'barsPattern',
      id: 'bars',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      bars: [
        { time: 1, x: 0, openY: 5, highY: 0, lowY: 10, closeY: 4, bodyWidth: 4, up: true },
      ],
      bounds: { x: -2, y: 0, width: 4, height: 10 },
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const anchoredVwapPrimitive: NonNever<MobileUserDrawingAnchoredVwapPrimitive> = {
      kind: 'anchoredVwap',
      id: 'vwap',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      anchor: { x: 0, y: 5 },
      points: [{ x: 0, y: 5 }],
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };

    expect(channelPrimitive.kind).toBe('parallelChannel');
    expect(regressionPrimitive.kind).toBe('regressionTrend');
    expect(flatPrimitive.kind).toBe('flatTopBottom');
    expect(disjointPrimitive.kind).toBe('disjointChannel');
    expect(linePrimitive.kind).toBe('line');
    expect(datePricePrimitive.kind).toBe('datePriceRange');
    expect(riskRewardPrimitive.kind).toBe('riskRewardPosition');
    expect(barsPatternPrimitive.kind).toBe('barsPattern');
    expect(anchoredVwapPrimitive.kind).toBe('anchoredVwap');
  });

  it('exports usable native risk reward label position helpers', () => {
    const labelPosition: MobileUserDrawingRiskRewardLabelPosition = resolveMobileUserDrawingRiskRewardLabelPosition(
      {
        labelPoint: { x: 50, y: 35 },
        style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid', fontSize: 14, fontFamily: 'monospace' },
      },
      { x: 0, y: -10, width: 84, height: 14 },
    );

    expect(labelPosition).toEqual({ fontSize: 14, fontFamily: 'monospace', x: 8, y: 38 });
  });

  it('exports a reusable native measurement label layout helper', () => {
    const target: MobileUserDrawingMeasurementLabelTarget = {
      labelPoint: { x: 50, y: 20 },
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const position: MobileUserDrawingMeasurementLabelPosition = resolveMobileUserDrawingMeasurementLabelPosition(target, {
      width: 40,
      height: 12,
    });

    expect(position).toMatchObject({ fontSize: 12, fontFamily: 'sans-serif', x: 30, y: 26 });
  });

  it('exports shared drawing opacity helpers', () => {
    const descriptor: UserDrawingOpacityDescriptor = USER_DRAWING_OPACITY_DESCRIPTORS[0]!;
    expect(normalizeUserDrawingOpacity(0.5)).toBe(0.5);
    expect(descriptor.label).toBe('100 percent opacity');
    expect(USER_DRAWING_OPACITY_DESCRIPTORS.map((descriptor) => descriptor.opacity)).toEqual([1, 0.75, 0.5, 0.25]);
  });

  it('exports shared drawing style toggle descriptors', () => {
    const descriptor: UserDrawingStyleToggleDescriptor = USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS[0]!;
    expect(descriptor.style).toBe('lineVisible');
    expect(USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS.map((descriptor) => descriptor.style)).toEqual([
      'lineVisible',
      'fillVisible',
    ]);
  });

  it('exports shared drawing font-family helpers', () => {
    const fontSize: UserDrawingFontSize = 12;
    const fontFamily: UserDrawingFontFamily = USER_DRAWING_FONT_FAMILIES[0]!;
    const descriptor: UserDrawingFontFamilyDescriptor = USER_DRAWING_FONT_FAMILY_DESCRIPTORS[0]!;
    expect(fontSize).toBe(12);
    expect(fontFamily).toBe('sans-serif');
    expect(descriptor.fontFamily).toBe('sans-serif');
    expect(normalizeUserDrawingFontFamily('serif')).toBe('serif');
  });

  it('exports shared drawing text layout helpers', () => {
    const measureTextLabelLine: UserDrawingHitTestTextMeasure = (_drawing, line) => line.length;
    const layout: UserDrawingTextLabelLayout = resolveUserDrawingTextLabelLayout({
      text: 'A\nB',
      point: { x: 10, y: 10 },
      textAlign: 'center',
      lineWidths: [6, 6],
    });

    expect(splitUserDrawingTextLines('A\nB')).toEqual(['A', 'B']);
    expect(measureTextLabelLine).toBeTypeOf('function');
    expect(resolveUserDrawingTextEditMetrics('A\nB').longestLineLength).toBe(1);
    expect(layout.lines).toHaveLength(2);
  });

  it('exports shared drawing price range helpers', () => {
    const metrics: UserDrawingPriceRangeMetrics = resolveUserDrawingPriceRangeMetrics(100, 125);
    const drawing: PriceRangeDrawing = {
      id: 'range',
      kind: 'priceRange',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 100 },
        { time: 2, price: 125 },
      ],
    };

    expect(metrics.label).toBe('+25.00 (+25.00%)');
    expect(
      resolveUserDrawingVisualPriceRangeMetrics({ time: 1, price: 125 }, { time: 2, price: 100 }).label,
    ).toBe('+25.00 (+25.00%)');
    expect(drawing.kind).toBe('priceRange');
  });

  it('exports shared drawing date range helpers', () => {
    const metrics: UserDrawingDateRangeMetrics = resolveUserDrawingDateRangeMetrics(
      { time: 0, price: 10 },
      { time: 60_000, price: 20 },
    );
    const drawing: DateRangeDrawing = {
      id: 'range',
      kind: 'dateRange',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 0, price: 10 },
        { time: 60_000, price: 20 },
      ],
    };

    expect(metrics.label).toBe('1 minute');
    expect(drawing.kind).toBe('dateRange');
  });

  it('exports shared drawing date and price range types', () => {
    const drawing: DatePriceRangeDrawing = {
      id: 'date-price-range',
      kind: 'datePriceRange',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 0, price: 10 },
        { time: 60_000, price: 20 },
      ],
    };

    expect(drawing.kind).toBe('datePriceRange');
  });

  it('exports shared risk reward position helpers and types', () => {
    const metrics: UserDrawingRiskRewardMetrics = resolveUserDrawingRiskRewardMetrics(
      'longPosition',
      { time: 0, price: 100 },
      { time: 1, price: 110 },
      { time: 1, price: 95 },
    );
    const geometry: DrawingScreenRiskRewardPosition = resolveRiskRewardPositionFromAnchors(
      'longPosition',
      { time: 0, price: 100 },
      { time: 1, price: 110 },
      { time: 2, price: 95 },
      {
        viewport: { startTime: 0, endTime: 2, priceMin: 90, priceMax: 110 },
        pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 90, yMax: 110 },
        chartLeft: 0,
        chartRight: 200,
      },
    );
    const longDrawing: LongPositionDrawing = {
      id: 'long',
      kind: 'longPosition',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 0, price: 100 },
        { time: 1, price: 110 },
        { time: 2, price: 95 },
      ],
    };
    const shortDrawing: ShortPositionDrawing = { ...longDrawing, id: 'short', kind: 'shortPosition' };

    expect(metrics.ratioLabel).toBe('R:R 2.00');
    expect(geometry.entryLine.end.x).toBe(200);
    expect(longDrawing.kind).toBe('longPosition');
    expect(shortDrawing.kind).toBe('shortPosition');
  });

  it('exports shared bars pattern helpers and types', () => {
    const pattern: DrawingScreenBarsPattern = resolveBarsPatternFromAnchors(
      { time: 0, price: 100 },
      { time: 1, price: 100 },
      { time: 1, price: 101 },
      {
        viewport: { startTime: 0, endTime: 2, priceMin: 90, priceMax: 110 },
        pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 90, yMax: 110 },
        chartLeft: 0,
        chartRight: 200,
        bars: [
          { time: 0, open: 100, high: 104, low: 99, close: 102, volume: 1 },
          { time: 1, open: 102, high: 105, low: 101, close: 101, volume: 1 },
        ],
      },
    );
    const drawing: BarsPatternDrawing = {
      id: 'bars',
      kind: 'barsPattern',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 0, price: 100 },
        { time: 1, price: 100 },
        { time: 1, price: 101 },
      ],
      bars: [
        { time: 0, open: 100, high: 104, low: 99, close: 102 },
        { time: 1, open: 102, high: 105, low: 101, close: 101 },
      ],
    };

    expect(pattern.bars).toHaveLength(2);
    expect(pattern.bounds.width).toBeGreaterThan(0);
    expect(drawing.kind).toBe('barsPattern');
  });

  it('exports shared drawing info line helpers', () => {
    const metrics: UserDrawingInfoLineMetrics = resolveUserDrawingInfoLineMetrics(
      { time: 0, price: 100 },
      { time: 60_000, price: 125 },
    );
    const drawing: InfoLineDrawing = {
      id: 'info',
      kind: 'infoLine',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 0, price: 100 },
        { time: 60_000, price: 125 },
      ],
    };

    expect(metrics.label).toBe('+25.00 (+25.00%) / 1 minute');
    expect(drawing.kind).toBe('infoLine');
  });

  it('exports shared drawing arrow line types', () => {
    const drawing: ArrowLineDrawing = {
      id: 'arrow',
      kind: 'arrowLine',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    };

    expect(drawing.kind).toBe('arrowLine');
  });

  it('exports shared drawing arrow marker types', () => {
    const drawing: ArrowMarkerDrawing = {
      id: 'marker',
      kind: 'arrowMarker',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    };

    expect(drawing.kind).toBe('arrowMarker');
  });

  it('exports shared drawing arrow mark types', () => {
    const up: ArrowMarkUpDrawing = {
      id: 'up',
      kind: 'arrowMarkUp',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      point: { time: 1, price: 10 },
    };
    const down: ArrowMarkDownDrawing = {
      ...up,
      id: 'down',
      kind: 'arrowMarkDown',
    };

    expect(up.kind).toBe('arrowMarkUp');
    expect(down.kind).toBe('arrowMarkDown');
  });

  it('exports shared drawing circle types', () => {
    const drawing: CircleDrawing = {
      id: 'circle',
      kind: 'circle',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    };

    expect(drawing.kind).toBe('circle');
    expect(
      resolveCircleFromAnchors(
        { time: 1_000, price: 100 },
        { time: 1_200, price: 104 },
        {
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
        },
      ).radius,
    ).toBe(10);
  });

  it('exports shared drawing ellipse types', () => {
    const drawing: EllipseDrawing = {
      id: 'ellipse',
      kind: 'ellipse',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    };

    expect(drawing.kind).toBe('ellipse');
    expect(
      resolveEllipseFromAnchors(
        { time: 1_000, price: 100 },
        { time: 1_200, price: 104 },
        {
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
        },
      ),
    ).toMatchObject({ radiusX: 10, radiusY: 10 });
  });

  it('exports shared drawing extended line types', () => {
    const drawing: ExtendedLineDrawing = {
      id: 'extended',
      kind: 'extendedLine',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    };

    expect(drawing.kind).toBe('extendedLine');
  });

  it('exports shared drawing trend angle types and helpers', () => {
    const drawing: TrendAngleDrawing = {
      id: 'angle',
      kind: 'trendAngle',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    };

    expect(drawing.kind).toBe('trendAngle');
    expect(formatTrendAngleDegrees(26.565)).toBe('26.6°');
  });

  it('exports shared drawing path types', () => {
    const drawing: PathDrawing = {
      id: 'path',
      kind: 'path',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    };

    expect(drawing.kind).toBe('path');
  });

  it('exports shared drawing triangle types', () => {
    const drawing: TriangleDrawing = {
      id: 'triangle',
      kind: 'triangle',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    };

    expect(drawing.kind).toBe('triangle');
  });

  it('exports shared drawing parallel channel types', () => {
    const drawing: ParallelChannelDrawing = {
      id: 'channel',
      kind: 'parallelChannel',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    };

    expect(drawing.kind).toBe('parallelChannel');
  });

  it('exports shared drawing regression trend types', () => {
    const drawing: RegressionTrendDrawing = {
      id: 'regression',
      kind: 'regressionTrend',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    };

    expect(drawing.kind).toBe('regressionTrend');
  });

  it('exports shared drawing flat top and bottom types', () => {
    const drawing: FlatTopBottomDrawing = {
      id: 'flat',
      kind: 'flatTopBottom',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    };

    expect(drawing.kind).toBe('flatTopBottom');
  });

  it('exports shared drawing disjoint channel types', () => {
    const drawing: DisjointChannelDrawing = {
      id: 'disjoint',
      kind: 'disjointChannel',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
        { time: 4, price: 9 },
      ],
    };

    expect(drawing.kind).toBe('disjointChannel');
  });

  it('exports shared drawing anchored VWAP types', () => {
    const drawing: AnchoredVwapDrawing = {
      id: 'vwap',
      kind: 'anchoredVwap',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      point: { time: 1, price: 10 },
    };

    expect(drawing.kind).toBe('anchoredVwap');
  });
});
