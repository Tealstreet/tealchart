import type { UserDrawingCommand } from './commands';
import type { DuplicateUserDrawingOptions, UpdateUserDrawingOptions, UserDrawingZOrderAction } from './input';
import type { UserDrawing, UserDrawingKind, UserDrawingState, UserDrawingTool } from './types';

import { getUserDrawingSelectionIds } from './input';
import { getUserDrawingToolDescriptor } from './toolbar';

export type UserDrawingObjectTreeOrder = 'frontToBack' | 'backToFront';

export interface UserDrawingObjectTreeOptions {
  order?: UserDrawingObjectTreeOrder;
}

export interface UserDrawingObjectTreeRow {
  id: string;
  drawingId: string;
  kind: UserDrawingKind;
  tool: UserDrawingTool;
  label: string;
  defaultLabel: string;
  customName: string | null;
  icon: string;
  paneId: string;
  visible: boolean;
  locked: boolean;
  selected: boolean;
  editable: boolean;
  zIndex: number;
  orderIndex: number;
  groupIds: readonly string[];
}

export interface UserDrawingObjectTreeGroup {
  id: string;
  label: string;
  paneId: string;
  rowIds: readonly string[];
  drawingIds: readonly string[];
  orderIndex: number;
  drawingCount: number;
}

export interface UserDrawingObjectTreeModel {
  rows: readonly UserDrawingObjectTreeRow[];
  groups?: readonly UserDrawingObjectTreeGroup[];
  selectedIds: readonly string[];
  drawingCount: number;
}

export type UserDrawingObjectTreeSelectionAction =
  | { type: 'select'; drawingId: string; additive?: boolean }
  | { type: 'selectRange'; anchorDrawingId: string; targetDrawingId: string; order?: UserDrawingObjectTreeOrder };

export type UserDrawingObjectTreeMutationAction =
  | { type: 'delete'; drawingIds?: readonly string[]; includeLocked?: boolean }
  | {
      type: 'duplicate';
      createId: DuplicateUserDrawingOptions['createId'];
      drawingIds?: readonly string[];
      includeLocked?: boolean;
    }
  | { type: 'hide'; drawingIds?: readonly string[]; includeLocked?: boolean }
  | { type: 'show'; drawingIds?: readonly string[]; includeLocked?: boolean }
  | { type: 'lock'; drawingIds?: readonly string[]; includeLocked?: boolean }
  | { type: 'unlock'; drawingIds?: readonly string[]; includeLocked?: boolean }
  | { type: 'bringForward'; drawingIds?: readonly string[]; includeLocked?: boolean }
  | { type: 'sendBackward'; drawingIds?: readonly string[]; includeLocked?: boolean }
  | { type: 'bringToFront'; drawingIds?: readonly string[]; includeLocked?: boolean }
  | { type: 'sendToBack'; drawingIds?: readonly string[]; includeLocked?: boolean }
  | { type: 'rename'; drawingId: string; name: string | null; includeLocked?: boolean };

export type UserDrawingObjectTreeAction = UserDrawingObjectTreeSelectionAction | UserDrawingObjectTreeMutationAction;
export type UserDrawingObjectTreeDispatchAction =
  | UserDrawingObjectTreeSelectionAction
  | Exclude<UserDrawingObjectTreeMutationAction, { type: 'duplicate' }>
  | (Omit<Extract<UserDrawingObjectTreeMutationAction, { type: 'duplicate' }>, 'createId'> & {
      createId?: DuplicateUserDrawingOptions['createId'];
    });

export interface UserDrawingObjectTreeCommandOptions {
  now?: UpdateUserDrawingOptions['now'];
}

export interface UserDrawingObjectTreeDispatchCommandOptions extends UserDrawingObjectTreeCommandOptions {
  createId: DuplicateUserDrawingOptions['createId'];
}

