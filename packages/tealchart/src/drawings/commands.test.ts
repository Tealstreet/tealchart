import { describe, expect, it } from 'vitest';

import { dispatchUserDrawingCommand } from './commands';
import { beginUserDrawingEditDragAtPoint } from './editing';
import {
  appendUserDrawingPathDragPoint,
  beginUserDrawingPathDrag,
  beginUserDrawingTextEdit,
  commitUserDrawingPathDrag,
  commitUserDrawingTextEdit,
  createUserDrawingState,
  deleteUserDrawing,
  duplicateUserDrawing,
  handleUserDrawingInput,
  reorderUserDrawings,
  resolveUserDrawingSelectionAtPoint,
  selectUserDrawingById,
  setUserDrawingIconName,
  setUserDrawingImageSource,
  setUserDrawingLocked,
  setUserDrawingTableCell,
  setUserDrawingTableDimensions,
  setUserDrawingTextAlign,
  setUserDrawingTool,
  setUserDrawingTrendLineExtend,
  setUserDrawingVisibility,
  updateUserDrawingStyle,
  updateUserDrawingTextEdit,
} from './input';
import type { DrawingCoordinateSpace } from './coordinates';
import type { UserDrawingState } from './types';

const anchorA = { time: 1_000, price: 100 };
const anchorB = { time: 2_000, price: 110 };
const style = { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const };
const coordinateSpace: DrawingCoordinateSpace = {
  viewport: { startTime: 0, endTime: 3_000, priceMin: 90, priceMax: 120 },
  pane: { id: 'main', top: 0, height: 300, bottom: 300, yMin: 90, yMax: 120 },
  chartLeft: 0,
  chartRight: 300,
};
const spacesByPaneId = new Map([['main', coordinateSpace]]);

function createStateWithTrendLine(): UserDrawingState {
  const first = handleUserDrawingInput(
    setUserDrawingTool(createUserDrawingState(), 'trendLine'),
    { paneId: 'main', anchor: anchorA },
    { createId: () => 'trend-line', now: () => 10, style },
  );
  return handleUserDrawingInput(
    first,
    { paneId: 'main', anchor: anchorB },
    { createId: () => 'trend-line', now: () => 10, style },
  );
}

function createStateWithTextLabel(): UserDrawingState {
  return handleUserDrawingInput(
    setUserDrawingTool(createUserDrawingState(), 'textLabel'),
    { paneId: 'main', anchor: anchorA },
    { createId: () => 'label', now: () => 20, style, text: 'Initial' },
  );
}

function createStateWithTable(): UserDrawingState {
  return handleUserDrawingInput(
    setUserDrawingTool(createUserDrawingState(), 'table'),
    { paneId: 'main', anchor: anchorA },
    { createId: () => 'table', now: () => 25, style },
  );
}

