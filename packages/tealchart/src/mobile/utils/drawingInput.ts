import type { Viewport } from '../../types';
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
}

export function resolveMobileUserDrawingInputPoint({
  point,
  viewport,
  dimensions,
  panes,
}: ResolveMobileUserDrawingInputPointOptions): UserDrawingInputPoint | null {
  return resolveUserDrawingInputPointFromChart({
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
}
