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

function createSelectedTextState(): UserDrawingState {
  return {
    ...createSelectedState(),
    selection: { drawingId: 'text' },
    drawings: [
      {
        id: 'text',
        name: 'Note',
        kind: 'textLabel',
        paneId: 'main',
        visible: true,
        locked: false,
        createdAt: 1,
        updatedAt: 1,
        style: {
          ...style,
          fillColor: 'rgba(245, 197, 66, 0.12)',
          textColor: '#f5c542',
          fontSize: 12,
          textWrap: true,
          textMaxWidth: 180,
        },
        point: { time: 1, price: 50 },
        text: 'Wrapped note',
        textAlign: 'center',
      },
    ],
  };
}

function getMockViewStyle(element: HTMLElement): Record<string, unknown> {
  const rawStyle = element.getAttribute('data-style');
  expect(rawStyle).not.toBeNull();
  const style = JSON.parse(rawStyle ?? '[]') as Array<Record<string, unknown> | null | false>;
  return Object.assign({}, ...style.filter(Boolean));
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

    const { rerender } = render(
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
    expect(screen.getByLabelText('Style selected drawing').getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByLabelText('75 percent opacity'));
    expect(screen.getByLabelText('Style selected drawing').getAttribute('aria-expanded')).toBe('true');

    const nextState: UserDrawingState = {
      ...state,
      selection: { drawingId: 'line-2' },
      drawings: [
        {
          ...state.drawings[0]!,
          id: 'line-2',
          name: 'Range',
          price: 60,
        },
      ],
    };
    rerender(
      <div onClick={onChartTouch}>
        <UserDrawingSelectedActionSurfaceComponent
          state={nextState}
          surface={resolveUserDrawingSelectedActionSurface(nextState)}
          anchor={{ ...selectionActionAnchor, drawingIds: ['line-2'] }}
          dimensions={{ width: 360, height: 240 }}
          topInset={40}
          createId={() => 'copy'}
          dispatchUserDrawingCommand={dispatchUserDrawingCommand}
          onUserDrawingPropertiesOpen={onUserDrawingPropertiesOpen}
        />
      </div>,
    );
    expect(screen.getByLabelText('Style selected drawing').getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByLabelText('Selected drawing style controls')).toBeNull();
    rerender(
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
    expect(screen.getByLabelText('Style selected drawing').getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByLabelText('Selected drawing style controls')).toBeNull();

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
    expect(dispatchUserDrawingCommand).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { opacity: 0.75 },
      meta: { source: 'toolbar' },
    });
    expect(dispatchUserDrawingCommand).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'select' }));
    expect(dispatchUserDrawingCommand).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'selectMany' }));
  });

  it('clamps mobile selected style popovers using the expanded surface height', () => {
    const state = createSelectedTextState();

    render(
      <UserDrawingSelectedActionSurfaceComponent
        state={state}
        surface={resolveUserDrawingSelectedActionSurface(state)}
        anchor={{ ...selectionActionAnchor, drawingIds: ['text'], anchor: { x: 160, y: 230 } }}
        dimensions={{ width: 360, height: 240 }}
        topInset={40}
        createId={() => 'copy'}
        dispatchUserDrawingCommand={vi.fn()}
      />,
    );

    const surface = screen.getByLabelText('Selected drawing actions');
    expect(getMockViewStyle(surface).top).toBe(162);

    fireEvent.click(screen.getByLabelText('Style selected drawing'));

    expect(screen.getByLabelText('Style selected drawing').getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByLabelText('Selected drawing style controls')).not.toBeNull();
    expect(getMockViewStyle(surface).top).toBe(83);
  });
});
