import type { Viewport } from '../../types';
import type { Bar } from '../../types';
import type { UserDrawingInputPoint, UserDrawingMagnetMode } from '../../drawings';
import type { DrawingCoordinateSpace, DrawingScreenPoint } from '../../drawings';
import type { ChartDimensions, PaneInfo } from './coordinates';

import {
  normalizeUserDrawingAnchorPressure,
  resolveUserDrawingInputPointFromChart,
  resolveUserDrawingMagnetInputPoint,
} from '../../drawings';

export type MobileUserDrawingInputPane = PaneInfo | DrawingCoordinateSpace['pane'];

export interface ResolveMobileUserDrawingInputPointOptions {
  point: DrawingScreenPoint;
  viewport: Viewport;
  dimensions: ChartDimensions;
  panes: readonly MobileUserDrawingInputPane[];
  bars?: readonly Bar[];
  magnetMode?: UserDrawingMagnetMode;
  pressure?: number;
}

export interface ResolveMobileUserDrawingPlacementConstraintOptions {
  propConstrained?: boolean;
  overrideConstrained?: boolean | null;
}

export interface ResolveMobileUserDrawingDuplicateEditDragOptions {
  propDuplicate?: boolean;
  overrideDuplicate?: boolean | null;
}

export function resolveMobileUserDrawingPlacementConstraintEnabled({
  propConstrained = false,
  overrideConstrained = null,
}: ResolveMobileUserDrawingPlacementConstraintOptions): boolean {
  return overrideConstrained ?? propConstrained;
}

export function resolveMobileUserDrawingDuplicateEditDragEnabled({
  propDuplicate = false,
  overrideDuplicate = null,
}: ResolveMobileUserDrawingDuplicateEditDragOptions): boolean {
  return overrideDuplicate ?? propDuplicate;
}

export function resolveMobileUserDrawingInputPoint({
  point,
  viewport,
  dimensions,
  panes,
  bars,
  magnetMode = 'off',
  pressure,
}: ResolveMobileUserDrawingInputPointOptions): UserDrawingInputPoint | null {
  const normalizedPanes = panes.map((pane) => ({
    id: pane.id,
    top: pane.top,
    height: pane.height,
    bottom: 'bottom' in pane ? pane.bottom : pane.top + pane.height,
    yMin: pane.yMin,
    yMax: pane.yMax,
  }));
  const inputPoint = resolveUserDrawingInputPointFromChart({
    point,
    viewport,
    panes: normalizedPanes,
    width: dimensions.width,
    margins: dimensions.margins,
  });
  if (!inputPoint) return null;

  const normalizedPressure = normalizeUserDrawingAnchorPressure(pressure);
  const anchor =
    normalizedPressure === undefined
      ? inputPoint.anchor
      : {
          ...inputPoint.anchor,
          pressure: normalizedPressure,
        };

  const resolvedPoint = {
    ...inputPoint,
    anchor,
    bars: inputPoint.paneId === 'main' && bars && bars.length > 0 ? bars : undefined,
  };
  const inputPane = normalizedPanes.find((pane) => pane.id === inputPoint.paneId);
  if (!inputPane || magnetMode === 'off') return resolvedPoint;

  return resolveUserDrawingMagnetInputPoint({
    mode: magnetMode,
    point: resolvedPoint,
    screenPoint: point,
    space: {
      viewport,
      pane: inputPane,
      chartLeft: dimensions.margins.left,
      chartRight: dimensions.width - dimensions.margins.right,
      bars: resolvedPoint.bars,
    },
  });
}
