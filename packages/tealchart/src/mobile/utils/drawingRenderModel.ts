import type {
  DrawingCoordinateSpace,
  DrawingScreenPoint,
  ResolvedUserDrawingGeometry,
  ResolveUserDrawingRenderEntriesOptions,
  UserDrawingIconName,
  UserDrawingRenderPhase,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTextAnnotation,
} from '../../drawings';

import { resolveDrawingArrowHead } from '../../drawings/arrowGeometry';
import {
  normalizeUserDrawingFontFamily,
  normalizeUserDrawingFontSize,
  normalizeUserDrawingOpacity,
  resolveUserDrawingBalloonLayout,
  resolveUserDrawingInfoLineMetrics,
  resolveUserDrawingDateRangeMetrics,
  resolveUserDrawingVisualPriceRangeMetrics,
  resolveUserDrawingTextLabelLayout,
  resolveUserDrawingGeometry,
  resolveUserDrawingHandlePoints,
  resolveUserDrawingRenderEntries,
  splitUserDrawingTextLines,
} from '../../drawings';

export type MobileUserDrawingPrimitive =
  | {
      kind: 'line';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      start: DrawingScreenPoint;
      end: DrawingScreenPoint;
      arrowHead: {
        left: DrawingScreenPoint;
        right: DrawingScreenPoint;
      } | null;
      style: UserDrawingStyle;
    }
  | {
      kind: 'infoLine';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      start: DrawingScreenPoint;
      end: DrawingScreenPoint;
      labelPoint: DrawingScreenPoint;
      label: string;
      style: UserDrawingStyle;
    }
  | {
      kind: 'forecast';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      start: DrawingScreenPoint;
      end: DrawingScreenPoint;
      labelPoint: DrawingScreenPoint;
      sourceLabel: string;
      targetLabel: string;
      changeLabel: string;
      style: UserDrawingStyle;
    }
  | {
      kind: 'projection';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      start: DrawingScreenPoint;
      pivot: DrawingScreenPoint;
      target: DrawingScreenPoint;
      labelPoint: DrawingScreenPoint;
      startLabel: string;
      pivotLabel: string;
      targetLabel: string;
      changeLabel: string;
      style: UserDrawingStyle;
    }
  | {
      kind: 'trendAngle';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      start: DrawingScreenPoint;
      end: DrawingScreenPoint;
      labelPoint: DrawingScreenPoint;
      label: string;
      style: UserDrawingStyle;
    }
  | {
      kind: 'crossLine';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      horizontal: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      vertical: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      style: UserDrawingStyle;
    }
  | {
      kind: 'arrowMarker';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'arrowMark';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'icon';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      point: DrawingScreenPoint;
      iconName: UserDrawingIconName;
      points: readonly DrawingScreenPoint[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'rectangle';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      rect: { x: number; y: number; width: number; height: number };
      style: UserDrawingStyle;
    }
  | {
      kind: 'circle';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      center: DrawingScreenPoint;
      radius: number;
      rect: { x: number; y: number; width: number; height: number };
      style: UserDrawingStyle;
    }
  | {
      kind: 'ellipse';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      center: DrawingScreenPoint;
      radiusX: number;
      radiusY: number;
      rect: { x: number; y: number; width: number; height: number };
      style: UserDrawingStyle;
    }
  | {
      kind: 'path';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'brush';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'highlighter';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'curve';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      start: DrawingScreenPoint;
      control: DrawingScreenPoint;
      end: DrawingScreenPoint;
      points: readonly DrawingScreenPoint[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'arc';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      center: DrawingScreenPoint;
      radius: number;
      start: DrawingScreenPoint;
      through: DrawingScreenPoint;
      end: DrawingScreenPoint;
      points: readonly DrawingScreenPoint[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'anchoredVwap';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      anchor: DrawingScreenPoint;
      points: readonly DrawingScreenPoint[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'triangle';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'pitchfork';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      median: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      upper: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      lower: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      style: UserDrawingStyle;
    }
  | {
      kind: 'pitchfan';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      rays: readonly {
        ratio: number;
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
      }[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'fibFan';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      rays: readonly {
        ratio: number;
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
      }[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'fibSpeedResistanceFan';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      rays: readonly {
        ratio: number;
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
      }[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'fibCircles';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      center: DrawingScreenPoint;
      baseRadius: number;
      circles: readonly {
        ratio: number;
        radius: number;
      }[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'fibSpeedResistanceArcs';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      center: DrawingScreenPoint;
      reference: DrawingScreenPoint;
      baseRadius: number;
      arcs: readonly {
        ratio: number;
        radius: number;
        startAngle: number;
        endAngle: number;
      }[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'fibWedge';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      center: DrawingScreenPoint;
      lower: DrawingScreenPoint;
      upper: DrawingScreenPoint;
      baseRadius: number;
      arcs: readonly {
        ratio: number;
        radius: number;
        startAngle: number;
        endAngle: number;
      }[];
      boundaries: readonly {
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
      }[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'fibSpiral';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      center: DrawingScreenPoint;
      reference: DrawingScreenPoint;
      baseRadius: number;
      startAngle: number;
      points: readonly DrawingScreenPoint[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'gannFan';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      rays: readonly {
        ratio: number;
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
      }[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'gannBox' | 'gannSquare';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      rect: { x: number; y: number; width: number; height: number };
      levels: readonly {
        ratio: number;
        horizontal: { start: DrawingScreenPoint; end: DrawingScreenPoint };
        vertical: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      }[];
      angles: readonly {
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
      }[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'fibChannel';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      levels: readonly {
        ratio: number;
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
      }[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'fibTimeZone';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      levels: readonly {
        ratio: number;
        time: number;
        x: number;
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
      }[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'trendBasedFibTime';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      levels: readonly {
        ratio: number;
        time: number;
        x: number;
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
      }[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'cyclicLines';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      levels: readonly {
        ratio: number;
        time: number;
        x: number;
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
      }[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'timeCycles';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      cycles: readonly {
        ratio: number;
        startTime: number;
        endTime: number;
        startBoundary: { start: DrawingScreenPoint; end: DrawingScreenPoint };
        endBoundary: { start: DrawingScreenPoint; end: DrawingScreenPoint };
        points: readonly DrawingScreenPoint[];
      }[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'sineLine';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'parallelChannel';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      base: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      parallel: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      style: UserDrawingStyle;
    }
  | {
      kind: 'rotatedRectangle';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      base: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      parallel: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      style: UserDrawingStyle;
    }
  | {
      kind: 'regressionTrend';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      base: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      parallel: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      style: UserDrawingStyle;
    }
  | {
      kind: 'flatTopBottom';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      base: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      parallel: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      style: UserDrawingStyle;
    }
  | {
      kind: 'disjointChannel';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      base: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      parallel: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      style: UserDrawingStyle;
    }
  | {
      kind: 'priceRange';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      rect: { x: number; y: number; width: number; height: number };
      labelPoint: DrawingScreenPoint;
      label: string;
      style: UserDrawingStyle;
    }
  | {
      kind: 'dateRange';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      rect: { x: number; y: number; width: number; height: number };
      labelPoint: DrawingScreenPoint;
      label: string;
      style: UserDrawingStyle;
    }
  | {
      kind: 'datePriceRange';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      rect: { x: number; y: number; width: number; height: number };
      priceLabelPoint: DrawingScreenPoint;
      priceLabel: string;
      dateLabelPoint: DrawingScreenPoint;
      dateLabel: string;
      style: UserDrawingStyle;
    }
  | {
      kind: 'riskRewardPosition';
      id: string;
      tool: 'longPosition' | 'shortPosition';
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      profitRect: { x: number; y: number; width: number; height: number };
      riskRect: { x: number; y: number; width: number; height: number };
      entryLine: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      targetLine: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      stopLine: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      rewardLabelPoint: DrawingScreenPoint;
      riskLabelPoint: DrawingScreenPoint;
      ratioLabelPoint: DrawingScreenPoint;
      rewardLabel: string;
      riskLabel: string;
      ratioLabel: string;
      style: UserDrawingStyle;
    }
  | {
      kind: 'fibRetracement' | 'fibExtension';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      levels: readonly {
        ratio: number;
        label: string;
        price: number;
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
      }[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'barsPattern';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      bars: readonly {
        time: number;
        x: number;
        openY: number;
        highY: number;
        lowY: number;
        closeY: number;
        bodyWidth: number;
        up: boolean;
      }[];
      bounds: { x: number; y: number; width: number; height: number };
      style: UserDrawingStyle;
    }
  | {
      kind: 'textLabel';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      point: DrawingScreenPoint;
      text: string;
      editing: boolean;
      editValue: string | null;
      textAlign: UserDrawingTextAnnotation['textAlign'];
      style: UserDrawingStyle;
    }
  | {
      kind: 'note';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      point: DrawingScreenPoint;
      text: string;
      editing: boolean;
      editValue: string | null;
      textAlign: UserDrawingTextAnnotation['textAlign'];
      style: UserDrawingStyle;
    }
  | {
      kind: 'comment';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      point: DrawingScreenPoint;
      text: string;
      editing: boolean;
      editValue: string | null;
      textAlign: UserDrawingTextAnnotation['textAlign'];
      style: UserDrawingStyle;
    }
  | {
      kind: 'balloon';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      point: DrawingScreenPoint;
      text: string;
      editing: boolean;
      editValue: string | null;
      textAlign: UserDrawingTextAnnotation['textAlign'];
      style: UserDrawingStyle;
    }
  | {
      kind: 'callout';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      tip: DrawingScreenPoint;
      point: DrawingScreenPoint;
      text: string;
      editing: boolean;
      editValue: string | null;
      textAlign: UserDrawingTextAnnotation['textAlign'];
      style: UserDrawingStyle;
    }
  | {
      kind: 'priceNote';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      tip: DrawingScreenPoint;
      point: DrawingScreenPoint;
      text: string;
      editing: boolean;
      editValue: string | null;
      textAlign: UserDrawingTextAnnotation['textAlign'];
      style: UserDrawingStyle;
    }
  | {
      kind: 'pin';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      point: DrawingScreenPoint;
      radius: number;
      style: UserDrawingStyle;
    }
  | {
      kind: 'handle';
      id: string;
      drawingId: string;
      clip: MobileUserDrawingClipRect;
      point: DrawingScreenPoint;
      strokeColor: string;
      fillColor: string;
      radius: number;
    };

export type MobileUserDrawingTextLabelPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'textLabel' }>;
export type MobileUserDrawingNotePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'note' }>;
export type MobileUserDrawingCalloutPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'callout' }>;
export type MobileUserDrawingCommentPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'comment' }>;
export type MobileUserDrawingPriceNotePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'priceNote' }>;
export type MobileUserDrawingPinPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'pin' }>;
export type MobileUserDrawingBalloonPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'balloon' }>;
export type MobileUserDrawingLinePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'line' }>;
export type MobileUserDrawingPriceRangePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'priceRange' }>;
export type MobileUserDrawingDatePriceRangePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'datePriceRange' }>;
export type MobileUserDrawingRiskRewardPositionPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'riskRewardPosition' }
>;
export type MobileUserDrawingPathPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'path' }>;
export type MobileUserDrawingBrushPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'brush' }>;
export type MobileUserDrawingHighlighterPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'highlighter' }>;
export type MobileUserDrawingCurvePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'curve' }>;
export type MobileUserDrawingArcPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'arc' }>;
export type MobileUserDrawingAnchoredVwapPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'anchoredVwap' }>;
export type MobileUserDrawingTrianglePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'triangle' }>;
export type MobileUserDrawingPitchforkPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'pitchfork' }>;
export type MobileUserDrawingPitchfanPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'pitchfan' }>;
export type MobileUserDrawingFibFanPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibFan' }>;
export type MobileUserDrawingFibSpeedResistanceFanPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'fibSpeedResistanceFan' }
>;
export type MobileUserDrawingFibCirclesPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibCircles' }>;
export type MobileUserDrawingFibSpeedResistanceArcsPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'fibSpeedResistanceArcs' }
>;
export type MobileUserDrawingFibWedgePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibWedge' }>;
export type MobileUserDrawingFibSpiralPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibSpiral' }>;
export type MobileUserDrawingGannFanPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'gannFan' }>;
export type MobileUserDrawingGannBoxPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'gannBox' | 'gannSquare' }
> & { kind: 'gannBox' };
export type MobileUserDrawingGannSquarePrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'gannBox' | 'gannSquare' }
> & { kind: 'gannSquare' };
export type MobileUserDrawingFibChannelPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibChannel' }>;
export type MobileUserDrawingFibTimeZonePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibTimeZone' }>;
export type MobileUserDrawingTrendBasedFibTimePrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'trendBasedFibTime' }
>;
export type MobileUserDrawingCyclicLinesPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'cyclicLines' }>;
export type MobileUserDrawingTimeCyclesPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'timeCycles' }>;
export type MobileUserDrawingSineLinePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'sineLine' }>;
export type MobileUserDrawingParallelChannelPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'parallelChannel' }>;
export type MobileUserDrawingRotatedRectanglePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'rotatedRectangle' }>;
export type MobileUserDrawingRegressionTrendPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'regressionTrend' }>;
export type MobileUserDrawingFlatTopBottomPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'flatTopBottom' }>;
export type MobileUserDrawingDisjointChannelPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'disjointChannel' }>;
export type MobileUserDrawingFibRetracementPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibRetracement' }>;
export type MobileUserDrawingFibExtensionPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibExtension' }>;
export type MobileUserDrawingBarsPatternPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'barsPattern' }>;
export type MobileUserDrawingArrowMarkerPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'arrowMarker' }>;
export type MobileUserDrawingArrowMarkPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'arrowMark' }>;
export type MobileUserDrawingIconPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'icon' }>;
export type MobileUserDrawingCirclePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'circle' }>;
export type MobileUserDrawingEllipsePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'ellipse' }>;
export type MobileUserDrawingInfoLinePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'infoLine' }>;
export type MobileUserDrawingForecastPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'forecast' }>;
export type MobileUserDrawingProjectionPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'projection' }>;
export type MobileUserDrawingCrossLinePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'crossLine' }>;
export type MobileUserDrawingTrendAnglePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'trendAngle' }>;
export type MobileUserDrawingMeasurementLabelPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'priceRange' | 'dateRange' }
>;

