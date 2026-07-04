import type { DrawingCoordinateSpace, DrawingScreenPoint, DrawingScreenRect } from './coordinates';
import type { UserDrawing, UserDrawingAnchor, UserDrawingLineStyle, UserDrawingState } from './types';

import {
  anchorToScreenPoint,
  panePositionToScreenPoint,
  priceToDrawingY,
  resolveDateRangeRectFromAnchors,
  resolveCircleFromAnchors,
  resolveEllipseFromAnchors,
  resolvePolylineFromAnchors,
  resolveRectFromAnchors,
  resolveUserDrawingGeometry,
  timeToDrawingX,
} from './coordinates';
import { getUserDrawingSelectionIds } from './input';
import { getUserDrawingPlacementMode } from './placement';
import { createUserDrawingFromDraft, getRequiredAnchorCount } from './types';

export type UserDrawingRenderPhase = 'committed' | 'draft';

export interface UserDrawingRenderEntry {
  drawing: UserDrawing;
  phase: UserDrawingRenderPhase;
  selected: boolean;
}

export interface ResolveUserDrawingRenderEntriesOptions {
  draftPreviewAnchor?: UserDrawingAnchor;
  draftId?: string;
  now?: number;
}

export interface ResolveUserDrawingSelectionActionAnchorOptions {
  padding?: number;
  minTargetSize?: number;
}

export interface UserDrawingSelectionActionAnchor {
  anchor: DrawingScreenPoint;
  bounds: DrawingScreenRect;
  drawingIds: readonly string[];
  paneIds: readonly string[];
  primaryPaneId: string;
}

export interface UserDrawingPressureStrokeSegment {
  start: DrawingScreenPoint;
  end: DrawingScreenPoint;
  lineWidth: number;
  lineDashOffset: number;
}

const DEFAULT_SELECTION_ACTION_PADDING = 8;
const DEFAULT_SELECTION_ACTION_MIN_TARGET_SIZE = 24;
const PRESSURE_STROKE_MIN_FACTOR = 0.25;

function resolvePressureStrokeWidth(lineWidth: number, pressure: number): number {
  const baseWidth = Math.max(1, lineWidth);
  return Math.max(1, baseWidth * (PRESSURE_STROKE_MIN_FACTOR + (1 - PRESSURE_STROKE_MIN_FACTOR) * pressure));
}

