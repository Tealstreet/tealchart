import { describe, expect, it } from 'vitest';

import { IDLE_PANE_MAXIMIZE_STATE, togglePaneMaximize } from './paneMaximize';

const panes = [
  { id: 'main', heightRatio: 0.7 },
  { id: 'pane_1', heightRatio: 0.3 },
];

describe('togglePaneMaximize', () => {
  it('gives the tapped pane the whole canvas and remembers the ratios', () => {
    const toggled = togglePaneMaximize(IDLE_PANE_MAXIMIZE_STATE, panes, 'pane_1');

    expect(toggled?.heightRatios).toEqual({ main: 0, pane_1: 1 });
    expect(toggled?.state).toEqual({
      maximizedPaneId: 'pane_1',
      savedHeightRatios: { main: 0.7, pane_1: 0.3 },
    });
  });

  it('restores the saved ratios when the same pane is tapped again', () => {
    const maximized = togglePaneMaximize(IDLE_PANE_MAXIMIZE_STATE, panes, 'pane_1');
    const maximizedPanes = panes.map((pane) => ({ ...pane, heightRatio: maximized!.heightRatios[pane.id]! }));
    const restored = togglePaneMaximize(maximized!.state, maximizedPanes, 'pane_1');

    expect(restored?.heightRatios).toEqual({ main: 0.7, pane_1: 0.3 });
    expect(restored?.state).toEqual(IDLE_PANE_MAXIMIZE_STATE);
  });

  it('keeps the original ratios when maximizing straight to another pane', () => {
    const maximized = togglePaneMaximize(IDLE_PANE_MAXIMIZE_STATE, panes, 'pane_1');
    const maximizedPanes = panes.map((pane) => ({ ...pane, heightRatio: maximized!.heightRatios[pane.id]! }));
    const switched = togglePaneMaximize(maximized!.state, maximizedPanes, 'main');

    expect(switched?.heightRatios).toEqual({ main: 1, pane_1: 0 });
    // The all-or-nothing layout must not become the restore target.
    expect(switched?.state.savedHeightRatios).toEqual({ main: 0.7, pane_1: 0.3 });
  });

  it('does nothing without a second pane, or for a pane that is not there', () => {
    expect(togglePaneMaximize(IDLE_PANE_MAXIMIZE_STATE, [panes[0]!], 'main')).toBeNull();
    expect(togglePaneMaximize(IDLE_PANE_MAXIMIZE_STATE, panes, 'pane_9')).toBeNull();
  });

  it('leaves a pane added while maximized at its own height on restore', () => {
    const maximized = togglePaneMaximize(IDLE_PANE_MAXIMIZE_STATE, panes, 'pane_1');
    const withNewPane = [
      ...panes.map((pane) => ({ ...pane, heightRatio: maximized!.heightRatios[pane.id]! })),
      { id: 'pane_2', heightRatio: 0.25 },
    ];
    const restored = togglePaneMaximize(maximized!.state, withNewPane, 'pane_1');

    expect(restored?.heightRatios).toEqual({ main: 0.7, pane_1: 0.3, pane_2: 0.25 });
  });
});
