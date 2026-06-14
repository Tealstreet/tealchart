import type {
  AddUserDrawingOptions,
  UserDrawingSelectionInputOptions,
  DeleteUserDrawingOptions,
  DuplicateUserDrawingOptions,
  UpdateUserDrawingOptions,
  UserDrawingImageSourceInput,
  UserDrawingInputOptions,
  UserDrawingInputPoint,
  UserDrawingClipboard,
  PasteUserDrawingOptions,
  UserDrawingPlacementDragCommitOptions,
  UserDrawingPlacementDragStartOptions,
  UserDrawingPathDragOptions,
  UserDrawingTableCellInput,
  UserDrawingTableCellsInput,
  UserDrawingTableColumnInput,
  UserDrawingTableRowInput,
  UserDrawingTextEditOptions,
  UserDrawingZOrderAction,
} from './input';
import type { DrawingCoordinateSpace, DrawingScreenPoint } from './coordinates';
import type {
  BeginUserDrawingDuplicateEditDragOptions,
  BeginUserDrawingEditDragOptions,
  NudgeUserDrawingSelectionOptions,
  UserDrawingEditDrag,
} from './editing';
import type {
  UserDrawingHandleRole,
  UserDrawingIconName,
  UserDrawing,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTextAlign,
  UserDrawingTool,
  UserDrawingTrendLineExtend,
} from './types';
import { isUserDrawingLayoutStateEqual } from './serialization';

