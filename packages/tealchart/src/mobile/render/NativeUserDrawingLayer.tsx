import type { SkPath } from '@shopify/react-native-skia';
import type { UserDrawing, UserDrawingAnchor, UserDrawingRenderEntry } from '../../drawings';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativePrimitiveClip } from './nativePrimitiveClip';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import React from 'react';

import { Group, Skia, Path as SkiaPath } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { sharedPriceToNativeY, sharedTimeToNativeX } from './nativeSharedViewport';

interface NativeDrawingPoint {
  x: number;
  y: number;
}

const NATIVE_SELECTION_HANDLE_RADIUS = 4;
const NATIVE_DRAFT_ANCHOR_RADIUS = 3.5;
const NATIVE_DRAFT_OPACITY = 0.65;
const NATIVE_SELECTION_COLOR = '#00b7ef';

function appendNativeRectPath(path: SkPath, x: number, y: number, width: number, height: number): void {
  'worklet';
  if (width <= 0 || height <= 0) return;
  path.moveTo(x, y);
  path.lineTo(x + width, y);
  path.lineTo(x + width, y + height);
  path.lineTo(x, y + height);
  path.close();
}

function appendNativeOvalPath(path: SkPath, x: number, y: number, width: number, height: number): void {
  'worklet';
  if (width <= 0 || height <= 0) return;
  const rx = width / 2;
  const ry = height / 2;
  const cx = x + rx;
  const cy = y + ry;
  path.moveTo(cx + rx, cy);
  path.quadTo(cx + rx, cy + ry, cx, cy + ry);
  path.quadTo(cx - rx, cy + ry, cx - rx, cy);
  path.quadTo(cx - rx, cy - ry, cx, cy - ry);
  path.quadTo(cx + rx, cy - ry, cx + rx, cy);
  path.close();
}

function nativeAnchorToPoint(
  anchor: UserDrawingAnchor,
  frame: NativeChartFrame,
  sharedViewport: NativeViewportSharedValues,
): NativeDrawingPoint {
  'worklet';
  return {
    x: sharedTimeToNativeX(anchor.time, sharedViewport, frame),
    y: sharedPriceToNativeY(anchor.price, sharedViewport, frame),
  };
}

function appendSegment(path: SkPath, start: NativeDrawingPoint, end: NativeDrawingPoint): void {
  'worklet';
  path.moveTo(start.x, start.y);
  path.lineTo(end.x, end.y);
}

function appendAnchorsPath(
  path: SkPath,
  anchors: readonly UserDrawingAnchor[],
  frame: NativeChartFrame,
  sharedViewport: NativeViewportSharedValues,
  close = false,
): void {
  'worklet';
  const firstAnchor = anchors[0];
  if (!firstAnchor) return;

  const first = nativeAnchorToPoint(firstAnchor, frame, sharedViewport);
  path.moveTo(first.x, first.y);
  for (let index = 1; index < anchors.length; index += 1) {
    const point = nativeAnchorToPoint(anchors[index]!, frame, sharedViewport);
    path.lineTo(point.x, point.y);
  }
  if (close) path.close();
}

function appendRectFromAnchors(
  path: SkPath,
  firstAnchor: UserDrawingAnchor,
  secondAnchor: UserDrawingAnchor,
  frame: NativeChartFrame,
  sharedViewport: NativeViewportSharedValues,
): void {
  'worklet';
  const first = nativeAnchorToPoint(firstAnchor, frame, sharedViewport);
  const second = nativeAnchorToPoint(secondAnchor, frame, sharedViewport);
  const x = Math.min(first.x, second.x);
  const y = Math.min(first.y, second.y);
  appendNativeRectPath(path, x, y, Math.abs(second.x - first.x), Math.abs(second.y - first.y));
}

