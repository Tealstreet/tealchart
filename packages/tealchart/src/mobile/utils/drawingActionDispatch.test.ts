import type { UserDrawingState, UserDrawingStyle } from '../../drawings';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearChartStoreCache } from '../../state/chartState';
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
  afterEach(() => {
    clearChartStoreCache();
  });

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
    expect(onOpenObjectTree).toHaveBeenCalledWith(expect.objectContaining({
      drawingCount: 2,
      groups: [
        {
          id: 'pane:main',
          label: 'Main chart',
          paneId: 'main',
          rowIds: ['range', 'line'],
          drawingIds: ['range', 'line'],
          orderIndex: 0,
          drawingCount: 2,
        },
      ],
      rows: [
        expect.objectContaining({
          drawingId: 'range',
          groupIds: ['pane:main'],
          label: 'Rectangle',
          selected: false,
          actions: expect.arrayContaining([
            expect.objectContaining({ type: 'rename', enabled: true }),
            expect.objectContaining({ type: 'delete', enabled: true, destructive: true }),
          ]),
        }),
        expect.objectContaining({
          drawingId: 'line',
          groupIds: ['pane:main'],
          label: 'Breakout',
          selected: true,
          actions: expect.arrayContaining([
            expect.objectContaining({ type: 'hide', enabled: true }),
            expect.objectContaining({ type: 'lock', enabled: true }),
          ]),
        }),
      ],
      selectionActions: expect.arrayContaining([
        expect.objectContaining({ type: 'hide', enabled: true, selectedCount: 1 }),
        expect.objectContaining({ type: 'lock', enabled: true, selectedCount: 1 }),
      ]),
      selectedIds: ['line'],
    }));
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

  it('does not leak selected action taps into direct selection commands', () => {
    const dispatchUserDrawingCommand = vi.fn();
    const onOpenProperties = vi.fn();
    const onOpenObjectTree = vi.fn();
    const onCopySelected = vi.fn();

    dispatchMobileUserDrawingActionCommand(
      { type: 'openProperties' },
      {
        state: createSelectedState(),
        source: 'toolbar',
        createId: () => 'copy',
        dispatchUserDrawingCommand,
        onUserDrawingPropertiesOpen: onOpenProperties,
      },
    );
    dispatchMobileUserDrawingActionCommand(
      { type: 'openObjectTree' },
      {
        state: createSelectedState(),
        source: 'toolbar',
        createId: () => 'copy',
        dispatchUserDrawingCommand,
        onUserDrawingObjectTreeOpen: onOpenObjectTree,
      },
    );
    dispatchMobileUserDrawingActionCommand(
      { type: 'updateStyle', style: { lineWidth: 3 } },
      {
        state: createSelectedState(),
        source: 'toolbar',
        createId: () => 'copy',
        dispatchUserDrawingCommand,
      },
    );
    dispatchMobileUserDrawingActionCommand(
      { type: 'copySelected' },
      {
        state: createSelectedState(),
        source: 'toolbar',
        createId: () => 'copy',
        dispatchUserDrawingCommand,
        onUserDrawingCopySelected: onCopySelected,
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

    expect(onOpenProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        drawingId: 'line',
        editable: true,
        selected: true,
        type: 'properties',
      }),
    );
    expect(onOpenObjectTree).toHaveBeenCalledTimes(1);
    expect(onCopySelected).toHaveBeenCalledTimes(1);
    expect(dispatchUserDrawingCommand).toHaveBeenCalledTimes(2);
    expect(dispatchUserDrawingCommand).toHaveBeenCalledWith({
      type: 'updateStyle',
      style: { lineWidth: 3 },
      meta: { source: 'toolbar' },
    });
    expect(dispatchUserDrawingCommand).toHaveBeenCalledWith({
      type: 'duplicate',
      options: { createId: expect.any(Function) },
      meta: { source: 'toolbar' },
    });
    expect(dispatchUserDrawingCommand).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'select' }));
    expect(dispatchUserDrawingCommand).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'selectMany' }));
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
      { type: 'updateStyle', style: { opacity: 0.75, lineVisible: false } },
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
      { type: 'setTrendLineExtend', extend: 'left' },
      {
        state: createSelectedState(),
        source: 'contextMenu',
        createId: () => 'copy',
        dispatchUserDrawingCommand,
      },
    );
    dispatchMobileUserDrawingActionCommand(
      { type: 'setIconName', iconName: 'circle' },
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
      style: { opacity: 0.75, lineVisible: false },
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
      type: 'setTrendLineExtend',
      extend: 'left',
      meta: { source: 'contextMenu' },
    });
    expect(dispatchUserDrawingCommand).toHaveBeenCalledWith({
      type: 'setIconName',
      iconName: 'circle',
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