import {
  addUserDrawing,
  appendUserDrawingPathDragPoint,
  beginUserDrawingPlacementDrag,
  beginUserDrawingPathDrag,
  beginUserDrawingTextEdit,
  cancelUserDrawingDraft,
  cancelUserDrawingTextEdit,
  clearUserDrawings,
  cloneUserDrawingSnapshot,
  commitUserDrawingPlacementDrag,
  commitUserDrawingPathDrag,
  commitUserDrawingTextEdit,
  deleteUserDrawing,
  deleteUserDrawingTableColumn,
  deleteUserDrawingTableRow,
  duplicateUserDrawing,
  handleUserDrawingInput,
  insertUserDrawingTableColumn,
  insertUserDrawingTableRow,
  reorderUserDrawings,
  pasteUserDrawingClipboard,
  resolveUserDrawingSelectionAtPoint,
  selectUserDrawingById,
  selectUserDrawingsById,
  setUserDrawingIconName,
  setUserDrawingImageSource,
  setUserDrawingLocked,
  setUserDrawingName,
  setUserDrawingTableCell,
  setUserDrawingTableCells,
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
import {
  applyUserDrawingEditDrag,
  beginUserDrawingDuplicateEditDragAtPoint,
  beginUserDrawingEditDragAtPoint,
  nudgeUserDrawingSelection,
} from './editing';

export type UserDrawingCommandSource =
  | 'pointer'
  | 'touch'
  | 'keyboard'
  | 'api'
  | 'layout'
  | 'toolbar'
  | 'contextMenu'
  | 'objectTree'
  | 'textEditor';

export interface UserDrawingCommandMetadata {
  source: UserDrawingCommandSource;
  timestamp?: number;
  transactionKey?: string;
  affectedIds?: readonly string[];
}

interface UserDrawingCommandBase {
  meta?: UserDrawingCommandMetadata;
}

export type UserDrawingCommand =
  | (UserDrawingCommandBase & { type: 'setActiveTool'; tool: UserDrawingTool })
  | (UserDrawingCommandBase & { type: 'add'; drawing: UserDrawing; options?: AddUserDrawingOptions })
  | (UserDrawingCommandBase & { type: 'select'; drawingId: string | null; handle?: UserDrawingHandleRole })
  | (UserDrawingCommandBase & { type: 'selectMany'; drawingIds: readonly string[] })
  | (UserDrawingCommandBase & {
      type: 'selectAtPoint';
      point: DrawingScreenPoint;
      spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>;
      options?: UserDrawingSelectionInputOptions;
    })
  | (UserDrawingCommandBase & {
      type: 'beginEditDragAtPoint';
      point: DrawingScreenPoint;
      spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>;
      options?: BeginUserDrawingEditDragOptions;
    })
  | (UserDrawingCommandBase & {
      type: 'beginDuplicateEditDragAtPoint';
      point: DrawingScreenPoint;
      spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>;
      options: BeginUserDrawingDuplicateEditDragOptions;
    })
  | (UserDrawingCommandBase & {
      type: 'applyEditDrag';
      drag: UserDrawingEditDrag;
      point: DrawingScreenPoint;
    })
  | (UserDrawingCommandBase & {
      type: 'nudge';
      spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>;
      options: NudgeUserDrawingSelectionOptions;
    })
  | (UserDrawingCommandBase & { type: 'delete'; options?: DeleteUserDrawingOptions })
  | (UserDrawingCommandBase & { type: 'duplicate'; options: DuplicateUserDrawingOptions })
  | (UserDrawingCommandBase & { type: 'paste'; clipboard: UserDrawingClipboard | null | undefined; options: PasteUserDrawingOptions })
  | (UserDrawingCommandBase & { type: 'clear' })
  | (UserDrawingCommandBase & { type: 'cancelDraft' })
  | (UserDrawingCommandBase & { type: 'handleInput'; point: UserDrawingInputPoint; options: UserDrawingInputOptions })
  | (UserDrawingCommandBase & {
      type: 'beginPlacementDrag';
      point: UserDrawingInputPoint;
      options?: UserDrawingPlacementDragStartOptions;
    })
  | (UserDrawingCommandBase & {
      type: 'commitPlacementDrag';
      point: UserDrawingInputPoint;
      options: UserDrawingPlacementDragCommitOptions;
    })
  | (UserDrawingCommandBase & {
      type: 'beginPathDrag';
      point: UserDrawingInputPoint;
      options?: Omit<UserDrawingPathDragOptions, 'createId'>;
    })
  | (UserDrawingCommandBase & { type: 'appendPathDragPoint'; point: UserDrawingInputPoint })
  | (UserDrawingCommandBase & { type: 'commitPathDrag'; options: UserDrawingPathDragOptions })
  | (UserDrawingCommandBase & { type: 'beginTextEdit'; drawingId?: string; options?: UserDrawingTextEditOptions })
  | (UserDrawingCommandBase & { type: 'updateTextEdit'; value: string })
  | (UserDrawingCommandBase & { type: 'commitTextEdit'; options?: UserDrawingTextEditOptions })
  | (UserDrawingCommandBase & { type: 'cancelTextEdit' })
  | (UserDrawingCommandBase & { type: 'setText'; drawingId: string; text: string; options?: UserDrawingTextEditOptions })
  | (UserDrawingCommandBase & { type: 'setTextContent'; text: string; options?: UpdateUserDrawingOptions })
  | (UserDrawingCommandBase & { type: 'updateStyle'; style: Partial<UserDrawingStyle>; options?: UpdateUserDrawingOptions })
  | (UserDrawingCommandBase & { type: 'setTextAlign'; textAlign: UserDrawingTextAlign; options?: UpdateUserDrawingOptions })
  | (UserDrawingCommandBase & {
      type: 'setTrendLineExtend';
      extend: UserDrawingTrendLineExtend;
      options?: UpdateUserDrawingOptions;
    })
  | (UserDrawingCommandBase & { type: 'setIconName'; iconName: UserDrawingIconName; options?: UpdateUserDrawingOptions })
  | (UserDrawingCommandBase & {
      type: 'setImageSource';
      source: UserDrawingImageSourceInput;
      options?: UpdateUserDrawingOptions;
    })
  | (UserDrawingCommandBase & { type: 'setName'; drawingId: string; name: string | null; options?: UpdateUserDrawingOptions })
  | (UserDrawingCommandBase & {
      type: 'setTableCells';
      cells: UserDrawingTableCellsInput;
      options?: UpdateUserDrawingOptions;
    })
  | (UserDrawingCommandBase & {
      type: 'setTableCell';
      row: number;
      column: number;
      value: UserDrawingTableCellInput;
      options?: UpdateUserDrawingOptions;
    })
  | (UserDrawingCommandBase & {
      type: 'setTableDimensions';
      rows: number;
      columns: number;
      options?: UpdateUserDrawingOptions;
    })
  | (UserDrawingCommandBase & {
      type: 'insertTableRow';
      row: number;
      values?: UserDrawingTableRowInput;
      options?: UpdateUserDrawingOptions;
    })
  | (UserDrawingCommandBase & { type: 'deleteTableRow'; row: number; options?: UpdateUserDrawingOptions })
  | (UserDrawingCommandBase & {
      type: 'insertTableColumn';
      column: number;
      values?: UserDrawingTableColumnInput;
      options?: UpdateUserDrawingOptions;
    })
  | (UserDrawingCommandBase & { type: 'deleteTableColumn'; column: number; options?: UpdateUserDrawingOptions })
  | (UserDrawingCommandBase & { type: 'setVisibility'; visible: boolean; options?: UpdateUserDrawingOptions })
  | (UserDrawingCommandBase & { type: 'setLocked'; locked: boolean; options?: UpdateUserDrawingOptions })
  | (UserDrawingCommandBase & { type: 'reorder'; action: UserDrawingZOrderAction; options?: UpdateUserDrawingOptions });

export type UserDrawingHistoryCommand = UserDrawingCommandBase & { type: 'undo' | 'redo' };
export type UserDrawingReplaceStateCommand = UserDrawingCommandBase & { type: 'replaceState' };
export type UserDrawingCommandEventCommand = UserDrawingCommand | UserDrawingHistoryCommand | UserDrawingReplaceStateCommand;

export interface UserDrawingCommandDispatchResult {
  state: UserDrawingState;
  changed: boolean;
  command: UserDrawingCommand;
  meta?: UserDrawingCommandMetadata;
  hit?: boolean;
  editDrag?: UserDrawingEditDrag | null;
}

export interface UserDrawingCommandEvent {
  command: UserDrawingCommandEventCommand;
  previousState: UserDrawingState;
  state: UserDrawingState;
  meta?: UserDrawingCommandMetadata;
  source?: UserDrawingCommandSource;
  affectedIds?: readonly string[];
  hit?: boolean;
}

export type UserDrawingCommandEventListener = (event: UserDrawingCommandEvent) => void;

function resolveUserDrawingCommandAffectedIds(
  previousState: UserDrawingState,
  nextState: UserDrawingState,
): readonly string[] | undefined {
  const changedIds = new Set<string>();
  const previousById = new Map(previousState.drawings.map((drawing) => [drawing.id, drawing]));
  const nextById = new Map(nextState.drawings.map((drawing) => [drawing.id, drawing]));
  const previousIndexById = new Map(previousState.drawings.map((drawing, index) => [drawing.id, index]));

  for (const previousDrawing of previousState.drawings) {
    if (nextById.get(previousDrawing.id) !== previousDrawing) {
      changedIds.add(previousDrawing.id);
    }
  }
  for (let index = 0; index < nextState.drawings.length; index++) {
    const nextDrawing = nextState.drawings[index]!;
    if (previousById.get(nextDrawing.id) !== nextDrawing || previousIndexById.get(nextDrawing.id) !== index) {
      changedIds.add(nextDrawing.id);
    }
  }

  addUserDrawingSelectionAffectedIds(previousState, nextState, changedIds);
  if (previousState.textEdit?.drawingId !== nextState.textEdit?.drawingId) {
    if (previousState.textEdit?.drawingId) changedIds.add(previousState.textEdit.drawingId);
    if (nextState.textEdit?.drawingId) changedIds.add(nextState.textEdit.drawingId);
  }

  return changedIds.size > 0 ? [...changedIds] : undefined;
}

function getUserDrawingSelectionIdSet(state: UserDrawingState): Set<string> {
  return new Set(state.selection?.drawingIds ?? (state.selection?.drawingId ? [state.selection.drawingId] : []));
}

function addUserDrawingSelectionAffectedIds(
  previousState: UserDrawingState,
  nextState: UserDrawingState,
  affectedIds: Set<string>,
): void {
  const previousSelectionIds = getUserDrawingSelectionIdSet(previousState);
  const nextSelectionIds = getUserDrawingSelectionIdSet(nextState);
  for (const id of previousSelectionIds) {
    if (!nextSelectionIds.has(id)) affectedIds.add(id);
  }
  for (const id of nextSelectionIds) {
    if (!previousSelectionIds.has(id)) affectedIds.add(id);
  }
}

export function createUserDrawingCommandEvent(
  previousState: UserDrawingState,
  result: UserDrawingCommandDispatchResult,
): UserDrawingCommandEvent | null {
  if (!result.changed) return null;
  return {
    command: result.command,
    previousState,
    state: result.state,
    meta: result.meta,
    source: result.meta?.source,
    affectedIds: result.meta?.affectedIds ?? resolveUserDrawingCommandAffectedIds(previousState, result.state),
    hit: result.hit,
  };
}

export function createUserDrawingHistoryCommandEvent(
  previousState: UserDrawingState,
  state: UserDrawingState,
  command: UserDrawingHistoryCommand,
  changed: boolean,
): UserDrawingCommandEvent | null {
  if (!changed) return null;
  return {
    command,
    previousState,
    state,
    meta: command.meta,
    source: command.meta?.source,
    affectedIds: command.meta?.affectedIds ?? resolveUserDrawingCommandAffectedIds(previousState, state),
  };
}

export function createUserDrawingReplaceStateCommandEvent(
  previousState: UserDrawingState,
  state: UserDrawingState,
  command: UserDrawingReplaceStateCommand,
): UserDrawingCommandEvent | null {
  if (isUserDrawingLayoutStateEqual(previousState, state)) return null;
  return {
    command,
    previousState,
    state,
    meta: command.meta,
    source: command.meta?.source,
    affectedIds: command.meta?.affectedIds ?? resolveUserDrawingCommandAffectedIds(previousState, state),
  };
}

export function dispatchUserDrawingCommand(
  state: UserDrawingState,
  command: UserDrawingCommand,
): UserDrawingCommandDispatchResult {
  if (command.type === 'add') {
    const snapshotCommand = { ...command, drawing: cloneUserDrawingSnapshot(command.drawing) };
    const nextState = reduceUserDrawingCommand(state, snapshotCommand);
    return {
      state: nextState,
      changed: nextState !== state,
      command: snapshotCommand,
      meta: snapshotCommand.meta,
    };
  }

  if (command.type === 'selectAtPoint') {
    const result = resolveUserDrawingSelectionAtPoint(state, command.point, command.spacesByPaneId, command.options);
    return {
      state: result.state,
      changed: result.changed,
      command,
      meta: command.meta,
      hit: result.hit,
    };
  }

  if (command.type === 'beginEditDragAtPoint') {
    const result = beginUserDrawingEditDragAtPoint(state, command.point, command.spacesByPaneId, command.options);
    return {
      state: result.state,
      changed: result.changed,
      command,
      meta: command.meta,
      hit: result.hit,
      editDrag: result.drag,
    };
  }

  if (command.type === 'beginDuplicateEditDragAtPoint') {
    const result = beginUserDrawingDuplicateEditDragAtPoint(state, command.point, command.spacesByPaneId, command.options);
    return {
      state: result.state,
      changed: result.changed,
      command,
      meta: command.meta,
      hit: result.hit,
      editDrag: result.drag,
    };
  }

  const nextState = reduceUserDrawingCommand(state, command);
  return {
    state: nextState,
    changed: nextState !== state,
    command,
    meta: command.meta,
  };
}

export function reduceUserDrawingCommand(state: UserDrawingState, command: UserDrawingCommand): UserDrawingState {
  switch (command.type) {
    case 'setActiveTool':
      return setUserDrawingTool(state, command.tool);
    case 'add':
      return addUserDrawing(state, command.drawing, command.options);
    case 'select':
      return selectUserDrawingById(state, command.drawingId, command.handle);
    case 'selectMany':
      return selectUserDrawingsById(state, command.drawingIds);
    case 'selectAtPoint':
      return resolveUserDrawingSelectionAtPoint(state, command.point, command.spacesByPaneId, command.options).state;
    case 'beginEditDragAtPoint':
      return beginUserDrawingEditDragAtPoint(state, command.point, command.spacesByPaneId, command.options).state;
    case 'beginDuplicateEditDragAtPoint':
      return beginUserDrawingDuplicateEditDragAtPoint(state, command.point, command.spacesByPaneId, command.options).state;
    case 'applyEditDrag':
      return applyUserDrawingEditDrag(state, command.drag, command.point);
    case 'nudge':
      return nudgeUserDrawingSelection(state, command.spacesByPaneId, command.options);
    case 'delete':
      return deleteUserDrawing(state, command.options);
    case 'duplicate':
      return duplicateUserDrawing(state, command.options);
    case 'paste':
      return pasteUserDrawingClipboard(state, command.clipboard, command.options);
    case 'clear':
      return clearUserDrawings(state);
    case 'cancelDraft':
      return cancelUserDrawingDraft(state);
    case 'handleInput':
      return handleUserDrawingInput(state, command.point, command.options);
    case 'beginPlacementDrag':
      return beginUserDrawingPlacementDrag(state, command.point, command.options);
    case 'commitPlacementDrag':
      return commitUserDrawingPlacementDrag(state, command.point, command.options);
    case 'beginPathDrag':
      return beginUserDrawingPathDrag(state, command.point, command.options);
    case 'appendPathDragPoint':
      return appendUserDrawingPathDragPoint(state, command.point);
    case 'commitPathDrag':
      return commitUserDrawingPathDrag(state, command.options);
    case 'beginTextEdit':
      return beginUserDrawingTextEdit(state, command.drawingId, command.options);
    case 'updateTextEdit':
      return updateUserDrawingTextEdit(state, command.value);
    case 'commitTextEdit':
      return commitUserDrawingTextEdit(state, command.options);
    case 'cancelTextEdit':
      return cancelUserDrawingTextEdit(state);
    case 'setText':
      return setUserDrawingText(state, command.drawingId, command.text, command.options);
    case 'setTextContent':
      return setUserDrawingTextContent(state, command.text, command.options);
    case 'updateStyle':
      return updateUserDrawingStyle(state, command.style, command.options);
    case 'setTextAlign':
      return setUserDrawingTextAlign(state, command.textAlign, command.options);
    case 'setTrendLineExtend':
      return setUserDrawingTrendLineExtend(state, command.extend, command.options);
    case 'setIconName':
      return setUserDrawingIconName(state, command.iconName, command.options);
    case 'setImageSource':
      return setUserDrawingImageSource(state, command.source, command.options);
    case 'setName':
      return setUserDrawingName(state, command.drawingId, command.name, command.options);
    case 'setTableCells':
      return setUserDrawingTableCells(state, command.cells, command.options);
    case 'setTableCell':
      return setUserDrawingTableCell(state, command.row, command.column, command.value, command.options);
    case 'setTableDimensions':
      return setUserDrawingTableDimensions(state, command.rows, command.columns, command.options);
    case 'insertTableRow':
      return insertUserDrawingTableRow(state, command.row, command.values, command.options);
    case 'deleteTableRow':
      return deleteUserDrawingTableRow(state, command.row, command.options);
    case 'insertTableColumn':
      return insertUserDrawingTableColumn(state, command.column, command.values, command.options);
    case 'deleteTableColumn':
      return deleteUserDrawingTableColumn(state, command.column, command.options);
    case 'setVisibility':
      return setUserDrawingVisibility(state, command.visible, command.options);
    case 'setLocked':
      return setUserDrawingLocked(state, command.locked, command.options);
    case 'reorder':
      return reorderUserDrawings(state, command.action, command.options);
  }
}