export interface MobileUserDrawingTextLabelLayout {
  fontSize: number;
  fontFamily: string;
  labelPadding: number;
  labelHeight: number;
  box: { x: number; y: number; width: number; height: number };
  text: { x: number; y: number };
  lines: readonly { text: string; width: number; x: number; y: number }[];
}

export interface MobileUserDrawingBalloonLayout extends MobileUserDrawingTextLabelLayout {
  tail: {
    tip: DrawingScreenPoint;
    left: DrawingScreenPoint;
    right: DrawingScreenPoint;
  };
}

export interface MobileUserDrawingPriceRangeLabelPosition {
  fontSize: number;
  fontFamily: string;
  x: number;
  y: number;
}

export interface MobileUserDrawingRiskRewardLabelPosition {
  fontSize: number;
  fontFamily: string;
  x: number;
  y: number;
}

export interface MobileUserDrawingMeasurementLabelPosition {
  fontSize: number;
  fontFamily: string;
  x: number;
  y: number;
}

export interface MobileUserDrawingMeasurementLabelTarget {
  labelPoint: DrawingScreenPoint;
  style: UserDrawingStyle;
}

export interface MobileUserDrawingInfoLineLabelPosition {
  fontSize: number;
  fontFamily: string;
  x: number;
  y: number;
}

