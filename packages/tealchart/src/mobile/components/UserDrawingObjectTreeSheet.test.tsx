import type { UserDrawingState } from '../../drawings';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveUserDrawingObjectTreeModel } from '../../drawings';
import { clearChartStoreCache } from '../../state/chartState';
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
    clearChartStoreCache();
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
    fireEvent.click(screen.getByLabelText('Drawing object tree'));
    expect(onClose).not.toHaveBeenCalled();
    expect(onChartTouch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Select Rectangle'));
    expect(onDispatch).toHaveBeenCalledWith({ type: 'select', drawingId: 'target' });
    expect(onClose).not.toHaveBeenCalled();
    expect(onChartTouch).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByLabelText('Rename drawing')[0]!);
    fireEvent.change(screen.getByLabelText('Rename Rectangle'), { target: { value: 'Range box' } });
    fireEvent.click(screen.getByLabelText('Save drawing name'));
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'rename',
      drawingId: 'target',
      name: 'Range box',
      includeLocked: undefined,
    });
    fireEvent.click(screen.getAllByLabelText('Rename drawing')[0]!);
    fireEvent.change(screen.getByLabelText('Rename Rectangle'), { target: { value: 'Keyboard range' } });
    fireEvent.keyDown(screen.getByLabelText('Rename Rectangle'), { key: 'Enter' });
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'rename',
      drawingId: 'target',
      name: 'Keyboard range',
      includeLocked: undefined,
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(onChartTouch).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByLabelText('Hide drawing')[0]!);
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'hide',
      drawingIds: ['target'],
      includeLocked: undefined,
    });
    fireEvent.click(screen.getAllByLabelText('Send drawing to back')[0]!);
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'sendToBack',
      drawingIds: ['target'],
      includeLocked: undefined,
    });
    const bringToFrontButtons = screen.getAllByLabelText('Bring drawing to front');
    fireEvent.click(bringToFrontButtons[bringToFrontButtons.length - 1]!);
    expect(onDispatch).toHaveBeenCalledWith({
      type: 'bringToFront',
      drawingIds: ['line'],
      includeLocked: undefined,
    });
    expect(screen.getAllByText('Top').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Back').length).toBeGreaterThan(0);
    expect(onClose).not.toHaveBeenCalled();
    expect(onChartTouch).not.toHaveBeenCalled();

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