function distanceBetweenScreenPoints(a: DrawingScreenPoint, b: DrawingScreenPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function resolveUserDrawingPressureStrokeSegments(
  anchors: readonly UserDrawingAnchor[],
  points: readonly DrawingScreenPoint[],
  lineWidth: number,
  _lineStyle: UserDrawingLineStyle,
): UserDrawingPressureStrokeSegment[] {
  if (anchors.length < 2 || points.length < 2 || anchors.every((anchor) => anchor.pressure === undefined)) {
    return [];
  }

  const count = Math.min(anchors.length, points.length);
  const segments: UserDrawingPressureStrokeSegment[] = [];
  let lineDashOffset = 0;
  for (let index = 0; index < count - 1; index += 1) {
    const startAnchor = anchors[index]!;
    const endAnchor = anchors[index + 1]!;
    const start = points[index]!;
    const end = points[index + 1]!;
    const pressure = ((startAnchor.pressure ?? 1) + (endAnchor.pressure ?? 1)) / 2;
    segments.push({
      start,
      end,
      lineWidth: resolvePressureStrokeWidth(lineWidth, pressure),
      lineDashOffset,
    });
    lineDashOffset += distanceBetweenScreenPoints(start, end);
  }
  return segments;
}

export function resolveUserDrawingRenderEntries(
  state: UserDrawingState,
  options: ResolveUserDrawingRenderEntriesOptions = {},
): UserDrawingRenderEntry[] {
  const selectedIds = new Set(getUserDrawingSelectionIds(state.selection));
  const entries: UserDrawingRenderEntry[] = state.drawings.map((drawing) => ({
    drawing,
    phase: 'committed' as const,
    selected: selectedIds.has(drawing.id),
  }));

  if (state.measure) {
    const measureDrawing = createUserDrawingFromDraft(
      {
        tool: 'datePriceRange',
        paneId: state.measure.paneId,
        anchors: state.measure.anchors,
        style: state.measure.style,
        startedAt: state.measure.startedAt,
      },
      {
        id: '__measure__',
        now: options.now ?? state.measure.startedAt,
      },
    );
    if (measureDrawing) {
      entries.push({
        drawing: measureDrawing,
        phase: 'draft',
        selected: false,
      });
    }
  }

  if (!state.draft) return entries;

  const requiredAnchorCount = getRequiredAnchorCount(state.draft.tool);
  const placementMode = getUserDrawingPlacementMode(state.draft.tool);
  let draftAnchors = state.draft.anchors;
  if (state.draft.anchors.length < requiredAnchorCount && options.draftPreviewAnchor) {
    draftAnchors = [...state.draft.anchors, options.draftPreviewAnchor];
  }
  if (
    draftAnchors.length >= 2 &&
    draftAnchors.length < requiredAnchorCount &&
    (placementMode === 'dragSeed' || placementMode === 'click')
  ) {
    const terminalAnchor = draftAnchors[draftAnchors.length - 1]!;
    draftAnchors = [
      ...draftAnchors,
      ...Array.from({ length: requiredAnchorCount - draftAnchors.length }, () => terminalAnchor),
    ];
  }

  const draftDrawing = createUserDrawingFromDraft(
    {
      ...state.draft,
      anchors: draftAnchors,
    },
    {
      id: options.draftId ?? '__draft__',
      now: options.now ?? state.draft.startedAt,
    },
  );

  if (!draftDrawing) return entries;

  return [
    ...entries,
    {
      drawing: draftDrawing,
      phase: 'draft',
      selected: false,
    },
  ];
}

export function resolveUserDrawingHandlePoints(
  drawing: UserDrawing,
  space: DrawingCoordinateSpace,
): DrawingScreenPoint[] {
  switch (drawing.kind) {
    case 'trendLine':
    case 'trendAngle':
    case 'extendedLine':
    case 'infoLine':
    case 'arrowLine':
    case 'arrowMarker':
    case 'ray':
    case 'fibRetracement':
    case 'fibExtension':
    case 'trendBasedFibExtension':
    case 'fibFan':
    case 'fibSpeedResistanceFan':
    case 'fibArcs':
    case 'fibSpeedResistanceArcs':
    case 'fibCircles':
    case 'fibSpiral':
    case 'fibTimeZone':
    case 'cyclicLines':
    case 'timeCycles':
    case 'sineLine':
    case 'forecast':
    case 'fixedRangeVolumeProfile':
    case 'gannFan':
      return drawing.points.map((point) => anchorToScreenPoint(point, space));
    case 'horizontalLine': {
      const y = priceToDrawingY(drawing.price, space);
      return [
        { x: space.chartLeft, y },
        { x: space.chartRight, y },
      ];
    }
    case 'verticalLine': {
      const x = timeToDrawingX(drawing.time, space);
      return [
        { x, y: space.pane.top },
        { x, y: space.pane.bottom },
      ];
    }
    case 'arrowMarkLeft':
    case 'arrowMarkRight':
    case 'arrowMarkUp':
    case 'arrowMarkDown':
    case 'horizontalRay':
    case 'crossLine':
    case 'anchoredVwap':
    case 'anchoredVolumeProfile':
    case 'table':
    case 'icon':
    case 'flagMark':
      return [anchorToScreenPoint(drawing.point, space)];
    case 'rectangle': {
      const rect = resolveRectFromAnchors(drawing.points[0], drawing.points[1], space);
      return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];
    }
    case 'image': {
      const rect = resolveRectFromAnchors(drawing.points[0], drawing.points[1], space);
      return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];
    }
    case 'circle': {
      const rect = resolveCircleFromAnchors(drawing.points[0], drawing.points[1], space).rect;
      return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];
    }
    case 'ellipse': {
      const rect = resolveEllipseFromAnchors(drawing.points[0], drawing.points[1], space).rect;
      return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];
    }
    case 'priceRange': {
      const rect = resolveRectFromAnchors(drawing.points[0], drawing.points[1], space);
      return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];
    }
    case 'gannBox': {
      const rect = resolveRectFromAnchors(drawing.points[0], drawing.points[1], space);
      return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];
    }
    case 'gannSquare': {
      const geometry = resolveUserDrawingGeometry(drawing, space);
      if (geometry.kind !== 'gannSquare') return [];
      const rect = geometry.gannBox.rect;
      return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];
    }
    case 'gannSquareFixed': {
      const geometry = resolveUserDrawingGeometry(drawing, space);
      if (geometry.kind !== 'gannSquareFixed') return [];
      const rect = geometry.gannBox.rect;
      return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];
    }
    case 'datePriceRange': {
      const rect = resolveRectFromAnchors(drawing.points[0], drawing.points[1], space);
      return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];
    }
    case 'dateRange': {
      const rect = resolveDateRangeRectFromAnchors(drawing.points[0], drawing.points[1], space);
      return [
        { x: rect.x, y: rect.y + rect.height / 2 },
        { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
      ];
    }
    case 'path':
    case 'brush':
    case 'highlighter':
    case 'callout':
    case 'priceNote':
    case 'polyline':
    case 'curve':
    case 'doubleCurve':
    case 'arc':
    case 'triangle':
    case 'fibWedge':
    case 'fibChannel':
    case 'trendBasedFibTime':
    case 'pitchfork':
    case 'schiffPitchfork':
    case 'modifiedSchiffPitchfork':
    case 'insidePitchfork':
    case 'pitchfan':
    case 'rotatedRectangle':
    case 'parallelChannel':
    case 'flatTopBottom':
    case 'disjointChannel':
    case 'projection':
    case 'elliottCorrectiveWave':
    case 'elliottDoubleComboWave':
    case 'longPosition':
    case 'shortPosition':
    case 'trianglePattern':
    case 'abcdPattern':
    case 'xabcdPattern':
    case 'cypherPattern':
    case 'threeDrivesPattern':
    case 'headShouldersPattern':
    case 'elliottImpulseWave':
    case 'elliottTripleComboWave':
    case 'elliottTriangleWave':
      return resolvePolylineFromAnchors(drawing.points, space).points.slice();
    case 'sector': {
      const geometry = resolveUserDrawingGeometry(drawing, space);
      return geometry.kind === 'sector' ? geometry.sector.polygon.points.slice() : [];
    }
    case 'barsPattern':
      return [anchorToScreenPoint(drawing.points[2], space)];
    case 'regressionTrend':
      {
        const geometry = resolveUserDrawingGeometry(drawing, space);
        if (geometry.kind !== 'regressionTrend') return [];
        return [
          geometry.channel.base.start,
          geometry.channel.base.end,
          geometry.channel.parallel.start,
        ];
      }
    case 'textLabel':
    case 'note':
    case 'comment':
    case 'priceLabel':
    case 'emoji':
    case 'sticker':
    case 'balloon':
    case 'signpost':
    case 'pin':
      return [anchorToScreenPoint(drawing.point, space)];
    case 'anchoredText':
    case 'anchoredNote':
      return [panePositionToScreenPoint(drawing.position, space)];
  }
}

