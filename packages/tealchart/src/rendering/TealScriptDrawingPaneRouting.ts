import type { DrawingOutput } from '@tealstreet/tealscript';
import type { ComputedPane } from '../types';

export interface RoutedTealScriptDrawings {
  main: DrawingOutput[];
  byPaneId: Map<string, DrawingOutput[]>;
}

function forcesOverlay(drawing: DrawingOutput): boolean {
  return 'forceOverlay' in drawing && drawing.forceOverlay === true;
}

function findIndicatorPane(scriptId: string, panes: readonly ComputedPane[]): ComputedPane | undefined {
  return panes.find((pane) => pane.type === 'indicator' && pane.indicatorIds?.includes(scriptId));
}

export function routeTealScriptDrawings(
  drawings: readonly DrawingOutput[],
  panes: readonly ComputedPane[],
): RoutedTealScriptDrawings {
  const routed: RoutedTealScriptDrawings = {
    main: [],
    byPaneId: new Map(),
  };

  for (const drawing of drawings) {
    if (forcesOverlay(drawing) || !drawing.scriptId) {
      routed.main.push(drawing);
      continue;
    }

    const pane = findIndicatorPane(drawing.scriptId, panes);
    if (!pane) {
      routed.main.push(drawing);
      continue;
    }

    const paneDrawings = routed.byPaneId.get(pane.id);
    if (paneDrawings) {
      paneDrawings.push(drawing);
    } else {
      routed.byPaneId.set(pane.id, [drawing]);
    }
  }

  return routed;
}
