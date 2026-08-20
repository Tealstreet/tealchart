/**
 * Double tapping a pane blows it up to the full canvas and tapping again puts
 * the panes back where they were. Web owned that arithmetic inside PaneManager,
 * which native has no equivalent of, so it lives here and both call it.
 */

export interface PaneMaximizeCandidate {
  heightRatio: number;
  id: string;
}

export interface PaneMaximizeState {
  maximizedPaneId: string | null;
  savedHeightRatios: Readonly<Record<string, number>> | null;
}

export interface PaneMaximizeToggle {
  heightRatios: Readonly<Record<string, number>>;
  state: PaneMaximizeState;
}

export const IDLE_PANE_MAXIMIZE_STATE: PaneMaximizeState = {
  maximizedPaneId: null,
  savedHeightRatios: null,
};

/**
 * Next state and pane ratios for a maximize toggle, or null when the tap should
 * do nothing - an unknown pane, or a chart that has no second pane to hide.
 */
export function togglePaneMaximize(
  state: PaneMaximizeState,
  panes: readonly PaneMaximizeCandidate[],
  paneId: string,
): PaneMaximizeToggle | null {
  if (panes.length <= 1) return null;
  if (!panes.some((pane) => pane.id === paneId)) return null;

  if (state.maximizedPaneId === paneId) {
    const saved = state.savedHeightRatios;
    if (!saved) return null;
    const heightRatios: Record<string, number> = {};
    for (const pane of panes) {
      // A pane added while maximized has no saved ratio; it keeps its own.
      heightRatios[pane.id] = saved[pane.id] ?? pane.heightRatio;
    }
    return { heightRatios, state: IDLE_PANE_MAXIMIZE_STATE };
  }

  // Switching between panes keeps the ratios saved by the first maximize;
  // re-saving would record the all-or-nothing layout as the restore target.
  const savedHeightRatios =
    state.savedHeightRatios ??
    panes.reduce<Record<string, number>>((saved, pane) => {
      saved[pane.id] = pane.heightRatio;
      return saved;
    }, {});

  const heightRatios: Record<string, number> = {};
  for (const pane of panes) {
    heightRatios[pane.id] = pane.id === paneId ? 1 : 0;
  }

  return { heightRatios, state: { maximizedPaneId: paneId, savedHeightRatios } };
}
