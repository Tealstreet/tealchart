import type { UserDrawingState, UserDrawingStyle } from '../../drawings';

import { describe, expect, it, vi } from 'vitest';

import { dispatchMobileUserDrawingActionCommand } from './drawingActionDispatch';

const style: UserDrawingStyle = {
  lineColor: '#f5c542',
  lineWidth: 2,
  lineStyle: 'solid',
};

function createSelectedState(): UserDrawingState {
  return {
    version: 1,
    activeTool: 'select',
    selection: { drawingId: 'line' },
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
      {
        id: 'range',
        kind: 'rectangle',
        paneId: 'main',
        visible: true,
        locked: false,
        createdAt: 2,
        updatedAt: 2,
        style,
        points: [
          { time: 1, price: 40 },
          { time: 2, price: 60 },
        ],
      },
    ],
    draft: null,
    textEdit: null,
  };
}

describe('mobile drawing action dispatch', () => {
  it('opens the shared object tree model from selected toolbar actions', () => {
    const onOpenObjectTree = vi.fn();
    const handled = dispatchMobileUserDrawingActionCommand(
      { type: 'openObjectTree' },
      {
        state: createSelectedState(),
        source: 'toolbar',
        createId: () => 'copy',
        dispatchUserDrawingCommand: vi.fn(),
        onUserDrawingObjectTreeOpen: onOpenObjectTree,
      },
    );

    expect(handled).toBe(true);
    expect(onOpenObjectTree).toHaveBeenCalledWith({
      drawingCount: 2,
      rows: [
        expect.objectContaining({ drawingId: 'range', label: 'Rectangle', selected: false }),
        expect.objectContaining({ drawingId: 'line', label: 'Breakout', selected: true }),
      ],
      selectedIds: ['line'],
    });
  });

  it('opens the same shared object tree model from context menu actions', () => {
    const onOpenObjectTree = vi.fn();
    const handled = dispatchMobileUserDrawingActionCommand(
      { type: 'openObjectTree' },
      {
        state: createSelectedState(),
        source: 'contextMenu',
        createId: () => 'copy',
        dispatchUserDrawingCommand: vi.fn(),
        onUserDrawingObjectTreeOpen: onOpenObjectTree,
      },
    );

    expect(handled).toBe(true);
    expect(onOpenObjectTree).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([
          expect.objectContaining({ drawingId: 'line', label: 'Breakout', selected: true }),
        ]),
      }),
    );
  });

  it('preserves source metadata when dispatching mobile mutation actions', () => {
    const dispatchUserDrawingCommand = vi.fn();

    dispatchMobileUserDrawingActionCommand(
      { type: 'updateStyle', style: { lineWidth: 3 } },
      {
        state: createSelectedState(),
        source: 'contextMenu',
        createId: () => 'copy',
        dispatchUserDrawingCommand,
      },
    );
    dispatchMobileUserDrawingActionCommand(
      { type: 'toolbarAction', action: 'duplicateSelected' },
      {
        state: createSelectedState(),
        source: 'toolbar',
        createId: () => 'copy',
        dispatchUserDrawingCommand,
      },
    );

    expect(dispatchUserDrawingCommand).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { lineWidth: 3 },
      meta: { source: 'contextMenu' },
    });
    expect(dispatchUserDrawingCommand).toHaveBeenCalledWith({
      type: 'duplicate',
      options: { createId: expect.any(Function) },
      meta: { source: 'toolbar' },
    });
  });
});
