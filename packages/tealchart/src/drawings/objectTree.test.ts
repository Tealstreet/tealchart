import { afterEach, describe, expect, it } from 'vitest';

import { reduceUserDrawingCommand } from './commands';
import { createUserDrawingCommandHistory, dispatchUserDrawingCommandWithHistory, undoUserDrawingCommand } from './history';
import { createUserDrawingState } from './input';
import {
  resolveUserDrawingObjectTreeActionCommands,
  resolveUserDrawingObjectTreeDispatchActionCommands,
  resolveUserDrawingObjectTreeModel,
  resolveUserDrawingObjectTreeRowDispatchAction,
  resolveUserDrawingObjectTreeSelectionDispatchAction,
} from './objectTree';
import { deserializeUserDrawingStateFromLayout, serializeUserDrawingStateForLayout } from './serialization';
import { clearChartStoreCache } from '../state/chartState';
import type { UserDrawing, UserDrawingStyle } from './types';

const style: UserDrawingStyle = {
  lineColor: '#fff',
  lineWidth: 1,
  lineStyle: 'solid',
};

const anchorA = { time: 1_000, price: 100 };
const anchorB = { time: 2_000, price: 110 };

function createTrendLine(overrides: Partial<Extract<UserDrawing, { kind: 'trendLine' }>> = {}): UserDrawing {
  return {
    id: 'trend',
    kind: 'trendLine',
    paneId: 'main',
    visible: true,
    locked: false,
    createdAt: 1,
    updatedAt: 1,
    style,
    points: [anchorA, anchorB],
    extend: 'none',
    ...overrides,
  };
}

function createRectangle(overrides: Partial<Extract<UserDrawing, { kind: 'rectangle' }>> = {}): UserDrawing {
  return {
    id: 'rect',
    kind: 'rectangle',
    paneId: 'main',
    visible: true,
    locked: false,
    createdAt: 1,
    updatedAt: 1,
    style,
    points: [anchorA, anchorB],
    ...overrides,
  };
}

function createHorizontalLine(overrides: Partial<Extract<UserDrawing, { kind: 'horizontalLine' }>> = {}): UserDrawing {
  return {
    id: 'hline',
    kind: 'horizontalLine',
    paneId: 'volume',
    visible: true,
    locked: false,
    createdAt: 1,
    updatedAt: 1,
    style,
    price: 105,
    ...overrides,
  };
}

