import type {
  DrawingCoordinateSpace,
  DrawingScreenAbcdPatternLabel,
  DrawingScreenElliottCorrectiveWaveLabel,
  DrawingScreenElliottDoubleComboWaveLabel,
  DrawingScreenElliottImpulseWaveLabel,
  DrawingScreenElliottTriangleWaveLabel,
  DrawingScreenElliottTripleComboWaveLabel,
  DrawingScreenFibSpiralLabel,
  DrawingScreenHeadShouldersPatternLabel,
  DrawingScreenPoint,
  DrawingScreenRect,
  DrawingScreenSegment,
  DrawingScreenTable,
  DrawingScreenThreeDrivesPatternLabel,
  DrawingScreenTrianglePatternLabel,
  DrawingScreenXabcdPatternLabel,
  ResolvedUserDrawingGeometry,
  ResolveUserDrawingRenderEntriesOptions,
  UserDrawingPressureStrokeSegment,
  UserDrawingIconName,
  UserDrawingRenderPhase,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingBarsPatternDisplayMode,
  BrushDrawing,
  HighlighterDrawing,
  PathDrawing,
  TableDrawing,
  UserDrawingTextAnnotation,
} from '../../drawings';

import {
  DEFAULT_USER_DRAWING_MEASUREMENT_LABEL_POSITION,
  DEFAULT_USER_DRAWING_BARS_PATTERN_DISPLAY_MODE,
  normalizeUserDrawingMeasurementLabelPosition,
  normalizeUserDrawingBarsPatternDisplayMode,
  normalizeUserDrawingFontFamily,
  normalizeUserDrawingFontSize,
  normalizeUserDrawingOpacity,
  resolveUserDrawingBalloonLayout,
  resolveUserDrawingGeometry,
  resolveUserDrawingHandlePoints,
  resolveUserDrawingPressureStrokeSegments,
  resolveUserDrawingRenderEntries,
  resolveUserDrawingTextLabelLayout,
  resolveUserDrawingVisualPriceRangeMetrics,
  splitUserDrawingTextLines,
} from '../../drawings';
import { resolveDrawingArrowHead } from '../../drawings/arrowGeometry';

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
      kind: 'sector';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      origin: DrawingScreenPoint;
      future: DrawingScreenPoint;
      target: DrawingScreenPoint;
      boundaries: readonly [DrawingScreenSegment, DrawingScreenSegment];
      points: readonly DrawingScreenPoint[];
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
      kind: 'image';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      rect: { x: number; y: number; width: number; height: number };
      src: string;
      alt: string;
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
      pressureSegments: readonly UserDrawingPressureStrokeSegment[];
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
      pressureSegments: readonly UserDrawingPressureStrokeSegment[];
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
      pressureSegments: readonly UserDrawingPressureStrokeSegment[];
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
      kind: 'doubleCurve';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      start: DrawingScreenPoint;
      firstControl: DrawingScreenPoint;
      secondControl: DrawingScreenPoint;
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
      kind: 'anchoredVolumeProfile';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      bounds: DrawingScreenRect;
      bins: readonly {
        priceMin: number;
        priceMax: number;
        volume: number;
        rect: DrawingScreenRect;
      }[];
      guides: readonly {
        kind: 'pointOfControl' | 'valueAreaHigh' | 'valueAreaLow';
        price: number;
        volume: number;
        segment: {
          start: DrawingScreenPoint;
          end: DrawingScreenPoint;
        };
      }[];
      maxVolume: number;
      totalVolume: number;
      style: UserDrawingStyle;
    }
  | {
      kind: 'fixedRangeVolumeProfile';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      bounds: DrawingScreenRect;
      bins: readonly {
        priceMin: number;
        priceMax: number;
        volume: number;
        rect: DrawingScreenRect;
      }[];
      guides: readonly {
        kind: 'pointOfControl' | 'valueAreaHigh' | 'valueAreaLow';
        price: number;
        volume: number;
        segment: {
          start: DrawingScreenPoint;
          end: DrawingScreenPoint;
        };
      }[];
      maxVolume: number;
      totalVolume: number;
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
      parallels: readonly {
        ratio: number;
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
      }[];
      fill: readonly DrawingScreenPoint[];
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
        label?: string;
        labelPoint?: DrawingScreenPoint;
      }[];
      bands: readonly {
        fromRatio: number;
        toRatio: number;
        points: readonly [DrawingScreenPoint, DrawingScreenPoint, DrawingScreenPoint];
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
        label?: string;
        labelPoint?: DrawingScreenPoint;
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
        label?: string;
        labelPoint?: DrawingScreenPoint;
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
        label: string;
        radius: number;
        labelPoint: DrawingScreenPoint;
      }[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'fibArcs';
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
        label: string;
        radius: number;
        startAngle: number;
        endAngle: number;
        labelPoint: DrawingScreenPoint;
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
        label: string;
        radius: number;
        startAngle: number;
        endAngle: number;
        labelPoint: DrawingScreenPoint;
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
        label: string;
        radius: number;
        startAngle: number;
        endAngle: number;
        labelPoint: DrawingScreenPoint;
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
      labels: readonly DrawingScreenFibSpiralLabel[];
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
      kind: 'gannBox' | 'gannSquare' | 'gannSquareFixed';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      rect: { x: number; y: number; width: number; height: number };
      levels: readonly {
        ratio: number;
        label: string;
        horizontal: { start: DrawingScreenPoint; end: DrawingScreenPoint };
        vertical: { start: DrawingScreenPoint; end: DrawingScreenPoint };
        labelPoint: DrawingScreenPoint;
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
        label: string;
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
        labelPoint: DrawingScreenPoint;
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
        label: string;
        time: number;
        x: number;
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
        labelPoint: DrawingScreenPoint;
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
        label: string;
        time: number;
        x: number;
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
        labelPoint: DrawingScreenPoint;
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
        label: string;
        time: number;
        x: number;
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
        labelPoint: DrawingScreenPoint;
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
        label: string;
        startTime: number;
        endTime: number;
        startBoundary: { start: DrawingScreenPoint; end: DrawingScreenPoint };
        endBoundary: { start: DrawingScreenPoint; end: DrawingScreenPoint };
        points: readonly DrawingScreenPoint[];
        labelPoint: DrawingScreenPoint;
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
      median: { start: DrawingScreenPoint; end: DrawingScreenPoint };
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
      median: { start: DrawingScreenPoint; end: DrawingScreenPoint };
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
      median: { start: DrawingScreenPoint; end: DrawingScreenPoint };
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
      median: { start: DrawingScreenPoint; end: DrawingScreenPoint };
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
      median: { start: DrawingScreenPoint; end: DrawingScreenPoint };
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
      kind: 'fibRetracement' | 'fibExtension' | 'trendBasedFibExtension';
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
      displayMode: UserDrawingBarsPatternDisplayMode;
      linePoints: readonly DrawingScreenPoint[];
      bounds: { x: number; y: number; width: number; height: number };
      style: UserDrawingStyle;
    }
  | {
      kind: 'trianglePattern';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      polygon: readonly DrawingScreenPoint[];
      boundaries: readonly {
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
      }[];
      labels: readonly DrawingScreenTrianglePatternLabel[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'abcdPattern';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      labels: readonly DrawingScreenAbcdPatternLabel[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'xabcdPattern' | 'cypherPattern';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      labels: readonly DrawingScreenXabcdPatternLabel[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'threeDrivesPattern';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      labels: readonly DrawingScreenThreeDrivesPatternLabel[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'elliottImpulseWave';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      labels: readonly DrawingScreenElliottImpulseWaveLabel[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'elliottCorrectiveWave' | 'elliottDoubleComboWave';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      labels: readonly (DrawingScreenElliottCorrectiveWaveLabel | DrawingScreenElliottDoubleComboWaveLabel)[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'elliottTriangleWave' | 'elliottTripleComboWave';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      labels: readonly (DrawingScreenElliottTriangleWaveLabel | DrawingScreenElliottTripleComboWaveLabel)[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'headShouldersPattern';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      neckline: {
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
      };
      labels: readonly DrawingScreenHeadShouldersPatternLabel[];
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
      kind: 'anchoredText';
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
      kind: 'anchoredNote';
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
      kind: 'priceLabel';
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
      kind: 'emoji';
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
      kind: 'sticker';
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
      kind: 'signpost';
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
      kind: 'table';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      table: DrawingScreenTable;
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
export type MobileUserDrawingAnchoredTextPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'anchoredText' }>;
export type MobileUserDrawingAnchoredNotePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'anchoredNote' }>;
export type MobileUserDrawingPriceLabelPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'priceLabel' }>;
export type MobileUserDrawingPriceNotePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'priceNote' }>;
export type MobileUserDrawingPinPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'pin' }>;
export type MobileUserDrawingEmojiPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'emoji' }>;
export type MobileUserDrawingStickerPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'sticker' }>;
export type MobileUserDrawingBalloonPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'balloon' }>;
export type MobileUserDrawingSignpostPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'signpost' }>;
export type MobileUserDrawingTablePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'table' }>;
export type MobileUserDrawingTextBoxPrimitive =
  | MobileUserDrawingTextLabelPrimitive
  | MobileUserDrawingNotePrimitive
  | MobileUserDrawingAnchoredTextPrimitive
  | MobileUserDrawingAnchoredNotePrimitive
  | MobileUserDrawingCalloutPrimitive
  | MobileUserDrawingPriceLabelPrimitive
  | MobileUserDrawingPriceNotePrimitive
  | MobileUserDrawingEmojiPrimitive
  | MobileUserDrawingStickerPrimitive
  | MobileUserDrawingCommentPrimitive
  | MobileUserDrawingBalloonPrimitive
  | MobileUserDrawingSignpostPrimitive;

