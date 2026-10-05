import type { DrawingOutput } from '@tealstreet/tealscript';
import type { CanvasContext } from '../../rendering/CanvasContext';
import type { Bar, ChartMargins, ComputedPane, Viewport } from '../../types';

import { routeTealScriptDrawings } from '../../rendering/TealScriptDrawingPaneRouting';
import { partitionTealScriptDrawings } from '../../rendering/TealScriptDrawingPartition';
import { paintTealScriptDrawings } from '../../rendering/TealScriptDrawingRenderer';

interface PaintOptions {
  ctx: CanvasContext;
  drawings: readonly DrawingOutput[];
  bars: readonly Bar[];
  viewport: Viewport;
  panes: readonly ComputedPane[];
  width: number;
  margins: ChartMargins;
}

export function paintNativeTealScriptDrawings({
  ctx,
  drawings,
  bars,
  viewport,
  panes,
  width,
  margins,
}: PaintOptions): void {
  'worklet';
  const routed = routeTealScriptDrawings(drawings, panes);
  for (const pane of panes) {
    if (pane.height <= 0) continue;
    const paneDrawings = pane.type === 'main' ? routed.main : (routed.byPaneId.get(pane.id) ?? []);
    paintTealScriptDrawings(
      {
        ctx,
        options: { width },
        margins,
        font: 'sans-serif',
        coordinateResolvers: {
          timeToX(time, activeViewport) {
            const range = activeViewport.endTime - activeViewport.startTime;
            return (
              margins.left +
              (range === 0 ? 0.5 : (time - activeViewport.startTime) / range) * (width - margins.left - margins.right)
            );
          },
          valueToY(value, activePane) {
            const range = activePane.yMax - activePane.yMin;
            return activePane.top + (range === 0 ? 0.5 : (activePane.yMax - value) / range) * activePane.height;
          },
        },
        getTextWidth(activeCtx, text, font) {
          activeCtx.font = font;
          return activeCtx.measureText(text).width;
        },
      },
      partitionTealScriptDrawings(paneDrawings),
      bars,
      viewport,
      pane,
    );
  }
}