describe('user drawing object tree model', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('resolves committed drawings in front-to-back order by default', () => {
    const state = createUserDrawingState({
      drawings: [createTrendLine(), createRectangle(), createHorizontalLine()],
    });

    const model = resolveUserDrawingObjectTreeModel(state);

    expect(model.drawingCount).toBe(3);
    expect(model.rows.map((row) => row.drawingId)).toEqual(['hline', 'rect', 'trend']);
    expect(model.rows.map((row) => row.zIndex)).toEqual([2, 1, 0]);
    expect(model.rows.map((row) => row.orderIndex)).toEqual([0, 1, 2]);
    expect(model.rows[0]).toMatchObject({
      id: 'hline',
      kind: 'horizontalLine',
      tool: 'horizontalLine',
      label: 'Horizontal line',
      defaultLabel: 'Horizontal line',
      customName: null,
      paneId: 'volume',
      visible: true,
      locked: false,
      selected: false,
      editable: true,
    });
    expect(model.rows[0]?.actions?.map((action) => [action.type, action.enabled])).toEqual([
      ['rename', true],
      ['duplicate', true],
      ['delete', true],
      ['hide', true],
      ['lock', true],
      ['bringForward', false],
      ['sendBackward', true],
      ['bringToFront', false],
      ['sendToBack', true],
    ]);
    expect(model.rows.map((row) => row.groupIds)).toEqual([['pane:volume'], ['pane:main'], ['pane:main']]);
    expect(model.groups).toEqual([
      {
        id: 'pane:main',
        label: 'Main chart',
        paneId: 'main',
        rowIds: ['rect', 'trend'],
        drawingIds: ['rect', 'trend'],
        orderIndex: 0,
        drawingCount: 2,
      },
      {
        id: 'pane:volume',
        label: 'Pane volume',
        paneId: 'volume',
        rowIds: ['hline'],
        drawingIds: ['hline'],
        orderIndex: 1,
        drawingCount: 1,
      },
    ]);
  });

  it('can resolve drawings in back-to-front order', () => {
    const state = createUserDrawingState({
      drawings: [createTrendLine(), createRectangle(), createHorizontalLine()],
    });

    const model = resolveUserDrawingObjectTreeModel(state, { order: 'backToFront' });

    expect(model.rows.map((row) => row.drawingId)).toEqual(['trend', 'rect', 'hline']);
    expect(model.rows.map((row) => row.zIndex)).toEqual([0, 1, 2]);
    expect(model.groups?.map((group) => [group.id, group.rowIds])).toEqual([
      ['pane:main', ['trend', 'rect']],
      ['pane:volume', ['hline']],
    ]);
  });

  it('includes selection, visibility, lock, and editability metadata', () => {
    const state = createUserDrawingState({
      drawings: [
        createTrendLine({ id: 'trend', visible: false }),
        createRectangle({ id: 'rect', locked: true }),
        createHorizontalLine({ id: 'hline' }),
      ],
      selection: { drawingId: 'trend', drawingIds: ['trend', 'rect'] },
    });

    const model = resolveUserDrawingObjectTreeModel(state);

    expect(model.selectedIds).toEqual(['trend', 'rect']);
    expect(model.rows.map((row) => [row.drawingId, row.selected, row.visible, row.locked, row.editable])).toEqual([
      ['hline', false, true, false, true],
      ['rect', true, true, true, false],
      ['trend', true, false, false, true],
    ]);
    expect(model.rows.find((row) => row.drawingId === 'trend')?.actions?.map((action) => [action.type, action.enabled])).toEqual([
      ['rename', true],
      ['duplicate', true],
      ['delete', true],
      ['show', true],
      ['lock', true],
      ['bringForward', true],
      ['sendBackward', false],
      ['bringToFront', true],
      ['sendToBack', false],
    ]);
    expect(model.rows.find((row) => row.drawingId === 'rect')?.actions?.map((action) => [action.type, action.enabled])).toEqual([
      ['rename', false],
      ['duplicate', false],
      ['delete', false],
      ['hide', false],
      ['unlock', true],
      ['bringForward', false],
      ['sendBackward', false],
      ['bringToFront', false],
      ['sendToBack', false],
    ]);
    expect(model.selectionActions?.map((action) => [action.type, action.enabled, action.selectedCount])).toEqual([
      ['duplicate', true, 2],
      ['delete', true, 2],
      ['hide', false, 2],
      ['show', true, 2],
      ['lock', true, 2],
      ['unlock', true, 2],
      ['bringForward', true, 2],
      ['sendBackward', false, 2],
      ['bringToFront', true, 2],
      ['sendToBack', false, 2],
    ]);
    expect(resolveUserDrawingObjectTreeSelectionDispatchAction(model, 'show')).toEqual({
      type: 'show',
      drawingIds: ['trend', 'rect'],
      includeLocked: undefined,
    });
    expect(resolveUserDrawingObjectTreeSelectionDispatchAction(model, 'unlock')).toEqual({
      type: 'unlock',
      drawingIds: ['trend', 'rect'],
      includeLocked: true,
    });
    expect(resolveUserDrawingObjectTreeSelectionDispatchAction(model, 'hide')).toBeNull();
  });

  it('resolves row action descriptors to app-dispatchable object-tree actions', () => {
    const state = createUserDrawingState({
      drawings: [
        createTrendLine({ id: 'trend', visible: false }),
        createRectangle({ id: 'rect', locked: true }),
        createHorizontalLine({ id: 'hline' }),
      ],
    });
    const model = resolveUserDrawingObjectTreeModel(state);
    const hiddenTrend = model.rows.find((row) => row.drawingId === 'trend')!;
    const lockedRect = model.rows.find((row) => row.drawingId === 'rect')!;
    const frontHline = model.rows.find((row) => row.drawingId === 'hline')!;

    expect(resolveUserDrawingObjectTreeRowDispatchAction(hiddenTrend, 'show')).toEqual({
      type: 'show',
      drawingIds: ['trend'],
      includeLocked: undefined,
    });
    expect(resolveUserDrawingObjectTreeRowDispatchAction(hiddenTrend, 'rename', { name: 'Support' })).toEqual({
      type: 'rename',
      drawingId: 'trend',
      name: 'Support',
      includeLocked: undefined,
    });
    expect(resolveUserDrawingObjectTreeRowDispatchAction(hiddenTrend, 'rename')).toBeNull();
    expect(resolveUserDrawingObjectTreeRowDispatchAction(lockedRect, 'unlock')).toEqual({
      type: 'unlock',
      drawingIds: ['rect'],
      includeLocked: true,
    });
    expect(resolveUserDrawingObjectTreeRowDispatchAction(lockedRect, 'delete')).toBeNull();
    expect(resolveUserDrawingObjectTreeRowDispatchAction(frontHline, 'bringToFront')).toBeNull();
    expect(resolveUserDrawingObjectTreeRowDispatchAction(frontHline, 'sendToBack', { includeLocked: true })).toEqual({
      type: 'sendToBack',
      drawingIds: ['hline'],
      includeLocked: true,
    });
  });

  it('routes row unlock actions through locked drawing command protection', () => {
    const state = createUserDrawingState({
      drawings: [createRectangle({ id: 'rect', locked: true })],
    });
    const lockedRect = resolveUserDrawingObjectTreeModel(state).rows.find((row) => row.drawingId === 'rect')!;
    const unlockAction = resolveUserDrawingObjectTreeRowDispatchAction(lockedRect, 'unlock');

    expect(unlockAction).toEqual({
      type: 'unlock',
      drawingIds: ['rect'],
      includeLocked: true,
    });

    const commands = resolveUserDrawingObjectTreeDispatchActionCommands(state, unlockAction!, {
      createId: () => 'unused',
      now: () => 51,
    });
    const next = reduceUserDrawingCommand(state, commands[0]!);

    expect(next.drawings[0]).toMatchObject({ id: 'rect', locked: false, updatedAt: 51 });
  });

  it('routes selected bulk actions through app-dispatchable object-tree commands', () => {
    const state = createUserDrawingState({
      drawings: [
        createTrendLine({ id: 'trend', visible: false }),
        createRectangle({ id: 'rect', locked: true }),
      ],
      selection: { drawingId: 'trend', drawingIds: ['trend', 'rect'] },
    });
    const unlockAction = resolveUserDrawingObjectTreeSelectionDispatchAction(resolveUserDrawingObjectTreeModel(state), 'unlock');

    const commands = resolveUserDrawingObjectTreeDispatchActionCommands(state, unlockAction!, {
      createId: () => 'unused',
      now: () => 52,
    });
    const next = reduceUserDrawingCommand(state, commands[0]!);

    expect(next.drawings).toEqual([
      expect.objectContaining({ id: 'trend', locked: false }),
      expect.objectContaining({ id: 'rect', locked: false, updatedAt: 52 }),
    ]);
  });

  it('uses optional drawing names as row labels', () => {
    const state = createUserDrawingState({
      drawings: [createTrendLine({ id: 'trend', name: 'Support break' })],
    });

    expect(resolveUserDrawingObjectTreeModel(state).rows[0]).toMatchObject({
      drawingId: 'trend',
      label: 'Support break',
      defaultLabel: 'Trend line',
      customName: 'Support break',
    });
  });

  it('resolves row selection and range selection commands', () => {
    const state = createUserDrawingState({
      drawings: [createTrendLine(), createRectangle(), createHorizontalLine()],
      selection: { drawingId: 'trend' },
    });

    expect(resolveUserDrawingObjectTreeActionCommands(state, { type: 'select', drawingId: 'rect', additive: true })).toEqual([
      { type: 'selectMany', drawingIds: ['trend', 'rect'], meta: { source: 'objectTree' } },
    ]);
    expect(
      resolveUserDrawingObjectTreeActionCommands(state, {
        type: 'selectRange',
        anchorDrawingId: 'hline',
        targetDrawingId: 'rect',
      }),
    ).toEqual([{ type: 'selectMany', drawingIds: ['hline', 'rect'], meta: { source: 'objectTree' } }]);
  });

  it('resolves row mutation actions to shared drawing commands', () => {
    const state = createUserDrawingState({
      drawings: [createTrendLine(), createRectangle(), createHorizontalLine()],
      selection: { drawingId: 'trend' },
    });

    expect(resolveUserDrawingObjectTreeActionCommands(state, { type: 'hide', drawingIds: ['rect'] })).toEqual([
      {
        type: 'setVisibility',
        visible: false,
        options: { drawingId: 'rect' },
        meta: { source: 'objectTree', affectedIds: ['rect'] },
      },
    ]);
    expect(
      resolveUserDrawingObjectTreeActionCommands(
        state,
        { type: 'duplicate', drawingIds: ['trend', 'rect'], includeLocked: true, createId: () => 'copy' },
        { now: () => 10 },
      ),
    ).toEqual([
      {
        type: 'duplicate',
        options: { drawingIds: ['trend', 'rect'], includeLocked: true, now: expect.any(Function), createId: expect.any(Function) },
        meta: { source: 'objectTree', affectedIds: ['trend', 'rect'] },
      },
    ]);
    expect(resolveUserDrawingObjectTreeActionCommands(state, { type: 'sendToBack', drawingIds: ['rect'] })).toEqual([
      {
        type: 'reorder',
        action: 'sendToBack',
        options: { drawingId: 'rect' },
        meta: { source: 'objectTree', affectedIds: ['rect'] },
      },
    ]);
    expect(resolveUserDrawingObjectTreeActionCommands(state, { type: 'delete', drawingIds: [] })).toEqual([]);
  });

  it('resolves app-dispatchable duplicate actions with a default id factory', () => {
    const state = createUserDrawingState({
      drawings: [createTrendLine(), createRectangle()],
      selection: { drawingId: 'trend' },
    });

    const commands = resolveUserDrawingObjectTreeDispatchActionCommands(
      state,
      { type: 'duplicate', drawingIds: ['trend'] },
      { createId: () => 'copy', now: () => 30 },
    );

    expect(commands).toEqual([
      {
        type: 'duplicate',
        options: { drawingId: 'trend', now: expect.any(Function), createId: expect.any(Function) },
        meta: { source: 'objectTree', affectedIds: ['trend'] },
      },
    ]);

    const next = reduceUserDrawingCommand(state, commands[0]!);
    expect(next.drawings.map((drawing) => drawing.id)).toEqual(['trend', 'copy', 'rect']);
    expect(next.selection).toEqual({ drawingId: 'copy' });
  });

  it('preserves selection snapshots when object-tree mutations target multiple ids', () => {
    const state = createUserDrawingState({
      drawings: [createTrendLine(), createRectangle(), createHorizontalLine()],
      selection: { drawingId: 'hline' },
    });
    const [command] = resolveUserDrawingObjectTreeActionCommands(state, {
      type: 'hide',
      drawingIds: ['trend', 'rect'],
    });

    const dispatched = dispatchUserDrawingCommandWithHistory(state, createUserDrawingCommandHistory(), command!);
    expect(dispatched.state.selection).toEqual({ drawingId: 'hline' });
    expect(dispatched.state.drawings.map((drawing) => [drawing.id, drawing.visible])).toEqual([
      ['trend', false],
      ['rect', false],
      ['hline', true],
    ]);

    const undone = undoUserDrawingCommand(dispatched.state, dispatched.history);
    expect(undone.state.selection).toEqual({ drawingId: 'hline' });
    expect(undone.state.drawings.map((drawing) => [drawing.id, drawing.visible])).toEqual([
      ['trend', true],
      ['rect', true],
      ['hline', true],
    ]);
  });

  it('updates object-tree z-order without rewriting drawing IDs or selection', () => {
    const state = createUserDrawingState({
      drawings: [createTrendLine(), createRectangle(), createHorizontalLine()],
      selection: { drawingId: 'rect' },
    });
    const command = resolveUserDrawingObjectTreeActionCommands(state, {
      type: 'bringToFront',
      drawingIds: ['trend'],
    })[0]!;

    const next = reduceUserDrawingCommand(state, command);

    expect(next.selection).toEqual({ drawingId: 'rect' });
    expect(next.drawings.map((drawing) => drawing.id)).toEqual(['rect', 'hline', 'trend']);
    expect(resolveUserDrawingObjectTreeModel(next).rows.map((row) => [row.drawingId, row.zIndex])).toEqual([
      ['trend', 2],
      ['hline', 1],
      ['rect', 0],
    ]);
  });

  it('renames drawings through shared commands and layout serialization', () => {
    const state = createUserDrawingState({
      drawings: [createTrendLine({ id: 'trend' })],
    });
    const command = resolveUserDrawingObjectTreeActionCommands(
      state,
      { type: 'rename', drawingId: 'trend', name: 'Breakout line' },
      { now: () => 20 },
    )[0]!;

    const renamed = reduceUserDrawingCommand(state, command);
    expect(renamed.drawings[0]).toMatchObject({ id: 'trend', name: 'Breakout line', updatedAt: 20 });

    const restored = deserializeUserDrawingStateFromLayout(serializeUserDrawingStateForLayout(renamed));
    expect(restored?.drawings[0]).toMatchObject({ id: 'trend', name: 'Breakout line' });

    const cleared = reduceUserDrawingCommand(renamed, { type: 'setName', drawingId: 'trend', name: '   ' });
    expect(cleared.drawings[0]?.name).toBeUndefined();
  });

  it('returns stable empty metadata for an empty drawing state', () => {
    const model = resolveUserDrawingObjectTreeModel(createUserDrawingState());

    expect(model).toEqual({
      rows: [],
      groups: [],
      selectionActions: expect.arrayContaining([
        expect.objectContaining({ type: 'duplicate', enabled: false, selectedCount: 0 }),
        expect.objectContaining({ type: 'delete', enabled: false, selectedCount: 0 }),
        expect.objectContaining({ type: 'unlock', enabled: false, selectedCount: 0 }),
      ]),
      selectedIds: [],
      drawingCount: 0,
    });
    expect(model.selectionActions).toHaveLength(10);
  });
});
