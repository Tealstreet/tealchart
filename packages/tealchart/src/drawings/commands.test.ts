import { afterEach, describe, expect, it } from 'vitest';

import { createUserDrawingCommandEvent, createUserDrawingReplaceStateCommandEvent, dispatchUserDrawingCommand } from './commands';
import type { UserDrawingCommand } from './commands';
import { beginUserDrawingDuplicateEditDragAtPoint, beginUserDrawingEditDragAtPoint } from './editing';
import { clearChartStoreCache } from '../state/chartState';
import {
  addUserDrawing,
  appendUserDrawingPathDragPoint,
  beginUserDrawingPlacementDrag,
  beginUserDrawingPathDrag,
  beginUserDrawingTextEdit,
  cancelUserDrawingDraft,
  cancelUserDrawingTextEdit,
  clearUserDrawings,
  commitUserDrawingPlacementDrag,
  commitUserDrawingPathDrag,
  commitUserDrawingTextEdit,
  createUserDrawingClipboard,
  createUserDrawingState,
  deleteUserDrawingTableColumn,
  deleteUserDrawingTableRow,
  deleteUserDrawing,
  duplicateUserDrawing,
  handleUserDrawingInput,
  insertUserDrawingTableColumn,
  insertUserDrawingTableRow,
  reorderUserDrawings,
  resolveUserDrawingSelectionAtPoint,
  selectUserDrawingById,
  selectUserDrawingsById,
  setUserDrawingIconName,
  setUserDrawingImageSource,
  setUserDrawingLocked,
  setUserDrawingMagnetMode,
  setUserDrawingMeasureMode,
  setUserDrawingName,
  setUserDrawingStayInDrawingMode,
  setUserDrawingTableCells,
  setUserDrawingTableCell,
  setUserDrawingTableDimensions,
  setUserDrawingText,
  setUserDrawingTextAlign,
  setUserDrawingTextContent,
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
const indicatorCoordinateSpace: DrawingCoordinateSpace = {
  viewport: { startTime: 0, endTime: 3_000, priceMin: 0, priceMax: 100 },
  pane: { id: 'indicator', top: 300, height: 100, bottom: 400, yMin: 0, yMax: 100 },
  chartLeft: 0,
  chartRight: 300,
};
const spacesByPaneId = new Map([['main', coordinateSpace]]);
const multiPaneSpacesByPaneId = new Map([
  ['main', coordinateSpace],
  ['indicator', indicatorCoordinateSpace],
]);
const coveredUserDrawingCommandTypes = [
  'setActiveTool',
  'setStayInDrawingMode',
  'setMagnetMode',
  'setFavoriteTools',
  'toggleFavoriteTool',
  'setFavoriteToolbarPosition',
  'setDefaultStyleByKind',
  'setMeasureMode',
  'add',
  'select',
  'selectMany',
  'selectAtPoint',
  'beginEditDragAtPoint',
  'beginDuplicateEditDragAtPoint',
  'applyEditDrag',
  'nudge',
  'delete',
  'duplicate',
  'paste',
  'clear',
  'cancelDraft',
  'handleInput',
  'beginPlacementDrag',
  'commitPlacementDrag',
  'beginMeasure',
  'updateMeasure',
  'endMeasure',
  'beginPathDrag',
  'appendPathDragPoint',
  'commitPathDrag',
  'beginTextEdit',
  'updateTextEdit',
  'commitTextEdit',
  'cancelTextEdit',
  'setText',
  'setTextContent',
  'updateStyle',
  'setTextAlign',
  'setTrendLineExtend',
  'setIconName',
  'setImageSource',
  'setName',
  'setTableCells',
  'setTableCell',
  'setTableDimensions',
  'insertTableRow',
  'deleteTableRow',
  'insertTableColumn',
  'deleteTableColumn',
  'setVisibility',
  'setLocked',
  'reorder',
] as const satisfies readonly UserDrawingCommand['type'][];
type MissingCoveredUserDrawingCommandType = Exclude<UserDrawingCommand['type'], (typeof coveredUserDrawingCommandTypes)[number]>;
const allUserDrawingCommandTypesCovered: Record<MissingCoveredUserDrawingCommandType, never> = {};

afterEach(() => {
  clearChartStoreCache();
});

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

function expectCommandState(state: UserDrawingState, command: UserDrawingCommand, directState: UserDrawingState): UserDrawingState {
  const result = dispatchUserDrawingCommand(state, command);
  expect(result.state).toEqual(directState);
  expect(result.changed).toBe(result.state !== state);
  return result.state;
}

describe('user drawing command dispatch', () => {
  it('keeps the shared command coverage harness exhaustive', () => {
    expect(allUserDrawingCommandTypesCovered).toEqual({});
    expect(new Set(coveredUserDrawingCommandTypes).size).toBe(coveredUserDrawingCommandTypes.length);
  });

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

  it('wraps stay-in-drawing-mode reducer without changing behavior', () => {
    const initial = createUserDrawingState();
    const direct = setUserDrawingStayInDrawingMode(initial, true);
    const command = dispatchUserDrawingCommand(initial, {
      type: 'setStayInDrawingMode',
      stayInDrawingMode: true,
      meta: { source: 'toolbar', timestamp: 2 },
    });

    expect(command.state).toEqual(direct);
    expect(command.changed).toBe(true);
    expect(command.meta).toEqual({ source: 'toolbar', timestamp: 2 });

    const unchanged = dispatchUserDrawingCommand(command.state, {
      type: 'setStayInDrawingMode',
      stayInDrawingMode: true,
      meta: { source: 'toolbar' },
    });

    expect(unchanged.state).toBe(command.state);
    expect(unchanged.changed).toBe(false);
  });

  it('wraps magnet-mode reducer without changing behavior', () => {
    const initial = createUserDrawingState();
    const direct = setUserDrawingMagnetMode(initial, 'strong');
    const command = dispatchUserDrawingCommand(initial, {
      type: 'setMagnetMode',
      magnetMode: 'strong',
      meta: { source: 'toolbar', timestamp: 3 },
    });

    expect(command.state).toEqual(direct);
    expect(command.changed).toBe(true);
    expect(command.meta).toEqual({ source: 'toolbar', timestamp: 3 });

    const unchanged = dispatchUserDrawingCommand(command.state, {
      type: 'setMagnetMode',
      magnetMode: 'strong',
      meta: { source: 'toolbar' },
    });

    expect(unchanged.state).toBe(command.state);
    expect(unchanged.changed).toBe(false);
  });

  it('toggles and sets favorite tools without recording history', () => {
    const initial = createUserDrawingState();
    const added = dispatchUserDrawingCommand(initial, {
      type: 'toggleFavoriteTool',
      tool: 'trendLine',
      meta: { source: 'toolbar' },
    });
    expect(added.state.favoriteTools).toEqual(['trendLine']);
    expect(added.changed).toBe(true);

    const removed = dispatchUserDrawingCommand(added.state, {
      type: 'toggleFavoriteTool',
      tool: 'trendLine',
      meta: { source: 'toolbar' },
    });
    expect(removed.state.favoriteTools).toEqual([]);

    const replaced = dispatchUserDrawingCommand(removed.state, {
      type: 'setFavoriteTools',
      favoriteTools: ['rectangle', 'horizontalLine', 'rectangle'],
      meta: { source: 'toolbar' },
    });
    expect(replaced.state.favoriteTools).toEqual(['rectangle', 'horizontalLine']);

    const unchanged = dispatchUserDrawingCommand(replaced.state, {
      type: 'setFavoriteTools',
      favoriteTools: ['rectangle', 'horizontalLine'],
      meta: { source: 'toolbar' },
    });
    expect(unchanged.state).toBe(replaced.state);
    expect(unchanged.changed).toBe(false);

    const moved = dispatchUserDrawingCommand(replaced.state, {
      type: 'setFavoriteToolbarPosition',
      position: { x: 120, y: 64 },
      meta: { source: 'toolbar' },
    });
    expect(moved.state.favoriteToolbarPosition).toEqual({ x: 120, y: 64 });
    expect(moved.changed).toBe(true);

    const movedSame = dispatchUserDrawingCommand(moved.state, {
      type: 'setFavoriteToolbarPosition',
      position: { x: 120, y: 64 },
      meta: { source: 'toolbar' },
    });
    expect(movedSame.state).toBe(moved.state);
    expect(movedSame.changed).toBe(false);

    const cleared = dispatchUserDrawingCommand(moved.state, {
      type: 'setFavoriteToolbarPosition',
      position: null,
      meta: { source: 'toolbar' },
    });
    expect(cleared.state.favoriteToolbarPosition ?? null).toBeNull();
  });

  it('wraps temporary measure commands without creating drawings', () => {
    const initial = createUserDrawingState();
    const direct = setUserDrawingMeasureMode(initial, 'on');
    const command = dispatchUserDrawingCommand(initial, {
      type: 'setMeasureMode',
      measureMode: 'on',
      meta: { source: 'toolbar', timestamp: 4 },
    });

    expect(command.state).toEqual(direct);
    expect(command.changed).toBe(true);

    const started = dispatchUserDrawingCommand(command.state, {
      type: 'beginMeasure',
      point: { paneId: 'main', anchor: anchorA },
      options: { now: () => 20, style },
      meta: { source: 'pointer' },
    });
    expect(started.state.drawings).toEqual([]);
    expect(started.state.measure?.anchors).toEqual([anchorA, anchorA]);

    const moved = dispatchUserDrawingCommand(started.state, {
      type: 'updateMeasure',
      point: { paneId: 'main', anchor: anchorB },
      meta: { source: 'pointer' },
    });
    expect(moved.state.drawings).toEqual([]);
    expect(moved.state.measure?.anchors).toEqual([anchorA, anchorB]);

    const ended = dispatchUserDrawingCommand(moved.state, {
      type: 'endMeasure',
      meta: { source: 'pointer' },
    });
    expect(ended.state.measure).toBeNull();
    expect(ended.state.measureMode).toBe('on');
    expect(ended.state.drawings).toEqual([]);
  });

  it('derives affected drawing ids for reorder command events', () => {
    const state = duplicateUserDrawing(createStateWithTrendLine(), {
      createId: () => 'copy',
      now: () => 30,
    });
    const result = dispatchUserDrawingCommand(state, {
      type: 'reorder',
      action: 'sendToBack',
      meta: { source: 'api' },
    });
    const event = createUserDrawingCommandEvent(state, result);

    expect(result.changed).toBe(true);
    expect(event?.affectedIds).toEqual(expect.arrayContaining(['trend-line', 'copy']));
    expect(event?.affectedIds).toHaveLength(2);
  });

  it('derives affected drawing ids when select-many changes the secondary selection set', () => {
    const state = duplicateUserDrawing(createStateWithTrendLine(), {
      createId: () => 'copy',
      now: () => 31,
    });
    const selectedPrimaryOnly = { ...state, selection: { drawingId: 'trend-line' } };
    const result = dispatchUserDrawingCommand(selectedPrimaryOnly, {
      type: 'selectMany',
      drawingIds: ['trend-line', 'copy'],
      meta: { source: 'api' },
    });
    const event = createUserDrawingCommandEvent(selectedPrimaryOnly, result);

    expect(result.changed).toBe(true);
    expect(event?.affectedIds).toEqual(['copy']);
  });

  it('creates non-undoable replace-state events for direct state replacement', () => {
    const previousState = createUserDrawingState();
    const state = createStateWithTrendLine();
    const event = createUserDrawingReplaceStateCommandEvent(previousState, state, {
      type: 'replaceState',
      meta: { source: 'layout' },
    });

    expect(event).toMatchObject({
      command: { type: 'replaceState' },
      source: 'layout',
      previousState,
      state,
      affectedIds: ['trend-line'],
    });
    expect(createUserDrawingReplaceStateCommandEvent(state, state, { type: 'replaceState', meta: { source: 'api' } })).toBeNull();
    expect(
      createUserDrawingReplaceStateCommandEvent(previousState, { ...previousState, activeTool: 'rectangle' }, {
        type: 'replaceState',
        meta: { source: 'api' },
      }),
    ).toBeNull();
  });

  it('wraps selection, duplicate, delete, style, lock, and z-order reducers', () => {
    const state = createStateWithTrendLine();
    const addedDrawing = { ...state.drawings[0]!, id: 'added-line' };

    expect(
      dispatchUserDrawingCommand(createUserDrawingState(), {
        type: 'add',
        drawing: addedDrawing,
        options: { select: false },
        meta: { source: 'api', affectedIds: ['added-line'] },
      }).state,
    ).toEqual(addUserDrawing(createUserDrawingState(), addedDrawing, { select: false }));

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

    const guidesHidden = updateUserDrawingStyle(
      duplicated,
      {
        barsPatternDisplayMode: 'future' as never,
        measurementLabelAlignment: 'future' as never,
        riskRewardLabelAlignment: 'future' as never,
        riskRewardStatsMode: 'future' as never,
        volumeProfileGuidesVisible: false,
        volumeProfileRowCount: 24.4,
        volumeProfileValueAreaRatio: 1.5,
        volumeProfileWidthRatio: -1,
      },
      { drawingId: 'trend-line-copy', now: () => 41 },
    );
    const guideHiddenDrawing = guidesHidden.drawings.find((drawing) => drawing.id === 'trend-line-copy');
    expect(guideHiddenDrawing?.style.barsPatternDisplayMode).toBe('candles');
    expect(guideHiddenDrawing?.style.measurementLabelAlignment).toBe('center');
    expect(guideHiddenDrawing?.style.riskRewardLabelAlignment).toBe('center');
    expect(guideHiddenDrawing?.style.riskRewardStatsMode).toBe('full');
    expect(guideHiddenDrawing?.style.volumeProfileGuidesVisible).toBe(false);
    expect(guideHiddenDrawing?.style.volumeProfileRowCount).toBe(24);
    expect(guideHiddenDrawing?.style.volumeProfileValueAreaRatio).toBe(1);
    expect(guideHiddenDrawing?.style.volumeProfileWidthRatio).toBe(0.05);
    expect(guideHiddenDrawing?.updatedAt).toBe(41);

    expect(dispatchUserDrawingCommand(duplicated, { type: 'setLocked', locked: true, options: { now: () => 42 } }).state).toEqual(
      setUserDrawingLocked(duplicated, true, { now: () => 42 }),
    );

    expect(dispatchUserDrawingCommand(duplicated, { type: 'reorder', action: 'sendToBack' }).state).toEqual(
      reorderUserDrawings(duplicated, 'sendToBack'),
    );

    expect(
      dispatchUserDrawingCommand(duplicated, {
        type: 'setName',
        drawingId: 'trend-line-copy',
        name: 'Copied trend',
        options: { now: () => 43 },
      }).state,
    ).toEqual(setUserDrawingName(duplicated, 'trend-line-copy', 'Copied trend', { now: () => 43 }));

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

  it('wraps remaining selection, draft, text, table, and clear reducers', () => {
    const selectedState = createStateWithTrendLine();
    const duplicatedState = duplicateUserDrawing(selectedState, {
      createId: () => 'trend-line-copy',
      now: () => 80,
    });
    expectCommandState(
      duplicatedState,
      { type: 'selectMany', drawingIds: ['trend-line', 'trend-line-copy'], meta: { source: 'api' } },
      selectUserDrawingsById(duplicatedState, ['trend-line', 'trend-line-copy']),
    );
    expectCommandState(duplicatedState, { type: 'clear', meta: { source: 'api' } }, clearUserDrawings(duplicatedState));

    const draftState = handleUserDrawingInput(
      setUserDrawingTool(createUserDrawingState(), 'rectangle'),
      { paneId: 'main', anchor: anchorA },
      { createId: () => 'rect', now: () => 81, style },
    );
    expectCommandState(draftState, { type: 'cancelDraft', meta: { source: 'api' } }, cancelUserDrawingDraft(draftState));

    const textState = createStateWithTextLabel();
    const editing = beginUserDrawingTextEdit(textState, 'label', { now: () => 82 });
    expectCommandState(editing, { type: 'cancelTextEdit', meta: { source: 'textEditor' } }, cancelUserDrawingTextEdit(editing));
    expectCommandState(
      textState,
      { type: 'setText', drawingId: 'label', text: 'Direct text', options: { now: () => 83 } },
      setUserDrawingText(textState, 'label', 'Direct text', { now: () => 83 }),
    );
    expectCommandState(
      textState,
      { type: 'setTextContent', text: 'Selected text', options: { now: () => 84 } },
      setUserDrawingTextContent(textState, 'Selected text', { now: () => 84 }),
    );

    const tableState = createStateWithTable();
    const tableCells = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    expectCommandState(
      tableState,
      { type: 'setTableCells', cells: tableCells, options: { now: () => 85 } },
      setUserDrawingTableCells(tableState, tableCells, { now: () => 85 }),
    );

    const expandedTable = setUserDrawingTableCells(tableState, tableCells, { now: () => 86 });
    expectCommandState(
      expandedTable,
      { type: 'insertTableRow', row: 1, values: ['E', 'F'], options: { now: () => 87 } },
      insertUserDrawingTableRow(expandedTable, 1, ['E', 'F'], { now: () => 87 }),
    );
    expectCommandState(
      expandedTable,
      { type: 'deleteTableRow', row: 1, options: { now: () => 88 } },
      deleteUserDrawingTableRow(expandedTable, 1, { now: () => 88 }),
    );
    expectCommandState(
      expandedTable,
      { type: 'insertTableColumn', column: 1, values: ['X', 'Y'], options: { now: () => 89 } },
      insertUserDrawingTableColumn(expandedTable, 1, ['X', 'Y'], { now: () => 89 }),
    );
    expectCommandState(
      expandedTable,
      { type: 'deleteTableColumn', column: 1, options: { now: () => 90 } },
      deleteUserDrawingTableColumn(expandedTable, 1, { now: () => 90 }),
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

  it('wraps two-anchor placement drag lifecycle reducers', () => {
    const state = setUserDrawingTool(createUserDrawingState(), 'rectangle');
    const firstPoint = { paneId: 'main', anchor: anchorA };
    const secondPoint = { paneId: 'main', anchor: anchorB };
    const started = beginUserDrawingPlacementDrag(state, firstPoint, { now: () => 62, style });

    expect(
      dispatchUserDrawingCommand(state, {
        type: 'beginPlacementDrag',
        point: firstPoint,
        options: { now: () => 62, style },
      }).state,
    ).toEqual(started);
    expect(
      dispatchUserDrawingCommand(started, {
        type: 'commitPlacementDrag',
        point: secondPoint,
        options: { createId: () => 'rect-1', now: () => 63, style },
      }).state,
    ).toEqual(commitUserDrawingPlacementDrag(started, secondPoint, { createId: () => 'rect-1', now: () => 63, style }));
  });

  it('restarts click placement in the new pane instead of committing a cross-pane drawing', () => {
    const state = setUserDrawingTool(createUserDrawingState(), 'rectangle');
    const started = dispatchUserDrawingCommand(state, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorA },
      options: { createId: () => 'cross-pane-rect', now: () => 64, style },
      meta: { source: 'pointer' },
    });
    const second = dispatchUserDrawingCommand(started.state, {
      type: 'handleInput',
      point: { paneId: 'indicator', anchor: anchorB },
      options: { createId: () => 'cross-pane-rect', now: () => 65, style },
      meta: { source: 'pointer' },
    });

    expect(started.changed).toBe(true);
    expect(started.state.draft).toMatchObject({ tool: 'rectangle', paneId: 'main', anchors: [anchorA] });
    // A second click in a different pane restarts placement there rather than committing a cross-pane shape.
    expect(second.state.drawings).toEqual([]);
    expect(second.state.draft).toMatchObject({ tool: 'rectangle', paneId: 'indicator', anchors: [anchorB] });
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

  it('wraps duplicate edit-drag start with hit metadata for the copied drawing', () => {
    const state = createStateWithTrendLine();
    const hitPoint = { x: 150, y: 150 };
    const direct = beginUserDrawingDuplicateEditDragAtPoint(state, hitPoint, spacesByPaneId, {
      createId: () => 'trend-line-copy',
      now: () => 50,
    });
    const command = dispatchUserDrawingCommand(state, {
      type: 'beginDuplicateEditDragAtPoint',
      point: hitPoint,
      spacesByPaneId,
      options: {
        createId: () => 'trend-line-copy',
        now: () => 50,
      },
      meta: { source: 'pointer', transactionKey: 'duplicate-drag' },
    });

    expect(command.state).toEqual(direct.state);
    expect(command.changed).toBe(true);
    expect(command.hit).toBe(true);
    expect(command.editDrag).toEqual(direct.drag);
    expect(command.state.drawings.map((drawing) => drawing.id)).toEqual(['trend-line', 'trend-line-copy']);
    expect(command.state.selection).toEqual({ drawingId: 'trend-line-copy' });
    expect(command.editDrag?.startDrawing.id).toBe('trend-line-copy');
    if (!command.editDrag) throw new Error('expected duplicate edit drag metadata');
    const copiedBeforeMove = command.state.drawings.find((drawing) => drawing.id === 'trend-line-copy');
    const originalBeforeMove = command.state.drawings.find((drawing) => drawing.id === 'trend-line');

    const moved = dispatchUserDrawingCommand(command.state, {
      type: 'applyEditDrag',
      drag: command.editDrag,
      point: { x: 170, y: 130 },
      meta: { source: 'pointer', transactionKey: 'duplicate-drag' },
    });
    const copiedDrawing = moved.state.drawings.find((drawing) => drawing.id === 'trend-line-copy');
    const originalDrawing = moved.state.drawings.find((drawing) => drawing.id === 'trend-line');
    expect(copiedDrawing?.kind).toBe('trendLine');
    expect(originalDrawing?.kind).toBe('trendLine');
    if (copiedDrawing?.kind !== 'trendLine' || originalDrawing?.kind !== 'trendLine') {
      throw new Error('expected trend line drawings');
    }
    expect(moved.changed).toBe(true);
    expect(originalDrawing).toEqual(originalBeforeMove);
    expect(copiedDrawing).not.toEqual(copiedBeforeMove);
    expect(copiedDrawing.points).not.toEqual(originalDrawing.points);
    expect(moved.state.selection).toEqual({ drawingId: 'trend-line-copy' });
  });

  it('wraps selected drawing nudges through edit-drag geometry', () => {
    const state = createStateWithTrendLine();
    const nudged = dispatchUserDrawingCommand(state, {
      type: 'nudge',
      spacesByPaneId,
      options: { delta: { x: 10, y: 10 }, now: () => 91 },
      meta: { source: 'keyboard' },
    });

    expect(nudged.changed).toBe(true);
    expect(nudged.state.selection).toEqual(state.selection);
    const movedDrawing = nudged.state.drawings[0];
    expect(movedDrawing?.kind).toBe('trendLine');
    if (movedDrawing?.kind !== 'trendLine') throw new Error('expected trend line drawing');
    expect(movedDrawing.updatedAt).toBe(91);
    expect(movedDrawing.points[0]).toEqual({ time: 1100, price: 99 });
    expect(movedDrawing.points[1]).toEqual({ time: 2100, price: 109 });
  });

  it('nudges multi-pane selections using each drawing pane coordinate space', () => {
    const state: UserDrawingState = {
      ...createUserDrawingState(),
      selection: { drawingId: 'main-line', drawingIds: ['main-line', 'indicator-line'] },
      drawings: [
        {
          id: 'main-line',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 100,
        },
        {
          id: 'indicator-line',
          kind: 'horizontalLine',
          paneId: 'indicator',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 50,
        },
      ],
    };

    const nudged = dispatchUserDrawingCommand(state, {
      type: 'nudge',
      spacesByPaneId: multiPaneSpacesByPaneId,
      options: { delta: { x: 0, y: 10 }, now: () => 92 },
      meta: { source: 'keyboard' },
    });

    expect(nudged.changed).toBe(true);
    expect(nudged.state.drawings[0]).toMatchObject({ id: 'main-line', price: 99, updatedAt: 92 });
    expect(nudged.state.drawings[1]).toMatchObject({ id: 'indicator-line', price: 40, updatedAt: 92 });
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

  it('copies selected drawings into a transient clipboard and pastes fresh drawings through commands', () => {
    const state = createStateWithTrendLine();
    const clipboard = createUserDrawingClipboard(state);

    expect(clipboard?.drawings.map((drawing) => drawing.id)).toEqual(['trend-line']);

    const pasted = dispatchUserDrawingCommand(state, {
      type: 'paste',
      clipboard,
      options: { createId: () => 'trend-line-copy', now: () => 90 },
      meta: { source: 'keyboard' },
    });

    expect(pasted.changed).toBe(true);
    expect(pasted.state.drawings.map((drawing) => drawing.id)).toEqual(['trend-line', 'trend-line-copy']);
    expect(pasted.state.selection).toEqual({ drawingId: 'trend-line-copy' });
    expect(pasted.state.drawings[1]).toMatchObject({
      id: 'trend-line-copy',
      createdAt: 90,
      updatedAt: 90,
    });
  });

  it('does not copy locked selected drawings unless requested', () => {
    const state = {
      ...createStateWithTrendLine(),
      drawings: [{ ...createStateWithTrendLine().drawings[0]!, locked: true }],
    };

    expect(createUserDrawingClipboard(state)).toBeNull();
    expect(createUserDrawingClipboard(state, { includeLocked: true })?.drawings[0]).toMatchObject({
      id: 'trend-line',
      locked: true,
    });
  });
});