describe('user drawing command dispatch', () => {
  it('wraps active tool and drawing input reducers without changing behavior', () => {
    const initial = createUserDrawingState();
    const toolDirect = setUserDrawingTool(initial, 'rectangle');
    const toolCommand = dispatchUserDrawingCommand(initial, {
      type: 'setActiveTool',
      tool: 'rectangle',
      meta: { source: 'toolbar', timestamp: 1, transactionKey: 'tool' },
    });

    expect(toolCommand.state).toEqual(toolDirect);
    expect(toolCommand.changed).toBe(true);
    expect(toolCommand.meta).toEqual({ source: 'toolbar', timestamp: 1, transactionKey: 'tool' });

    const firstDirect = handleUserDrawingInput(toolDirect, { paneId: 'main', anchor: anchorA }, {
      createId: () => 'rect',
      now: () => 30,
      style,
    });
    const firstCommand = dispatchUserDrawingCommand(toolCommand.state, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorA },
      options: { createId: () => 'rect', now: () => 30, style },
      meta: { source: 'pointer', transactionKey: 'draw-1' },
    });

    expect(firstCommand.state).toEqual(firstDirect);
    expect(firstCommand.changed).toBe(true);

    const secondDirect = handleUserDrawingInput(firstDirect, { paneId: 'main', anchor: anchorB }, {
      createId: () => 'rect',
      now: () => 30,
      style,
    });
    const secondCommand = dispatchUserDrawingCommand(firstCommand.state, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorB },
      options: { createId: () => 'rect', now: () => 30, style },
      meta: { source: 'pointer', transactionKey: 'draw-1' },
    });

    expect(secondCommand.state).toEqual(secondDirect);
    expect(secondCommand.state.selection).toEqual({ drawingId: 'rect' });
  });

  it('wraps selection, duplicate, delete, style, lock, and z-order reducers', () => {
    const state = createStateWithTrendLine();

    expect(dispatchUserDrawingCommand(state, { type: 'select', drawingId: 'trend-line' }).state).toEqual(
      selectUserDrawingById(state, 'trend-line'),
    );

    const duplicateCommand = dispatchUserDrawingCommand(state, {
      type: 'duplicate',
      options: { createId: () => 'trend-line-copy', now: () => 40 },
      meta: { source: 'api', affectedIds: ['trend-line'] },
    });
    const duplicated = duplicateUserDrawing(state, { createId: () => 'trend-line-copy', now: () => 40 });
    expect(duplicateCommand.state).toEqual(duplicated);
    expect(duplicateCommand.meta?.affectedIds).toEqual(['trend-line']);

    expect(
      dispatchUserDrawingCommand(duplicated, {
        type: 'updateStyle',
        style: { lineColor: '#00ff88' },
        options: { now: () => 41 },
      }).state,
    ).toEqual(updateUserDrawingStyle(duplicated, { lineColor: '#00ff88' }, { now: () => 41 }));

    expect(dispatchUserDrawingCommand(duplicated, { type: 'setLocked', locked: true, options: { now: () => 42 } }).state).toEqual(
      setUserDrawingLocked(duplicated, true, { now: () => 42 }),
    );

    expect(dispatchUserDrawingCommand(duplicated, { type: 'reorder', action: 'sendToBack' }).state).toEqual(
      reorderUserDrawings(duplicated, 'sendToBack'),
    );

    expect(dispatchUserDrawingCommand(duplicated, { type: 'delete' }).state).toEqual(deleteUserDrawing(duplicated));
  });

  it('wraps text edit lifecycle reducers', () => {
    const state = createStateWithTextLabel();
    const editing = beginUserDrawingTextEdit(state, 'label', { now: () => 50 });
    const updated = updateUserDrawingTextEdit(editing, 'Changed');

    expect(
      dispatchUserDrawingCommand(state, {
        type: 'beginTextEdit',
        drawingId: 'label',
        options: { now: () => 50 },
        meta: { source: 'textEditor', transactionKey: 'text-label' },
      }).state,
    ).toEqual(editing);
    expect(dispatchUserDrawingCommand(editing, { type: 'updateTextEdit', value: 'Changed' }).state).toEqual(updated);
    expect(dispatchUserDrawingCommand(updated, { type: 'commitTextEdit', options: { now: () => 51 } }).state).toEqual(
      commitUserDrawingTextEdit(updated, { now: () => 51 }),
    );
  });

  it('wraps path drag lifecycle reducers', () => {
    const state = setUserDrawingTool(createUserDrawingState(), 'path');
    const firstPoint = { paneId: 'main', anchor: anchorA };
    const secondPoint = { paneId: 'main', anchor: anchorB };
    const started = beginUserDrawingPathDrag(state, firstPoint, { now: () => 60, style });
    const appended = appendUserDrawingPathDragPoint(started, secondPoint);

    expect(
      dispatchUserDrawingCommand(state, {
        type: 'beginPathDrag',
        point: firstPoint,
        options: { now: () => 60, style },
      }).state,
    ).toEqual(started);
    expect(dispatchUserDrawingCommand(started, { type: 'appendPathDragPoint', point: secondPoint }).state).toEqual(appended);
    expect(
      dispatchUserDrawingCommand(appended, {
        type: 'commitPathDrag',
        options: { createId: () => 'path-1', now: () => 61, style },
      }).state,
    ).toEqual(commitUserDrawingPathDrag(appended, { createId: () => 'path-1', now: () => 61, style }));
  });

  it('wraps point selection and edit drag reducers with hit metadata', () => {
    const state = createStateWithTrendLine();
    const hitPoint = { x: 100, y: 200 };
    const selectedDirect = resolveUserDrawingSelectionAtPoint(state, hitPoint, spacesByPaneId);
    const selectedCommand = dispatchUserDrawingCommand(state, {
      type: 'selectAtPoint',
      point: hitPoint,
      spacesByPaneId,
      meta: { source: 'pointer' },
    });

    expect(selectedCommand.state).toEqual(selectedDirect.state);
    expect(selectedCommand.changed).toBe(true);
    expect(selectedCommand.hit).toBe(true);
    expect(selectedCommand.state.selection).toEqual({ drawingId: 'trend-line', handle: 'start' });

    const dragDirect = beginUserDrawingEditDragAtPoint(selectedCommand.state, hitPoint, spacesByPaneId);
    const dragCommand = dispatchUserDrawingCommand(selectedCommand.state, {
      type: 'beginEditDragAtPoint',
      point: hitPoint,
      spacesByPaneId,
      meta: { source: 'pointer', transactionKey: 'edit-drag' },
    });

    expect(dragCommand.state).toEqual(dragDirect.state);
    expect(dragCommand.hit).toBe(true);
    expect(dragCommand.editDrag).toEqual(dragDirect.drag);
    expect(dragCommand.editDrag).not.toBeNull();

    const drag = dragCommand.editDrag;
    if (!drag) throw new Error('expected edit drag metadata');

    const movePoint = { x: 110, y: 190 };
    const movedCommand = dispatchUserDrawingCommand(dragCommand.state, {
      type: 'applyEditDrag',
      drag,
      point: movePoint,
      meta: { source: 'pointer', transactionKey: 'edit-drag' },
    });

    expect(movedCommand.changed).toBe(true);
    const movedDrawing = movedCommand.state.drawings[0];
    expect(movedDrawing?.kind).toBe('trendLine');
    if (movedDrawing?.kind !== 'trendLine') throw new Error('expected trend line drawing');
    expect(movedDrawing.points[0]).not.toEqual(anchorA);
    expect(movedDrawing.points[0]?.time).toBeGreaterThan(anchorA.time);
    expect(movedDrawing.points[0]?.price).toBeGreaterThan(anchorA.price);
  });

  it('wraps image, table, text alignment, icon, and visibility reducers', () => {
    const imageState: UserDrawingState = {
      ...createUserDrawingState(),
      selection: { drawingId: 'image' },
      drawings: [
        {
          id: 'image',
          kind: 'image',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          points: [anchorA, anchorB],
          src: '',
          alt: '',
        },
      ],
    };
    expect(
      dispatchUserDrawingCommand(imageState, {
        type: 'setImageSource',
        source: { src: 'chart.png', alt: 'Chart' },
        options: { now: () => 70 },
      }).state,
    ).toEqual(setUserDrawingImageSource(imageState, { src: 'chart.png', alt: 'Chart' }, { now: () => 70 }));

    const tableState = createStateWithTable();
    expect(
      dispatchUserDrawingCommand(tableState, {
        type: 'setTableCell',
        row: 0,
        column: 0,
        value: 'Metric',
        options: { now: () => 71 },
      }).state,
    ).toEqual(setUserDrawingTableCell(tableState, 0, 0, 'Metric', { now: () => 71 }));
    expect(
      dispatchUserDrawingCommand(tableState, {
        type: 'setTableDimensions',
        rows: 2,
        columns: 2,
        options: { now: () => 72 },
      }).state,
    ).toEqual(setUserDrawingTableDimensions(tableState, 2, 2, { now: () => 72 }));

    const textState = createStateWithTextLabel();
    expect(dispatchUserDrawingCommand(textState, { type: 'setTextAlign', textAlign: 'right', options: { now: () => 73 } }).state).toEqual(
      setUserDrawingTextAlign(textState, 'right', { now: () => 73 }),
    );

    const trendState = createStateWithTrendLine();
    expect(
      dispatchUserDrawingCommand(trendState, {
        type: 'setTrendLineExtend',
        extend: 'right',
        options: { now: () => 74 },
      }).state,
    ).toEqual(setUserDrawingTrendLineExtend(trendState, 'right', { now: () => 74 }));

    const iconState = handleUserDrawingInput(
      setUserDrawingTool(createUserDrawingState(), 'icon'),
      { paneId: 'main', anchor: anchorA },
      { createId: () => 'icon', now: () => 75, style },
    );
    expect(dispatchUserDrawingCommand(iconState, { type: 'setIconName', iconName: 'arrowDown', options: { now: () => 76 } }).state).toEqual(
      setUserDrawingIconName(iconState, 'arrowDown', { now: () => 76 }),
    );

    expect(dispatchUserDrawingCommand(trendState, { type: 'setVisibility', visible: false, options: { now: () => 77 } }).state).toEqual(
      setUserDrawingVisibility(trendState, false, { now: () => 77 }),
    );
  });

  it('reports unchanged commands as no-ops', () => {
    const state = createUserDrawingState();
    const result = dispatchUserDrawingCommand(state, { type: 'delete', meta: { source: 'keyboard' } });

    expect(result.state).toBe(state);
    expect(result.changed).toBe(false);
    expect(result.meta).toEqual({ source: 'keyboard' });
  });
});
