import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { clearChartStoreCache } from './state/chartState';
import {
  formatTrendAngleDegrees,
  duplicateUserDrawing,
  getUserDrawingSelectionIds,
  normalizeUserDrawingFontFamily,
  normalizeUserDrawingIconName,
  normalizeUserDrawingOpacity,
  resolveAnchoredVwapFromAnchor,
  resolveArcFromAnchors,
  resolveCircleFromAnchors,
  resolveCurveFromAnchors,
  resolveDisjointChannelFromAnchors,
  resolveEllipseFromAnchors,
  resolveFibChannelFromAnchors,
  resolveFibCirclesFromAnchors,
  resolveFlatTopBottomFromAnchors,
  resolveFibFanFromAnchors,
  resolveFibSpeedResistanceArcsFromAnchors,
  resolveFibSpeedResistanceFanFromAnchors,
  resolveFibTimeZoneFromAnchors,
  resolveCyclicLinesFromAnchors,
  resolveTimeCyclesFromAnchors,
  resolveSineLineFromAnchors,
  resolveForecastFromAnchors,
  resolveProjectionFromAnchors,
  resolveFibWedgeFromAnchors,
  resolveFibSpiralFromAnchors,
  resolveTrendBasedFibTimeFromAnchors,
  resolveGannFanFromAnchors,
  resolveGannBoxFromAnchors,
  resolveGannSquareFromAnchors,
  resolvePitchforkFromAnchors,
  resolvePitchfanFromAnchors,
  resolveUserDrawingDateRangeMetrics,
  resolveUserDrawingInfoLineMetrics,
  resolveUserDrawingPriceRangeMetrics,
  resolveRiskRewardPositionFromAnchors,
  resolveRegressionTrendFromAnchors,
  resolveUserDrawingRiskRewardMetrics,
  resolveUserDrawingTextEditMetrics,
  resolveUserDrawingTextLabelLayout,
  resolveUserDrawingVisualPriceRangeMetrics,
  setUserDrawingIconName,
  selectUserDrawingsById,
  setUserDrawingTextAlign,
  splitUserDrawingTextLines,
  USER_DRAWING_FONT_FAMILIES,
  USER_DRAWING_FONT_FAMILY_DESCRIPTORS,
  USER_DRAWING_ICON_NAMES,
  USER_DRAWING_ICON_NAME_DESCRIPTORS,
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
  MobileUserDrawingArcPrimitive,
  MobileUserDrawingBarsPatternPrimitive,
  MobileUserDrawingBrushPrimitive,
  MobileUserDrawingCurvePrimitive,
  MobileUserDrawingCyclicLinesPrimitive,
  MobileUserDrawingTimeCyclesPrimitive,
  MobileUserDrawingSineLinePrimitive,
  MobileUserDrawingForecastPrimitive,
  MobileUserDrawingProjectionPrimitive,
  MobileUserDrawingHighlighterPrimitive,
  MobileUserDrawingDisjointChannelPrimitive,
  MobileUserDrawingLinePrimitive,
  MobileUserDrawingMeasurementLabelPosition,
  MobileUserDrawingMeasurementLabelTarget,
  MobileUserDrawingCalloutPrimitive,
  MobileUserDrawingBalloonPrimitive,
  MobileUserDrawingCommentPrimitive,
  MobileUserDrawingIconPrimitive,
  MobileUserDrawingNotePrimitive,
  MobileUserDrawingPinPrimitive,
  MobileUserDrawingPriceNotePrimitive,
  MobileUserDrawingParallelChannelPrimitive,
  MobileUserDrawingFibChannelPrimitive,
  MobileUserDrawingFibCirclesPrimitive,
  MobileUserDrawingFibSpeedResistanceArcsPrimitive,
  MobileUserDrawingFibWedgePrimitive,
  MobileUserDrawingFibSpiralPrimitive,
  MobileUserDrawingFibTimeZonePrimitive,
  MobileUserDrawingTrendBasedFibTimePrimitive,
  MobileUserDrawingFibFanPrimitive,
  MobileUserDrawingFibSpeedResistanceFanPrimitive,
  MobileUserDrawingGannBoxPrimitive,
  MobileUserDrawingGannFanPrimitive,
  MobileUserDrawingGannSquarePrimitive,
  MobileUserDrawingPitchfanPrimitive,
  MobileUserDrawingPitchforkPrimitive,
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
  ArcDrawing,
  AnchoredVwapDrawing,
  BarsPatternDrawing,
  BrushDrawing,
  CircleDrawing,
  CyclicLinesDrawing,
  TimeCyclesDrawing,
  SineLineDrawing,
  ForecastDrawing,
  HighlighterDrawing,
  ProjectionDrawing,
  DatePriceRangeDrawing,
  DateRangeDrawing,
  DisjointChannelDrawing,
  CurveDrawing,
  DrawingPitchforkVariant,
  EllipseDrawing,
  ExtendedLineDrawing,
  FibChannelDrawing,
  FibCirclesDrawing,
  FibFanDrawing,
  FibSpeedResistanceArcsDrawing,
  FibSpeedResistanceFanDrawing,
  FibTimeZoneDrawing,
  FibWedgeDrawing,
  FibSpiralDrawing,
  TrendBasedFibTimeDrawing,
  GannBoxDrawing,
  GannFanDrawing,
  GannSquareDrawing,
  FlatTopBottomDrawing,
  InfoLineDrawing,
  LongPositionDrawing,
  BalloonDrawing,
  CalloutDrawing,
  CommentDrawing,
  IconDrawing,
  NoteDrawing,
  PathDrawing,
  ParallelChannelDrawing,
  PinDrawing,
  PitchforkDrawing,
  PitchforkDrawingKind,
  PitchfanDrawing,
  PriceNoteDrawing,
  PriceRangeDrawing,
  RegressionTrendDrawing,
  RotatedRectangleDrawing,
  ShortPositionDrawing,
  TriangleDrawing,
  TrendAngleDrawing,
  UserDrawingFontFamily,
  UserDrawingFontFamilyDescriptor,
  UserDrawingFontSize,
  UserDrawingHitTestTextMeasure,
  UserDrawingIconNameDescriptor,
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
    expect(setUserDrawingIconName).toBeTypeOf('function');
    expect(duplicateUserDrawing).toBeTypeOf('function');
    expect(getUserDrawingSelectionIds).toBeTypeOf('function');
    expect(selectUserDrawingsById).toBeTypeOf('function');
    expect(resolveRegressionTrendFromAnchors).toBeTypeOf('function');
    expect(resolveFlatTopBottomFromAnchors).toBeTypeOf('function');
    expect(resolveDisjointChannelFromAnchors).toBeTypeOf('function');
    expect(resolvePitchforkFromAnchors).toBeTypeOf('function');
    expect(resolvePitchfanFromAnchors).toBeTypeOf('function');
    expect(resolveAnchoredVwapFromAnchor).toBeTypeOf('function');
    const nativeEntry = readFileSync(resolve(__dirname, 'index.native.ts'), 'utf8');
    expect(nativeEntry).toContain('setMobileUserDrawingTextAlign');
    expect(nativeEntry).toContain('setMobileUserDrawingIconName');
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
    expect(nativeEntry).toContain('MobileUserDrawingArcPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingBarsPatternPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingBrushPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingHighlighterPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingCirclePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingCrossLinePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingCurvePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingCyclicLinesPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingTimeCyclesPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingSineLinePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingForecastPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingProjectionPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingEllipsePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingTrendAnglePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingTrianglePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingPitchforkPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingPitchfanPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingParallelChannelPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingRegressionTrendPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingFlatTopBottomPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingDisjointChannelPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingDatePriceRangePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingRiskRewardPositionPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingGannSquarePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingLinePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingNotePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingCalloutPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingCommentPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingPriceNotePrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingPinPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingIconPrimitive');
    expect(nativeEntry).toContain('MobileUserDrawingBalloonPrimitive');
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
    const pitchforkPrimitive: NonNever<MobileUserDrawingPitchforkPrimitive> = {
      kind: 'pitchfork',
      id: 'pitchfork',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      median: { start: { x: 0, y: 5 }, end: { x: 10, y: 5 } },
      upper: { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
      lower: { start: { x: 0, y: 10 }, end: { x: 10, y: 10 } },
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const pitchfanPrimitive: NonNever<MobileUserDrawingPitchfanPrimitive> = {
      kind: 'pitchfan',
      id: 'pitchfan',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      rays: [{ ratio: 0.5, start: { x: 0, y: 5 }, end: { x: 10, y: 5 } }],
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const fibFanPrimitive: NonNever<MobileUserDrawingFibFanPrimitive> = {
      ...pitchfanPrimitive,
      kind: 'fibFan',
      id: 'fib-fan',
    };
    const fibSpeedFanPrimitive: NonNever<MobileUserDrawingFibSpeedResistanceFanPrimitive> = {
      ...pitchfanPrimitive,
      kind: 'fibSpeedResistanceFan',
      id: 'fib-speed-fan',
    };
    const fibSpeedArcsPrimitive: NonNever<MobileUserDrawingFibSpeedResistanceArcsPrimitive> = {
      kind: 'fibSpeedResistanceArcs',
      id: 'fib-speed-arcs',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      center: { x: 5, y: 5 },
      reference: { x: 10, y: 10 },
      baseRadius: 5,
      arcs: [{ ratio: 1, radius: 5, startAngle: 0, endAngle: 1 }],
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const fibCirclesPrimitive: NonNever<MobileUserDrawingFibCirclesPrimitive> = {
      kind: 'fibCircles',
      id: 'fib-circles',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      center: { x: 5, y: 5 },
      baseRadius: 10,
      circles: [{ ratio: 1, radius: 10 }],
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const fibWedgePrimitive: NonNever<MobileUserDrawingFibWedgePrimitive> = {
      kind: 'fibWedge',
      id: 'fib-wedge',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      center: { x: 5, y: 5 },
      lower: { x: 10, y: 5 },
      upper: { x: 10, y: 10 },
      baseRadius: 5,
      arcs: [{ ratio: 1, radius: 5, startAngle: 0, endAngle: 1 }],
      boundaries: [
        { start: { x: 5, y: 5 }, end: { x: 10, y: 5 } },
        { start: { x: 5, y: 5 }, end: { x: 10, y: 10 } },
      ],
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const fibSpiralPrimitive: NonNever<MobileUserDrawingFibSpiralPrimitive> = {
      kind: 'fibSpiral',
      id: 'fib-spiral',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      center: { x: 5, y: 5 },
      reference: { x: 10, y: 5 },
      baseRadius: 5,
      startAngle: 0,
      points: [
        { x: 10, y: 5 },
        { x: 5, y: 10 },
      ],
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const fibChannelPrimitive: NonNever<MobileUserDrawingFibChannelPrimitive> = {
      kind: 'fibChannel',
      id: 'fib-channel',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      points: [
        { x: 0, y: 5 },
        { x: 10, y: 5 },
        { x: 10, y: 0 },
        { x: 0, y: 0 },
      ],
      levels: [{ ratio: 0.5, start: { x: 0, y: 3 }, end: { x: 10, y: 3 } }],
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const fibTimeZonePrimitive: NonNever<MobileUserDrawingFibTimeZonePrimitive> = {
      kind: 'fibTimeZone',
      id: 'fib-time-zone',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      levels: [{ ratio: 1, time: 2, x: 10, start: { x: 10, y: 0 }, end: { x: 10, y: 10 } }],
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const cyclicLinesPrimitive: NonNever<MobileUserDrawingCyclicLinesPrimitive> = {
      kind: 'cyclicLines',
      id: 'cyclic-lines',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      levels: [{ ratio: 1, time: 2, x: 10, start: { x: 10, y: 0 }, end: { x: 10, y: 10 } }],
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const timeCyclesPrimitive: NonNever<MobileUserDrawingTimeCyclesPrimitive> = {
      kind: 'timeCycles',
      id: 'time-cycles',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      cycles: [
        {
          ratio: 0,
          startTime: 1,
          endTime: 2,
          startBoundary: { start: { x: 0, y: 0 }, end: { x: 0, y: 10 } },
          endBoundary: { start: { x: 10, y: 0 }, end: { x: 10, y: 10 } },
          points: [
            { x: 0, y: 5 },
            { x: 5, y: 0 },
            { x: 10, y: 5 },
          ],
        },
      ],
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const sineLinePrimitive: NonNever<MobileUserDrawingSineLinePrimitive> = {
      kind: 'sineLine',
      id: 'sine-line',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      points: [
        { x: 0, y: 5 },
        { x: 5, y: 0 },
        { x: 10, y: 5 },
      ],
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const forecastPrimitive: NonNever<MobileUserDrawingForecastPrimitive> = {
      kind: 'forecast',
      id: 'forecast',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      start: { x: 0, y: 10 },
      end: { x: 10, y: 0 },
      labelPoint: { x: 5, y: 4 },
      sourceLabel: 'Source 10.00',
      targetLabel: 'Target 20.00',
      changeLabel: '+10.00 (+100.00%) / 1 second',
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const projectionPrimitive: NonNever<MobileUserDrawingProjectionPrimitive> = {
      kind: 'projection',
      id: 'projection',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      start: { x: 0, y: 10 },
      pivot: { x: 5, y: 5 },
      target: { x: 10, y: 0 },
      labelPoint: { x: 7.5, y: 2 },
      startLabel: 'Start 10.00',
      pivotLabel: 'Pivot 15.00',
      targetLabel: 'Target 20.00',
      changeLabel: '+5.00 (+33.33%) / 1 second',
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const gannBoxPrimitive: NonNever<MobileUserDrawingGannBoxPrimitive> = {
      kind: 'gannBox',
      id: 'gann-box',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      rect: { x: 0, y: 0, width: 10, height: 10 },
      levels: [
        {
          ratio: 0.5,
          horizontal: { start: { x: 0, y: 5 }, end: { x: 10, y: 5 } },
          vertical: { start: { x: 5, y: 0 }, end: { x: 5, y: 10 } },
        },
      ],
      angles: [{ start: { x: 0, y: 0 }, end: { x: 10, y: 10 } }],
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const gannSquarePrimitive: NonNever<MobileUserDrawingGannSquarePrimitive> = {
      ...gannBoxPrimitive,
      kind: 'gannSquare',
      id: 'gann-square',
    };
    const trendBasedFibTimePrimitive: NonNever<MobileUserDrawingTrendBasedFibTimePrimitive> = {
      ...fibTimeZonePrimitive,
      kind: 'trendBasedFibTime',
      id: 'trend-fib-time',
    };
    const gannFanPrimitive: NonNever<MobileUserDrawingGannFanPrimitive> = {
      ...pitchfanPrimitive,
      kind: 'gannFan',
      id: 'gann-fan',
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
    const curvePrimitive: NonNever<MobileUserDrawingCurvePrimitive> = {
      kind: 'curve',
      id: 'curve',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      start: { x: 0, y: 5 },
      control: { x: 5, y: 0 },
      end: { x: 10, y: 5 },
      points: [
        { x: 0, y: 5 },
        { x: 5, y: 2.5 },
        { x: 10, y: 5 },
      ],
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const arcPrimitive: NonNever<MobileUserDrawingArcPrimitive> = {
      kind: 'arc',
      id: 'arc',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      center: { x: 5, y: 8 },
      radius: 5,
      start: { x: 0, y: 5 },
      through: { x: 5, y: 3 },
      end: { x: 10, y: 5 },
      points: [
        { x: 0, y: 5 },
        { x: 5, y: 3 },
        { x: 10, y: 5 },
      ],
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
    const brushPrimitive: NonNever<MobileUserDrawingBrushPrimitive> = {
      kind: 'brush',
      id: 'brush',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 5 },
      ],
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const highlighterPrimitive: NonNever<MobileUserDrawingHighlighterPrimitive> = {
      kind: 'highlighter',
      id: 'highlighter',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 5 },
      ],
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const notePrimitive: NonNever<MobileUserDrawingNotePrimitive> = {
      kind: 'note',
      id: 'note',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      point: { x: 0, y: 0 },
      text: 'Note',
      editing: false,
      editValue: null,
      textAlign: 'center',
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const calloutPrimitive: NonNever<MobileUserDrawingCalloutPrimitive> = {
      kind: 'callout',
      id: 'callout',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      tip: { x: 0, y: 0 },
      point: { x: 5, y: 5 },
      text: 'Callout',
      editing: false,
      editValue: null,
      textAlign: 'center',
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const commentPrimitive: NonNever<MobileUserDrawingCommentPrimitive> = {
      kind: 'comment',
      id: 'comment',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      point: { x: 0, y: 0 },
      text: 'Comment',
      editing: false,
      editValue: null,
      textAlign: 'center',
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const priceNotePrimitive: NonNever<MobileUserDrawingPriceNotePrimitive> = {
      kind: 'priceNote',
      id: 'price-note',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      tip: { x: 0, y: 0 },
      point: { x: 5, y: 5 },
      text: 'Price note',
      editing: false,
      editValue: null,
      textAlign: 'center',
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const pinPrimitive: NonNever<MobileUserDrawingPinPrimitive> = {
      kind: 'pin',
      id: 'pin',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      point: { x: 5, y: 5 },
      radius: 4,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const iconPrimitive: NonNever<MobileUserDrawingIconPrimitive> = {
      kind: 'icon',
      id: 'icon',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      point: { x: 5, y: 5 },
      iconName: 'star',
      points: [{ x: 5, y: 0 }],
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
    };
    const balloonPrimitive: NonNever<MobileUserDrawingBalloonPrimitive> = {
      kind: 'balloon',
      id: 'balloon',
      phase: 'committed',
      selected: false,
      opacity: 1,
      clip,
      point: { x: 5, y: 5 },
      text: 'Balloon',
      editing: false,
      editValue: null,
      textAlign: 'center',
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
    expect(pitchforkPrimitive.kind).toBe('pitchfork');
    expect(pitchfanPrimitive.kind).toBe('pitchfan');
    expect(fibFanPrimitive.kind).toBe('fibFan');
    expect(fibSpeedFanPrimitive.kind).toBe('fibSpeedResistanceFan');
    expect(fibSpeedArcsPrimitive.kind).toBe('fibSpeedResistanceArcs');
    expect(fibCirclesPrimitive.kind).toBe('fibCircles');
    expect(fibWedgePrimitive.kind).toBe('fibWedge');
    expect(fibSpiralPrimitive.kind).toBe('fibSpiral');
    expect(fibChannelPrimitive.kind).toBe('fibChannel');
    expect(fibTimeZonePrimitive.kind).toBe('fibTimeZone');
    expect(cyclicLinesPrimitive.kind).toBe('cyclicLines');
    expect(timeCyclesPrimitive.kind).toBe('timeCycles');
    expect(sineLinePrimitive.kind).toBe('sineLine');
    expect(forecastPrimitive.kind).toBe('forecast');
    expect(projectionPrimitive.kind).toBe('projection');
    expect(trendBasedFibTimePrimitive.kind).toBe('trendBasedFibTime');
    expect(gannFanPrimitive.kind).toBe('gannFan');
    expect(gannBoxPrimitive.kind).toBe('gannBox');
    expect(gannSquarePrimitive.kind).toBe('gannSquare');
    expect(linePrimitive.kind).toBe('line');
    expect(curvePrimitive.kind).toBe('curve');
    expect(arcPrimitive.kind).toBe('arc');
    expect(datePricePrimitive.kind).toBe('datePriceRange');
    expect(riskRewardPrimitive.kind).toBe('riskRewardPosition');
    expect(barsPatternPrimitive.kind).toBe('barsPattern');
    expect(brushPrimitive.kind).toBe('brush');
    expect(highlighterPrimitive.kind).toBe('highlighter');
    expect(notePrimitive.kind).toBe('note');
    expect(calloutPrimitive.kind).toBe('callout');
    expect(commentPrimitive.kind).toBe('comment');
    expect(priceNotePrimitive.kind).toBe('priceNote');
    expect(pinPrimitive.kind).toBe('pin');
    expect(iconPrimitive.kind).toBe('icon');
    expect(balloonPrimitive.kind).toBe('balloon');
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

  it('exports shared drawing icon-name helpers', () => {
    const descriptor: UserDrawingIconNameDescriptor = USER_DRAWING_ICON_NAME_DESCRIPTORS[0]!;
    expect(descriptor.iconName).toBe('star');
    expect(normalizeUserDrawingIconName('flag')).toBe('flag');
    expect(normalizeUserDrawingIconName('unknown')).toBe('star');
    expect(USER_DRAWING_ICON_NAMES).toEqual(['star', 'circle', 'square', 'triangle', 'flag', 'arrowUp', 'arrowDown']);
    expect(USER_DRAWING_ICON_NAME_DESCRIPTORS.map((descriptor) => descriptor.iconName)).toEqual(
      USER_DRAWING_ICON_NAMES,
    );
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
    const brush: BrushDrawing = {
      ...drawing,
      id: 'brush',
      kind: 'brush',
    };
    const highlighter: HighlighterDrawing = {
      ...drawing,
      id: 'highlighter',
      kind: 'highlighter',
    };
    const note: NoteDrawing = {
      ...drawing,
      id: 'note',
      kind: 'note',
      point: drawing.points[0]!,
      text: 'Note',
      textAlign: 'center',
    };
    const callout: CalloutDrawing = {
      ...drawing,
      id: 'callout',
      kind: 'callout',
      points: [drawing.points[0]!, drawing.points[1]!],
      text: 'Callout',
      textAlign: 'center',
    };
    const comment: CommentDrawing = {
      ...drawing,
      id: 'comment',
      kind: 'comment',
      point: drawing.points[0]!,
      text: 'Comment',
      textAlign: 'center',
    };
    const priceNote: PriceNoteDrawing = {
      ...drawing,
      id: 'price-note',
      kind: 'priceNote',
      points: [drawing.points[0]!, drawing.points[1]!],
      text: 'Price note',
      textAlign: 'center',
    };
    const pin: PinDrawing = {
      ...drawing,
      id: 'pin',
      kind: 'pin',
      point: drawing.points[0]!,
    };
    const icon: IconDrawing = {
      ...drawing,
      id: 'icon',
      kind: 'icon',
      point: drawing.points[0]!,
      iconName: 'star',
    };
    const balloon: BalloonDrawing = {
      ...drawing,
      id: 'balloon',
      kind: 'balloon',
      point: drawing.points[0]!,
      text: 'Balloon',
      textAlign: 'center',
    };

    expect(drawing.kind).toBe('path');
    expect(brush.kind).toBe('brush');
    expect(highlighter.kind).toBe('highlighter');
    expect(note.kind).toBe('note');
    expect(callout.kind).toBe('callout');
    expect(comment.kind).toBe('comment');
    expect(priceNote.kind).toBe('priceNote');
    expect(pin.kind).toBe('pin');
    expect(icon.kind).toBe('icon');
    expect(balloon.kind).toBe('balloon');
  });

  it('exports shared drawing curve types and resolver', () => {
    const drawing: CurveDrawing = {
      id: 'curve',
      kind: 'curve',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 10 },
      ],
    };
    const curve = resolveCurveFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], {
      viewport: { startTime: 1, endTime: 3, priceMin: 8, priceMax: 12 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 8, yMax: 12 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('curve');
    expect(curve.control).toEqual({ x: 50, y: 0 });
    expect(curve.points).toHaveLength(49);
  });

  it('exports shared drawing arc types and resolver', () => {
    const drawing: ArcDrawing = {
      id: 'arc',
      kind: 'arc',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 10 },
      ],
    };
    const arc = resolveArcFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], {
      viewport: { startTime: 1, endTime: 3, priceMin: 8, priceMax: 12 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 8, yMax: 12 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('arc');
    expect(arc.through).toEqual({ x: 50, y: 0 });
    expect(arc.points).toHaveLength(97);
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

  it('exports shared drawing pitchfork types', () => {
    const kind: PitchforkDrawingKind = 'modifiedSchiffPitchfork';
    const variant: DrawingPitchforkVariant = 'modifiedSchiff';
    const drawing: PitchforkDrawing = {
      id: 'pitchfork',
      kind,
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

    expect(variant).toBe('modifiedSchiff');
    expect(drawing.kind).toBe('modifiedSchiffPitchfork');
  });

  it('exports shared drawing pitchfan types', () => {
    const drawing: PitchfanDrawing = {
      id: 'pitchfan',
      kind: 'pitchfan',
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

    expect(drawing.kind).toBe('pitchfan');
  });

  it('exports shared drawing fib fan types and resolver', () => {
    const drawing: FibFanDrawing = {
      id: 'fib-fan',
      kind: 'fibFan',
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
    const fan = resolveFibFanFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('fibFan');
    expect(fan.rays).toHaveLength(7);
  });

  it('exports shared drawing fib speed resistance fan types and resolver', () => {
    const drawing: FibSpeedResistanceFanDrawing = {
      id: 'fib-speed-fan',
      kind: 'fibSpeedResistanceFan',
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
    const fan = resolveFibSpeedResistanceFanFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('fibSpeedResistanceFan');
    expect(fan.rays.map((ray) => ray.ratio)).toEqual([1 / 3, 2 / 3, 1]);
  });

  it('exports shared drawing fib speed resistance arc types and resolver', () => {
    const drawing: FibSpeedResistanceArcsDrawing = {
      id: 'fib-speed-arcs',
      kind: 'fibSpeedResistanceArcs',
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
    const arcs = resolveFibSpeedResistanceArcsFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('fibSpeedResistanceArcs');
    expect(arcs.arcs.map((arc) => arc.ratio)).toEqual([1 / 3, 2 / 3, 1]);
  });

  it('exports shared drawing fib circle types and resolver', () => {
    const drawing: FibCirclesDrawing = {
      id: 'fib-circles',
      kind: 'fibCircles',
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
    const circles = resolveFibCirclesFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('fibCircles');
    expect(circles.circles.map((circle) => circle.ratio)).toEqual([0.236, 0.382, 0.5, 0.618, 1, 1.618, 2.618]);
  });

  it('exports shared drawing fib wedge types and resolver', () => {
    const drawing: FibWedgeDrawing = {
      id: 'fib-wedge',
      kind: 'fibWedge',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 10 },
        { time: 2, price: 12 },
      ],
    };
    const wedge = resolveFibWedgeFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('fibWedge');
    expect(wedge.arcs.map((arc) => arc.ratio)).toEqual([0.236, 0.382, 0.5, 0.618, 1, 1.618, 2.618]);
  });

  it('exports shared drawing fib spiral types and resolver', () => {
    const drawing: FibSpiralDrawing = {
      id: 'fib-spiral',
      kind: 'fibSpiral',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 10 },
      ],
    };
    const spiral = resolveFibSpiralFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('fibSpiral');
    expect(spiral.points[0]).toEqual({ x: 100, y: 50 });
    expect(spiral.points.length).toBeGreaterThan(100);
  });

  it('exports shared drawing gann fan types and resolver', () => {
    const drawing: GannFanDrawing = {
      id: 'gann-fan',
      kind: 'gannFan',
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
    const fan = resolveGannFanFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('gannFan');
    expect(fan.rays).toHaveLength(9);
  });

  it('exports shared drawing gann box types and resolver', () => {
    const drawing: GannBoxDrawing = {
      id: 'gann-box',
      kind: 'gannBox',
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
    const box = resolveGannBoxFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('gannBox');
    expect(box.levels).toHaveLength(9);
    expect(box.angles).toHaveLength(6);
  });

  it('exports shared drawing gann square types and resolver', () => {
    const drawing: GannSquareDrawing = {
      id: 'gann-square',
      kind: 'gannSquare',
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
    const square = resolveGannSquareFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('gannSquare');
    expect(square.rect.width).toBe(square.rect.height);
    expect(square.levels).toHaveLength(9);
    expect(square.angles).toHaveLength(6);
  });

  it('exports shared drawing fib channel types and resolver', () => {
    const drawing: FibChannelDrawing = {
      id: 'fib-channel',
      kind: 'fibChannel',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 10 },
        { time: 1, price: 12 },
      ],
    };
    const channel = resolveFibChannelFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('fibChannel');
    expect(channel.levels).toHaveLength(11);
  });

  it('exports shared drawing fib time zone types and resolver', () => {
    const drawing: FibTimeZoneDrawing = {
      id: 'fib-time-zone',
      kind: 'fibTimeZone',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 10 },
      ],
    };
    const zones = resolveFibTimeZoneFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('fibTimeZone');
    expect(zones.levels).toHaveLength(10);
  });

  it('exports shared drawing cyclic line types and resolver', () => {
    const drawing: CyclicLinesDrawing = {
      id: 'cyclic-lines',
      kind: 'cyclicLines',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 10 },
      ],
    };
    const lines = resolveCyclicLinesFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('cyclicLines');
    expect(lines.levels).toEqual(
      expect.arrayContaining([
        { ratio: 0, time: 1, x: 50, segment: { start: { x: 50, y: 0 }, end: { x: 50, y: 100 } } },
        { ratio: 1, time: 2, x: 100, segment: { start: { x: 100, y: 0 }, end: { x: 100, y: 100 } } },
      ]),
    );
  });

  it('exports shared drawing time cycle types and resolver', () => {
    const drawing: TimeCyclesDrawing = {
      id: 'time-cycles',
      kind: 'timeCycles',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 20 },
      ],
    };
    const cycles = resolveTimeCyclesFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('timeCycles');
    expect(cycles.cycles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ratio: 0,
          startTime: 1,
          endTime: 2,
          points: expect.arrayContaining([{ x: 75, y: 0 }]),
        }),
      ]),
    );
  });

  it('exports shared drawing sine line types and resolver', () => {
    const drawing: SineLineDrawing = {
      id: 'sine-line',
      kind: 'sineLine',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 20 },
      ],
    };
    const sineLine = resolveSineLineFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('sineLine');
    expect(sineLine.points).toEqual(
      expect.arrayContaining([
        { x: 50, y: 50 },
        { x: 100, y: 0 },
      ]),
    );
  });

  it('exports shared drawing forecast types and resolver', () => {
    const drawing: ForecastDrawing = {
      id: 'forecast',
      kind: 'forecast',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 20 },
      ],
    };
    const forecast = resolveForecastFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('forecast');
    expect(forecast).toMatchObject({
      source: { x: 50, y: 50 },
      target: { x: 100, y: 0 },
      sourceLabel: 'Source 10.00',
      targetLabel: 'Target 20.00',
      changeLabel: '+10.00 (+100.00%) / 1 ms',
    });
  });

  it('exports shared drawing projection types and resolver', () => {
    const drawing: ProjectionDrawing = {
      id: 'projection',
      kind: 'projection',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 15 },
        { time: 3, price: 20 },
      ],
    };
    const projection = resolveProjectionFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], {
      viewport: { startTime: 0, endTime: 3, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 150,
    });

    expect(drawing.kind).toBe('projection');
    expect(projection).toMatchObject({
      start: { x: 50, y: 50 },
      pivot: { x: 100, y: 25 },
      target: { x: 150, y: 0 },
      startLabel: 'Start 10.00',
      pivotLabel: 'Pivot 15.00',
      targetLabel: 'Target 20.00',
      changeLabel: '+5.00 (+33.33%) / 1 ms',
    });
  });

  it('exports shared drawing trend-based fib time types and resolver', () => {
    const drawing: TrendBasedFibTimeDrawing = {
      id: 'trend-fib-time',
      kind: 'trendBasedFibTime',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 10 },
        { time: 3, price: 12 },
      ],
    };
    const zones = resolveTrendBasedFibTimeFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('trendBasedFibTime');
    expect(zones.levels[0]).toMatchObject({ ratio: 0, time: 3 });
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

  it('exports shared drawing rotated rectangle types', () => {
    const drawing: RotatedRectangleDrawing = {
      id: 'rotated',
      kind: 'rotatedRectangle',
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

    expect(drawing.kind).toBe('rotatedRectangle');
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
