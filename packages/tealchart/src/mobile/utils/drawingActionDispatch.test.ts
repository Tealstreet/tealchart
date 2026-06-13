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

function createSelectedTextState(): UserDrawingState {
  return {
    ...createSelectedState(),
    selection: { drawingId: 'label' },
    drawings: [
      {
        id: 'label',
        kind: 'textLabel',
        paneId: 'main',
        visible: true,
        locked: false,
        createdAt: 1,
        updatedAt: 1,
        style,
        point: { time: 1, price: 50 },
        text: 'Note',
        textAlign: 'center',
      },
    ],
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
      { type: 'updateStyle', style: { fillColor: 'rgba(34, 197, 94, 0.12)', fillVisible: false } },
      {
        state: createSelectedState(),
        source: 'toolbar',
        createId: () => 'copy',
        dispatchUserDrawingCommand,
      },
    );
    dispatchMobileUserDrawingActionCommand(
      {
        type: 'updateStyle',
        style: {
          textColor: '#22c55e',
          fontSize: 16,
          fontFamily: 'serif',
          fontWeight: 'bold',
          fontStyle: 'italic',
          textUnderline: true,
          textLineThrough: true,
          textWrap: true,
          textMaxWidth: 180,
        },
      },
      {
        state: createSelectedState(),
        source: 'toolbar',
        createId: () => 'copy',
        dispatchUserDrawingCommand,
      },
    );
    dispatchMobileUserDrawingActionCommand(
      { type: 'updateStyle', style: { textMaxWidth: 240 } },
      {
        state: createSelectedState(),
        source: 'contextMenu',
        createId: () => 'copy',
        dispatchUserDrawingCommand,
      },
    );
    dispatchMobileUserDrawingActionCommand(
      { type: 'setTextAlign', textAlign: 'right' },
      {
        state: createSelectedState(),
        source: 'toolbar',
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
      type: 'updateStyle',
      style: { fillColor: 'rgba(34, 197, 94, 0.12)', fillVisible: false },
      meta: { source: 'toolbar' },
    });
    expect(dispatchUserDrawingCommand).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: {
        textColor: '#22c55e',
        fontSize: 16,
        fontFamily: 'serif',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textUnderline: true,
        textLineThrough: true,
        textWrap: true,
        textMaxWidth: 180,
      },
      meta: { source: 'toolbar' },
    });
    expect(dispatchUserDrawingCommand).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { textMaxWidth: 240 },
      meta: { source: 'contextMenu' },
    });
    expect(dispatchUserDrawingCommand).toHaveBeenCalledWith({
      type: 'setTextAlign',
      textAlign: 'right',
      meta: { source: 'toolbar' },
    });
    expect(dispatchUserDrawingCommand).toHaveBeenCalledWith({
      type: 'duplicate',
      options: { createId: expect.any(Function) },
      meta: { source: 'toolbar' },
    });
  });

  it('dispatches mobile text edit actions with platform source metadata', () => {
    const dispatchUserDrawingCommand = vi.fn();

    dispatchMobileUserDrawingActionCommand(
      { type: 'editText', drawingId: 'label' },
      {
        state: createSelectedTextState(),
        source: 'contextMenu',
        createId: () => 'copy',
        dispatchUserDrawingCommand,
      },
    );

    expect(dispatchUserDrawingCommand).toHaveBeenCalledWith({
      type: 'beginTextEdit',
      drawingId: 'label',
      meta: { source: 'contextMenu' },
    });
  });
});
