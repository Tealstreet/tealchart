import type { UserDrawingCommand, UserDrawingCommandDispatchResult } from './commands';
import type { UserDrawingState } from './types';

import { dispatchUserDrawingCommand } from './commands';
import { createUserDrawingState } from './input';
import { isUserDrawingLayoutStateEqual } from './serialization';

export const DEFAULT_USER_DRAWING_HISTORY_CAPACITY = 100;

export interface UserDrawingHistoryEntry {
  before: UserDrawingState;
  after: UserDrawingState;
  command: UserDrawingCommand;
  transactionKey?: string;
  timestamp?: number;
}

export interface UserDrawingCommandHistory {
  undoStack: readonly UserDrawingHistoryEntry[];
  redoStack: readonly UserDrawingHistoryEntry[];
  capacity: number;
}

export interface UserDrawingCommandHistoryOptions {
  capacity?: number;
}

export interface UserDrawingHistoryDispatchResult extends UserDrawingCommandDispatchResult {
  history: UserDrawingCommandHistory;
}

export interface UserDrawingHistoryStepResult {
  state: UserDrawingState;
  history: UserDrawingCommandHistory;
  changed: boolean;
}

export function createUserDrawingCommandHistory(
  options: UserDrawingCommandHistoryOptions = {},
): UserDrawingCommandHistory {
  return {
    undoStack: [],
    redoStack: [],
    capacity: Math.max(1, Math.trunc(options.capacity ?? DEFAULT_USER_DRAWING_HISTORY_CAPACITY)),
  };
}

export function canUndoUserDrawingCommand(history: UserDrawingCommandHistory): boolean {
  return history.undoStack.length > 0;
}

export function canRedoUserDrawingCommand(history: UserDrawingCommandHistory): boolean {
  return history.redoStack.length > 0;
}

export function clearUserDrawingCommandHistory(
  history: UserDrawingCommandHistory,
): UserDrawingCommandHistory {
  return createUserDrawingCommandHistory({ capacity: history.capacity });
}

function createHistorySnapshot(state: UserDrawingState): UserDrawingState {
  return createUserDrawingState({
    version: state.version,
    drawings: state.drawings,
    activeTool: state.activeTool,
    stayInDrawingMode: state.stayInDrawingMode !== false,
    selection: state.selection,
  });
}

function shouldRecordUserDrawingCommand(command: UserDrawingCommand): boolean {
  switch (command.type) {
    case 'setActiveTool':
    case 'setStayInDrawingMode':
    case 'select':
    case 'selectMany':
    case 'selectAtPoint':
    case 'beginEditDragAtPoint':
    case 'cancelDraft':
    case 'beginPlacementDrag':
    case 'beginPathDrag':
    case 'appendPathDragPoint':
    case 'beginTextEdit':
    case 'updateTextEdit':
    case 'cancelTextEdit':
      return false;
    case 'handleInput':
    case 'add':
    case 'applyEditDrag':
    case 'beginDuplicateEditDragAtPoint':
    case 'nudge':
    case 'delete':
    case 'duplicate':
    case 'paste':
    case 'clear':
    case 'commitPlacementDrag':
    case 'commitPathDrag':
    case 'commitTextEdit':
    case 'setText':
    case 'setTextContent':
    case 'updateStyle':
    case 'setTextAlign':
    case 'setTrendLineExtend':
    case 'setIconName':
    case 'setImageSource':
    case 'setName':
    case 'setTableCells':
    case 'setTableCell':
    case 'setTableDimensions':
    case 'insertTableRow':
    case 'deleteTableRow':
    case 'insertTableColumn':
    case 'deleteTableColumn':
    case 'setVisibility':
    case 'setLocked':
    case 'reorder':
      return true;
  }
}

function pushUndoEntry(
  history: UserDrawingCommandHistory,
  entry: UserDrawingHistoryEntry,
): UserDrawingCommandHistory {
  const undoStack = history.undoStack.slice();
  const lastEntry = undoStack[undoStack.length - 1];
  if (lastEntry?.transactionKey && lastEntry.transactionKey === entry.transactionKey) {
    undoStack[undoStack.length - 1] = {
      ...entry,
      before: lastEntry.before,
    };
  } else {
    undoStack.push(entry);
  }

  return {
    ...history,
    undoStack: undoStack.slice(Math.max(0, undoStack.length - history.capacity)),
    redoStack: [],
  };
}

export function dispatchUserDrawingCommandWithHistory(
  state: UserDrawingState,
  history: UserDrawingCommandHistory,
  command: UserDrawingCommand,
): UserDrawingHistoryDispatchResult {
  const result = dispatchUserDrawingCommand(state, command);
  if (!result.changed || !shouldRecordUserDrawingCommand(command) || isUserDrawingLayoutStateEqual(state, result.state)) {
    return { ...result, history };
  }

  const entry: UserDrawingHistoryEntry = {
    before: createHistorySnapshot(state),
    after: createHistorySnapshot(result.state),
    command,
    transactionKey: command.meta?.transactionKey,
    timestamp: command.meta?.timestamp,
  };
  return {
    ...result,
    history: pushUndoEntry(history, entry),
  };
}

export function undoUserDrawingCommand(
  state: UserDrawingState,
  history: UserDrawingCommandHistory,
): UserDrawingHistoryStepResult {
  const entry = history.undoStack[history.undoStack.length - 1];
  if (!entry) return { state, history, changed: false };

  return {
    state: entry.before,
    history: {
      ...history,
      undoStack: history.undoStack.slice(0, -1),
      redoStack: [...history.redoStack, entry],
    },
    changed: true,
  };
}

export function redoUserDrawingCommand(
  state: UserDrawingState,
  history: UserDrawingCommandHistory,
): UserDrawingHistoryStepResult {
  const entry = history.redoStack[history.redoStack.length - 1];
  if (!entry) return { state, history, changed: false };

  return {
    state: entry.after,
    history: {
      ...history,
      undoStack: [...history.undoStack, entry].slice(
        Math.max(0, history.undoStack.length + 1 - history.capacity),
      ),
      redoStack: history.redoStack.slice(0, -1),
    },
    changed: true,
  };
}
