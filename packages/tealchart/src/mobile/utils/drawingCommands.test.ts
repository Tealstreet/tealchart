import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  commitMobileUserDrawingHandleCommand,
  dispatchMobileUserDrawingHandleCommand,
  dispatchMobileUserDrawingHistoryCommand,
  dispatchMobileUserDrawingHistoryCommandWithEvent,
  dispatchMobileUserDrawingKeyboardAction,
} from './drawingCommands';
import { clearChartStoreCache } from '../../state/chartState';
import {
  createUserDrawingCommandHistory,
  createUserDrawingCommandEvent,
  createUserDrawingState,
  duplicateUserDrawing,
  handleUserDrawingInput,
  resolveUserDrawingObjectTreeDispatchActionCommands,
  resolveUserDrawingObjectTreeDrawingDispatchAction,
  resolveUserDrawingObjectTreeModel,
  resolveUserDrawingObjectTreeRowDispatchAction,
  resolveUserDrawingObjectTreeSelectionDispatchAction,
  setUserDrawingTool,
  shouldRenderUserDrawingSelectedActionSurface,
  redoUserDrawingCommand,
  undoUserDrawingCommand,
} from '../../drawings';
import type { DrawingCoordinateSpace, UserDrawing, UserDrawingState, UserDrawingTool } from '../../drawings';

const style = { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const };
const anchorA = { time: 1_000, price: 100 };
const anchorB = { time: 2_000, price: 110 };
const anchorC = { time: 3_000, price: 120 };
const anchorD = { time: 4_000, price: 130 };
const anchorE = { time: 5_000, price: 140 };
const expandedDragPlacementTools: UserDrawingTool[] = [
  'trendAngle',
  'priceRange',
  'dateRange',
  'datePriceRange',
  'forecast',
  'fixedRangeVolumeProfile',
  'callout',
  'priceNote',
  'image',
  'fibRetracement',
  'fibExtension',
  'fibFan',
  'fibSpeedResistanceFan',
  'fibArcs',
  'fibSpeedResistanceArcs',
  'fibCircles',
  'fibSpiral',
  'gannFan',
  'gannBox',
  'gannSquare',
  'gannSquareFixed',
  'fibTimeZone',
  'cyclicLines',
  'timeCycles',
  'sineLine',
];
const coordinateSpace: DrawingCoordinateSpace = {
  viewport: { startTime: 0, endTime: 3_000, priceMin: 90, priceMax: 120 },
  pane: { id: 'main', top: 0, height: 300, bottom: 300, yMin: 90, yMax: 120 },
  chartLeft: 0,
  chartRight: 300,
};
const spacesByPaneId = new Map([['main', coordinateSpace]]);

afterEach(() => {
  clearChartStoreCache();
});

function createMobileStateWithTrendLine(): UserDrawingState {
  const first = handleUserDrawingInput(
    setUserDrawingTool(createUserDrawingState(), 'trendLine'),
    { paneId: 'main', anchor: anchorA },
    { createId: () => 'line', now: () => 10, style },
  );
  return handleUserDrawingInput(
    first,
    { paneId: 'main', anchor: anchorB },
    { createId: () => 'line', now: () => 10, style },
  );
}

function createMobileStateWithTable(): UserDrawingState {
  return handleUserDrawingInput(
    setUserDrawingTool(createUserDrawingState(), 'table'),
    { paneId: 'main', anchor: anchorA },
    { createId: () => 'table', now: () => 20, style },
  );
}

