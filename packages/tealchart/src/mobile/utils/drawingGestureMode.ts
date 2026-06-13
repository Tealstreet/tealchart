import type { UserDrawingTool } from '../../drawings';

export function isMobileUserDrawingGestureActive(activeTool: UserDrawingTool): boolean {
  return activeTool !== 'select';
}

export function isMobileChartGestureLayerEnabled(activeTool: UserDrawingTool, crosshairVisible: boolean): boolean {
  return !crosshairVisible || isMobileUserDrawingGestureActive(activeTool);
}

export function isMobileCrosshairPanGestureEnabled(activeTool: UserDrawingTool, crosshairVisible: boolean): boolean {
  return crosshairVisible && !isMobileUserDrawingGestureActive(activeTool);
}