function appendOvalFromAnchors(
  path: SkPath,
  firstAnchor: UserDrawingAnchor,
  secondAnchor: UserDrawingAnchor,
  frame: NativeChartFrame,
  sharedViewport: NativeViewportSharedValues,
): void {
  'worklet';
  const first = nativeAnchorToPoint(firstAnchor, frame, sharedViewport);
  const second = nativeAnchorToPoint(secondAnchor, frame, sharedViewport);
  const x = Math.min(first.x, second.x);
  const y = Math.min(first.y, second.y);
  const width = Math.abs(second.x - first.x);
  const height = Math.abs(second.y - first.y);
  appendNativeOvalPath(path, x, y, width, height);
}

function extendSegmentToFrame(
  first: NativeDrawingPoint,
  second: NativeDrawingPoint,
  frame: NativeChartFrame,
): { start: NativeDrawingPoint; end: NativeDrawingPoint } {
  'worklet';
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) {
    return { start: first, end: second };
  }

  const candidates: NativeDrawingPoint[] = [];
  const leftT = dx === 0 ? Number.NaN : (frame.contentLeft - first.x) / dx;
  const rightT = dx === 0 ? Number.NaN : (frame.contentRight - first.x) / dx;
  const topT = dy === 0 ? Number.NaN : (frame.mainPane.top - first.y) / dy;
  const bottomT = dy === 0 ? Number.NaN : (frame.mainPane.bottom - first.y) / dy;
  const ts = [leftT, rightT, topT, bottomT];

  for (let index = 0; index < ts.length; index += 1) {
    const t = ts[index];
    if (!Number.isFinite(t)) continue;
    const x = first.x + dx * t;
    const y = first.y + dy * t;
    if (
      x >= frame.contentLeft - 0.5 &&
      x <= frame.contentRight + 0.5 &&
      y >= frame.mainPane.top - 0.5 &&
      y <= frame.mainPane.bottom + 0.5
    ) {
      candidates.push({ x, y });
    }
  }

  if (candidates.length < 2) return { start: first, end: second };
  return { start: candidates[0]!, end: candidates[candidates.length - 1]! };
}

function appendArrowHead(path: SkPath, start: NativeDrawingPoint, end: NativeDrawingPoint, size: number): void {
  'worklet';
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const left = {
    x: end.x - Math.cos(angle - Math.PI / 6) * size,
    y: end.y - Math.sin(angle - Math.PI / 6) * size,
  };
  const right = {
    x: end.x - Math.cos(angle + Math.PI / 6) * size,
    y: end.y - Math.sin(angle + Math.PI / 6) * size,
  };
  appendSegment(path, left, end);
  appendSegment(path, right, end);
}

