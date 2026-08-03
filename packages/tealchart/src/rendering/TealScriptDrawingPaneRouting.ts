import type { DrawingOutput, PlotOutput } from '@tealstreet/tealscript';
import type { ComputedPane } from '../types';

type DrawingPaneRouteTarget = Pick<ComputedPane, 'id' | 'type' | 'indicatorIds'>;
type OverlayPlotInfo = { overlay?: boolean };

export interface MainOverlayContentPresence {
  hasMainPriceOverlayContent: boolean;
  hasMainOverlayContent: boolean;
}

export interface ResolveMainOverlayContentPresenceOptions {
  plots?: readonly PlotOutput[];
  indicatorPaneInfo?: Record<string, OverlayPlotInfo | undefined>;
  drawings?: readonly DrawingOutput[];
  panes: readonly DrawingPaneRouteTarget[];
  executionLines?: readonly unknown[];
}

export interface RoutedTealScriptDrawings {
  main: DrawingOutput[];
  byPaneId: Map<string, DrawingOutput[]>;
}

function forcesOverlay(drawing: DrawingOutput): boolean {
  return 'forceOverlay' in drawing && drawing.forceOverlay === true;
}

function findIndicatorPane(scriptId: string, panes: readonly DrawingPaneRouteTarget[]): DrawingPaneRouteTarget | undefined {
  return panes.find((pane) => pane.type === 'indicator' && pane.indicatorIds?.includes(scriptId));
}

export function routeTealScriptDrawings(
  drawings: readonly DrawingOutput[],
  panes: readonly DrawingPaneRouteTarget[],
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

export function hasMainRoutedTealScriptDrawings(routed: RoutedTealScriptDrawings): boolean {
  return routed.main.length > 0;
}

export function hasPaneRoutedTealScriptDrawings(routed: RoutedTealScriptDrawings, paneId: string): boolean {
  return (routed.byPaneId.get(paneId)?.length ?? 0) > 0;
}

export function resolveMainOverlayContentPresence(
  options: ResolveMainOverlayContentPresenceOptions,
): MainOverlayContentPresence {
  const mainOverlayPlots = (options.plots ?? []).filter(
    (plot) => options.indicatorPaneInfo?.[plot.scriptId ?? 'unknown']?.overlay !== false,
  );
  const hasMainRoutedDrawings =
    !!options.drawings?.length && hasMainRoutedTealScriptDrawings(routeTealScriptDrawings(options.drawings, options.panes));

  return {
    hasMainPriceOverlayContent: mainOverlayPlots.some((plot) => plot.type === 'hline'),
    hasMainOverlayContent:
      !!options.executionLines?.length || hasMainRoutedDrawings || mainOverlayPlots.some((plot) => plot.type !== 'hline'),
  };
}
