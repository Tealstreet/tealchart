import type { Viewport } from '../../types';
import type { Bar } from '../../types';
import type { UserDrawingInputPoint } from '../../drawings';
import type { DrawingCoordinateSpace, DrawingScreenPoint } from '../../drawings';
import type { ChartDimensions, PaneInfo } from './coordinates';

import { resolveUserDrawingInputPointFromChart } from '../../drawings';

export type MobileUserDrawingInputPane = PaneInfo | DrawingCoordinateSpace['pane'];

export interface ResolveMobileUserDrawingInputPointOptions {
  point: DrawingScreenPoint;
  viewport: Viewport;
  dimensions: ChartDimensions;
  panes: readonly MobileUserDrawingInputPane[];
  bars?: readonly Bar[];
}

export function resolveMobileUserDrawingInputPoint({
  point,
  viewport,
  dimensions,
  panes,
  bars,
}: ResolveMobileUserDrawingInputPointOptions): UserDrawingInputPoint | null {
  const inputPoint = resolveUserDrawingInputPointFromChart({
    point,
    viewport,
    panes: panes.map((pane) => ({
      id: pane.id,
      top: pane.top,
      height: pane.height,
      bottom: 'bottom' in pane ? pane.bottom : pane.top + pane.height,
      yMin: pane.yMin,
      yMax: pane.yMax,
    })),
    width: dimensions.width,
    margins: dimensions.margins,
  });
  if (!inputPoint) return null;

  return {
    ...inputPoint,
    bars: inputPoint.paneId === 'main' ? bars : undefined,
  };
}