function createNativeUserDrawingPath(
  drawing: UserDrawing,
  frame: NativeChartFrame,
  sharedViewport: NativeViewportSharedValues,
): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  if (!drawing.visible) return path;

  switch (drawing.kind) {
    case 'trendLine':
    case 'trendAngle':
    case 'infoLine': {
      appendSegment(
        path,
        nativeAnchorToPoint(drawing.points[0], frame, sharedViewport),
        nativeAnchorToPoint(drawing.points[1], frame, sharedViewport),
      );
      return path;
    }
    case 'arrowLine': {
      const start = nativeAnchorToPoint(drawing.points[0], frame, sharedViewport);
      const end = nativeAnchorToPoint(drawing.points[1], frame, sharedViewport);
      appendSegment(path, start, end);
      appendArrowHead(path, start, end, Math.max(10, drawing.style.lineWidth * 5));
      return path;
    }
    case 'extendedLine': {
      const segment = extendSegmentToFrame(
        nativeAnchorToPoint(drawing.points[0], frame, sharedViewport),
        nativeAnchorToPoint(drawing.points[1], frame, sharedViewport),
        frame,
      );
      appendSegment(path, segment.start, segment.end);
      return path;
    }
    case 'ray': {
      const start = nativeAnchorToPoint(drawing.points[0], frame, sharedViewport);
      const extended = extendSegmentToFrame(
        start,
        nativeAnchorToPoint(drawing.points[1], frame, sharedViewport),
        frame,
      );
      const end =
        Math.hypot(extended.end.x - start.x, extended.end.y - start.y) >=
        Math.hypot(extended.start.x - start.x, extended.start.y - start.y)
          ? extended.end
          : extended.start;
      appendSegment(path, start, end);
      return path;
    }
    case 'horizontalLine': {
      const y = sharedPriceToNativeY(drawing.price, sharedViewport, frame);
      appendSegment(path, { x: frame.contentLeft, y }, { x: frame.contentRight, y });
      return path;
    }
    case 'horizontalRay': {
      const point = nativeAnchorToPoint(drawing.point, frame, sharedViewport);
      appendSegment(path, point, { x: frame.contentRight, y: point.y });
      return path;
    }
    case 'verticalLine': {
      const x = sharedTimeToNativeX(drawing.time, sharedViewport, frame);
      appendSegment(path, { x, y: frame.mainPane.top }, { x, y: frame.mainPane.bottom });
      return path;
    }
    case 'crossLine': {
      const point = nativeAnchorToPoint(drawing.point, frame, sharedViewport);
      appendSegment(path, { x: frame.contentLeft, y: point.y }, { x: frame.contentRight, y: point.y });
      appendSegment(path, { x: point.x, y: frame.mainPane.top }, { x: point.x, y: frame.mainPane.bottom });
      return path;
    }
    case 'rectangle':
    case 'image':
    case 'priceRange':
    case 'dateRange':
    case 'datePriceRange':
      appendRectFromAnchors(path, drawing.points[0], drawing.points[1], frame, sharedViewport);
      return path;
    case 'circle':
    case 'ellipse':
      appendOvalFromAnchors(path, drawing.points[0], drawing.points[1], frame, sharedViewport);
      return path;
    case 'path':
    case 'brush':
    case 'highlighter':
    case 'polyline':
      appendAnchorsPath(path, drawing.points, frame, sharedViewport);
      return path;
    case 'triangle':
      appendAnchorsPath(path, drawing.points, frame, sharedViewport, true);
      return path;
    case 'parallelChannel':
    case 'regressionTrend':
    case 'flatTopBottom':
    case 'disjointChannel':
    case 'rotatedRectangle':
      appendAnchorsPath(path, drawing.points, frame, sharedViewport, true);
      return path;
    case 'arrowMarkLeft':
    case 'arrowMarkRight':
    case 'arrowMarkUp':
    case 'arrowMarkDown':
    case 'pin':
    case 'flagMark':
    case 'icon': {
      const point = nativeAnchorToPoint(drawing.point, frame, sharedViewport);
      path.addCircle(point.x, point.y, Math.max(4, drawing.style.lineWidth * 2));
      return path;
    }
    default:
      return path;
  }
}

function createNativeUserDrawingHandlePath(
  drawing: UserDrawing,
  frame: NativeChartFrame,
  sharedViewport: NativeViewportSharedValues,
): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  if (!drawing.visible) return path;

  const appendHandle = (point: NativeDrawingPoint) => {
    path.addCircle(point.x, point.y, NATIVE_SELECTION_HANDLE_RADIUS);
  };

  switch (drawing.kind) {
    case 'horizontalLine':
      appendHandle({ x: frame.contentLeft, y: sharedPriceToNativeY(drawing.price, sharedViewport, frame) });
      return path;
    case 'verticalLine':
      appendHandle({ x: sharedTimeToNativeX(drawing.time, sharedViewport, frame), y: frame.mainPane.top });
      return path;
    case 'horizontalRay':
    case 'crossLine':
    case 'arrowMarkLeft':
    case 'arrowMarkRight':
    case 'arrowMarkUp':
    case 'arrowMarkDown':
    case 'pin':
    case 'flagMark':
    case 'icon':
      appendHandle(nativeAnchorToPoint(drawing.point, frame, sharedViewport));
      return path;
    default:
      if ('points' in drawing) {
        for (const anchor of drawing.points) {
          appendHandle(nativeAnchorToPoint(anchor, frame, sharedViewport));
        }
      }
      return path;
  }
}