export interface MobileUserDrawingTrendAngleLabelPosition {
  fontSize: number;
  fontFamily: string;
  x: number;
  y: number;
}

export interface MobileUserDrawingTextBounds {
  x?: number;
  y?: number;
  width: number;
  height?: number;
}

export interface ResolveMobileUserDrawingRenderModelOptions extends ResolveUserDrawingRenderEntriesOptions {
  handleRadius?: number;
  draftOpacity?: number;
}

export interface MobileUserDrawingClipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_HANDLE_RADIUS = 4;
const DEFAULT_DRAFT_OPACITY = 0.65;
const DEFAULT_TEXT_LABEL_PADDING = 6;
const DEFAULT_TEXT_LABEL_HEIGHT = 20;

function clipRectFromSpace(space: DrawingCoordinateSpace): MobileUserDrawingClipRect {
  return {
    x: space.chartLeft,
    y: space.pane.top,
    width: space.chartRight - space.chartLeft,
    height: space.pane.height,
  };
}

function primitiveFromGeometry(
  geometry: ResolvedUserDrawingGeometry,
  clip: MobileUserDrawingClipRect,
  phase: UserDrawingRenderPhase,
  selected: boolean,
  opacity: number,
  handleRadius: number,
  textEditValue?: string | null,
): MobileUserDrawingPrimitive {
  switch (geometry.kind) {
    case 'line':
    case 'ray':
    case 'horizontalRay':
    case 'horizontalLine':
    case 'verticalLine': {
      return {
        kind: 'line',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        start: geometry.segment.start,
        end: geometry.segment.end,
        arrowHead: null,
        style: geometry.drawing.style,
      };
    }
    case 'crossLine':
      return {
        kind: 'crossLine',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        horizontal: geometry.crossLine.horizontal,
        vertical: geometry.crossLine.vertical,
        style: geometry.drawing.style,
      };
    case 'arrowLine': {
      const arrowHead =
        resolveDrawingArrowHead(geometry.segment, {
          size: Math.max(10, geometry.drawing.style.lineWidth * 5),
        });
      return {
        kind: 'line',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        start: geometry.segment.start,
        end: geometry.segment.end,
        arrowHead: arrowHead ? { left: arrowHead.left, right: arrowHead.right } : null,
        style: geometry.drawing.style,
      };
    }
    case 'trendAngle':
      return {
        kind: 'trendAngle',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        start: geometry.angle.segment.start,
        end: geometry.angle.segment.end,
        labelPoint: geometry.angle.labelPoint,
        label: geometry.angle.label,
        style: geometry.drawing.style,
      };
    case 'infoLine': {
      const drawing = geometry.drawing;
      const label =
        drawing.kind === 'infoLine' ? resolveUserDrawingInfoLineMetrics(drawing.points[0], drawing.points[1]).label : '';
      return {
        kind: 'infoLine',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        start: geometry.segment.start,
        end: geometry.segment.end,
        labelPoint: {
          x: (geometry.segment.start.x + geometry.segment.end.x) / 2,
          y: (geometry.segment.start.y + geometry.segment.end.y) / 2 - 4,
        },
        label,
        style: geometry.drawing.style,
      };
    }
    case 'arrowMarker':
      return {
        kind: 'arrowMarker',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.marker.points,
        style: geometry.drawing.style,
      };
    case 'arrowMark':
      return {
        kind: 'arrowMark',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.mark.points,
        style: geometry.drawing.style,
      };
    case 'icon':
      return {
        kind: 'icon',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        point: geometry.icon.center,
        iconName: geometry.icon.name,
        points: geometry.icon.points,
        style: geometry.drawing.style,
      };
    case 'rectangle':
      return {
        kind: 'rectangle',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        rect: geometry.rect,
        style: geometry.drawing.style,
      };
    case 'circle':
      return {
        kind: 'circle',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        center: geometry.circle.center,
        radius: geometry.circle.radius,
        rect: geometry.circle.rect,
        style: geometry.drawing.style,
      };
    case 'ellipse':
      return {
        kind: 'ellipse',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        center: geometry.ellipse.center,
        radiusX: geometry.ellipse.radiusX,
        radiusY: geometry.ellipse.radiusY,
        rect: geometry.ellipse.rect,
        style: geometry.drawing.style,
      };
    case 'path':
    case 'brush':
    case 'highlighter':
      return {
        kind: geometry.kind,
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.polyline.points,
        style: geometry.drawing.style,
      };
    case 'curve':
      return {
        kind: 'curve',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        start: geometry.curve.start,
        control: geometry.curve.control,
        end: geometry.curve.end,
        points: geometry.curve.points,
        style: geometry.drawing.style,
      };
    case 'arc':
      return {
        kind: 'arc',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        center: geometry.arc.center,
        radius: geometry.arc.radius,
        start: geometry.arc.start,
        through: geometry.arc.through,
        end: geometry.arc.end,
        points: geometry.arc.points,
        style: geometry.drawing.style,
      };
    case 'anchoredVwap':
      return {
        kind: 'anchoredVwap',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        anchor: geometry.vwap.anchor,
        points: geometry.vwap.points,
        style: geometry.drawing.style,
      };
    case 'triangle':
      return {
        kind: 'triangle',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.polygon.points,
        style: geometry.drawing.style,
      };
    case 'pitchfork':
      return {
        kind: 'pitchfork',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        median: geometry.pitchfork.median,
        upper: geometry.pitchfork.upper,
        lower: geometry.pitchfork.lower,
        style: geometry.drawing.style,
      };
    case 'pitchfan':
      return {
        kind: 'pitchfan',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        rays: geometry.pitchfan.rays.map((ray) => ({
          ratio: ray.ratio,
          start: ray.segment.start,
          end: ray.segment.end,
        })),
        style: geometry.drawing.style,
      };
    case 'fibFan':
      return {
        kind: 'fibFan',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        rays: geometry.fibFan.rays.map((ray) => ({
          ratio: ray.ratio,
          start: ray.segment.start,
          end: ray.segment.end,
        })),
        style: geometry.drawing.style,
      };
    case 'fibSpeedResistanceFan':
      return {
        kind: 'fibSpeedResistanceFan',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        rays: geometry.fibSpeedResistanceFan.rays.map((ray) => ({
          ratio: ray.ratio,
          start: ray.segment.start,
          end: ray.segment.end,
        })),
        style: geometry.drawing.style,
      };
    case 'fibCircles':
      return {
        kind: 'fibCircles',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        center: geometry.fibCircles.center,
        baseRadius: geometry.fibCircles.baseRadius,
        circles: geometry.fibCircles.circles.map((circle) => ({
          ratio: circle.ratio,
          radius: circle.radius,
        })),
        style: geometry.drawing.style,
      };
    case 'fibSpeedResistanceArcs':
      return {
        kind: 'fibSpeedResistanceArcs',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        center: geometry.fibSpeedResistanceArcs.center,
        reference: geometry.fibSpeedResistanceArcs.reference,
        baseRadius: geometry.fibSpeedResistanceArcs.baseRadius,
        arcs: geometry.fibSpeedResistanceArcs.arcs.map((arc) => ({
          ratio: arc.ratio,
          radius: arc.radius,
          startAngle: arc.startAngle,
          endAngle: arc.endAngle,
        })),
        style: geometry.drawing.style,
      };
    case 'fibWedge':
      return {
        kind: 'fibWedge',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        center: geometry.fibWedge.center,
        lower: geometry.fibWedge.lower,
        upper: geometry.fibWedge.upper,
        baseRadius: geometry.fibWedge.baseRadius,
        arcs: geometry.fibWedge.arcs.map((arc) => ({
          ratio: arc.ratio,
          radius: arc.radius,
          startAngle: arc.startAngle,
          endAngle: arc.endAngle,
        })),
        boundaries: geometry.fibWedge.boundaries.map((boundary) => ({
          start: boundary.start,
          end: boundary.end,
        })),
        style: geometry.drawing.style,
      };
    case 'fibSpiral':
      return {
        kind: 'fibSpiral',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        center: geometry.fibSpiral.center,
        reference: geometry.fibSpiral.reference,
        baseRadius: geometry.fibSpiral.baseRadius,
        startAngle: geometry.fibSpiral.startAngle,
        points: geometry.fibSpiral.points,
        style: geometry.drawing.style,
      };
    case 'gannFan':
      return {
        kind: 'gannFan',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        rays: geometry.gannFan.rays.map((ray) => ({
          ratio: ray.ratio,
          start: ray.segment.start,
          end: ray.segment.end,
        })),
        style: geometry.drawing.style,
      };
    case 'gannBox':
    case 'gannSquare':
      return {
        kind: geometry.kind,
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        rect: geometry.gannBox.rect,
        levels: geometry.gannBox.levels.map((level) => ({
          ratio: level.ratio,
          horizontal: level.horizontal,
          vertical: level.vertical,
        })),
        angles: geometry.gannBox.angles.map((angle) => ({
          start: angle.start,
          end: angle.end,
        })),
        style: geometry.drawing.style,
      };
    case 'fibChannel':
      return {
        kind: 'fibChannel',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.fibChannel.polygon.points,
        levels: geometry.fibChannel.levels.map((level) => ({
          ratio: level.ratio,
          start: level.segment.start,
          end: level.segment.end,
        })),
        style: geometry.drawing.style,
      };
    case 'fibTimeZone':
      return {
        kind: 'fibTimeZone',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        levels: geometry.fibTimeZone.levels.map((level) => ({
          ratio: level.ratio,
          time: level.time,
          x: level.x,
          start: level.segment.start,
          end: level.segment.end,
        })),
        style: geometry.drawing.style,
      };
    case 'trendBasedFibTime':
      return {
        kind: 'trendBasedFibTime',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        levels: geometry.trendBasedFibTime.levels.map((level) => ({
          ratio: level.ratio,
          time: level.time,
          x: level.x,
          start: level.segment.start,
          end: level.segment.end,
        })),
        style: geometry.drawing.style,
      };
    case 'cyclicLines':
      return {
        kind: 'cyclicLines',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        levels: geometry.cyclicLines.levels.map((level) => ({
          ratio: level.ratio,
          time: level.time,
          x: level.x,
          start: level.segment.start,
          end: level.segment.end,
        })),
        style: geometry.drawing.style,
      };
    case 'timeCycles':
      return {
        kind: 'timeCycles',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        cycles: geometry.timeCycles.cycles.map((cycle) => ({
          ratio: cycle.ratio,
          startTime: cycle.startTime,
          endTime: cycle.endTime,
          startBoundary: cycle.startBoundary,
          endBoundary: cycle.endBoundary,
          points: cycle.points,
        })),
        style: geometry.drawing.style,
      };
    case 'sineLine':
      return {
        kind: 'sineLine',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.sineLine.points,
        style: geometry.drawing.style,
      };
    case 'parallelChannel':
    case 'regressionTrend':
    case 'rotatedRectangle':
    case 'flatTopBottom':
    case 'disjointChannel':
      return {
        kind: geometry.kind,
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.channel.polygon.points,
        base: geometry.channel.base,
        parallel: geometry.channel.parallel,
        style: geometry.drawing.style,
      };
    case 'priceRange': {
      const drawing = geometry.drawing;
      const label =
        drawing.kind === 'priceRange'
          ? resolveUserDrawingVisualPriceRangeMetrics(drawing.points[0], drawing.points[1]).label
          : '';
      return {
        kind: 'priceRange',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        rect: geometry.rect,
        labelPoint: {
          x: geometry.rect.x + geometry.rect.width / 2,
          y: geometry.rect.y + geometry.rect.height / 2,
        },
        label,
        style: geometry.drawing.style,
      };
    }
    case 'dateRange': {
      const drawing = geometry.drawing;
      const label =
        drawing.kind === 'dateRange' ? resolveUserDrawingDateRangeMetrics(drawing.points[0], drawing.points[1]).label : '';
      return {
        kind: 'dateRange',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        rect: geometry.rect,
        labelPoint: {
          x: geometry.rect.x + geometry.rect.width / 2,
          y: geometry.rect.y + geometry.rect.height / 2,
        },
        label,
        style: geometry.drawing.style,
      };
    }
    case 'datePriceRange': {
      const drawing = geometry.drawing;
      const priceLabel =
        drawing.kind === 'datePriceRange'
          ? resolveUserDrawingVisualPriceRangeMetrics(drawing.points[0], drawing.points[1]).label
          : '';
      const dateLabel =
        drawing.kind === 'datePriceRange' ? resolveUserDrawingDateRangeMetrics(drawing.points[0], drawing.points[1]).label : '';
      const fontSize = normalizeUserDrawingFontSize(geometry.drawing.style.fontSize ?? 12);
      return {
        kind: 'datePriceRange',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        rect: geometry.rect,
        priceLabelPoint: {
          x: geometry.rect.x + geometry.rect.width / 2,
          y: geometry.rect.y + geometry.rect.height / 2,
        },
        priceLabel,
        dateLabelPoint: {
          x: geometry.rect.x + geometry.rect.width / 2,
          y: geometry.rect.y + geometry.rect.height - fontSize,
        },
        dateLabel,
        style: geometry.drawing.style,
      };
    }
    case 'longPosition':
    case 'shortPosition': {
      const { position } = geometry;
      const labelX = position.entryLine.start.x + (position.entryLine.end.x - position.entryLine.start.x) / 2;
      const fontSize = normalizeUserDrawingFontSize(geometry.drawing.style.fontSize ?? 12);
      return {
        kind: 'riskRewardPosition',
        id: geometry.drawing.id,
        tool: geometry.kind,
        phase,
        selected,
        opacity,
        clip,
        profitRect: position.profitRect,
        riskRect: position.riskRect,
        entryLine: position.entryLine,
        targetLine: position.targetLine,
        stopLine: position.stopLine,
        rewardLabelPoint: { x: labelX, y: position.profitRect.y + position.profitRect.height / 2 },
        riskLabelPoint: { x: labelX, y: position.riskRect.y + position.riskRect.height / 2 },
        ratioLabelPoint: { x: labelX, y: position.entry.y - fontSize },
        rewardLabel: position.rewardLabel,
        riskLabel: position.riskLabel,
        ratioLabel: position.ratioLabel,
        style: geometry.drawing.style,
      };
    }
    case 'forecast':
      return {
        kind: 'forecast',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        start: geometry.forecast.segment.start,
        end: geometry.forecast.segment.end,
        labelPoint: geometry.forecast.labelPoint,
        sourceLabel: geometry.forecast.sourceLabel,
        targetLabel: geometry.forecast.targetLabel,
        changeLabel: geometry.forecast.changeLabel,
        style: geometry.drawing.style,
      };
    case 'projection':
      return {
        kind: 'projection',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        start: geometry.projection.start,
        pivot: geometry.projection.pivot,
        target: geometry.projection.target,
        labelPoint: geometry.projection.labelPoint,
        startLabel: geometry.projection.startLabel,
        pivotLabel: geometry.projection.pivotLabel,
        targetLabel: geometry.projection.targetLabel,
        changeLabel: geometry.projection.changeLabel,
        style: geometry.drawing.style,
      };
    case 'fibRetracement':
    case 'fibExtension':
      return {
        kind: geometry.kind,
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        levels: geometry.fib.levels.map((level) => ({
          ratio: level.ratio,
          label: `${level.label} ${level.price.toFixed(2)}`,
          price: level.price,
          start: level.segment.start,
          end: level.segment.end,
        })),
        style: geometry.drawing.style,
      };
    case 'barsPattern':
      return {
        kind: 'barsPattern',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        bars: geometry.pattern.bars,
        bounds: geometry.pattern.bounds,
        style: geometry.drawing.style,
      };
    case 'textLabel':
    case 'note':
    case 'comment':
    case 'balloon':
      const drawing = geometry.drawing as UserDrawingTextAnnotation;
      return {
        kind: geometry.kind,
        id: drawing.id,
        phase,
        selected,
        opacity,
        clip,
        point: geometry.point,
        text: drawing.text,
        editing: textEditValue !== undefined,
        editValue: textEditValue ?? null,
        textAlign: drawing.textAlign,
        style: drawing.style,
      };
    case 'callout':
    case 'priceNote':
      const callout = geometry.drawing as UserDrawingTextAnnotation;
      return {
        kind: geometry.kind,
        id: callout.id,
        phase,
        selected,
        opacity,
        clip,
        tip: geometry.tip,
        point: geometry.point,
        text: callout.text,
        editing: textEditValue !== undefined,
        editValue: textEditValue ?? null,
        textAlign: callout.textAlign,
        style: callout.style,
      };
    case 'pin':
      return {
        kind: 'pin',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        point: geometry.point,
        radius: Math.max(4, handleRadius),
        style: geometry.drawing.style,
      };
  }
}

