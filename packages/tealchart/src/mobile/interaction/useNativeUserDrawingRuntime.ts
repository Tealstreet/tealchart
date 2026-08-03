import type {
  DrawingCoordinateSpace,
  DrawingScreenPoint,
  UserDrawingCommand,
  UserDrawingCommandAvailability,
  UserDrawingCommandDispatchResult,
  UserDrawingCommandMetadata,
  UserDrawingCommandEventListener,
  UserDrawingDraft,
  UserDrawingInputPoint,
  UserDrawingMeasure,
  UserDrawingPanePosition,
  UserDrawingRecentToolByCategory,
  UserDrawingSelectedActionSurfaceCommand,
  UserDrawingSelection,
  UserDrawingSelectionAtPointResult,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTextEdit,
  UserDrawingTool,
  UserDrawingAnchor,
  UserDrawingZOrderAction,
} from '../../drawings';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import {
  canRedoUserDrawingCommand,
  canUndoUserDrawingCommand,
  createUserDrawingCommandEvent,
  createUserDrawingCommandHistory,
  createUserDrawingHistoryCommandEvent,
  createUserDrawingReplaceStateCommandEvent,
  createUserDrawingClipboard,
  createUserDrawingState,
  dispatchUserDrawingCommandWithHistory,
  getSelectedUserDrawing,
  getUserDrawingSelectionIds,
  getUserDrawingToolCategoryDescriptorForTool,
  isUserDrawingLayoutStateEqual,
  redoUserDrawingCommand,
  undoUserDrawingCommand,
} from '../../drawings';

const EMPTY_NATIVE_USER_DRAWING_AFFECTED_IDS: readonly string[] = [];

export interface NativeUserDrawingRuntimeInput {
  initialUserDrawingState?: UserDrawingState | null;
  onUserDrawingCommand?: UserDrawingCommandEventListener;
  onUserDrawingStateChange?: (state: UserDrawingState) => void;
}

export interface NativeUserDrawingRuntime {
  dispatchNativeUserDrawingCommand: (command: UserDrawingCommand) => boolean;
  dispatchNativeUserDrawingSelectedAction: (command: UserDrawingSelectedActionSurfaceCommand) => boolean;
  handleNativeUserDrawingInput: (point: UserDrawingInputPoint) => boolean;
  redoNativeUserDrawingCommand: () => boolean;
  replaceNativeUserDrawingState: (nextState?: UserDrawingState | null) => boolean;
  selectNativeUserDrawingAtPoint: (
    point: DrawingScreenPoint,
    spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  ) => UserDrawingSelectionAtPointResult;
  selectNativeUserDrawingTool: (tool: UserDrawingTool) => boolean;
  undoNativeUserDrawingCommand: () => boolean;
  userDrawingCommandAvailability: UserDrawingCommandAvailability;
  userDrawingRecentToolsByCategory: UserDrawingRecentToolByCategory;
  userDrawingState: UserDrawingState;
}

export interface NativeUserDrawingExternalStateResolution {
  changed: boolean;
  layoutChanged: boolean;
  state: UserDrawingState;
}

function isNativeUserDrawingRuntimeStateEqual(
  previousState: UserDrawingState,
  nextState: UserDrawingState,
): boolean {
  if (Object.is(previousState, nextState)) return true;
  return (
    !isNativeUserDrawingTransientStateChanged(previousState, nextState) &&
    isUserDrawingLayoutStateEqual(previousState, nextState)
  );
}

function isNativeUserDrawingTransientStateChanged(
  previousState: UserDrawingState,
  nextState: UserDrawingState,
): boolean {
  return (
    previousState.activeTool !== nextState.activeTool ||
    (previousState.measureMode ?? 'off') !== (nextState.measureMode ?? 'off') ||
    !areNativeUserDrawingMeasuresEqual(previousState.measure ?? null, nextState.measure ?? null) ||
    !areNativeUserDrawingSelectionsEqual(previousState.selection, nextState.selection) ||
    !areNativeUserDrawingDraftsEqual(previousState.draft, nextState.draft) ||
    !areNativeUserDrawingTextEditsEqual(previousState.textEdit, nextState.textEdit)
  );
}