describe('mobile drawing handle command dispatch', () => {
  it('exposes boolean results for no-op-capable Skia drawing command APIs', () => {
    let history = createUserDrawingCommandHistory();
    const onEvent = vi.fn();
    let result = dispatchMobileUserDrawingHistoryCommandWithEvent(
      createUserDrawingState(),
      history,
      { type: 'setActiveTool', tool: 'select', meta: { source: 'api' } },
      onEvent,
    );
    expect(result.changed).toBe(false);
    expect(onEvent).not.toHaveBeenCalled();

    result = dispatchMobileUserDrawingHistoryCommandWithEvent(
      result.state,
      result.history,
      { type: 'setActiveTool', tool: 'rectangle', meta: { source: 'api' } },
      onEvent,
    );
    expect(result.changed).toBe(true);
    expect(onEvent).toHaveBeenCalledTimes(1);

    result = dispatchMobileUserDrawingHistoryCommandWithEvent(
      result.state,
      result.history,
      { type: 'setActiveTool', tool: 'rectangle', meta: { source: 'api' } },
      onEvent,
    );
    expect(result.changed).toBe(false);
    expect(onEvent).toHaveBeenCalledTimes(1);

    result = dispatchMobileUserDrawingHistoryCommandWithEvent(
      result.state,
      result.history,
      { type: 'setStayInDrawingMode', stayInDrawingMode: false, meta: { source: 'api' } },
      onEvent,
    );
    expect(result.changed).toBe(true);
    expect(result.state.stayInDrawingMode).toBe(false);
    expect(result.history.undoStack).toHaveLength(0);
    expect(onEvent).toHaveBeenCalledTimes(2);

    result = dispatchMobileUserDrawingHistoryCommandWithEvent(
      result.state,
      result.history,
      { type: 'setStayInDrawingMode', stayInDrawingMode: false, meta: { source: 'api' } },
      onEvent,
    );
    expect(result.changed).toBe(false);
    expect(onEvent).toHaveBeenCalledTimes(2);

    result = dispatchMobileUserDrawingHistoryCommandWithEvent(
      result.state,
      result.history,
      { type: 'setMagnetMode', magnetMode: 'strong', meta: { source: 'api' } },
      onEvent,
    );
    expect(result.changed).toBe(true);
    expect(result.state.magnetMode).toBe('strong');
    expect(result.history.undoStack).toHaveLength(0);
    expect(onEvent).toHaveBeenCalledTimes(3);

    result = dispatchMobileUserDrawingHistoryCommandWithEvent(
      result.state,
      result.history,
      { type: 'setMagnetMode', magnetMode: 'strong', meta: { source: 'api' } },
      onEvent,
    );
    expect(result.changed).toBe(false);
    expect(onEvent).toHaveBeenCalledTimes(3);
    onEvent.mockClear();

    result = dispatchMobileUserDrawingHistoryCommandWithEvent(
      result.state,
      result.history,
      { type: 'select', drawingId: 'missing', meta: { source: 'api' } },
      onEvent,
    );
    expect(result.changed).toBe(false);
    expect(onEvent).not.toHaveBeenCalled();

    const lineState = createMobileStateWithTrendLine();
    history = createUserDrawingCommandHistory();
    result = dispatchMobileUserDrawingHistoryCommandWithEvent(
      lineState,
      history,
      { type: 'select', drawingId: 'line', meta: { source: 'api' } },
      onEvent,
    );
    expect(result.changed).toBe(false);
    expect(onEvent).not.toHaveBeenCalled();

    result = dispatchMobileUserDrawingHistoryCommandWithEvent(
      result.state,
      result.history,
      { type: 'select', drawingId: null, meta: { source: 'api' } },
      onEvent,
    );
    expect(result.changed).toBe(true);
    expect(onEvent).toHaveBeenCalledTimes(1);

    result = dispatchMobileUserDrawingHistoryCommandWithEvent(
      result.state,
      result.history,
      { type: 'selectMany', drawingIds: ['line', 'missing'], meta: { source: 'api' } },
      onEvent,
    );
    expect(result.changed).toBe(true);
    expect(onEvent).toHaveBeenCalledTimes(2);

    result = dispatchMobileUserDrawingHistoryCommandWithEvent(
      result.state,
      result.history,
      { type: 'selectMany', drawingIds: ['line', 'missing'], meta: { source: 'api' } },
      onEvent,
    );
    expect(result.changed).toBe(false);
    expect(onEvent).toHaveBeenCalledTimes(2);

    result = dispatchMobileUserDrawingHistoryCommandWithEvent(result.state, result.history, {
      type: 'clear',
      meta: { source: 'api' },
    }, onEvent);
    expect(result.changed).toBe(true);
    expect(result.state.drawings).toEqual([]);
    expect(onEvent).toHaveBeenCalledTimes(3);
    const undoClear = undoUserDrawingCommand(result.state, result.history);
    expect(undoClear.changed).toBe(true);
    expect(undoClear.state.drawings.map((drawing) => drawing.id)).toEqual(['line']);

    result = dispatchMobileUserDrawingHistoryCommandWithEvent(result.state, result.history, {
      type: 'clear',
      meta: { source: 'api' },
    }, onEvent);
    expect(result.changed).toBe(false);
    expect(onEvent).toHaveBeenCalledTimes(3);

    result = dispatchMobileUserDrawingHistoryCommandWithEvent(result.state, result.history, {
      type: 'cancelDraft',
      meta: { source: 'api' },
    }, onEvent);
    expect(result.changed).toBe(false);
    expect(onEvent).toHaveBeenCalledTimes(3);

    const draftState = handleUserDrawingInput(
      setUserDrawingTool(createUserDrawingState(), 'rectangle'),
      { paneId: 'main', anchor: anchorA },
      { createId: () => 'rect', now: () => 30, style },
    );
    result = dispatchMobileUserDrawingHistoryCommandWithEvent(draftState, createUserDrawingCommandHistory(), {
      type: 'cancelDraft',
      meta: { source: 'api' },
    }, onEvent);
    expect(result.changed).toBe(true);
    expect(onEvent).toHaveBeenCalledTimes(4);
  });

  it('switches to select after mobile placement when stay-in-drawing-mode is disabled', () => {
    let history = createUserDrawingCommandHistory();
    let state = createUserDrawingState({ stayInDrawingMode: false });

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'setActiveTool',
      tool: 'rectangle',
      meta: { source: 'api' },
    }));
    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginPlacementDrag',
      point: { paneId: 'main', anchor: anchorA },
      meta: { source: 'touch' },
    }));
    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'commitPlacementDrag',
      point: { paneId: 'main', anchor: anchorB },
      options: { createId: () => 'rect', now: () => 20, style },
      meta: { source: 'touch' },
    }));

    expect(state.activeTool).toBe('select');
    expect(state.stayInDrawingMode).toBe(false);
    expect(state.selection).toEqual({ drawingId: 'rect' });
    expect(state.drawings[0]).toMatchObject({ id: 'rect', kind: 'rectangle' });
    expect(history.undoStack).toHaveLength(1);
  });

  it('records complete drawing additions through the mobile command adapter', () => {
    const drawing: UserDrawing = {
      id: 'api-line',
      kind: 'trendLine',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { ...style },
      points: [anchorA, anchorB],
      extend: 'none',
    };
    const state = createUserDrawingState();
    const history = createUserDrawingCommandHistory();

    const onEvent = vi.fn();
    const added = dispatchMobileUserDrawingHistoryCommandWithEvent(state, history, {
      type: 'add',
      drawing,
      meta: { source: 'api' },
    }, onEvent);

    expect(added.changed).toBe(true);
    expect(added.state.drawings).toEqual([drawing]);
    expect(added.state.selection).toEqual({ drawingId: 'api-line' });
    expect(added.history.undoStack).toHaveLength(1);
    expect(added.command.drawing).not.toBe(drawing);
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ affectedIds: ['api-line'] }));

    drawing.points[0] = { time: 1_000, price: 999 };
    drawing.style.lineColor = '#f00';
    expect(added.state.drawings[0]).toMatchObject({
      id: 'api-line',
      style: { lineColor: '#fff' },
      points: [anchorA, anchorB],
    });

    const duplicate = dispatchMobileUserDrawingHistoryCommand(added.state, added.history, {
      type: 'add',
      drawing,
      meta: { source: 'api' },
    });
    expect(duplicate.changed).toBe(false);
    expect(duplicate.history.undoStack).toHaveLength(1);

    const undo = undoUserDrawingCommand(added.state, added.history);
    expect(undo.state.drawings).toEqual([]);
    const redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings[0]).toMatchObject({
      id: 'api-line',
      style: { lineColor: '#fff' },
      points: [anchorA, anchorB],
    });

    const secondDrawing: UserDrawing = { ...drawing, id: 'api-line-2', style: { ...drawing.style } };
    dispatchMobileUserDrawingHistoryCommandWithEvent(redo.state, redo.history, {
      type: 'add',
      drawing: secondDrawing,
      meta: { source: 'api' },
    }, onEvent);
    expect(onEvent.mock.calls.at(-1)?.[0].affectedIds).toEqual(expect.arrayContaining(['api-line', 'api-line-2']));
    expect(onEvent.mock.calls.at(-1)?.[0].affectedIds).toHaveLength(2);
  });

  it('commits changed handle commands and preserves boolean results', () => {
    const commit = vi.fn<(state: UserDrawingState) => void>();
    const state = createMobileStateWithTrendLine();

    const changed = commitMobileUserDrawingHandleCommand(
      state,
      { type: 'duplicate', options: { createId: () => 'copy', now: () => 30 }, meta: { source: 'api' } },
      commit,
    );

    expect(changed).toBe(true);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit.mock.calls[0]?.[0].drawings.map((drawing) => drawing.id)).toEqual(['line', 'copy']);

    const unchanged = commitMobileUserDrawingHandleCommand(
      commit.mock.calls[0]![0],
      { type: 'delete', options: { drawingId: 'missing' }, meta: { source: 'api' } },
      commit,
    );

    expect(unchanged).toBe(false);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('routes representative mobile style, visibility, and table commands through shared dispatch', () => {
    const state = createMobileStateWithTable();
    const namedResult = dispatchMobileUserDrawingHandleCommand(state, {
      type: 'setName',
      drawingId: 'table',
      name: 'Mobile metrics',
      options: { now: () => 30 },
      meta: { source: 'api' },
    });
    const styleResult = dispatchMobileUserDrawingHandleCommand(namedResult.state, {
      type: 'updateStyle',
      style: { lineColor: '#00ff88' },
      options: { now: () => 31 },
      meta: { source: 'api' },
    });
    const tableResult = dispatchMobileUserDrawingHandleCommand(styleResult.state, {
      type: 'setTableCell',
      row: 0,
      column: 0,
      value: 'Metric',
      options: { now: () => 32 },
      meta: { source: 'api' },
    });
    const hiddenResult = dispatchMobileUserDrawingHandleCommand(tableResult.state, {
      type: 'setVisibility',
      visible: false,
      options: { now: () => 33 },
      meta: { source: 'api' },
    });

    expect(namedResult.changed).toBe(true);
    expect(namedResult.state.drawings[0]).toMatchObject({ name: 'Mobile metrics' });
    expect(styleResult.changed).toBe(true);
    expect(tableResult.changed).toBe(true);
    expect(hiddenResult.changed).toBe(true);
    expect(hiddenResult.state.selection).toBeNull();
    expect(hiddenResult.state.drawings[0]).toMatchObject({
      name: 'Mobile metrics',
      visible: false,
      style: expect.objectContaining({ lineColor: '#00ff88' }),
    });
    expect(hiddenResult.state.drawings[0]).toHaveProperty('cells', [
      ['Metric', 'Value'],
      ['Price', ''],
    ]);
  });

  it('routes mobile commands through shared undo history', () => {
    const state = createMobileStateWithTrendLine();
    const history = createUserDrawingCommandHistory();
    const result = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'duplicate',
      options: { createId: () => 'copy', now: () => 40 },
      meta: { source: 'api' },
    });

    expect(result.changed).toBe(true);
    expect(result.history.undoStack).toHaveLength(1);
    expect(result.state.drawings.map((drawing) => drawing.id)).toEqual(['line', 'copy']);

    const undo = undoUserDrawingCommand(result.state, result.history);
    expect(undo.changed).toBe(true);
    expect(undo.state.drawings.map((drawing) => drawing.id)).toEqual(['line']);

    const deleted = dispatchMobileUserDrawingHistoryCommand(result.state, result.history, {
      type: 'delete',
      options: { drawingId: 'copy' },
      meta: { source: 'api' },
    });

    expect(deleted.changed).toBe(true);
    expect(deleted.history.undoStack).toHaveLength(2);
    expect(deleted.state.drawings.map((drawing) => drawing.id)).toEqual(['line']);

    const restored = undoUserDrawingCommand(deleted.state, deleted.history);
    expect(restored.state.drawings.map((drawing) => drawing.id)).toEqual(['line', 'copy']);
  });

  it('records mobile tap-created drawings only after final placement input', () => {
    let state = setUserDrawingTool(createUserDrawingState(), 'trendLine');
    let history = createUserDrawingCommandHistory();

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorA },
      options: { createId: () => 'line', now: () => 20, style },
      meta: { source: 'touch', transactionKey: 'tap-placement' },
    }));

    expect(state.draft).toMatchObject({ tool: 'trendLine', anchors: [anchorA] });
    expect(history.undoStack).toHaveLength(0);

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorB },
      options: { createId: () => 'line', now: () => 21, style },
      meta: { source: 'touch', transactionKey: 'tap-placement' },
    }));

    expect(state.draft).toBeNull();
    expect(state.selection).toEqual({ drawingId: 'line' });
    expect(state.drawings[0]).toMatchObject({
      id: 'line',
      kind: 'trendLine',
      points: [anchorA, anchorB],
    });
    expect(history.undoStack).toHaveLength(1);

    const undo = undoUserDrawingCommand(state, history);
    expect(undo.state).toMatchObject({
      drawings: [],
      draft: null,
      selection: null,
    });

    const redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings[0]).toMatchObject({
      id: 'line',
      kind: 'trendLine',
      points: [anchorA, anchorB],
    });
  });

  it('records mobile style, visibility, lock, and z-order commands through shared history', () => {
    let state = duplicateUserDrawing(createMobileStateWithTrendLine(), {
      createId: () => 'copy',
      now: () => 30,
    });
    state = { ...state, selection: { drawingId: 'line' } };
    let history = createUserDrawingCommandHistory();

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'updateStyle',
      style: { lineColor: '#00ff88' },
      options: { drawingId: 'line', now: () => 31 },
      meta: { source: 'toolbar' },
    }));
    expect(state.drawings[0]?.style.lineColor).toBe('#00ff88');
    let undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings[0]?.style.lineColor).toBe('#fff');
    let redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings[0]?.style.lineColor).toBe('#00ff88');
    state = redo.state;
    history = redo.history;

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'setVisibility',
      visible: false,
      options: { drawingId: 'line', now: () => 32 },
      meta: { source: 'objectTree' },
    }));
    expect(state.drawings[0]?.visible).toBe(false);
    undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings[0]?.visible).toBe(true);
    redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings[0]?.visible).toBe(false);
    state = undo.state;
    history = undo.history;

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'setLocked',
      locked: true,
      options: { drawingId: 'line', now: () => 33 },
      meta: { source: 'toolbar' },
    }));
    expect(state.drawings[0]?.locked).toBe(true);
    undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings[0]?.locked).toBe(false);
    redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings[0]?.locked).toBe(true);
    state = redo.state;
    history = redo.history;

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'reorder',
      action: 'sendToBack',
      options: { drawingId: 'copy' },
      meta: { source: 'contextMenu' },
    }));
    expect(state.drawings.map((drawing) => drawing.id)).toEqual(['copy', 'line']);
    undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings.map((drawing) => drawing.id)).toEqual(['line', 'copy']);
    redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings.map((drawing) => drawing.id)).toEqual(['copy', 'line']);
  });

  it('defines mobile command failure returns for stale IDs and locked drawings', () => {
    const state = {
      ...createMobileStateWithTrendLine(),
      selection: { drawingId: 'line' },
      drawings: createMobileStateWithTrendLine().drawings.map((drawing) => ({ ...drawing, locked: true })),
    };
    const history = createUserDrawingCommandHistory();

    expect(
      dispatchMobileUserDrawingHistoryCommand(state, history, {
        type: 'delete',
        options: { drawingId: 'missing' },
        meta: { source: 'api' },
      }).changed,
    ).toBe(false);
    expect(
      dispatchMobileUserDrawingHistoryCommand(state, history, {
        type: 'duplicate',
        options: { drawingId: 'missing', createId: () => 'copy' },
        meta: { source: 'api' },
      }).changed,
    ).toBe(false);
    expect(
      dispatchMobileUserDrawingHistoryCommand(state, history, {
        type: 'updateStyle',
        style: { lineColor: '#ffffff' },
        options: { drawingId: 'line' },
        meta: { source: 'api' },
      }).changed,
    ).toBe(false);

    const forced = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'updateStyle',
      style: { lineColor: '#ffffff' },
      options: { drawingId: 'line', includeLocked: true },
      meta: { source: 'api' },
    });
    expect(forced.changed).toBe(true);
    expect(forced.state.drawings[0]?.style.lineColor).toBe('#ffffff');
  });

  it('emits mobile drawing command events for changed history commands', () => {
    const state = createMobileStateWithTrendLine();
    const onEvent = vi.fn();
    const result = dispatchMobileUserDrawingHistoryCommandWithEvent(
      state,
      createUserDrawingCommandHistory(),
      {
        type: 'duplicate',
        options: { createId: () => 'copy', now: () => 44 },
        meta: { source: 'api' },
      },
      onEvent,
    );

    expect(result.changed).toBe(true);
    expect(onEvent).toHaveBeenCalledTimes(1);
    const event = onEvent.mock.calls[0]?.[0];
    expect(event).toMatchObject({
      command: { type: 'duplicate' },
      previousState: state,
      state: result.state,
      source: 'api',
    });
    expect(event?.affectedIds).toContain('copy');

    const unchanged = dispatchMobileUserDrawingHistoryCommandWithEvent(
      result.state,
      result.history,
      { type: 'delete', options: { drawingId: 'missing' }, meta: { source: 'api' } },
      onEvent,
    );

    expect(unchanged.changed).toBe(false);
    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it('routes mobile keyboard actions through shared history state', () => {
    const state = createMobileStateWithTrendLine();
    let history = createUserDrawingCommandHistory();
    const keyboardOptions = { createId: () => 'copy' };
    const deleted = dispatchMobileUserDrawingKeyboardAction(state, history, { key: 'Delete' }, keyboardOptions);

    expect(deleted.action?.type).toBe('deleteSelected');
    expect(deleted.changed).toBe(true);
    expect(deleted.state.drawings).toEqual([]);
    expect(deleted.history.undoStack).toHaveLength(1);

    history = deleted.history;
    const undo = dispatchMobileUserDrawingKeyboardAction(deleted.state, history, { key: 'z', metaKey: true }, keyboardOptions);

    expect(undo.action?.type).toBe('undo');
    expect(undo.changed).toBe(true);
    expect(undo.state.drawings.map((drawing) => drawing.id)).toEqual(['line']);
    expect(undo.history.redoStack).toHaveLength(1);

    const redo = dispatchMobileUserDrawingKeyboardAction(
      undo.state,
      undo.history,
      { key: 'Z', metaKey: true, shiftKey: true },
      keyboardOptions,
    );

    expect(redo.action?.type).toBe('redo');
    expect(redo.changed).toBe(true);
    expect(redo.state.drawings).toEqual([]);
  });

  it('ignores mobile keyboard actions when chart does not own keyboard focus', () => {
    const state = createMobileStateWithTrendLine();
    const history = createUserDrawingCommandHistory();

    for (const focusOwner of ['textInput', 'appControl'] as const) {
      const result = dispatchMobileUserDrawingKeyboardAction(
        state,
        history,
        { key: 'Delete', focusOwner },
        { createId: () => 'copy' },
      );

      expect(result.action).toBeNull();
      expect(result.changed).toBe(false);
      expect(result.state).toBe(state);
      expect(result.history).toBe(history);
      expect(result.command).toBeUndefined();
    }
  });

  it('routes mobile escape keyboard action to draft cancellation without recording undo history', () => {
    const state = handleUserDrawingInput(
      setUserDrawingTool(createUserDrawingState(), 'rectangle'),
      { paneId: 'main', anchor: anchorA },
      { createId: () => 'rect', now: () => 41, style },
    );
    const result = dispatchMobileUserDrawingKeyboardAction(
      state,
      createUserDrawingCommandHistory(),
      { key: 'Escape' },
      { createId: () => 'copy' },
    );

    expect(result.action?.type).toBe('cancelDraft');
    expect(result.changed).toBe(true);
    expect(result.state.draft).toBeNull();
    expect(result.history.undoStack).toHaveLength(0);
  });

  it('routes mobile escape keyboard action to selected action dismissal without recording undo history', () => {
    const state = createMobileStateWithTrendLine();
    const anchor = {
      anchor: { x: 100, y: 200 },
      bounds: { x: 80, y: 180, width: 40, height: 40 },
      drawingIds: ['line'],
      paneIds: ['main'],
      primaryPaneId: 'main',
    };
    const result = dispatchMobileUserDrawingKeyboardAction(
      state,
      createUserDrawingCommandHistory(),
      { key: 'Escape' },
      { createId: () => 'copy' },
    );

    expect(result.action?.type).toBe('clearSelection');
    expect(result.changed).toBe(true);
    expect(result.state.selection).toBeNull();
    expect(result.state.drawings.map((drawing) => drawing.id)).toEqual(['line']);
    expect(result.history.undoStack).toHaveLength(0);
    expect(shouldRenderUserDrawingSelectedActionSurface(result.state, anchor)).toBe(false);
  });

  it('routes mobile selection misses through shared selected action dismissal state', () => {
    const state = createMobileStateWithTrendLine();
    const selected = dispatchMobileUserDrawingHandleCommand(state, {
      type: 'selectAtPoint',
      point: { x: 100, y: 200 },
      spacesByPaneId,
      meta: { source: 'pointer' },
    });
    const anchor = {
      anchor: { x: 100, y: 200 },
      bounds: { x: 80, y: 180, width: 40, height: 40 },
      drawingIds: ['line'],
      paneIds: ['main'],
      primaryPaneId: 'main',
    };

    expect(selected.hit).toBe(true);
    expect(selected.state.selection).toMatchObject({ drawingId: 'line' });
    expect(shouldRenderUserDrawingSelectedActionSurface(selected.state, anchor)).toBe(true);

    const missed = dispatchMobileUserDrawingHandleCommand(selected.state, {
      type: 'selectAtPoint',
      point: { x: 20, y: 20 },
      spacesByPaneId,
      meta: { source: 'pointer' },
    });

    expect(missed.hit).toBe(false);
    expect(missed.changed).toBe(true);
    expect(missed.state.selection).toBeNull();
    expect(shouldRenderUserDrawingSelectedActionSurface(missed.state, anchor)).toBe(false);
  });

  it('routes mobile copy and paste keyboard actions through adapter clipboard state', () => {
    const state = createMobileStateWithTrendLine();
    let clipboard = null;
    const copied = dispatchMobileUserDrawingKeyboardAction(
      state,
      createUserDrawingCommandHistory(),
      { key: 'c', metaKey: true },
      {
        createId: () => 'copy',
        setClipboard: (nextClipboard) => {
          clipboard = nextClipboard;
        },
      },
    );

    expect(copied.action?.type).toBe('copySelected');
    expect(copied.changed).toBe(true);
    expect(copied.state).toBe(state);
    expect(clipboard).toMatchObject({ drawings: [{ id: 'line' }] });

    const pasted = dispatchMobileUserDrawingKeyboardAction(
      state,
      copied.history,
      { key: 'v', metaKey: true },
      {
        clipboard,
        createId: () => 'copy',
      },
    );

    expect(pasted.action?.type).toBe('paste');
    expect(pasted.changed).toBe(true);
    expect(pasted.state.drawings.map((drawing) => drawing.id)).toEqual(['line', 'copy']);
    expect(pasted.state.selection).toEqual({ drawingId: 'copy' });
    expect(pasted.history.undoStack).toHaveLength(1);
  });

  it('routes mobile duplicate keyboard action through shared drawing history', () => {
    const state = createMobileStateWithTrendLine();
    const result = dispatchMobileUserDrawingKeyboardAction(
      state,
      createUserDrawingCommandHistory(),
      { key: 'd', metaKey: true },
      { createId: () => 'copy' },
    );

    expect(result.action?.type).toBe('duplicateSelected');
    expect(result.command).toMatchObject({ type: 'duplicate', meta: { source: 'keyboard' } });
    expect(result.changed).toBe(true);
    expect(result.state.drawings.map((drawing) => drawing.id)).toEqual(['line', 'copy']);
    expect(result.state.selection).toEqual({ drawingId: 'copy' });
    expect(result.history.undoStack).toHaveLength(1);
    expect(result.command ? createUserDrawingCommandEvent(state, { ...result, command: result.command })?.source : null).toBe(
      'keyboard',
    );
  });

  it('routes mobile object-tree actions through shared history dispatch', () => {
    let state = duplicateUserDrawing(createMobileStateWithTrendLine(), {
      createId: () => 'copy',
      now: () => 43,
    });
    state = { ...state, selection: { drawingId: 'line', drawingIds: ['line', 'copy'] } };
    let history = createUserDrawingCommandHistory();

    const lockSelectedAction = resolveUserDrawingObjectTreeSelectionDispatchAction(resolveUserDrawingObjectTreeModel(state), 'lock')!;
    expect(lockSelectedAction).toEqual({ type: 'lock', drawingIds: ['line', 'copy'], includeLocked: undefined });
    for (const command of resolveUserDrawingObjectTreeDispatchActionCommands(state, lockSelectedAction, {
      createId: () => 'unused',
      now: () => 44,
    })) {
      ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, command));
    }
    state = { ...state, selection: { drawingId: 'line', drawingIds: ['line', 'copy'] } };
    const unlockSelectedAction = resolveUserDrawingObjectTreeSelectionDispatchAction(resolveUserDrawingObjectTreeModel(state), 'unlock')!;
    expect(unlockSelectedAction).toEqual({ type: 'unlock', drawingIds: ['line', 'copy'], includeLocked: true });
    for (const command of resolveUserDrawingObjectTreeDispatchActionCommands(state, unlockSelectedAction, {
      createId: () => 'unused',
      now: () => 45,
    })) {
      ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, command));
    }

    expect(state.drawings.map((drawing) => [drawing.id, drawing.locked])).toEqual([
      ['line', false],
      ['copy', false],
    ]);
    expect(history.undoStack).toHaveLength(2);

    const copyRow = resolveUserDrawingObjectTreeModel(state).rows.find((row) => row.drawingId === 'copy')!;
    const hideCopyAction = resolveUserDrawingObjectTreeRowDispatchAction(copyRow, 'hide')!;
    expect(hideCopyAction).toEqual({ type: 'hide', drawingIds: ['copy'], includeLocked: undefined });
    for (const command of resolveUserDrawingObjectTreeDispatchActionCommands(state, hideCopyAction, {
      createId: () => 'unused',
      now: () => 46,
    })) {
      ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, command));
    }

    expect(state.selection).toEqual({ drawingId: 'line' });
    expect(state.drawings.map((drawing) => [drawing.id, drawing.visible])).toEqual([
      ['line', true],
      ['copy', false],
    ]);
    expect(history.undoStack).toHaveLength(3);

    const renameCopyAction = resolveUserDrawingObjectTreeDrawingDispatchAction(
      resolveUserDrawingObjectTreeModel(state),
      'copy',
      'rename',
      { name: 'Range copy' },
    )!;
    expect(renameCopyAction).toEqual({ type: 'rename', drawingId: 'copy', name: 'Range copy', includeLocked: undefined });
    for (const command of resolveUserDrawingObjectTreeDispatchActionCommands(state, renameCopyAction, {
      createId: () => 'unused',
      now: () => 47,
    })) {
      ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, command));
    }

    expect(state.drawings.find((drawing) => drawing.id === 'copy')).toMatchObject({ name: 'Range copy' });
    expect(history.undoStack).toHaveLength(4);

    for (const command of resolveUserDrawingObjectTreeDispatchActionCommands(
      state,
      { type: 'lock', drawingIds: ['copy'] },
      { createId: () => 'unused', now: () => 48 },
    )) {
      ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, command));
    }
    const lockedCopyRow = resolveUserDrawingObjectTreeModel(state).rows.find((row) => row.drawingId === 'copy')!;
    const unlockCopyAction = resolveUserDrawingObjectTreeRowDispatchAction(lockedCopyRow, 'unlock')!;
    expect(unlockCopyAction).toEqual({ type: 'unlock', drawingIds: ['copy'], includeLocked: true });
    for (const command of resolveUserDrawingObjectTreeDispatchActionCommands(state, unlockCopyAction, {
      createId: () => 'unused',
      now: () => 49,
    })) {
      ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, command));
    }

    expect(state.drawings.find((drawing) => drawing.id === 'copy')).toMatchObject({ locked: false });
    expect(history.undoStack).toHaveLength(6);

    for (const command of resolveUserDrawingObjectTreeDispatchActionCommands(
      state,
      { type: 'duplicate', drawingIds: ['line'] },
      { createId: () => 'object-tree-copy', now: () => 50 },
    )) {
      ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, command));
    }

    expect(state.drawings.map((drawing) => drawing.id)).toEqual(['line', 'object-tree-copy', 'copy']);
    expect(state.selection).toEqual({ drawingId: 'object-tree-copy' });
    expect(history.undoStack).toHaveLength(7);

    for (const command of resolveUserDrawingObjectTreeDispatchActionCommands(
      state,
      { type: 'sendToBack', drawingIds: ['object-tree-copy'] },
      { createId: () => 'unused', now: () => 51 },
    )) {
      ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, command));
    }

    expect(state.drawings.map((drawing) => drawing.id)).toEqual(['object-tree-copy', 'line', 'copy']);
    expect(state.selection).toEqual({ drawingId: 'object-tree-copy' });
    expect(history.undoStack).toHaveLength(8);

    const undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings.map((drawing) => drawing.id)).toEqual(['line', 'object-tree-copy', 'copy']);
  });

  it('routes mobile select-all keyboard action without recording undo history', () => {
    const state = duplicateUserDrawing(createMobileStateWithTrendLine(), {
      createId: () => 'copy',
      now: () => 43,
    });
    const result = dispatchMobileUserDrawingKeyboardAction(
      { ...state, selection: null },
      createUserDrawingCommandHistory(),
      { key: 'a', metaKey: true },
      { createId: () => 'unused' },
    );

    expect(result.action?.type).toBe('selectAll');
    expect(result.changed).toBe(true);
    expect(result.state.selection).toEqual({ drawingId: 'line', drawingIds: ['line', 'copy'] });
    expect(result.history.undoStack).toHaveLength(0);
  });

  it('routes mobile keyboard nudge through shared drawing history', () => {
    const state = createMobileStateWithTrendLine();
    const result = dispatchMobileUserDrawingKeyboardAction(
      state,
      createUserDrawingCommandHistory(),
      { key: 'ArrowRight' },
      {
        createId: () => 'copy',
        spacesByPaneId,
      },
    );

    expect(result.action?.type).toBe('nudge');
    expect(result.changed).toBe(true);
    expect(result.history.undoStack).toHaveLength(1);
    const movedDrawing = result.state.drawings[0];
    expect(movedDrawing?.kind).toBe('trendLine');
    if (movedDrawing?.kind !== 'trendLine') throw new Error('expected trend line drawing');
    expect(movedDrawing.points[0]?.time).toBe(1010);
    expect(movedDrawing.points[1]?.time).toBe(2010);
  });

  it('records consecutive mobile two-anchor placement drags as independent undo entries', () => {
    let state = setUserDrawingTool(createUserDrawingState(), 'rectangle');
    let history = createUserDrawingCommandHistory();
    const drag = (id: string, firstAnchor = anchorA, secondAnchor = anchorB) => {
      const started = dispatchMobileUserDrawingHistoryCommand(state, history, {
        type: 'beginPlacementDrag',
        point: { paneId: 'main', anchor: firstAnchor },
        meta: { source: 'touch' },
      });

      expect(started.changed).toBe(true);
      expect(started.history.undoStack).toHaveLength(history.undoStack.length);
      expect(started.state.draft?.anchors).toEqual([firstAnchor]);

      const committed = dispatchMobileUserDrawingHistoryCommand(started.state, started.history, {
        type: 'commitPlacementDrag',
        point: { paneId: 'main', anchor: secondAnchor },
        options: { createId: () => id, now: () => 42, style },
        meta: { source: 'touch' },
      });

      expect(committed.changed).toBe(true);

      state = committed.state;
      history = committed.history;
    };

    drag('rect-1');
    drag('rect-2', { time: 3_000, price: 120 }, { time: 4_000, price: 130 });

    expect(history.undoStack).toHaveLength(2);
    expect(state.drawings).toEqual([
      expect.objectContaining({
        id: 'rect-1',
        kind: 'rectangle',
        points: [anchorA, anchorB],
      }),
      expect.objectContaining({
        id: 'rect-2',
        kind: 'rectangle',
        points: [
          { time: 3_000, price: 120 },
          { time: 4_000, price: 130 },
        ],
      }),
    ]);

    const undo = undoUserDrawingCommand(state, history);
    expect(undo.changed).toBe(true);
    expect(undo.state.drawings).toEqual([expect.objectContaining({ id: 'rect-1' })]);
  });

  it('records expanded mobile two-anchor placement tools through the same drag lifecycle', () => {
    for (const tool of expandedDragPlacementTools) {
      const state = setUserDrawingTool(createUserDrawingState(), tool);
      const started = dispatchMobileUserDrawingHistoryCommand(state, createUserDrawingCommandHistory(), {
        type: 'beginPlacementDrag',
        point: { paneId: 'main', anchor: anchorA },
        meta: { source: 'touch', transactionKey: `${tool}-placement` },
      });
      const committed = dispatchMobileUserDrawingHistoryCommand(started.state, started.history, {
        type: 'commitPlacementDrag',
        point: { paneId: 'main', anchor: anchorB },
        options: { createId: () => `${tool}-drawing`, now: () => 43, style },
        meta: { source: 'touch' },
      });

      expect(started.changed, tool).toBe(true);
      expect(committed.changed, tool).toBe(true);
      expect(committed.history.undoStack, tool).toHaveLength(1);
      expect(committed.state.drawings[0], tool).toMatchObject({
        id: `${tool}-drawing`,
        kind: tool,
        points: [anchorA, anchorB],
      });
    }
  });

  it('records mobile drag-seeded multi-anchor placement after the final tap', () => {
    const dragSeedTools: UserDrawingTool[] = [
      'triangle',
      'parallelChannel',
      'regressionTrend',
      'flatTopBottom',
      'pitchfork',
      'schiffPitchfork',
      'modifiedSchiffPitchfork',
      'insidePitchfork',
      'pitchfan',
      'trendBasedFibExtension',
      'fibWedge',
      'fibChannel',
      'trendBasedFibTime',
      'projection',
      'sector',
      'longPosition',
      'shortPosition',
      'barsPattern',
      'elliottCorrectiveWave',
      'elliottDoubleComboWave',
    ];

    for (const tool of dragSeedTools) {
      const bars = [
        { time: 1_000, open: 100, high: 104, low: 99, close: 102 },
        { time: 2_000, open: 102, high: 105, low: 101, close: 101 },
      ];
      const pointOptions = tool === 'barsPattern' ? { bars } : {};
      const state = setUserDrawingTool(createUserDrawingState(), tool);
      const history = createUserDrawingCommandHistory();
      const started = dispatchMobileUserDrawingHistoryCommand(state, history, {
        type: 'beginPlacementDrag',
        point: { paneId: 'main', anchor: anchorA, ...pointOptions },
        meta: { source: 'touch' },
      });
      const seeded = dispatchMobileUserDrawingHistoryCommand(started.state, started.history, {
        type: 'commitPlacementDrag',
        point: { paneId: 'main', anchor: anchorB, ...pointOptions },
        options: { createId: () => `${tool}-drawing`, now: () => 43, style },
        meta: { source: 'touch' },
      });
      const committed = dispatchMobileUserDrawingHistoryCommand(seeded.state, seeded.history, {
        type: 'handleInput',
        point: { paneId: 'main', anchor: anchorC, ...pointOptions },
        options: { createId: () => `${tool}-drawing`, now: () => 44, style },
        meta: { source: 'touch' },
      });

      expect(started.changed, tool).toBe(true);
      expect(seeded.changed, tool).toBe(true);
      expect(seeded.history.undoStack, tool).toHaveLength(0);
      expect(seeded.state.drawings, tool).toEqual([]);
      expect(seeded.state.draft, tool).toMatchObject({
        tool,
        anchors: [anchorA, anchorB],
      });
      expect(committed.changed, tool).toBe(true);
      expect(committed.history.undoStack, tool).toHaveLength(1);
      expect(committed.state.draft, tool).toBeNull();
      expect(committed.state.drawings[0], tool).toMatchObject({
        id: `${tool}-drawing`,
        kind: tool,
        points: [anchorA, anchorB, anchorC],
        ...(tool === 'barsPattern' ? { bars } : {}),
      });
    }
  });

  it('records mobile drag-seeded four-anchor placement after the final tap', () => {
    const dragSeedTools: UserDrawingTool[] = ['doubleCurve', 'disjointChannel', 'trianglePattern', 'abcdPattern'];

    for (const tool of dragSeedTools) {
      const state = setUserDrawingTool(createUserDrawingState(), tool);
      const history = createUserDrawingCommandHistory();
      const started = dispatchMobileUserDrawingHistoryCommand(state, history, {
        type: 'beginPlacementDrag',
        point: { paneId: 'main', anchor: anchorA },
        meta: { source: 'touch' },
      });
      const seeded = dispatchMobileUserDrawingHistoryCommand(started.state, started.history, {
        type: 'commitPlacementDrag',
        point: { paneId: 'main', anchor: anchorB },
        options: { createId: () => `${tool}-drawing`, now: () => 43, style },
        meta: { source: 'touch' },
      });
      const waitingForFourth = dispatchMobileUserDrawingHistoryCommand(seeded.state, seeded.history, {
        type: 'handleInput',
        point: { paneId: 'main', anchor: anchorC },
        options: { createId: () => `${tool}-drawing`, now: () => 44, style },
        meta: { source: 'touch' },
      });
      const committed = dispatchMobileUserDrawingHistoryCommand(waitingForFourth.state, waitingForFourth.history, {
        type: 'handleInput',
        point: { paneId: 'main', anchor: anchorD },
        options: { createId: () => `${tool}-drawing`, now: () => 45, style },
        meta: { source: 'touch' },
      });

      expect(started.changed, tool).toBe(true);
      expect(seeded.changed, tool).toBe(true);
      expect(seeded.history.undoStack, tool).toHaveLength(0);
      expect(waitingForFourth.changed, tool).toBe(true);
      expect(waitingForFourth.history.undoStack, tool).toHaveLength(0);
      expect(waitingForFourth.state.drawings, tool).toEqual([]);
      expect(waitingForFourth.state.draft, tool).toMatchObject({
        tool,
        anchors: [anchorA, anchorB, anchorC],
      });
      expect(committed.changed, tool).toBe(true);
      expect(committed.history.undoStack, tool).toHaveLength(1);
      expect(committed.state.draft, tool).toBeNull();
      expect(committed.state.drawings[0], tool).toMatchObject({
        id: `${tool}-drawing`,
        kind: tool,
        points: [anchorA, anchorB, anchorC, anchorD],
      });
    }
  });

  it('records mobile drag-seeded five-anchor pattern placement after the final tap', () => {
    const dragSeedTools: UserDrawingTool[] = [
      'xabcdPattern',
      'cypherPattern',
      'threeDrivesPattern',
      'headShouldersPattern',
      'elliottImpulseWave',
      'elliottTripleComboWave',
      'elliottTriangleWave',
    ];

    for (const tool of dragSeedTools) {
      const state = setUserDrawingTool(createUserDrawingState(), tool);
      const history = createUserDrawingCommandHistory();
      const started = dispatchMobileUserDrawingHistoryCommand(state, history, {
        type: 'beginPlacementDrag',
        point: { paneId: 'main', anchor: anchorA },
        meta: { source: 'touch' },
      });
      const seeded = dispatchMobileUserDrawingHistoryCommand(started.state, started.history, {
        type: 'commitPlacementDrag',
        point: { paneId: 'main', anchor: anchorB },
        options: { createId: () => `${tool}-drawing`, now: () => 43, style },
        meta: { source: 'touch' },
      });
      const waitingForFourth = dispatchMobileUserDrawingHistoryCommand(seeded.state, seeded.history, {
        type: 'handleInput',
        point: { paneId: 'main', anchor: anchorC },
        options: { createId: () => `${tool}-drawing`, now: () => 44, style },
        meta: { source: 'touch' },
      });
      const waitingForFifth = dispatchMobileUserDrawingHistoryCommand(waitingForFourth.state, waitingForFourth.history, {
        type: 'handleInput',
        point: { paneId: 'main', anchor: anchorD },
        options: { createId: () => `${tool}-drawing`, now: () => 45, style },
        meta: { source: 'touch' },
      });
      const committed = dispatchMobileUserDrawingHistoryCommand(waitingForFifth.state, waitingForFifth.history, {
        type: 'handleInput',
        point: { paneId: 'main', anchor: anchorE },
        options: { createId: () => `${tool}-drawing`, now: () => 46, style },
        meta: { source: 'touch' },
      });

      expect(started.changed, tool).toBe(true);
      expect(seeded.changed, tool).toBe(true);
      expect(seeded.history.undoStack, tool).toHaveLength(0);
      expect(waitingForFourth.changed, tool).toBe(true);
      expect(waitingForFourth.history.undoStack, tool).toHaveLength(0);
      expect(waitingForFifth.changed, tool).toBe(true);
      expect(waitingForFifth.history.undoStack, tool).toHaveLength(0);
      expect(waitingForFifth.state.drawings, tool).toEqual([]);
      expect(waitingForFifth.state.draft, tool).toMatchObject({
        tool,
        anchors: [anchorA, anchorB, anchorC, anchorD],
      });
      expect(committed.changed, tool).toBe(true);
      expect(committed.history.undoStack, tool).toHaveLength(1);
      expect(committed.state.draft, tool).toBeNull();
      expect(committed.state.drawings[0], tool).toMatchObject({
        id: `${tool}-drawing`,
        kind: tool,
        points: [anchorA, anchorB, anchorC, anchorD, anchorE],
      });
    }
  });

  it('records mobile path-family drags as one undoable drawing creation', () => {
    const pathFamilyTools: UserDrawingTool[] = ['brush', 'highlighter'];

    for (const tool of pathFamilyTools) {
      let state = setUserDrawingTool(createUserDrawingState(), tool);
      let history = createUserDrawingCommandHistory();
      const drag = (id: string, firstAnchor = anchorA, secondAnchor = anchorB) => {
        const started = dispatchMobileUserDrawingHistoryCommand(state, history, {
          type: 'beginPathDrag',
          point: { paneId: 'main', anchor: firstAnchor },
          meta: { source: 'touch', transactionKey: `${tool}-path-drag` },
        });
        const moved = dispatchMobileUserDrawingHistoryCommand(started.state, started.history, {
          type: 'appendPathDragPoint',
          point: { paneId: 'main', anchor: secondAnchor },
          meta: { source: 'touch', transactionKey: `${tool}-path-drag` },
        });
        const committed = dispatchMobileUserDrawingHistoryCommand(moved.state, moved.history, {
          type: 'commitPathDrag',
          options: { createId: () => id, now: () => 44, style },
          meta: { source: 'touch' },
        });

        expect(started.changed, tool).toBe(true);
        expect(started.history.undoStack, tool).toHaveLength(history.undoStack.length);
        expect(moved.changed, tool).toBe(true);
        expect(moved.history.undoStack, tool).toHaveLength(history.undoStack.length);
        expect(committed.changed, tool).toBe(true);

        state = committed.state;
        history = committed.history;
      };

      drag(`${tool}-drawing-1`);
      drag(`${tool}-drawing-2`, { time: 3_000, price: 120 }, { time: 4_000, price: 130 });

      expect(history.undoStack, tool).toHaveLength(2);
      expect(state.drawings, tool).toEqual([
        expect.objectContaining({
          id: `${tool}-drawing-1`,
          kind: tool,
          points: [
            anchorA,
            { time: 1_250, price: 102.5 },
            { time: 1_750, price: 107.5 },
            anchorB,
          ],
        }),
        expect.objectContaining({
          id: `${tool}-drawing-2`,
          kind: tool,
          points: [
            { time: 3_000, price: 120 },
            { time: 3_250, price: 122.5 },
            { time: 3_750, price: 127.5 },
            { time: 4_000, price: 130 },
          ],
        }),
      ]);

      const pressureState = setUserDrawingTool(createUserDrawingState(), tool);
      const pressureHistory = createUserDrawingCommandHistory();
      const pressureStarted = dispatchMobileUserDrawingHistoryCommand(pressureState, pressureHistory, {
        type: 'beginPathDrag',
        point: { paneId: 'main', anchor: { ...anchorA, pressure: 0.25 } },
        meta: { source: 'touch', transactionKey: `${tool}-pressure-path-drag` },
      });
      const pressureMoved = dispatchMobileUserDrawingHistoryCommand(pressureStarted.state, pressureStarted.history, {
        type: 'appendPathDragPoint',
        point: { paneId: 'main', anchor: { ...anchorB, pressure: 0.75 } },
        meta: { source: 'touch', transactionKey: `${tool}-pressure-path-drag` },
      });
      const pressureCommitted = dispatchMobileUserDrawingHistoryCommand(pressureMoved.state, pressureMoved.history, {
        type: 'commitPathDrag',
        options: { createId: () => `${tool}-pressure`, now: () => 45, style },
        meta: { source: 'touch' },
      });
      expect(pressureCommitted.state.drawings[0]).toMatchObject({
        id: `${tool}-pressure`,
        kind: tool,
        points: [
          { ...anchorA, pressure: 0.25 },
          { time: 1_250, price: 102.5, pressure: 0.375 },
          { time: 1_750, price: 107.5, pressure: 0.625 },
          { ...anchorB, pressure: 0.75 },
        ],
      });

      const undo = undoUserDrawingCommand(state, history);
      expect(undo.changed, tool).toBe(true);
      expect(undo.state.drawings, tool).toEqual([expect.objectContaining({ id: `${tool}-drawing-1` })]);
    }
  });

  it('does not record a mobile path drag that is explicitly cancelled after movement', () => {
    const state = setUserDrawingTool(createUserDrawingState(), 'brush');
    const history = createUserDrawingCommandHistory();
    const started = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginPathDrag',
      point: { paneId: 'main', anchor: anchorA },
      meta: { source: 'touch', transactionKey: 'path-drag' },
    });
    const moved = dispatchMobileUserDrawingHistoryCommand(started.state, started.history, {
      type: 'appendPathDragPoint',
      point: { paneId: 'main', anchor: anchorB },
      meta: { source: 'touch', transactionKey: 'path-drag' },
    });
    const cancelled = dispatchMobileUserDrawingHistoryCommand(moved.state, moved.history, {
      type: 'cancelDraft',
      meta: { source: 'touch', transactionKey: 'path-drag' },
    });

    expect(started.changed).toBe(true);
    expect(started.history.undoStack).toHaveLength(0);
    expect(moved.changed).toBe(true);
    expect(moved.history.undoStack).toHaveLength(0);
    expect(moved.state.draft).toMatchObject({ tool: 'brush', anchors: [anchorA, anchorB] });
    expect(cancelled.changed).toBe(true);
    expect(cancelled.history.undoStack).toHaveLength(0);
    expect(cancelled.state.drawings).toEqual([]);
    expect(cancelled.state.draft).toBeNull();
  });

  it('does not record a mobile placement drag that ends at the start anchor', () => {
    const state = setUserDrawingTool(createUserDrawingState(), 'rectangle');
    const history = createUserDrawingCommandHistory();
    const started = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginPlacementDrag',
      point: { paneId: 'main', anchor: anchorA },
      meta: { source: 'touch' },
    });
    const cancelled = dispatchMobileUserDrawingHistoryCommand(started.state, started.history, {
      type: 'commitPlacementDrag',
      point: { paneId: 'main', anchor: anchorA },
      options: { createId: () => 'rect', now: () => 42, style },
      meta: { source: 'touch' },
    });

    expect(cancelled.changed).toBe(true);
    expect(cancelled.history.undoStack).toHaveLength(0);
    expect(cancelled.state.drawings).toEqual([]);
    expect(cancelled.state.draft).toBeNull();
  });

  it('keeps mobile placement drafts and history unchanged on cross-pane drag commits', () => {
    const state = setUserDrawingTool(createUserDrawingState(), 'rectangle');
    const history = createUserDrawingCommandHistory();
    const started = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginPlacementDrag',
      point: { paneId: 'main', anchor: anchorA },
      meta: { source: 'touch', transactionKey: 'placement-drag' },
    });
    const committed = dispatchMobileUserDrawingHistoryCommand(started.state, started.history, {
      type: 'commitPlacementDrag',
      point: { paneId: 'indicator', anchor: anchorB },
      options: { createId: () => 'rect', now: () => 42, style },
      meta: { source: 'touch', transactionKey: 'placement-drag' },
    });

    expect(started.changed).toBe(true);
    expect(started.history.undoStack).toHaveLength(0);
    expect(started.state.draft).toMatchObject({ tool: 'rectangle', paneId: 'main', anchors: [anchorA] });
    expect(committed.changed).toBe(false);
    expect(committed.history.undoStack).toHaveLength(0);
    expect(committed.state).toBe(started.state);
    expect(committed.state.drawings).toEqual([]);
    expect(committed.state.draft).toMatchObject({ tool: 'rectangle', paneId: 'main', anchors: [anchorA] });
  });

  it('does not record a mobile placement drag that is explicitly cancelled', () => {
    const state = setUserDrawingTool(createUserDrawingState(), 'rectangle');
    const history = createUserDrawingCommandHistory();
    const started = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginPlacementDrag',
      point: { paneId: 'main', anchor: anchorA },
      meta: { source: 'touch' },
    });
    const cancelled = dispatchMobileUserDrawingHistoryCommand(started.state, started.history, {
      type: 'cancelDraft',
      meta: { source: 'touch' },
    });

    expect(started.changed).toBe(true);
    expect(started.history.undoStack).toHaveLength(0);
    expect(cancelled.changed).toBe(true);
    expect(cancelled.history.undoStack).toHaveLength(0);
    expect(cancelled.state.drawings).toEqual([]);
    expect(cancelled.state.draft).toBeNull();
  });

  it('records mobile edit-drag moves as one coalesced undo entry', () => {
    const state = createMobileStateWithTrendLine();
    let history = createUserDrawingCommandHistory();
    const editStart = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginEditDragAtPoint',
      point: { x: 100, y: 200 },
      spacesByPaneId,
      meta: { source: 'touch', transactionKey: 'edit-drag' },
    });

    expect(editStart.history.undoStack).toHaveLength(0);
    expect(editStart.editDrag).not.toBeNull();
    if (!editStart.editDrag) throw new Error('expected edit drag');

    let moved = dispatchMobileUserDrawingHistoryCommand(editStart.state, editStart.history, {
      type: 'applyEditDrag',
      drag: editStart.editDrag,
      point: { x: 110, y: 190 },
      meta: { source: 'touch', transactionKey: 'edit-drag' },
    });
    history = moved.history;
    moved = dispatchMobileUserDrawingHistoryCommand(moved.state, history, {
      type: 'applyEditDrag',
      drag: editStart.editDrag,
      point: { x: 120, y: 180 },
      meta: { source: 'touch', transactionKey: 'edit-drag' },
    });

    expect(moved.history.undoStack).toHaveLength(1);
    const undo = undoUserDrawingCommand(moved.state, moved.history);
    expect(undo.state.drawings[0]).toEqual(editStart.state.drawings[0]);
  });

  it('records mobile duplicate-drag start and moves as one coalesced undo entry', () => {
    const state = createMobileStateWithTrendLine();
    const history = createUserDrawingCommandHistory();
    const duplicateStart = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginDuplicateEditDragAtPoint',
      point: { x: 150, y: 150 },
      spacesByPaneId,
      options: { createId: () => 'copy', now: () => 45 },
      meta: { source: 'api', transactionKey: 'duplicate-drag' },
    });

    expect(duplicateStart.changed).toBe(true);
    expect(duplicateStart.history.undoStack).toHaveLength(1);
    expect(duplicateStart.editDrag?.startDrawing.id).toBe('copy');
    if (!duplicateStart.editDrag) throw new Error('expected duplicate edit drag');

    const moved = dispatchMobileUserDrawingHistoryCommand(duplicateStart.state, duplicateStart.history, {
      type: 'applyEditDrag',
      drag: duplicateStart.editDrag,
      point: { x: 170, y: 130 },
      meta: { source: 'touch', transactionKey: 'duplicate-drag' },
    });

    expect(moved.history.undoStack).toHaveLength(1);
    const undo = undoUserDrawingCommand(moved.state, moved.history);
    expect(undo.state.drawings.map((drawing) => drawing.id)).toEqual(['line']);
  });

  it('records mobile text edit commit as one undoable transaction', () => {
    let state = handleUserDrawingInput(
      setUserDrawingTool(createUserDrawingState(), 'textLabel'),
      { paneId: 'main', anchor: anchorA },
      { createId: () => 'label', now: () => 50, style, text: 'Initial' },
    );
    let history = createUserDrawingCommandHistory();

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginTextEdit',
      drawingId: 'label',
      options: { now: () => 51 },
      meta: { source: 'api', transactionKey: 'label-edit' },
    }));
    expect(state.textEdit).toMatchObject({ drawingId: 'label', value: 'Initial' });
    expect(history.undoStack).toHaveLength(0);

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'updateTextEdit',
      value: 'Changed',
      meta: { source: 'textEditor', transactionKey: 'label-edit' },
    }));
    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'updateTextEdit',
      value: 'Changed again',
      meta: { source: 'textEditor', transactionKey: 'label-edit' },
    }));
    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'commitTextEdit',
      options: { now: () => 52 },
      meta: { source: 'textEditor', transactionKey: 'label-edit' },
    }));

    expect(state.drawings[0]).toMatchObject({ id: 'label', text: 'Changed again' });
    expect(state.textEdit).toBeNull();
    expect(history.undoStack).toHaveLength(1);

    const undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings[0]).toMatchObject({ id: 'label', text: 'Initial' });
    expect(undo.state.textEdit).toBeNull();

    const redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings[0]).toMatchObject({ id: 'label', text: 'Changed again' });
    expect(redo.state.textEdit).toBeNull();
  });

  it('does not record mobile canceled or unchanged text edits', () => {
    let state = handleUserDrawingInput(
      setUserDrawingTool(createUserDrawingState(), 'textLabel'),
      { paneId: 'main', anchor: anchorA },
      { createId: () => 'label', now: () => 60, style, text: 'Initial' },
    );
    let history = createUserDrawingCommandHistory();

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginTextEdit',
      drawingId: 'label',
      meta: { source: 'api' },
    }));
    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'cancelTextEdit',
      meta: { source: 'textEditor' },
    }));
    expect(state.textEdit).toBeNull();
    expect(history.undoStack).toHaveLength(0);
    expect(history.redoStack).toHaveLength(0);

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginTextEdit',
      drawingId: 'label',
      meta: { source: 'api' },
    }));
    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'commitTextEdit',
      meta: { source: 'textEditor' },
    }));
    expect(state.drawings[0]).toMatchObject({ id: 'label', text: 'Initial' });
    expect(state.textEdit).toBeNull();
    expect(history.undoStack).toHaveLength(0);
    expect(history.redoStack).toHaveLength(0);
  });
});