export function isMobileUserDrawingTextBoxPrimitive(
  primitive: MobileUserDrawingPrimitive,
): primitive is MobileUserDrawingTextBoxPrimitive {
  return (
    primitive.kind === 'textLabel' ||
    primitive.kind === 'note' ||
    primitive.kind === 'anchoredText' ||
    primitive.kind === 'anchoredNote' ||
    primitive.kind === 'callout' ||
    primitive.kind === 'priceLabel' ||
    primitive.kind === 'priceNote' ||
    primitive.kind === 'emoji' ||
    primitive.kind === 'sticker' ||
    primitive.kind === 'comment' ||
    primitive.kind === 'balloon' ||
    primitive.kind === 'signpost'
  );
}
export type MobileUserDrawingLinePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'line' }>;
export type MobileUserDrawingPriceRangePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'priceRange' }>;
export type MobileUserDrawingImagePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'image' }>;
export type MobileUserDrawingDatePriceRangePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'datePriceRange' }>;
export type MobileUserDrawingRiskRewardPositionPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'riskRewardPosition' }
>;
export type MobileUserDrawingPathPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'path' }>;
export type MobileUserDrawingBrushPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'brush' }>;
export type MobileUserDrawingHighlighterPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'highlighter' }>;
export type MobileUserDrawingCurvePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'curve' }>;
export type MobileUserDrawingDoubleCurvePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'doubleCurve' }>;
export type MobileUserDrawingArcPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'arc' }>;
export type MobileUserDrawingAnchoredVwapPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'anchoredVwap' }>;
export type MobileUserDrawingAnchoredVolumeProfilePrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'anchoredVolumeProfile' }
>;
export type MobileUserDrawingFixedRangeVolumeProfilePrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'fixedRangeVolumeProfile' }
>;
export type MobileUserDrawingTrianglePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'triangle' }>;
export type MobileUserDrawingPitchforkPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'pitchfork' }>;
export type MobileUserDrawingPitchfanPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'pitchfan' }>;
export type MobileUserDrawingFibFanPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibFan' }>;
export type MobileUserDrawingFibSpeedResistanceFanPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'fibSpeedResistanceFan' }
>;
export type MobileUserDrawingFibCirclesPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibCircles' }>;
export type MobileUserDrawingFibArcsPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibArcs' }>;
export type MobileUserDrawingFibSpeedResistanceArcsPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'fibSpeedResistanceArcs' }
>;
export type MobileUserDrawingFibWedgePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibWedge' }>;
export type MobileUserDrawingFibSpiralPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibSpiral' }>;
export type MobileUserDrawingGannFanPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'gannFan' }>;
export type MobileUserDrawingGannBoxPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'gannBox' | 'gannSquare' | 'gannSquareFixed' }
> & { kind: 'gannBox' };
export type MobileUserDrawingGannSquarePrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'gannBox' | 'gannSquare' | 'gannSquareFixed' }
> & { kind: 'gannSquare' };
export type MobileUserDrawingGannSquareFixedPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'gannBox' | 'gannSquare' | 'gannSquareFixed' }
> & { kind: 'gannSquareFixed' };
export type MobileUserDrawingFibChannelPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibChannel' }>;
export type MobileUserDrawingFibTimeZonePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibTimeZone' }>;
export type MobileUserDrawingTrendBasedFibTimePrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'trendBasedFibTime' }
>;
export type MobileUserDrawingCyclicLinesPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'cyclicLines' }>;
export type MobileUserDrawingTimeCyclesPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'timeCycles' }>;
export type MobileUserDrawingSineLinePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'sineLine' }>;
export type MobileUserDrawingParallelChannelPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'parallelChannel' }
>;
export type MobileUserDrawingRotatedRectanglePrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'rotatedRectangle' }
>;
export type MobileUserDrawingRegressionTrendPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'regressionTrend' }
>;
export type MobileUserDrawingFlatTopBottomPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'flatTopBottom' }>;
export type MobileUserDrawingDisjointChannelPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'disjointChannel' }
>;
export type MobileUserDrawingFibRetracementPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibRetracement' }>;
export type MobileUserDrawingFibExtensionPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibExtension' }>;
export type MobileUserDrawingTrendBasedFibExtensionPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'trendBasedFibExtension' }
>;
export type MobileUserDrawingBarsPatternPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'barsPattern' }>;
export type MobileUserDrawingTrianglePatternPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'trianglePattern' }
>;
export type MobileUserDrawingAbcdPatternPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'abcdPattern' }>;
export type MobileUserDrawingXabcdPatternPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'xabcdPattern' }>;
export type MobileUserDrawingCypherPatternPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'cypherPattern' }>;
export type MobileUserDrawingThreeDrivesPatternPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'threeDrivesPattern' }
>;
export type MobileUserDrawingHeadShouldersPatternPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'headShouldersPattern' }
>;
export type MobileUserDrawingElliottImpulseWavePrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'elliottImpulseWave' }
>;
export type MobileUserDrawingElliottCorrectiveWavePrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'elliottCorrectiveWave' }
>;
export type MobileUserDrawingElliottDoubleComboWavePrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'elliottDoubleComboWave' }
>;
export type MobileUserDrawingElliottTriangleWavePrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'elliottTriangleWave' }
>;
export type MobileUserDrawingElliottTripleComboWavePrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'elliottTripleComboWave' }
>;
export type MobileUserDrawingArrowMarkerPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'arrowMarker' }>;
export type MobileUserDrawingArrowMarkPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'arrowMark' }>;
export type MobileUserDrawingIconPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'icon' }>;
export type MobileUserDrawingCirclePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'circle' }>;
export type MobileUserDrawingEllipsePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'ellipse' }>;
export type MobileUserDrawingInfoLinePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'infoLine' }>;
export type MobileUserDrawingForecastPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'forecast' }>;
export type MobileUserDrawingProjectionPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'projection' }>;
export type MobileUserDrawingSectorPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'sector' }>;
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

