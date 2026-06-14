import type { UserDrawingSelectionActionAnchor, UserDrawingState, UserDrawingStyle } from '../../drawings';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveUserDrawingSelectedActionSurface } from '../../drawings';
import { UserDrawingSelectedActionSurfaceComponent } from './UserDrawingSelectedActionSurface';

const style: UserDrawingStyle = {
  lineColor: '#f5c542',
  lineWidth: 2,
  lineStyle: 'solid',
};

const selectionActionAnchor: UserDrawingSelectionActionAnchor = {
  anchor: { x: 160, y: 80 },
  bounds: { x: 120, y: 80, width: 80, height: 40 },
  drawingIds: ['line'],
  paneIds: ['main'],
  primaryPaneId: 'main',
};

function createSelectedState(): UserDrawingState {
  return {
    version: 1,
    activeTool: 'select',
    selection: { drawingId: 'line' },
    draft: null,
    textEdit: null,
    drawings: [
      {
        id: 'line',
        name: 'Breakout',
        kind: 'horizontalLine',
        paneId: 'main',
        visible: true,
        locked: false,
        createdAt: 1,
        updatedAt: 1,
        style,
        price: 50,
      },
    ],
  };
}

describe('UserDrawingSelectedActionSurfaceComponent', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps mobile selected action taps inside the toolbar boundary', () => {
    const state = createSelectedState();
    const onChartTouch = vi.fn();
    const dispatchUserDrawingCommand = vi.fn();
    const onUserDrawingPropertiesOpen = vi.fn();

    render(
      <div onClick={onChartTouch}>
        <UserDrawingSelectedActionSurfaceComponent
          state={state}
          surface={resolveUserDrawingSelectedActionSurface(state)}
          anchor={selectionActionAnchor}
          dimensions={{ width: 360, height: 240 }}
          topInset={40}
          createId={() => 'copy'}
          dispatchUserDrawingCommand={dispatchUserDrawingCommand}
          onUserDrawingPropertiesOpen={onUserDrawingPropertiesOpen}
        />
      </div>,
    );

    expect(screen.getByLabelText('Selected drawing actions').getAttribute('data-pointer-events')).toBe('auto');
    expect(screen.queryByLabelText('Cycle selected drawing line color to #22c55e')).toBeNull();

    fireEvent.click(screen.getByLabelText('Open selected drawing properties'));
    fireEvent.click(screen.getByLabelText('Duplicate selected drawing'));
    fireEvent.click(screen.getByLabelText('Style selected drawing'));
    expect(screen.getByLabelText('Style selected drawing').getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByLabelText('Selected drawing style controls')).not.toBeNull();
    fireEvent.click(screen.getByLabelText('Cycle selected drawing line color to #22c55e'));

    expect(onChartTouch).not.toHaveBeenCalled();
    expect(onUserDrawingPropertiesOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        drawingId: 'line',
        editable: true,
        selected: true,
        type: 'properties',
      }),
    );
    expect(dispatchUserDrawingCommand).toHaveBeenCalledWith({
      type: 'duplicate',
      options: { createId: expect.any(Function) },
      meta: { source: 'toolbar' },
    });
    expect(dispatchUserDrawingCommand).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { lineColor: '#22c55e' },
      meta: { source: 'toolbar' },
    });
    expect(dispatchUserDrawingCommand).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'select' }));
    expect(dispatchUserDrawingCommand).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'selectMany' }));
  });
});