function createNativeUserDrawingDraftAnchorPath(
  anchors: readonly UserDrawingAnchor[],
  frame: NativeChartFrame,
  sharedViewport: NativeViewportSharedValues,
): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  for (const anchor of anchors) {
    const point = nativeAnchorToPoint(anchor, frame, sharedViewport);
    path.addCircle(point.x, point.y, NATIVE_DRAFT_ANCHOR_RADIUS);
  }
  return path;
}

function AnimatedNativeUserDrawingImpl({
  drawing,
  frame,
  opacity,
  selected,
  sharedViewport,
}: {
  drawing: UserDrawing;
  frame: NativeChartFrame;
  opacity: number;
  selected: boolean;
  sharedViewport: NativeViewportSharedValues;
}) {
  const path = useDerivedValue(() => createNativeUserDrawingPath(drawing, frame, sharedViewport));
  const handlePath = useDerivedValue(() => createNativeUserDrawingHandlePath(drawing, frame, sharedViewport));
  const lineWidth = Math.max(1, drawing.style.lineWidth);
  const color = drawing.style.lineColor;

  return (
    <>
      {drawing.style.lineVisible !== false && (
        <SkiaPath path={path} color={color} style="stroke" strokeWidth={lineWidth} opacity={opacity} />
      )}
      {selected && <SkiaPath path={handlePath} color={NATIVE_SELECTION_COLOR} style="fill" opacity={opacity} />}
    </>
  );
}

const AnimatedNativeUserDrawing = React.memo(AnimatedNativeUserDrawingImpl);
AnimatedNativeUserDrawing.displayName = 'AnimatedNativeUserDrawing';

export function AnimatedNativeDraftAnchorsImpl({
  anchors,
  color,
  frame,
  sharedViewport,
}: {
  anchors: readonly UserDrawingAnchor[];
  color: string;
  frame: NativeChartFrame;
  sharedViewport: NativeViewportSharedValues;
}) {
  const path = useDerivedValue(() => createNativeUserDrawingDraftAnchorPath(anchors, frame, sharedViewport));

  return <SkiaPath path={path} color={color} style="fill" opacity={0.9} />;
}

export const AnimatedNativeDraftAnchors = React.memo(AnimatedNativeDraftAnchorsImpl);
AnimatedNativeDraftAnchors.displayName = 'AnimatedNativeDraftAnchors';

export function NativeUserDrawingLayerImpl({
  draftAnchorColor = NATIVE_SELECTION_COLOR,
  draftAnchors,
  entries,
  frame,
  plotPrimitiveClip,
  sharedViewport,
}: {
  draftAnchorColor?: string;
  draftAnchors: readonly UserDrawingAnchor[];
  entries: readonly UserDrawingRenderEntry[];
  frame: NativeChartFrame;
  plotPrimitiveClip: NativePrimitiveClip;
  sharedViewport: NativeViewportSharedValues;
}) {
  return (
    <Group clip={plotPrimitiveClip}>
      {entries.map((entry) => (
        <AnimatedNativeUserDrawing
          key={`${entry.phase}-${entry.drawing.id}`}
          drawing={entry.drawing}
          frame={frame}
          opacity={entry.phase === 'draft' ? NATIVE_DRAFT_OPACITY : 1}
          selected={entry.selected}
          sharedViewport={sharedViewport}
        />
      ))}
      {draftAnchors.length > 0 && (
        <AnimatedNativeDraftAnchors
          anchors={draftAnchors}
          color={draftAnchorColor}
          frame={frame}
          sharedViewport={sharedViewport}
        />
      )}
    </Group>
  );
}

export const NativeUserDrawingLayer = React.memo(NativeUserDrawingLayerImpl);
NativeUserDrawingLayer.displayName = 'NativeUserDrawingLayer';