function areNativeUserDrawingSelectionsEqual(
  previousSelection: UserDrawingSelection | null,
  nextSelection: UserDrawingSelection | null,
): boolean {
  if (Object.is(previousSelection, nextSelection)) return true;
  if (!previousSelection || !nextSelection) return false;
  return (
    previousSelection.drawingId === nextSelection.drawingId &&
    previousSelection.handle === nextSelection.handle &&
    previousSelection.pointIndex === nextSelection.pointIndex &&
    areNativeReadonlyArraysEqual(previousSelection.drawingIds ?? [], nextSelection.drawingIds ?? [], Object.is)
  );
}

function areNativeUserDrawingDraftsEqual(
  previousDraft: UserDrawingDraft | null,
  nextDraft: UserDrawingDraft | null,
): boolean {
  if (Object.is(previousDraft, nextDraft)) return true;
  if (!previousDraft || !nextDraft) return false;
  return (
    previousDraft.tool === nextDraft.tool &&
    previousDraft.paneId === nextDraft.paneId &&
    previousDraft.startedAt === nextDraft.startedAt &&
    previousDraft.text === nextDraft.text &&
    areNativeUserDrawingAnchorsEqual(previousDraft.anchors, nextDraft.anchors) &&
    areNativeUserDrawingPanePositionsEqual(previousDraft.positions ?? [], nextDraft.positions ?? []) &&
    areNativeUserDrawingBarsPatternBarsEqual(previousDraft.barsPatternBars ?? [], nextDraft.barsPatternBars ?? []) &&
    areNativeUserDrawingStylesEqual(previousDraft.style, nextDraft.style)
  );
}

function areNativeUserDrawingMeasuresEqual(
  previousMeasure: UserDrawingMeasure | null,
  nextMeasure: UserDrawingMeasure | null,
): boolean {
  if (Object.is(previousMeasure, nextMeasure)) return true;
  if (!previousMeasure || !nextMeasure) return false;
  return (
    previousMeasure.paneId === nextMeasure.paneId &&
    previousMeasure.startedAt === nextMeasure.startedAt &&
    areNativeUserDrawingAnchorsEqual(previousMeasure.anchors, nextMeasure.anchors) &&
    areNativeUserDrawingStylesEqual(previousMeasure.style, nextMeasure.style)
  );
}

function areNativeUserDrawingTextEditsEqual(
  previousTextEdit: UserDrawingTextEdit | null,
  nextTextEdit: UserDrawingTextEdit | null,
): boolean {
  if (Object.is(previousTextEdit, nextTextEdit)) return true;
  if (!previousTextEdit || !nextTextEdit) return false;
  return (
    previousTextEdit.drawingId === nextTextEdit.drawingId &&
    previousTextEdit.value === nextTextEdit.value &&
    previousTextEdit.originalValue === nextTextEdit.originalValue &&
    previousTextEdit.startedAt === nextTextEdit.startedAt
  );
}

function areNativeUserDrawingAnchorsEqual(
  previousAnchors: readonly UserDrawingAnchor[],
  nextAnchors: readonly UserDrawingAnchor[],
): boolean {
  return areNativeReadonlyArraysEqual(previousAnchors, nextAnchors, (previousAnchor, nextAnchor) =>
    Object.is(previousAnchor, nextAnchor) ||
    (previousAnchor.time === nextAnchor.time &&
      previousAnchor.price === nextAnchor.price &&
      previousAnchor.pressure === nextAnchor.pressure),
  );
}

function areNativeUserDrawingPanePositionsEqual(
  previousPositions: readonly UserDrawingPanePosition[],
  nextPositions: readonly UserDrawingPanePosition[],
): boolean {
  return areNativeReadonlyArraysEqual(previousPositions, nextPositions, (previousPosition, nextPosition) =>
    Object.is(previousPosition, nextPosition) ||
    (previousPosition.x === nextPosition.x && previousPosition.y === nextPosition.y),
  );
}