export function resolveMobileUserDrawingRenderModel(
  state: UserDrawingState,
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  options: ResolveMobileUserDrawingRenderModelOptions = {},
): MobileUserDrawingPrimitive[] {
  const entries = resolveUserDrawingRenderEntries(state, options);
  const primitives: MobileUserDrawingPrimitive[] = [];
  const draftOpacity = options.draftOpacity ?? DEFAULT_DRAFT_OPACITY;
  const handleRadius = options.handleRadius ?? DEFAULT_HANDLE_RADIUS;

  for (const entry of entries) {
    if (!entry.drawing.visible) continue;
    const space = spacesByPaneId.get(entry.drawing.paneId);
    if (!space) continue;
    const clip = clipRectFromSpace(space);
    const textEditValue = state.textEdit?.drawingId === entry.drawing.id ? state.textEdit.value : undefined;
    primitives.push(
      primitiveFromGeometry(
        resolveUserDrawingGeometry(entry.drawing, space),
        clip,
        entry.phase,
        entry.selected,
        normalizeUserDrawingOpacity(entry.drawing.style.opacity ?? 1) * (entry.phase === 'draft' ? draftOpacity : 1),
        handleRadius,
        textEditValue,
      ),
    );
  }

  for (const entry of entries) {
    if (!entry.selected || !entry.drawing.visible) continue;
    const space = spacesByPaneId.get(entry.drawing.paneId);
    if (!space) continue;
    const clip = clipRectFromSpace(space);

    for (const [index, point] of resolveUserDrawingHandlePoints(entry.drawing, space).entries()) {
      primitives.push({
        kind: 'handle',
        id: `${entry.drawing.id}:handle:${index}`,
        drawingId: entry.drawing.id,
        clip,
        point,
        strokeColor: entry.drawing.style.lineColor,
        fillColor: '#ffffff',
        radius: options.handleRadius ?? DEFAULT_HANDLE_RADIUS,
      });
    }
  }

  return primitives;
}