function pointsToBounds(points: readonly DrawingScreenPoint[]): DrawingScreenRect | null {
  if (points.length === 0) return null;

  let minX = points[0]?.x ?? 0;
  let maxX = minX;
  let minY = points[0]?.y ?? 0;
  let maxY = minY;

  for (const point of points.slice(1)) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function segmentToBounds({ start, end }: { start: DrawingScreenPoint; end: DrawingScreenPoint }): DrawingScreenRect {
  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);

  return {
    x: minX,
    y: minY,
    width: Math.max(start.x, end.x) - minX,
    height: Math.max(start.y, end.y) - minY,
  };
}

function normalizeSelectionActionBounds(
  bounds: DrawingScreenRect,
  options: Required<ResolveUserDrawingSelectionActionAnchorOptions>,
): DrawingScreenRect {
  const padded = {
    x: bounds.x - options.padding,
    y: bounds.y - options.padding,
    width: bounds.width + options.padding * 2,
    height: bounds.height + options.padding * 2,
  };
  const widthDelta = Math.max(0, options.minTargetSize - padded.width);
  const heightDelta = Math.max(0, options.minTargetSize - padded.height);

  return {
    x: padded.x - widthDelta / 2,
    y: padded.y - heightDelta / 2,
    width: padded.width + widthDelta,
    height: padded.height + heightDelta,
  };
}

