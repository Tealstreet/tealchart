import type { Bar, Viewport } from '../../types';
import type {
  DrawingCoordinateSpace,
  DrawingScreenPoint,
  UserDrawingInputPoint,
  UserDrawingState,
} from '../../drawings';
import type { NativeChartFrame, NativePaneFrame } from '../render/nativeChartFrame';

import { isPointInNativePriceAxis } from '../render/nativeChartFrame';
import {
  resolveUserDrawingInputPoint,
  resolveUserDrawingMagnetInputPoint,
} from '../../drawings';

export interface NativeUserDrawingCoordinateSpacesInput {
  bars: readonly Bar[];
  frame: NativeChartFrame;
  viewport: Viewport;
}

export interface NativeUserDrawingInputPointOptions extends NativeUserDrawingCoordinateSpacesInput {
  spacesByPaneId?: ReadonlyMap<string, DrawingCoordinateSpace>;
  state: UserDrawingState;
  x: number;
  y: number;
}

export interface NativeUserDrawingSelectionPointOptions extends NativeUserDrawingCoordinateSpacesInput {
  spacesByPaneId?: ReadonlyMap<string, DrawingCoordinateSpace>;
  x: number;
  y: number;
}

export interface NativeUserDrawingSelectionPointResult {
  point: DrawingScreenPoint;
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>;
}

function resolveNativeDrawingPaneRange(
  pane: NativePaneFrame,
  viewport: Viewport,
): Pick<NativePaneFrame, 'yMin' | 'yMax'> {
  if (pane.type === 'main') {
    return {
      yMin: viewport.priceMin,
      yMax: viewport.priceMax,
    };
  }
  return {
    yMin: pane.yMin,
    yMax: pane.yMax,
  };
}

export function createNativeUserDrawingCoordinateSpaces({
  bars,
  frame,
  viewport,
}: NativeUserDrawingCoordinateSpacesInput): ReadonlyMap<string, DrawingCoordinateSpace> {
  const spaces = new Map<string, DrawingCoordinateSpace>();

  for (const pane of frame.panes) {
    const range = resolveNativeDrawingPaneRange(pane, viewport);
    spaces.set(pane.id, {
      viewport,
      pane: {
        id: pane.id,
        top: pane.top,
        height: pane.height,
        bottom: pane.bottom,
        yMin: range.yMin,
        yMax: range.yMax,
      },
      chartLeft: frame.contentLeft,
      chartRight: frame.contentRight,
      bars: pane.type === 'main' ? bars : undefined,
    });
  }

  return spaces;
}

export function resolveNativeUserDrawingInputPoint({
  bars,
  frame,
  spacesByPaneId: providedSpacesByPaneId,
  state,
  viewport,
  x,
  y,
}: NativeUserDrawingInputPointOptions): UserDrawingInputPoint | null {
  if (isPointInNativePriceAxis(frame, x, y)) return null;
  const spacesByPaneId = providedSpacesByPaneId ?? createNativeUserDrawingCoordinateSpaces({ bars, frame, viewport });
  const point = resolveUserDrawingInputPoint({
    point: { x, y },
    viewport,
    panes: [...spacesByPaneId.values()].map((space) => space.pane),
    chartLeft: frame.contentLeft,
    chartRight: frame.contentRight,
  });
  if (!point) return null;

  const space = spacesByPaneId.get(point.paneId);
  if (!space || (state.magnetMode ?? 'off') === 'off' || !space.bars || space.bars.length === 0) {
    return point;
  }

  return resolveUserDrawingMagnetInputPoint({
    mode: state.magnetMode,
    point: {
      ...point,
      bars: space.bars,
    },
    screenPoint: { x, y },
    space,
  });
}

export function resolveNativeUserDrawingSelectionPoint({
  bars,
  frame,
  spacesByPaneId: providedSpacesByPaneId,
  viewport,
  x,
  y,
}: NativeUserDrawingSelectionPointOptions): NativeUserDrawingSelectionPointResult | null {
  if (isPointInNativePriceAxis(frame, x, y)) return null;
  if (x < frame.contentLeft || x > frame.contentRight) return null;
  const spacesByPaneId = providedSpacesByPaneId ?? createNativeUserDrawingCoordinateSpaces({ bars, frame, viewport });
  const hitPane = [...spacesByPaneId.values()].some((space) => (
    y >= space.pane.top && y <= space.pane.bottom
  ));
  if (!hitPane) return null;

  return {
    point: { x, y },
    spacesByPaneId,
  };
}