function areNativeUserDrawingBarsPatternBarsEqual(
  previousBars: NonNullable<UserDrawingDraft['barsPatternBars']>,
  nextBars: NonNullable<UserDrawingDraft['barsPatternBars']>,
): boolean {
  return areNativeReadonlyArraysEqual(
    previousBars,
    nextBars,
    (previousBar, nextBar) =>
      Object.is(previousBar, nextBar) ||
      (previousBar.time === nextBar.time &&
        previousBar.open === nextBar.open &&
        previousBar.high === nextBar.high &&
        previousBar.low === nextBar.low &&
        previousBar.close === nextBar.close),
  );
}

function areNativeUserDrawingStylesEqual(
  previousStyle: UserDrawingStyle,
  nextStyle: UserDrawingStyle,
): boolean {
  if (Object.is(previousStyle, nextStyle)) return true;
  const previousKeys = getNativeUserDrawingDefinedStyleKeys(previousStyle);
  const nextKeys = getNativeUserDrawingDefinedStyleKeys(nextStyle);
  if (previousKeys.length !== nextKeys.length) return false;
  return previousKeys.every((key) => Object.is(previousStyle[key], nextStyle[key]));
}

function getNativeUserDrawingDefinedStyleKeys(style: UserDrawingStyle): (keyof UserDrawingStyle)[] {
  return Object.keys(style).filter((key) => style[key as keyof UserDrawingStyle] !== undefined) as (
    keyof UserDrawingStyle
  )[];
}

function areNativeReadonlyArraysEqual<T>(
  previousItems: readonly T[],
  nextItems: readonly T[],
  compare: (previousItem: T, nextItem: T) => boolean,
): boolean {
  if (Object.is(previousItems, nextItems)) return true;
  if (previousItems.length !== nextItems.length) return false;
  return previousItems.every((previousItem, index) => compare(previousItem, nextItems[index]!));
}

function isUserDrawingZOrderAction(action: string): action is UserDrawingZOrderAction {
  return (
    action === 'bringForward' ||
    action === 'sendBackward' ||
    action === 'bringToFront' ||
    action === 'sendToBack'
  );
}

function didUserDrawingHistoryAvailabilityChange(
  previousHistory: ReturnType<typeof createUserDrawingCommandHistory>,
  nextHistory: ReturnType<typeof createUserDrawingCommandHistory>,
): boolean {
  return (
    canUndoUserDrawingCommand(previousHistory) !== canUndoUserDrawingCommand(nextHistory) ||
    canRedoUserDrawingCommand(previousHistory) !== canRedoUserDrawingCommand(nextHistory)
  );
}

export function createNativeUserDrawingNoAffectedToolbarCommandMetadata(): UserDrawingCommandMetadata {
  return { source: 'toolbar', affectedIds: EMPTY_NATIVE_USER_DRAWING_AFFECTED_IDS };
}

export function createNativeUserDrawingSelectedToolbarCommandMetadata(
  state: UserDrawingState,
): UserDrawingCommandMetadata {
  const affectedIds = getUserDrawingSelectionIds(state.selection);
  return {
    source: 'toolbar',
    affectedIds: affectedIds.length > 0 ? affectedIds : EMPTY_NATIVE_USER_DRAWING_AFFECTED_IDS,
  };
}

export function createNativeUserDrawingDuplicateSelectedToolbarCommand(
  state: UserDrawingState,
  createId: () => string,
  now: () => number,
): UserDrawingCommand {
  const affectedIds = [...getUserDrawingSelectionIds(state.selection)];
  return {
    type: 'duplicate',
    options: {
      createId: () => {
        const drawingId = createId();
        affectedIds.push(drawingId);
        return drawingId;
      },
      now,
    },
    meta: { source: 'toolbar', affectedIds },
  };
}

export function resolveNativeUserDrawingExternalState(
  previousState: UserDrawingState,
  externalState?: UserDrawingState | null,
): NativeUserDrawingExternalStateResolution {
  const nextState = createUserDrawingState(externalState ?? undefined);
  const changed = !isNativeUserDrawingRuntimeStateEqual(previousState, nextState);
  return {
    changed,
    layoutChanged: !isUserDrawingLayoutStateEqual(previousState, nextState),
    state: changed ? nextState : previousState,
  };
}

