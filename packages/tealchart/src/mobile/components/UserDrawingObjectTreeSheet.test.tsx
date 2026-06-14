import type { UserDrawingState } from '../../drawings';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveUserDrawingObjectTreeModel } from '../../drawings';
import { UserDrawingObjectTreeSheet } from './UserDrawingObjectTreeSheet';

const state: UserDrawingState = {
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
      style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
      price: 50,
    },
    {
      id: 'target',
      kind: 'rectangle',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 2,
      updatedAt: 2,
      style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 45 },
        { time: 2, price: 55 },
      ],
    },
  ],
};

describe('UserDrawingObjectTreeSheet', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the shared object tree model and dispatches row actions', () => {
    const onChartTouch = vi.fn();
    const onDispatch = vi.fn(() => true);
    const onClose = vi.fn();

    render(
      <div onClick={onChartTouch}>
        <UserDrawingObjectTreeSheet
          visible
          model={resolveUserDrawingObjectTreeModel(state)}
          onDispatch={onDispatch}
          onClose={onClose}
        />
      </div>,
    );

    expect(screen.getByLabelText('Drawing object tree').getAttribute('data-start-should-set-responder')).toBe('true');
    expect(screen.getByText('Drawings (2)')).not.toBeNull();

    fireEvent.click(screen.getByLabelText('Select Rectangle'));
    expect(onDispatch).toHaveBeenCalledWith({ type: 'select', drawingId: 'target' });

    fireEvent.click(screen.getAllByLabelText('Hide drawing')[0]!);
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'hide',
      drawingIds: ['target'],
      includeLocked: undefined,
    });

    fireEvent.click(screen.getByLabelText('Close drawing object tree'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChartTouch).not.toHaveBeenCalled();
  });

  it('renders an empty state', () => {
    render(
      <UserDrawingObjectTreeSheet
        visible
        model={resolveUserDrawingObjectTreeModel({ ...state, selection: null, drawings: [] })}
        onDispatch={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('No drawings')).not.toBeNull();
  });
});