function resolveUserDrawingObjectTreeRow(
  drawing: UserDrawing,
  drawingIndex: number,
  orderIndex: number,
  selectedIds: ReadonlySet<string>,
): UserDrawingObjectTreeRow {
  const descriptor = getUserDrawingToolDescriptor(drawing.kind);
  const customName = drawing.name?.trim() || null;

  return {
    id: drawing.id,
    drawingId: drawing.id,
    kind: drawing.kind,
    tool: drawing.kind,
    label: customName ?? descriptor.label,
    defaultLabel: descriptor.label,
    customName,
    icon: descriptor.icon,
    paneId: drawing.paneId,
    visible: drawing.visible,
    locked: drawing.locked,
    selected: selectedIds.has(drawing.id),
    editable: !drawing.locked,
    zIndex: drawingIndex,
    orderIndex,
    groupIds: [getUserDrawingObjectTreePaneGroupId(drawing.paneId)],
  };
}

function getUserDrawingObjectTreePaneGroupId(paneId: string): string {
  return `pane:${paneId}`;
}

function getUserDrawingObjectTreePaneGroupLabel(paneId: string): string {
  return paneId === 'main' ? 'Main chart' : `Pane ${paneId}`;
}

function compareUserDrawingObjectTreePaneIds(a: string, b: string): number {
  if (a === b) return 0;
  if (a === 'main') return -1;
  if (b === 'main') return 1;
  return a.localeCompare(b);
}

function resolveUserDrawingObjectTreeGroups(rows: readonly UserDrawingObjectTreeRow[]): readonly UserDrawingObjectTreeGroup[] {
  const groupRows = new Map<string, UserDrawingObjectTreeRow[]>();
  for (const row of rows) {
    const groupId = getUserDrawingObjectTreePaneGroupId(row.paneId);
    const rowsForGroup = groupRows.get(groupId);
    if (rowsForGroup) rowsForGroup.push(row);
    else groupRows.set(groupId, [row]);
  }

  return [...groupRows.entries()].sort(([, aRows], [, bRows]) =>
    compareUserDrawingObjectTreePaneIds(aRows[0]?.paneId ?? '', bRows[0]?.paneId ?? ''),
  ).map(([id, rowsForGroup], orderIndex) => {
    const paneId = rowsForGroup[0]?.paneId ?? '';
    return {
      id,
      label: getUserDrawingObjectTreePaneGroupLabel(paneId),
      paneId,
      rowIds: rowsForGroup.map((row) => row.id),
      drawingIds: rowsForGroup.map((row) => row.drawingId),
      orderIndex,
      drawingCount: rowsForGroup.length,
    };
  });
}

export function resolveUserDrawingObjectTreeModel(
  state: UserDrawingState,
  options: UserDrawingObjectTreeOptions = {},
): UserDrawingObjectTreeModel {
  const selectedIds = getUserDrawingSelectionIds(state.selection);
  const selectedIdSet = new Set(selectedIds);
  const indexedDrawings = state.drawings.map((drawing, drawingIndex) => ({ drawing, drawingIndex }));
  const orderedDrawings = options.order === 'backToFront' ? indexedDrawings : [...indexedDrawings].reverse();
  const rows = orderedDrawings.map(({ drawing, drawingIndex }, orderIndex) =>
    resolveUserDrawingObjectTreeRow(drawing, drawingIndex, orderIndex, selectedIdSet),
  );

  return {
    rows,
    groups: resolveUserDrawingObjectTreeGroups(rows),
    selectedIds,
    drawingCount: state.drawings.length,
  };
}

function getObjectTreeActionDrawingIds(state: UserDrawingState, drawingIds?: readonly string[]): readonly string[] {
  return drawingIds !== undefined ? [...new Set(drawingIds)] : getUserDrawingSelectionIds(state.selection);
}

function getObjectTreeSelectionCommands(
  state: UserDrawingState,
  drawingIds: readonly string[],
): readonly UserDrawingCommand[] {
  if (drawingIds.length === 0) return [];
  const selectedIds = getUserDrawingSelectionIds(state.selection);
  if (selectedIds.length === drawingIds.length && selectedIds.every((drawingId, index) => drawingId === drawingIds[index])) return [];
  return drawingIds.length === 1
    ? [{ type: 'select', drawingId: drawingIds[0]!, meta: { source: 'objectTree' } }]
    : [{ type: 'selectMany', drawingIds, meta: { source: 'objectTree' } }];
}