function mergeBounds(a: DrawingScreenRect, b: DrawingScreenRect): DrawingScreenRect {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function getSpaceForDrawing(
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace> | Readonly<Record<string, DrawingCoordinateSpace>>,
  drawing: UserDrawing,
): DrawingCoordinateSpace | undefined {
  if (typeof (spacesByPaneId as ReadonlyMap<string, DrawingCoordinateSpace>).get === 'function') {
    return (spacesByPaneId as ReadonlyMap<string, DrawingCoordinateSpace>).get(drawing.paneId);
  }

  return (spacesByPaneId as Readonly<Record<string, DrawingCoordinateSpace>>)[drawing.paneId];
}

function boundsFromUserDrawingGeometry(drawing: UserDrawing, space: DrawingCoordinateSpace): DrawingScreenRect | null {
  const geometry = resolveUserDrawingGeometry(drawing, space);

  switch (geometry.kind) {
    case 'line':
    case 'arrowLine':
    case 'ray':
    case 'horizontalRay':
    case 'horizontalLine':
    case 'verticalLine':
      return segmentToBounds(geometry.segment);
    case 'trendAngle':
      return segmentToBounds(geometry.angle.segment);
    case 'infoLine':
      return segmentToBounds(geometry.segment);
    case 'crossLine':
      return mergeBounds(segmentToBounds(geometry.crossLine.horizontal), segmentToBounds(geometry.crossLine.vertical));
    case 'arrowMarker':
      return pointsToBounds(geometry.marker.points);
    case 'arrowMark':
      return pointsToBounds(geometry.mark.points);
    case 'rectangle':
    case 'image':
    case 'priceRange':
    case 'datePriceRange':
    case 'dateRange':
      return geometry.rect;
    case 'circle':
      return geometry.circle.rect;
    case 'ellipse':
      return geometry.ellipse.rect;
    case 'longPosition':
    case 'shortPosition':
      return mergeBounds(geometry.position.profitRect, geometry.position.riskRect);
    case 'forecast':
      return segmentToBounds(geometry.forecast.segment);
    case 'projection':
      return mergeBounds(segmentToBounds(geometry.projection.baseSegment), segmentToBounds(geometry.projection.projectionSegment));
    case 'sector':
      return pointsToBounds(geometry.sector.polygon.points);
    case 'barsPattern':
      return geometry.pattern.bounds;
    case 'trianglePattern':
      return pointsToBounds(geometry.pattern.polygon.points);
    case 'xabcdPattern':
    case 'cypherPattern':
    case 'threeDrivesPattern':
    case 'abcdPattern':
    case 'elliottImpulseWave':
    case 'elliottCorrectiveWave':
    case 'elliottDoubleComboWave':
    case 'elliottTripleComboWave':
    case 'elliottTriangleWave':
      return pointsToBounds(geometry.pattern.polyline.points);
    case 'headShouldersPattern':
      return mergeBounds(pointsToBounds(geometry.pattern.polyline.points) ?? segmentToBounds(geometry.pattern.neckline), segmentToBounds(geometry.pattern.neckline));
    case 'fibRetracement':
    case 'fibExtension':
    case 'trendBasedFibExtension':
      return geometry.fib.rect;
    case 'path':
    case 'brush':
    case 'highlighter':
      return pointsToBounds(geometry.polyline.points);
    case 'curve':
      return pointsToBounds(geometry.curve.points);
    case 'doubleCurve':
      return pointsToBounds(geometry.doubleCurve.points);
    case 'arc':
      return pointsToBounds(geometry.arc.points);
    case 'anchoredVwap':
      return pointsToBounds([geometry.vwap.anchor, ...geometry.vwap.points]);
    case 'anchoredVolumeProfile':
    case 'fixedRangeVolumeProfile':
      return geometry.volumeProfile.bounds;
    case 'triangle':
      return pointsToBounds(geometry.polygon.points);
    case 'pitchfork': {
      let bounds = mergeBounds(segmentToBounds(geometry.pitchfork.median), segmentToBounds(geometry.pitchfork.upper));
      bounds = mergeBounds(bounds, segmentToBounds(geometry.pitchfork.lower));
      for (const parallel of geometry.pitchfork.parallels) {
        bounds = mergeBounds(bounds, segmentToBounds(parallel.segment));
      }
      return bounds;
    }
    case 'pitchfan':
      return pointsToBounds([
        geometry.pitchfan.origin,
        geometry.pitchfan.targetStart,
        geometry.pitchfan.targetEnd,
        ...geometry.pitchfan.rays.flatMap((ray) => [ray.segment.start, ray.segment.end]),
      ]);
    case 'fibFan':
      return pointsToBounds([
        geometry.fibFan.origin,
        geometry.fibFan.targetStart,
        geometry.fibFan.targetEnd,
        ...geometry.fibFan.rays.flatMap((ray) => [ray.segment.start, ray.segment.end]),
      ]);
    case 'fibSpeedResistanceFan':
      return pointsToBounds([
        geometry.fibSpeedResistanceFan.origin,
        geometry.fibSpeedResistanceFan.targetStart,
        geometry.fibSpeedResistanceFan.targetEnd,
        ...geometry.fibSpeedResistanceFan.rays.flatMap((ray) => [ray.segment.start, ray.segment.end]),
      ]);
    case 'fibArcs':
      return pointsToBounds(geometry.fibArcs.arcs.flatMap((arc) => [arc.labelPoint, { x: arc.rect.x, y: arc.rect.y }, { x: arc.rect.x + arc.rect.width, y: arc.rect.y + arc.rect.height }]));
    case 'fibSpeedResistanceArcs':
      return pointsToBounds(
        geometry.fibSpeedResistanceArcs.arcs.flatMap((arc) => [
          arc.labelPoint,
          { x: arc.rect.x, y: arc.rect.y },
          { x: arc.rect.x + arc.rect.width, y: arc.rect.y + arc.rect.height },
        ]),
      );
    case 'fibCircles':
      return pointsToBounds(
        geometry.fibCircles.circles.flatMap((circle) => [
          circle.labelPoint,
          { x: circle.rect.x, y: circle.rect.y },
          { x: circle.rect.x + circle.rect.width, y: circle.rect.y + circle.rect.height },
        ]),
      );
    case 'fibWedge':
      return pointsToBounds([
        geometry.fibWedge.center,
        geometry.fibWedge.lower,
        geometry.fibWedge.upper,
        ...geometry.fibWedge.boundaries.flatMap((boundary) => [boundary.start, boundary.end]),
        ...geometry.fibWedge.arcs.flatMap((arc) => [
          arc.labelPoint,
          { x: arc.rect.x, y: arc.rect.y },
          { x: arc.rect.x + arc.rect.width, y: arc.rect.y + arc.rect.height },
        ]),
      ]);
    case 'fibSpiral':
      return pointsToBounds(geometry.fibSpiral.points);
    case 'fibChannel':
      return pointsToBounds(geometry.fibChannel.polygon.points);
    case 'fibTimeZone':
      return pointsToBounds(geometry.fibTimeZone.levels.flatMap((level) => [level.segment.start, level.segment.end]));
    case 'trendBasedFibTime':
      return pointsToBounds(geometry.trendBasedFibTime.levels.flatMap((level) => [level.segment.start, level.segment.end]));
    case 'cyclicLines':
      return pointsToBounds(geometry.cyclicLines.levels.flatMap((level) => [level.segment.start, level.segment.end]));
    case 'timeCycles':
      return pointsToBounds([
        geometry.timeCycles.baseline,
        geometry.timeCycles.peak,
        ...geometry.timeCycles.cycles.flatMap((cycle) => cycle.points),
      ]);
    case 'sineLine':
      return pointsToBounds(geometry.sineLine.points);
    case 'gannFan':
      return pointsToBounds([geometry.gannFan.origin, geometry.gannFan.reference, ...geometry.gannFan.rays.flatMap((ray) => [ray.segment.start, ray.segment.end])]);
    case 'gannBox':
    case 'gannSquare':
    case 'gannSquareFixed':
      return geometry.gannBox.rect;
    case 'parallelChannel':
    case 'regressionTrend':
    case 'flatTopBottom':
    case 'disjointChannel':
    case 'rotatedRectangle':
      return pointsToBounds(geometry.channel.polygon.points);
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
    case 'pin':
      return pointsToBounds([geometry.point]);
    case 'table':
      return geometry.table.bounds;
    case 'icon':
      return geometry.icon.bounds;
    case 'callout':
    case 'priceNote':
      return pointsToBounds([geometry.tip, geometry.point]);
  }
}

export function resolveUserDrawingScreenBounds(
  drawing: UserDrawing,
  space: DrawingCoordinateSpace,
  options: ResolveUserDrawingSelectionActionAnchorOptions = {},
): DrawingScreenRect | null {
  const bounds = boundsFromUserDrawingGeometry(drawing, space) ?? pointsToBounds(resolveUserDrawingHandlePoints(drawing, space));
  if (!bounds) return null;

  return normalizeSelectionActionBounds(bounds, {
    padding: options.padding ?? DEFAULT_SELECTION_ACTION_PADDING,
    minTargetSize: options.minTargetSize ?? DEFAULT_SELECTION_ACTION_MIN_TARGET_SIZE,
  });
}

export function resolveUserDrawingSelectionActionAnchor(
  state: UserDrawingState,
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace> | Readonly<Record<string, DrawingCoordinateSpace>>,
  options: ResolveUserDrawingSelectionActionAnchorOptions = {},
): UserDrawingSelectionActionAnchor | null {
  const selectedIds = new Set(getUserDrawingSelectionIds(state.selection));
  if (selectedIds.size === 0) return null;

  const normalizedOptions = {
    padding: options.padding ?? DEFAULT_SELECTION_ACTION_PADDING,
    minTargetSize: options.minTargetSize ?? DEFAULT_SELECTION_ACTION_MIN_TARGET_SIZE,
  };
  const drawingsById = new Map(state.drawings.map((drawing) => [drawing.id, drawing]));
  const drawingIds: string[] = [];
  const paneIds: string[] = [];
  const fallbackDrawingIds: string[] = [];
  const fallbackPaneIds: string[] = [];
  let fallbackSpace: DrawingCoordinateSpace | null = null;
  let bounds: DrawingScreenRect | null = null;

  for (const drawingId of selectedIds) {
    const drawing = drawingsById.get(drawingId);
    if (!drawing) continue;

    const space = getSpaceForDrawing(spacesByPaneId, drawing);
    if (!space) continue;

    fallbackDrawingIds.push(drawing.id);
    if (!fallbackPaneIds.includes(drawing.paneId)) fallbackPaneIds.push(drawing.paneId);
    fallbackSpace ??= space;

    if (!drawing.visible) continue;

    const drawingBounds = resolveUserDrawingScreenBounds(drawing, space, normalizedOptions);
    if (!drawingBounds) continue;

    drawingIds.push(drawing.id);
    if (!paneIds.includes(drawing.paneId)) paneIds.push(drawing.paneId);
    bounds = bounds ? mergeBounds(bounds, drawingBounds) : drawingBounds;
  }

  if (!bounds && fallbackSpace) {
    bounds = {
      x: fallbackSpace.chartLeft + normalizedOptions.padding,
      y: fallbackSpace.pane.top + normalizedOptions.padding,
      width: normalizedOptions.minTargetSize,
      height: normalizedOptions.minTargetSize,
    };
    drawingIds.push(...fallbackDrawingIds);
    paneIds.push(...fallbackPaneIds);
  }

  if (!bounds || drawingIds.length === 0 || paneIds.length === 0) return null;

  return {
    anchor: {
      x: bounds.x + bounds.width / 2,
      y: bounds.y,
    },
    bounds,
    drawingIds,
    paneIds,
    primaryPaneId: paneIds[0] ?? '',
  };
}