export function useNativeUserDrawingRuntime({
  initialUserDrawingState,
  onUserDrawingCommand,
  onUserDrawingStateChange,
}: NativeUserDrawingRuntimeInput): NativeUserDrawingRuntime {
  const [userDrawingState, setUserDrawingState] = useState(() =>
    createUserDrawingState(initialUserDrawingState ?? undefined),
  );
  const [userDrawingRecentToolsByCategory, setUserDrawingRecentToolsByCategory] =
    useState<UserDrawingRecentToolByCategory>({});
  const [historyRevision, bumpHistoryRevision] = useReducer((revision: number) => revision + 1, 0);
  const stateRef = useRef(userDrawingState);
  const historyRef = useRef(createUserDrawingCommandHistory());
  const clipboardRef = useRef<ReturnType<typeof createUserDrawingClipboard> | null>(null);
  const drawingIdSequenceRef = useRef(0);
  const lastInitialUserDrawingStateRef = useRef(initialUserDrawingState);
  const onCommandRef = useRef(onUserDrawingCommand);
  const onStateChangeRef = useRef(onUserDrawingStateChange);

  useEffect(() => {
    stateRef.current = userDrawingState;
  }, [userDrawingState]);

  useEffect(() => {
    onCommandRef.current = onUserDrawingCommand;
  }, [onUserDrawingCommand]);

  useEffect(() => {
    onStateChangeRef.current = onUserDrawingStateChange;
  }, [onUserDrawingStateChange]);

  useEffect(() => {
    if (Object.is(lastInitialUserDrawingStateRef.current, initialUserDrawingState)) return;
    lastInitialUserDrawingStateRef.current = initialUserDrawingState;
    const previousState = stateRef.current;
    const result = resolveNativeUserDrawingExternalState(previousState, initialUserDrawingState);
    if (!result.changed) return;

    const previousHistory = historyRef.current;
    const nextHistory = result.layoutChanged
      ? createUserDrawingCommandHistory({ capacity: previousHistory.capacity })
      : previousHistory;
    historyRef.current = nextHistory;
    stateRef.current = result.state;
    setUserDrawingState(result.state);

    if (result.layoutChanged) {
      const event = createUserDrawingReplaceStateCommandEvent(previousState, result.state, {
        type: 'replaceState',
        meta: { source: 'layout' },
      });
      if (event) onCommandRef.current?.(event);
      if (didUserDrawingHistoryAvailabilityChange(previousHistory, nextHistory)) {
        bumpHistoryRevision();
      }
    }
  }, [initialUserDrawingState]);

  const setNativeUserDrawingState = useCallback((nextState: UserDrawingState) => {
    stateRef.current = nextState;
    setUserDrawingState(nextState);
    onStateChangeRef.current?.(nextState);
  }, []);

  const dispatchNativeUserDrawingCommandResult = useCallback(
    (command: UserDrawingCommand): UserDrawingCommandDispatchResult => {
      const previousState = stateRef.current;
      const previousHistory = historyRef.current;
      const result = dispatchUserDrawingCommandWithHistory(previousState, previousHistory, command);
      historyRef.current = result.history;

      if (result.changed) {
        setNativeUserDrawingState(result.state);
        const event = createUserDrawingCommandEvent(previousState, result);
        if (event) onCommandRef.current?.(event);
      }

      if (didUserDrawingHistoryAvailabilityChange(previousHistory, result.history)) {
        bumpHistoryRevision();
      }
      return result;
    },
    [setNativeUserDrawingState],
  );

  const dispatchNativeUserDrawingCommand = useCallback(
    (command: UserDrawingCommand) => dispatchNativeUserDrawingCommandResult(command).changed,
    [dispatchNativeUserDrawingCommandResult],
  );

  const selectNativeUserDrawingTool = useCallback(
    (tool: UserDrawingTool) => {
      const category = getUserDrawingToolCategoryDescriptorForTool(tool);
      if (category) {
        setUserDrawingRecentToolsByCategory((current) =>
          current[category.id] === tool ? current : { ...current, [category.id]: tool },
        );
      }
      return dispatchNativeUserDrawingCommand({
        type: 'setActiveTool',
        tool,
        meta: { source: 'toolbar' },
      });
    },
    [dispatchNativeUserDrawingCommand],
  );

  const createNativeUserDrawingId = useCallback(() => {
    const existingIds = new Set(stateRef.current.drawings.map((drawing) => drawing.id));
    let drawingId = '';
    do {
      drawingIdSequenceRef.current += 1;
      drawingId = `drawing_${drawingIdSequenceRef.current}`;
    } while (existingIds.has(drawingId));
    return drawingId;
  }, []);

  const handleNativeUserDrawingInput = useCallback(
    (point: UserDrawingInputPoint) =>
      dispatchNativeUserDrawingCommand({
        type: 'handleInput',
        point,
        options: {
          createId: createNativeUserDrawingId,
          now: () => Date.now(),
        },
        meta: { source: 'touch' },
      }),
    [createNativeUserDrawingId, dispatchNativeUserDrawingCommand],
  );

  const selectNativeUserDrawingAtPoint = useCallback(
    (
      point: DrawingScreenPoint,
      spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
    ): UserDrawingSelectionAtPointResult => {
      const result = dispatchNativeUserDrawingCommandResult({
        type: 'selectAtPoint',
        point,
        spacesByPaneId,
        options: {
          toggleSelected: true,
          hitTest: {
            handleTolerance: 12,
            labelHeight: 20,
            tolerance: 10,
          },
        },
        meta: { source: 'touch' },
      });
      return {
        state: result.state,
        hit: result.hit === true,
        changed: result.changed,
      };
    },
    [dispatchNativeUserDrawingCommandResult],
  );

  const dispatchNativeUserDrawingSelectedAction = useCallback(
    (command: UserDrawingSelectedActionSurfaceCommand): boolean => {
      const now = () => Date.now();
      const selectedMeta = createNativeUserDrawingSelectedToolbarCommandMetadata(stateRef.current);
      switch (command.type) {
        case 'toolbarAction':
          if (command.action === 'duplicateSelected') {
            return dispatchNativeUserDrawingCommand(
              createNativeUserDrawingDuplicateSelectedToolbarCommand(stateRef.current, createNativeUserDrawingId, now),
            );
          }
          if (command.action === 'deleteSelected') {
            return dispatchNativeUserDrawingCommand({
              type: 'delete',
              meta: selectedMeta,
            });
          }
          if (isUserDrawingZOrderAction(command.action)) {
            return dispatchNativeUserDrawingCommand({
              type: 'reorder',
              action: command.action,
              options: { now },
              meta: selectedMeta,
            });
          }
          return false;
        case 'styleAction': {
          let changed = false;
          if (command.visible !== undefined) {
            changed = dispatchNativeUserDrawingCommand({
              type: 'setVisibility',
              visible: command.visible,
              options: { includeLocked: command.includeLocked, now },
              meta: selectedMeta,
            }) || changed;
          }
          if (command.locked !== undefined) {
            changed = dispatchNativeUserDrawingCommand({
              type: 'setLocked',
              locked: command.locked,
              options: { includeLocked: command.includeLocked, now },
              meta: selectedMeta,
            }) || changed;
          }
          return changed;
        }
        case 'updateStyle':
          return dispatchNativeUserDrawingCommand({
            type: 'updateStyle',
            style: command.style,
            options: { now },
            meta: selectedMeta,
          });
        case 'setTextAlign':
          return dispatchNativeUserDrawingCommand({
            type: 'setTextAlign',
            textAlign: command.textAlign,
            options: { now },
            meta: selectedMeta,
          });
        case 'setTrendLineExtend':
          return dispatchNativeUserDrawingCommand({
            type: 'setTrendLineExtend',
            extend: command.extend,
            options: { now },
            meta: selectedMeta,
          });
        case 'setIconName':
          return dispatchNativeUserDrawingCommand({
            type: 'setIconName',
            iconName: command.iconName,
            options: { now },
            meta: selectedMeta,
          });
        case 'editText':
          return false;
        case 'copySelected':
          clipboardRef.current = createUserDrawingClipboard(stateRef.current);
          return clipboardRef.current !== null;
        case 'saveSelectedStyleAsDefault': {
          const selectedDrawing = getSelectedUserDrawing(stateRef.current);
          if (!selectedDrawing) return false;
          return dispatchNativeUserDrawingCommand({
            type: 'setDefaultStyleByKind',
            kind: selectedDrawing.kind,
            style: selectedDrawing.style,
            meta: createNativeUserDrawingNoAffectedToolbarCommandMetadata(),
          });
        }
        case 'openProperties':
        case 'openObjectTree':
        case 'setDuplicateEditDrag':
          return false;
      }
    },
    [createNativeUserDrawingId, dispatchNativeUserDrawingCommand],
  );

  const undoNativeUserDrawingCommand = useCallback(() => {
    const previousState = stateRef.current;
    const previousHistory = historyRef.current;
    const result = undoUserDrawingCommand(previousState, previousHistory);
    historyRef.current = result.history;

    if (result.changed) {
      setNativeUserDrawingState(result.state);
      const event = createUserDrawingHistoryCommandEvent(previousState, result.state, {
        type: 'undo',
        meta: { source: 'toolbar' },
      }, true);
      if (event) onCommandRef.current?.(event);
    }

    if (didUserDrawingHistoryAvailabilityChange(previousHistory, result.history)) {
      bumpHistoryRevision();
    }
    return result.changed;
  }, [setNativeUserDrawingState]);

  const redoNativeUserDrawingCommand = useCallback(() => {
    const previousState = stateRef.current;
    const previousHistory = historyRef.current;
    const result = redoUserDrawingCommand(previousState, previousHistory);
    historyRef.current = result.history;

    if (result.changed) {
      setNativeUserDrawingState(result.state);
      const event = createUserDrawingHistoryCommandEvent(previousState, result.state, {
        type: 'redo',
        meta: { source: 'toolbar' },
      }, true);
      if (event) onCommandRef.current?.(event);
    }

    if (didUserDrawingHistoryAvailabilityChange(previousHistory, result.history)) {
      bumpHistoryRevision();
    }
    return result.changed;
  }, [setNativeUserDrawingState]);

  const replaceNativeUserDrawingState = useCallback(
    (nextState?: UserDrawingState | null): boolean => {
      const previousState = stateRef.current;
      const nextStateValue = createUserDrawingState(nextState ?? undefined);
      if (isNativeUserDrawingRuntimeStateEqual(previousState, nextStateValue)) return false;

      const previousHistory = historyRef.current;
      const nextHistory = isUserDrawingLayoutStateEqual(previousState, nextStateValue)
        ? previousHistory
        : createUserDrawingCommandHistory({ capacity: previousHistory.capacity });
      historyRef.current = nextHistory;
      setNativeUserDrawingState(nextStateValue);

      const event = createUserDrawingReplaceStateCommandEvent(previousState, nextStateValue, {
        type: 'replaceState',
        meta: { source: 'layout' },
      });
      if (event) onCommandRef.current?.(event);
      if (didUserDrawingHistoryAvailabilityChange(previousHistory, nextHistory)) {
        bumpHistoryRevision();
      }
      return true;
    },
    [setNativeUserDrawingState],
  );

  const userDrawingCommandAvailability = useMemo(
    () => ({
      canUndo: canUndoUserDrawingCommand(historyRef.current),
      canRedo: canRedoUserDrawingCommand(historyRef.current),
    }),
    [historyRevision],
  );

  return {
    dispatchNativeUserDrawingCommand,
    dispatchNativeUserDrawingSelectedAction,
    handleNativeUserDrawingInput,
    redoNativeUserDrawingCommand,
    replaceNativeUserDrawingState,
    selectNativeUserDrawingAtPoint,
    selectNativeUserDrawingTool,
    undoNativeUserDrawingCommand,
    userDrawingCommandAvailability,
    userDrawingRecentToolsByCategory,
    userDrawingState,
  };
}