function areMobileUserDrawingLabelsVisible(geometry: ResolvedUserDrawingGeometry): boolean {
  return geometry.drawing.style.labelsVisible !== false;
}

function resolveMobileMeasurementLabelPoint(
  rect: DrawingScreenRect,
  fontSize: number,
  position: unknown,
): DrawingScreenPoint {
  const labelPosition = normalizeUserDrawingMeasurementLabelPosition(
    position ?? DEFAULT_USER_DRAWING_MEASUREMENT_LABEL_POSITION,
  );
  const x = rect.x + rect.width / 2;
  if (labelPosition === 'top') return { x, y: rect.y + fontSize };
  if (labelPosition === 'bottom') return { x, y: rect.y + rect.height - fontSize };
  return { x, y: rect.y + rect.height / 2 };
}

function resolveMobileDatePriceRangeLabelPoints(
  rect: DrawingScreenRect,
  fontSize: number,
  position: unknown,
): { price: DrawingScreenPoint; date: DrawingScreenPoint } {
  const labelPosition = normalizeUserDrawingMeasurementLabelPosition(
    position ?? DEFAULT_USER_DRAWING_MEASUREMENT_LABEL_POSITION,
  );
  const x = rect.x + rect.width / 2;
  if (labelPosition === 'top') {
    return {
      price: { x, y: rect.y + fontSize },
      date: { x, y: rect.y + fontSize * 2 },
    };
  }
  if (labelPosition === 'bottom') {
    return {
      price: { x, y: rect.y + rect.height - fontSize * 2 },
      date: { x, y: rect.y + rect.height - fontSize },
    };
  }
  return {
    price: { x, y: rect.y + rect.height / 2 },
    date: { x, y: rect.y + rect.height - fontSize },
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
      const arrowHead = resolveDrawingArrowHead(geometry.segment, {
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
        label: areMobileUserDrawingLabelsVisible(geometry) ? geometry.angle.label : '',
        style: geometry.drawing.style,
      };
    case 'infoLine': {
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
        label: areMobileUserDrawingLabelsVisible(geometry) ? geometry.infoMetrics.label : '',
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
    case 'image':
      return {
        kind: 'image',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        rect: geometry.rect,
        src: geometry.drawing.kind === 'image' ? geometry.drawing.src : '',
        alt: geometry.drawing.kind === 'image' ? geometry.drawing.alt : 'Image placeholder',
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
    case 'highlighter': {
      const pathDrawing = geometry.drawing as PathDrawing | BrushDrawing | HighlighterDrawing;
      return {
        kind: geometry.kind,
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.polyline.points,
        pressureSegments: resolveUserDrawingPressureStrokeSegments(
          pathDrawing.points,
          geometry.polyline.points,
          geometry.drawing.style.lineWidth,
          geometry.drawing.style.lineStyle,
        ),
        style: geometry.drawing.style,
      };
    }
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
    case 'doubleCurve':
      return {
        kind: 'doubleCurve',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        start: geometry.doubleCurve.start,
        firstControl: geometry.doubleCurve.firstControl,
        secondControl: geometry.doubleCurve.secondControl,
        end: geometry.doubleCurve.end,
        points: geometry.doubleCurve.points,
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
    case 'anchoredVolumeProfile':
    case 'fixedRangeVolumeProfile':
      return {
        kind: geometry.kind,
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        bounds: geometry.volumeProfile.bounds,
        bins: geometry.volumeProfile.bins.map((bin) => ({
          priceMin: bin.priceMin,
          priceMax: bin.priceMax,
          volume: bin.volume,
          rect: bin.rect,
        })),
        guides:
          geometry.drawing.style.volumeProfileGuidesVisible === false ? [] : geometry.volumeProfile.guides,
        maxVolume: geometry.volumeProfile.maxVolume,
        totalVolume: geometry.volumeProfile.totalVolume,
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
        parallels: geometry.pitchfork.parallels.map((parallel) => ({
          ratio: parallel.ratio,
          start: parallel.segment.start,
          end: parallel.segment.end,
        })),
        fill: geometry.pitchfork.fill.points,
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
        bands: geometry.pitchfan.bands,
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
          label: areMobileUserDrawingLabelsVisible(geometry) ? ray.label : undefined,
          labelPoint: ray.labelPoint,
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
          label: areMobileUserDrawingLabelsVisible(geometry) ? ray.label : undefined,
          labelPoint: ray.labelPoint,
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
          label: areMobileUserDrawingLabelsVisible(geometry) ? circle.label : '',
          radius: circle.radius,
          labelPoint: circle.labelPoint,
        })),
        style: geometry.drawing.style,
      };
    case 'fibArcs':
      return {
        kind: 'fibArcs',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        center: geometry.fibArcs.center,
        reference: geometry.fibArcs.reference,
        baseRadius: geometry.fibArcs.baseRadius,
        arcs: geometry.fibArcs.arcs.map((arc) => ({
          ratio: arc.ratio,
          label: areMobileUserDrawingLabelsVisible(geometry) ? arc.label : '',
          radius: arc.radius,
          startAngle: arc.startAngle,
          endAngle: arc.endAngle,
          labelPoint: arc.labelPoint,
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
          label: areMobileUserDrawingLabelsVisible(geometry) ? arc.label : '',
          radius: arc.radius,
          startAngle: arc.startAngle,
          endAngle: arc.endAngle,
          labelPoint: arc.labelPoint,
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
          label: areMobileUserDrawingLabelsVisible(geometry) ? arc.label : '',
          radius: arc.radius,
          startAngle: arc.startAngle,
          endAngle: arc.endAngle,
          labelPoint: arc.labelPoint,
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
        labels: areMobileUserDrawingLabelsVisible(geometry) ? geometry.fibSpiral.labels : [],
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
          label: areMobileUserDrawingLabelsVisible(geometry) ? ray.label : undefined,
          labelPoint: ray.labelPoint,
        })),
        style: geometry.drawing.style,
      };
    case 'gannBox':
    case 'gannSquare':
    case 'gannSquareFixed':
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
          label: areMobileUserDrawingLabelsVisible(geometry) ? level.label : '',
          horizontal: level.horizontal,
          vertical: level.vertical,
          labelPoint: level.labelPoint,
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
          label: areMobileUserDrawingLabelsVisible(geometry) ? level.label : '',
          start: level.segment.start,
          end: level.segment.end,
          labelPoint: level.labelPoint,
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
          label: areMobileUserDrawingLabelsVisible(geometry) ? level.label : '',
          time: level.time,
          x: level.x,
          start: level.segment.start,
          end: level.segment.end,
          labelPoint: level.labelPoint,
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
          label: areMobileUserDrawingLabelsVisible(geometry) ? level.label : '',
          time: level.time,
          x: level.x,
          start: level.segment.start,
          end: level.segment.end,
          labelPoint: level.labelPoint,
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
          label: areMobileUserDrawingLabelsVisible(geometry) ? level.label : '',
          time: level.time,
          x: level.x,
          start: level.segment.start,
          end: level.segment.end,
          labelPoint: level.labelPoint,
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
          label: areMobileUserDrawingLabelsVisible(geometry) ? cycle.label : '',
          startTime: cycle.startTime,
          endTime: cycle.endTime,
          startBoundary: cycle.startBoundary,
          endBoundary: cycle.endBoundary,
          points: cycle.points,
          labelPoint: cycle.labelPoint,
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
        median: geometry.channel.median,
        style: geometry.drawing.style,
      };
    case 'priceRange': {
      const drawing = geometry.drawing;
      const label =
        drawing.kind === 'priceRange'
          ? resolveUserDrawingVisualPriceRangeMetrics(drawing.points[0], drawing.points[1]).label
          : '';
      const fontSize = normalizeUserDrawingFontSize(geometry.drawing.style.fontSize ?? 12);
      return {
        kind: 'priceRange',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        rect: geometry.rect,
        labelPoint: resolveMobileMeasurementLabelPoint(
          geometry.rect,
          fontSize,
          geometry.drawing.style.measurementLabelPosition,
        ),
        label: areMobileUserDrawingLabelsVisible(geometry) ? label : '',
        style: geometry.drawing.style,
      };
    }
    case 'dateRange': {
      return {
        kind: 'dateRange',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        rect: geometry.rect,
        labelPoint: resolveMobileMeasurementLabelPoint(
          geometry.rect,
          normalizeUserDrawingFontSize(geometry.drawing.style.fontSize ?? 12),
          geometry.drawing.style.measurementLabelPosition,
        ),
        label: areMobileUserDrawingLabelsVisible(geometry) ? geometry.dateMetrics.label : '',
        style: geometry.drawing.style,
      };
    }
    case 'datePriceRange': {
      const drawing = geometry.drawing;
      const priceLabel =
        drawing.kind === 'datePriceRange'
          ? resolveUserDrawingVisualPriceRangeMetrics(drawing.points[0], drawing.points[1]).label
          : '';
      const fontSize = normalizeUserDrawingFontSize(geometry.drawing.style.fontSize ?? 12);
      const labelPoints = resolveMobileDatePriceRangeLabelPoints(
        geometry.rect,
        fontSize,
        geometry.drawing.style.measurementLabelPosition,
      );
      return {
        kind: 'datePriceRange',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        rect: geometry.rect,
        priceLabelPoint: labelPoints.price,
        priceLabel: areMobileUserDrawingLabelsVisible(geometry) ? priceLabel : '',
        dateLabelPoint: labelPoints.date,
        dateLabel: areMobileUserDrawingLabelsVisible(geometry) ? geometry.dateMetrics.label : '',
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
        rewardLabel: areMobileUserDrawingLabelsVisible(geometry) ? position.rewardLabel : '',
        riskLabel: areMobileUserDrawingLabelsVisible(geometry) ? position.riskLabel : '',
        ratioLabel: areMobileUserDrawingLabelsVisible(geometry) ? position.ratioLabel : '',
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
        sourceLabel: areMobileUserDrawingLabelsVisible(geometry) ? geometry.forecast.sourceLabel : '',
        targetLabel: areMobileUserDrawingLabelsVisible(geometry) ? geometry.forecast.targetLabel : '',
        changeLabel: areMobileUserDrawingLabelsVisible(geometry) ? geometry.forecast.changeLabel : '',
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
        startLabel: areMobileUserDrawingLabelsVisible(geometry) ? geometry.projection.startLabel : '',
        pivotLabel: areMobileUserDrawingLabelsVisible(geometry) ? geometry.projection.pivotLabel : '',
        targetLabel: areMobileUserDrawingLabelsVisible(geometry) ? geometry.projection.targetLabel : '',
        changeLabel: areMobileUserDrawingLabelsVisible(geometry) ? geometry.projection.changeLabel : '',
        style: geometry.drawing.style,
      };
    case 'sector':
      return {
        kind: 'sector',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        origin: geometry.sector.origin,
        future: geometry.sector.future,
        target: geometry.sector.target,
        boundaries: geometry.sector.boundaries,
        points: geometry.sector.polygon.points,
        style: geometry.drawing.style,
      };
    case 'fibRetracement':
    case 'fibExtension':
    case 'trendBasedFibExtension':
      return {
        kind: geometry.kind,
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        levels: geometry.fib.levels.map((level) => ({
          ratio: level.ratio,
          label: areMobileUserDrawingLabelsVisible(geometry) ? `${level.label} ${level.price.toFixed(2)}` : '',
          price: level.price,
          start: level.segment.start,
          end: level.segment.end,
        })),
        style: geometry.drawing.style,
      };
    case 'barsPattern':
      const displayMode = normalizeUserDrawingBarsPatternDisplayMode(
        geometry.drawing.style.barsPatternDisplayMode ?? DEFAULT_USER_DRAWING_BARS_PATTERN_DISPLAY_MODE,
      );
      return {
        kind: 'barsPattern',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        bars: geometry.pattern.bars,
        displayMode,
        linePoints: geometry.pattern.bars.map((bar) => ({ x: bar.x, y: bar.closeY })),
        bounds: geometry.pattern.bounds,
        style: geometry.drawing.style,
      };
    case 'trianglePattern':
      return {
        kind: 'trianglePattern',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.pattern.points,
        polygon: geometry.pattern.polygon.points,
        boundaries: geometry.pattern.boundaries,
        labels: areMobileUserDrawingLabelsVisible(geometry) ? geometry.pattern.labels : [],
        style: geometry.drawing.style,
      };
    case 'xabcdPattern':
    case 'cypherPattern':
      return {
        kind: geometry.kind,
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.pattern.polyline.points,
        labels: areMobileUserDrawingLabelsVisible(geometry) ? geometry.pattern.labels : [],
        style: geometry.drawing.style,
      };
    case 'threeDrivesPattern':
      return {
        kind: 'threeDrivesPattern',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.pattern.polyline.points,
        labels: areMobileUserDrawingLabelsVisible(geometry) ? geometry.pattern.labels : [],
        style: geometry.drawing.style,
      };
    case 'elliottImpulseWave':
      return {
        kind: 'elliottImpulseWave',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.pattern.polyline.points,
        labels: areMobileUserDrawingLabelsVisible(geometry) ? geometry.pattern.labels : [],
        style: geometry.drawing.style,
      };
    case 'elliottCorrectiveWave':
    case 'elliottDoubleComboWave':
      return {
        kind: geometry.kind,
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.pattern.polyline.points,
        labels: areMobileUserDrawingLabelsVisible(geometry) ? geometry.pattern.labels : [],
        style: geometry.drawing.style,
      };
    case 'elliottTriangleWave':
    case 'elliottTripleComboWave':
      return {
        kind: geometry.kind,
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.pattern.polyline.points,
        labels: areMobileUserDrawingLabelsVisible(geometry) ? geometry.pattern.labels : [],
        style: geometry.drawing.style,
      };
    case 'headShouldersPattern':
      return {
        kind: 'headShouldersPattern',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.pattern.polyline.points,
        neckline: geometry.pattern.neckline,
        labels: areMobileUserDrawingLabelsVisible(geometry) ? geometry.pattern.labels : [],
        style: geometry.drawing.style,
      };
    case 'abcdPattern':
      return {
        kind: 'abcdPattern',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.pattern.polyline.points,
        labels: areMobileUserDrawingLabelsVisible(geometry) ? geometry.pattern.labels : [],
        style: geometry.drawing.style,
      };
    case 'textLabel':
    case 'note':
    case 'comment':
    case 'anchoredText':
    case 'anchoredNote':
    case 'priceLabel':
    case 'emoji':
    case 'sticker':
    case 'balloon':
    case 'signpost':
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
    case 'table':
      return {
        kind: 'table',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        table: geometry.table,
        textAlign: (geometry.drawing as TableDrawing).textAlign,
        style: geometry.drawing.style,
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
  primitive: MobileUserDrawingTextBoxPrimitive,
  measuredTextWidth: number | readonly number[],
  options: {
    labelPadding?: number;
    labelHeight?: number;
    lines?: readonly string[];
    boxWidth?: number;
  } = {},
): MobileUserDrawingTextLabelLayout {
  const fontSize = normalizeUserDrawingFontSize(primitive.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(primitive.style.fontFamily ?? 'sans-serif');
  const labelPadding = options.labelPadding ?? DEFAULT_TEXT_LABEL_PADDING;
  const labelHeight = options.labelHeight ?? DEFAULT_TEXT_LABEL_HEIGHT;
  const lines = options.lines ?? splitUserDrawingTextLines(primitive.text);
  const lineWidths = Array.isArray(measuredTextWidth) ? measuredTextWidth : lines.map(() => measuredTextWidth);
  const layout = resolveUserDrawingTextLabelLayout({
    text: primitive.text,
    point: primitive.point,
    textAlign: primitive.textAlign,
    lineWidths,
    lines,
    boxWidth: options.boxWidth,
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
    lines?: readonly string[];
    boxWidth?: number;
  } = {},
): MobileUserDrawingBalloonLayout {
  const fontSize = normalizeUserDrawingFontSize(primitive.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(primitive.style.fontFamily ?? 'sans-serif');
  const labelPadding = options.labelPadding ?? DEFAULT_TEXT_LABEL_PADDING;
  const labelHeight = options.labelHeight ?? DEFAULT_TEXT_LABEL_HEIGHT;
  const lines = options.lines ?? splitUserDrawingTextLines(primitive.text);
  const lineWidths = Array.isArray(measuredTextWidth) ? measuredTextWidth : lines.map(() => measuredTextWidth);
  const layout = resolveUserDrawingBalloonLayout({
    text: primitive.text,
    point: primitive.point,
    textAlign: primitive.textAlign,
    lineWidths,
    lines,
    boxWidth: options.boxWidth,
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