function getObjectTreeUpdateOptions(
  action: Extract<UserDrawingObjectTreeMutationAction, { drawingIds?: readonly string[]; includeLocked?: boolean }>,
  drawingIds: readonly string[],
  now?: UpdateUserDrawingOptions['now'],
): UpdateUserDrawingOptions {
  const options: UpdateUserDrawingOptions = {};
  if (drawingIds.length === 1) options.drawingId = drawingIds[0];
  else options.drawingIds = drawingIds;
  if (action.includeLocked !== undefined) options.includeLocked = action.includeLocked;
  if (now) options.now = now;
  return options;
}

function getObjectTreeZOrderAction(action: UserDrawingObjectTreeMutationAction['type']): UserDrawingZOrderAction | null {
  switch (action) {
    case 'bringForward':
    case 'sendBackward':
    case 'bringToFront':
    case 'sendToBack':
      return action;
    default:
      return null;
  }
}

function resolveUserDrawingObjectTreeRangeSelection(
  state: UserDrawingState,
  action: Extract<UserDrawingObjectTreeSelectionAction, { type: 'selectRange' }>,
): readonly string[] {
  const rows = resolveUserDrawingObjectTreeModel(state, { order: action.order }).rows;
  const anchorIndex = rows.findIndex((row) => row.drawingId === action.anchorDrawingId);
  const targetIndex = rows.findIndex((row) => row.drawingId === action.targetDrawingId);
  if (anchorIndex < 0 || targetIndex < 0) return [];

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return rows.slice(start, end + 1).map((row) => row.drawingId);
}

export function resolveUserDrawingObjectTreeActionCommands(
  state: UserDrawingState,
  action: UserDrawingObjectTreeAction,
  options: UserDrawingObjectTreeCommandOptions = {},
): readonly UserDrawingCommand[] {
  if (action.type === 'select') {
    const selectedIds = action.additive
      ? [...new Set([...getUserDrawingSelectionIds(state.selection), action.drawingId])]
      : [action.drawingId];
    return getObjectTreeSelectionCommands(state, selectedIds);
  }

  if (action.type === 'selectRange') {
    return getObjectTreeSelectionCommands(state, resolveUserDrawingObjectTreeRangeSelection(state, action));
  }

  if (action.type === 'rename') {
    const commandOptions: UpdateUserDrawingOptions = {};
    if (action.includeLocked !== undefined) commandOptions.includeLocked = action.includeLocked;
    if (options.now) commandOptions.now = options.now;
    return [
      {
        type: 'setName',
        drawingId: action.drawingId,
        name: action.name,
        options: commandOptions,
        meta: { source: 'objectTree', affectedIds: [action.drawingId] },
      },
    ];
  }

  const drawingIds = getObjectTreeActionDrawingIds(state, action.drawingIds);
  if (drawingIds.length === 0) return [];

  const updateOptions = getObjectTreeUpdateOptions(action, drawingIds, options.now);
  const meta = { source: 'objectTree' as const, affectedIds: drawingIds };
  const zOrderAction = getObjectTreeZOrderAction(action.type);

  if (zOrderAction) {
    return [{ type: 'reorder', action: zOrderAction, options: updateOptions, meta }];
  }

  switch (action.type) {
    case 'delete':
      return [{ type: 'delete', options: updateOptions, meta }];
    case 'duplicate':
      return [{ type: 'duplicate', options: { ...updateOptions, createId: action.createId }, meta }];
    case 'hide':
    case 'show':
      return [{ type: 'setVisibility', visible: action.type === 'show', options: updateOptions, meta }];
    case 'lock':
    case 'unlock':
      return [{ type: 'setLocked', locked: action.type === 'lock', options: updateOptions, meta }];
    default:
      return [];
  }
}

export function resolveUserDrawingObjectTreeDispatchActionCommands(
  state: UserDrawingState,
  action: UserDrawingObjectTreeDispatchAction,
  options: UserDrawingObjectTreeDispatchCommandOptions,
): readonly UserDrawingCommand[] {
  const resolvedAction: UserDrawingObjectTreeAction =
    action.type === 'duplicate' ? { ...action, createId: action.createId ?? options.createId } : action;
  return resolveUserDrawingObjectTreeActionCommands(state, resolvedAction, options);
}