export function resolveMobileUserDrawingTextLabelLayout(
  primitive:
    | MobileUserDrawingTextLabelPrimitive
    | MobileUserDrawingNotePrimitive
    | MobileUserDrawingBalloonPrimitive
    | MobileUserDrawingCalloutPrimitive
    | MobileUserDrawingPriceNotePrimitive
    | MobileUserDrawingCommentPrimitive,
  measuredTextWidth: number | readonly number[],
  options: {
    labelPadding?: number;
    labelHeight?: number;
  } = {},
): MobileUserDrawingTextLabelLayout {
  const fontSize = normalizeUserDrawingFontSize(primitive.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(primitive.style.fontFamily ?? 'sans-serif');
  const labelPadding = options.labelPadding ?? DEFAULT_TEXT_LABEL_PADDING;
  const labelHeight = options.labelHeight ?? DEFAULT_TEXT_LABEL_HEIGHT;
  const lines = splitUserDrawingTextLines(primitive.text);
  const lineWidths = Array.isArray(measuredTextWidth) ? measuredTextWidth : lines.map(() => measuredTextWidth);
  const layout = resolveUserDrawingTextLabelLayout({
    text: primitive.text,
    point: primitive.point,
    textAlign: primitive.textAlign,
    lineWidths,
    labelPadding,
    lineHeight: Math.max(1, labelHeight - 2),
  });
  const firstLine = layout.lines[0] ?? { x: primitive.point.x, y: primitive.point.y };

  return {
    fontSize,
    fontFamily,
    labelPadding,
    labelHeight: layout.box.height,
    box: layout.box,
    text: { x: firstLine.x, y: firstLine.y },
    lines: layout.lines,
  };
}

export function resolveMobileUserDrawingBalloonLayout(
  primitive: MobileUserDrawingBalloonPrimitive,
  measuredTextWidth: number | readonly number[],
  options: {
    labelPadding?: number;
    labelHeight?: number;
  } = {},
): MobileUserDrawingBalloonLayout {
  const fontSize = normalizeUserDrawingFontSize(primitive.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(primitive.style.fontFamily ?? 'sans-serif');
  const labelPadding = options.labelPadding ?? DEFAULT_TEXT_LABEL_PADDING;
  const labelHeight = options.labelHeight ?? DEFAULT_TEXT_LABEL_HEIGHT;
  const lines = splitUserDrawingTextLines(primitive.text);
  const lineWidths = Array.isArray(measuredTextWidth) ? measuredTextWidth : lines.map(() => measuredTextWidth);
  const layout = resolveUserDrawingBalloonLayout({
    text: primitive.text,
    point: primitive.point,
    textAlign: primitive.textAlign,
    lineWidths,
    labelPadding,
    lineHeight: Math.max(1, labelHeight - 2),
  });
  const firstLine = layout.lines[0] ?? { x: primitive.point.x, y: primitive.point.y };

  return {
    fontSize,
    fontFamily,
    labelPadding,
    labelHeight: layout.box.height,
    box: layout.box,
    text: { x: firstLine.x, y: firstLine.y },
    lines: layout.lines,
    tail: layout.tail,
  };
}

export function resolveMobileUserDrawingMeasurementLabelPosition(
  primitive: MobileUserDrawingMeasurementLabelTarget,
  measuredTextBounds: MobileUserDrawingTextBounds,
): MobileUserDrawingMeasurementLabelPosition {
  const fontSize = normalizeUserDrawingFontSize(primitive.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(primitive.style.fontFamily ?? 'sans-serif');
  const textX = measuredTextBounds.x ?? 0;
  const textY = measuredTextBounds.y ?? -fontSize;
  const textHeight = measuredTextBounds.height ?? fontSize;

  return {
    fontSize,
    fontFamily,
    x: primitive.labelPoint.x - textX - measuredTextBounds.width / 2,
    y: primitive.labelPoint.y - textY - textHeight / 2,
  };
}

export function resolveMobileUserDrawingPriceRangeLabelPosition(
  primitive: MobileUserDrawingMeasurementLabelPrimitive,
  measuredTextBounds: MobileUserDrawingTextBounds,
): MobileUserDrawingPriceRangeLabelPosition {
  return resolveMobileUserDrawingMeasurementLabelPosition(primitive, measuredTextBounds);
}

export function resolveMobileUserDrawingRiskRewardLabelPosition(
  primitive: MobileUserDrawingMeasurementLabelTarget,
  measuredTextBounds: MobileUserDrawingTextBounds,
): MobileUserDrawingRiskRewardLabelPosition {
  return resolveMobileUserDrawingMeasurementLabelPosition(primitive, measuredTextBounds);
}

export function resolveMobileUserDrawingInfoLineLabelPosition(
  primitive: MobileUserDrawingInfoLinePrimitive,
  measuredTextBounds: MobileUserDrawingTextBounds,
): MobileUserDrawingInfoLineLabelPosition {
  const fontSize = normalizeUserDrawingFontSize(primitive.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(primitive.style.fontFamily ?? 'sans-serif');
  const textX = measuredTextBounds.x ?? 0;
  const textY = measuredTextBounds.y ?? -fontSize;
  const textHeight = measuredTextBounds.height ?? fontSize;

  return {
    fontSize,
    fontFamily,
    x: primitive.labelPoint.x - textX - measuredTextBounds.width / 2,
    y: primitive.labelPoint.y - textY - textHeight,
  };
}

export function resolveMobileUserDrawingTrendAngleLabelPosition(
  primitive: MobileUserDrawingTrendAnglePrimitive,
  measuredTextBounds: MobileUserDrawingTextBounds,
): MobileUserDrawingTrendAngleLabelPosition {
  const fontSize = normalizeUserDrawingFontSize(primitive.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(primitive.style.fontFamily ?? 'sans-serif');
  const textX = measuredTextBounds.x ?? 0;
  const textY = measuredTextBounds.y ?? -fontSize;
  const textHeight = measuredTextBounds.height ?? fontSize;

  return {
    fontSize,
    fontFamily,
    x: primitive.labelPoint.x - textX - measuredTextBounds.width / 2,
    y: primitive.labelPoint.y - textY - textHeight,
  };
}
