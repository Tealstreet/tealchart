import type {
  ExecutionLineRenderData,
  OrderLineRenderData,
  PositionLineRenderData,
} from '../../types';
import type { TealchartApi } from '../../TealchartApi';
import type {
  NativeBracketDragInteractionState,
  NativeOrderDragInteractionState,
  NativeTradeLineBracketType,
} from './nativeOemsDragState';
import type {
  NativeTradeLineActionType,
  NativeTradeLineObjectType,
} from '../utils/tradeLineLayout';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { OemsActionSettlement } from '../../interaction/oemsActionManager';
import { OemsActionManager } from '../../interaction/oemsActionManager';
import {
  getOemsOrderLineState,
  getOemsOrderObjectId,
  getOemsPositionLineState,
  getOemsPositionObjectId,
} from '../../interaction/oemsLineState';
import { getTealchartApiLineRenderSnapshot } from '../../TealchartApi';
import { reuseNativeRenderList } from '../utils/nativeLineSnapshotReuse';
import {
  getNativeOrderObjectId,
  getNativePositionObjectId,
} from '../utils/tradeLineLayout';
import {
  clearNativeBracketDragState,
  clearNativeOrderDragState,
  shouldClearNativeBracketDragForSnapshot,
  shouldClearNativeOrderDragForSnapshot,
} from './nativeOemsDragState';
import {
  startNativeBracketMoveAction,
  startNativeOrderMoveAction,
  startNativeTradeLineAction,
} from './nativeOemsLineActions';
import {
  applyNativeOrderActionState,
  applyNativePositionActionState,
  confirmNativeOrderLineSnapshots,
  confirmNativePositionLineSnapshots,
  type NativeOemsTradingLineState,
} from './nativeOemsLineState';
import { createNativeReleaseHold, resolveNativeReleaseHold, type NativeReleaseHold } from './nativeReleaseHold';

/** Long enough that a normal venue round trip never hits it, short enough that a
 *  stranded preview is not left on the chart. */
const NATIVE_BRACKET_PREVIEW_HANDOFF_TIMEOUT_MS = 6000;

export interface NativeOemsDragHandoff {
  objectId: string;
}

export interface NativeOemsBracketDragHandoff {
  objectId: string;
  objectType: NativeTradeLineObjectType;
  seq: number;
}

/**
 * Decides when a committed drag lets go of its line.
 *
 * Three states, and the third is the one that gets forgotten. A live gesture
 * owns its line outright. A pending action means the optimistic price is drawn,
 * so the preview has somewhere to hand off to. And an action that is simply
 * *gone* - a rejected callback, a `false`, a timeout - has to release too, or
 * the preview keeps drawing where the user dropped it while its drag zone stays
 * at the price the venue still holds. The line then looks solid and untouchable:
 * every tap lands on empty chart, because the line is not where it appears.
 *
 * `handoff` is set only between a commit and the projection catching up, which
 * is what stops the gone-action branch from retiring a preview whose action has
 * not been started yet - the commit reaches JS a frame after the finger lifts.
 */
export function shouldReleaseNativeOrderDragForSnapshot({
  dragActive,
  handoff,
  hasAction,
  pendingObserved,
}: {
  dragActive: boolean;
  handoff: NativeOemsDragHandoff | null;
  hasAction: (objectId: string) => boolean;
  pendingObserved: boolean;
}): boolean {
  if (dragActive) return false;
  if (pendingObserved) return true;
  return handoff !== null && !hasAction(handoff.objectId);
}

/**
 * The same retirement, decided from a settle rather than a snapshot.
 *
 * A settle fires for a confirm, a `false`, a rejection and a timeout alike, so
 * it is the deterministic signal; a snapshot is not, because a cancelled move
 * rolls the price back to what it already was and the snapshot never changes.
 */
export function shouldReleaseNativeOrderDragOnSettle({
  dragActive,
  handoff,
  objectId,
  objectType,
}: {
  dragActive: boolean;
  handoff: NativeOemsDragHandoff | null;
  objectId: string;
  objectType: string;
}): boolean {
  if (objectType !== 'order') return false;
  if (handoff === null || handoff.objectId !== objectId) return false;
  // Nothing retires a live gesture - see shouldReleaseNativeOrderDragForSnapshot.
  return !dragActive;
}

export interface NativeOemsLineSnapshot {
  orderLines: readonly OrderLineRenderData[];
  positionLines: readonly PositionLineRenderData[];
  executionLines: readonly ExecutionLineRenderData[];
}

export interface NativeOemsLineRuntimeInput {
  bracketDragInteractionState: NativeBracketDragInteractionState;
  chartApi: TealchartApi;
  forceUpdate: () => void;
  orderDragState: NativeOrderDragInteractionState;
  pricePrecision: number;
}

export interface NativeOemsLineRuntime {
  clearNativeBracketDrag: () => void;
  clearNativeOrderDrag: () => void;
  commitBracketMove: (
    objectType: NativeTradeLineObjectType,
    objectId: string,
    bracketType: NativeTradeLineBracketType,
    price: number,
    partialPercent?: number,
  ) => void;
  commitOrderMove: (objectId: string, nextPrice: number) => void;
  commitTradeLineAction: (
    objectType: NativeTradeLineObjectType,
    objectId: string,
    actionType: NativeTradeLineActionType,
  ) => void;
  lineSnapshot: NativeOemsLineSnapshot;
  syncNativeOemsDragStateForSnapshot: () => void;
}

export function useNativeOemsLineRuntime({
  bracketDragInteractionState,
  chartApi,
  forceUpdate,
  orderDragState,
  pricePrecision,
}: NativeOemsLineRuntimeInput): NativeOemsLineRuntime {
  // The manager is built once but the tick follows the symbol, so it reads a ref.
  const pricePrecisionRef = useRef(pricePrecision);
  pricePrecisionRef.current = pricePrecision;
  const oemsActionsRef = useRef<OemsActionManager<NativeOemsTradingLineState> | null>(null);
  // Built once, so the settle handler is reached through a ref that each render
  // refreshes - see where it is assigned for why the settle is load-bearing.
  const onOemsActionSettledRef = useRef<((settlement: OemsActionSettlement<NativeOemsTradingLineState>) => void) | null>(
    null,
  );
  if (!oemsActionsRef.current) {
    oemsActionsRef.current = new OemsActionManager<NativeOemsTradingLineState>({
      priceTolerance: () => pricePrecisionRef.current,
      onChange: forceUpdate,
      onSettle: (settlement) => onOemsActionSettledRef.current?.(settlement),
    });
  }
  const oemsActions = oemsActionsRef.current;
  const latestOrderLinesRef = useRef<OrderLineRenderData[]>([]);
  const latestPositionLinesRef = useRef<PositionLineRenderData[]>([]);
  // Set only between an order commit and the projection carrying its price.
  const orderHandoffRef = useRef<{ objectId: string } | null>(null);
  // Set only between a bracket commit and the projection carrying its price.
  const bracketHandoffRef = useRef<{
    objectId: string;
    objectType: NativeTradeLineObjectType;
    seq: number;
  } | null>(null);
  const [orderPreviewReleaseHold, setOrderPreviewReleaseHold] =
    useState<NativeReleaseHold<NativeOemsDragHandoff> | null>(null);
  const [bracketPreviewReleaseHold, setBracketPreviewReleaseHold] =
    useState<NativeReleaseHold<NativeOemsBracketDragHandoff> | null>(null);
  const releaseHoldTokenRef = useRef(0);
  const createReleaseHoldToken = useCallback(() => {
    releaseHoldTokenRef.current += 1;
    return releaseHoldTokenRef.current;
  }, []);
  const bracketHandoffSeqRef = useRef(0);
  const rawLineSnapshot = getTealchartApiLineRenderSnapshot(chartApi);

  useEffect(() => {
    confirmNativeOrderLineSnapshots(oemsActions, rawLineSnapshot.orderLines);
    confirmNativePositionLineSnapshots(oemsActions, rawLineSnapshot.positionLines);
  }, [oemsActions, rawLineSnapshot.orderLines, rawLineSnapshot.positionLines]);


  // Rebuilt every render on purpose: the action-state pass reads live manager
  // state, and memoising the build would strand a pending order at its old
  // price. Only the identities are held, so the geometry memos downstream -
  // which measure Skia text - stop recomputing on renders that changed no line.
  const previousLineSnapshotRef = useRef<NativeOemsLineSnapshot | null>(null);
  const previousLineSnapshot = previousLineSnapshotRef.current;
  const orderLines = reuseNativeRenderList(
    previousLineSnapshot?.orderLines,
    rawLineSnapshot.orderLines.map((line) => applyNativeOrderActionState(line, oemsActions)),
  );
  const positionLines = reuseNativeRenderList(
    previousLineSnapshot?.positionLines,
    rawLineSnapshot.positionLines.map((line) => applyNativePositionActionState(line, oemsActions)),
  );
  const executionLines = reuseNativeRenderList(previousLineSnapshot?.executionLines, rawLineSnapshot.executionLines);
  const lineSnapshot = useMemo<NativeOemsLineSnapshot>(
    () => ({ orderLines, positionLines, executionLines }),
    [executionLines, orderLines, positionLines],
  );
  previousLineSnapshotRef.current = lineSnapshot;

  useEffect(() => {
    latestOrderLinesRef.current = rawLineSnapshot.orderLines;
    latestPositionLinesRef.current = rawLineSnapshot.positionLines;
  }, [rawLineSnapshot.orderLines, rawLineSnapshot.positionLines]);

  const clearNativeOrderDrag = useCallback(() => {
    orderHandoffRef.current = null;
    setOrderPreviewReleaseHold(null);
    clearNativeOrderDragState(orderDragState);
  }, [orderDragState]);

  /**
   * Hands the line back a frame late, on purpose.
   *
   * `livePrice` mixes a shared value with a captured one: it reads the drag off
   * `dragState` but falls back to `line.price` from its closure. Clearing the
   * drag re-evaluates that worklet on the UI thread immediately, while the
   * closure carrying the optimistic price only reaches the UI thread on
   * Reanimated's next propagation - so the line drew one frame at its ORIGINAL
   * price before the new one landed. That is the flap on release.
   *
   * Waiting a frame lets the closure catch up first, so the drag lets go of a
   * line that is already drawn where the user dropped it.
   */
  const releaseNativeOrderDragAfterCommit = useCallback(
    (handoff: NativeOemsDragHandoff | null) => {
      if (!handoff) {
        clearNativeOrderDragState(orderDragState);
        return;
      }
      setOrderPreviewReleaseHold(
        createNativeReleaseHold({
          kind: 'oemsOrderPreview',
          target: handoff,
          token: createReleaseHoldToken(),
        }),
      );
    },
    [createReleaseHoldToken, orderDragState],
  );

  useLayoutEffect(() => {
    if (!orderPreviewReleaseHold) return;
    const resolution = resolveNativeReleaseHold({ caughtUp: true, hold: orderPreviewReleaseHold });
    if (resolution.hold === orderPreviewReleaseHold) return;
    setOrderPreviewReleaseHold(resolution.hold);
    if (resolution.released) {
      clearNativeOrderDragState(orderDragState);
    }
  }, [orderDragState, orderPreviewReleaseHold]);

  /** The bracket preview's version of the same hand-off, for the same reason:
   *  the line's optimistic bracket arrives by closure, the preview goes away by
   *  shared value. */
  const releaseNativeBracketDragAfterCommit = useCallback(
    (handoff: NativeOemsBracketDragHandoff | null) => {
      if (!handoff) {
        clearNativeBracketDragState(bracketDragInteractionState);
        return;
      }
      setBracketPreviewReleaseHold(
        createNativeReleaseHold({
          kind: 'oemsBracketPreview',
          target: handoff,
          token: createReleaseHoldToken(),
        }),
      );
    },
    [bracketDragInteractionState, createReleaseHoldToken],
  );

  useLayoutEffect(() => {
    if (!bracketPreviewReleaseHold) return;
    const resolution = resolveNativeReleaseHold({ caughtUp: true, hold: bracketPreviewReleaseHold });
    if (resolution.hold === bracketPreviewReleaseHold) return;
    setBracketPreviewReleaseHold(resolution.hold);
    if (resolution.released) {
      clearNativeBracketDragState(bracketDragInteractionState);
    }
  }, [bracketDragInteractionState, bracketPreviewReleaseHold]);

  const clearNativeBracketDrag = useCallback(() => {
    setBracketPreviewReleaseHold(null);
    clearNativeBracketDragState(bracketDragInteractionState);
  }, [bracketDragInteractionState]);

  const commitOrderMove = useCallback(
    (objectId: string, nextPrice: number) => {
      const result = startNativeOrderMoveAction({
        manager: oemsActions,
        orderLines: latestOrderLinesRef.current,
        objectId,
        nextPrice,
      });
      if (result.clearDrag) {
        clearNativeOrderDrag();
      } else {
        orderHandoffRef.current = { objectId };
      }
      if (result.forceUpdate) {
        forceUpdate();
      }
    },
    [clearNativeOrderDrag, forceUpdate, oemsActions],
  );

  const commitBracketMove = useCallback(
    (
      objectType: NativeTradeLineObjectType,
      objectId: string,
      bracketType: NativeTradeLineBracketType,
      price: number,
      partialPercent?: number,
    ) => {
      const result = startNativeBracketMoveAction({
        manager: oemsActions,
        orderLines: latestOrderLinesRef.current,
        positionLines: latestPositionLinesRef.current,
        objectType,
        objectId,
        bracketType,
        price,
        partialPercent,
      });
      if (result.clearDrag) {
        bracketHandoffRef.current = null;
        clearNativeBracketDrag();
      } else {
        // Sequenced so a second drag voids the first drag's timeout: without it
        // a re-drag of the same object inherits a timer that fires mid-gesture
        // and drops the edit.
        const seq = bracketHandoffSeqRef.current + 1;
        bracketHandoffSeqRef.current = seq;
        bracketHandoffRef.current = { objectId, objectType, seq };
        setTimeout(() => {
          if (bracketHandoffRef.current?.seq !== seq) return;
          bracketHandoffRef.current = null;
          clearNativeBracketDrag();
        }, NATIVE_BRACKET_PREVIEW_HANDOFF_TIMEOUT_MS);
      }
      if (result.forceUpdate) {
        forceUpdate();
      }
    },
    [clearNativeBracketDrag, forceUpdate, oemsActions],
  );

  const commitTradeLineAction = useCallback(
    (objectType: NativeTradeLineObjectType, objectId: string, actionType: NativeTradeLineActionType) => {
      const result = startNativeTradeLineAction({
        manager: oemsActions,
        orderLines: latestOrderLinesRef.current,
        positionLines: latestPositionLinesRef.current,
        objectType,
        objectId,
        actionType,
      });
      if (result.forceUpdate) forceUpdate();
    },
    [forceUpdate, oemsActions],
  );

  const syncNativeOrderDragStateForSnapshot = useCallback(() => {
    const release = shouldReleaseNativeOrderDragForSnapshot({
      dragActive: orderDragState.active.value,
      handoff: orderHandoffRef.current,
      hasAction: (objectId) => oemsActions.getAction('order', objectId) !== null,
      pendingObserved: shouldClearNativeOrderDragForSnapshot({
        state: orderDragState,
        orderLines: lineSnapshot.orderLines,
        getOrderObjectId: getNativeOrderObjectId,
      }),
    });
    if (!release) return;

    const handoff = orderHandoffRef.current;
    orderHandoffRef.current = null;
    releaseNativeOrderDragAfterCommit(handoff);
  }, [lineSnapshot.orderLines, oemsActions, orderDragState, releaseNativeOrderDragAfterCommit]);

  /**
   * The preview also has to retire on the settle, not only on a snapshot.
   *
   * `syncNativeOrderDragStateForSnapshot` is the only caller of the release
   * predicate, and it runs from a layout effect keyed on the snapshot's order
   * lines. A cancelled move settles by rolling the optimistic price back, so the
   * snapshot comes back byte-identical, `reuseNativeRenderList` hands back the
   * previous array, the effect never re-runs and the predicate is never asked.
   * The preview then keeps drawing at the dropped price until some unrelated
   * tick changes the snapshot - there is no timeout on it, unlike the bracket's.
   *
   * Settling is the deterministic signal: it fires for a confirm, a `false`, a
   * rejection and a timeout alike. The live-gesture guard stays, because nothing
   * may retire a drag the finger is still in.
   */
  onOemsActionSettledRef.current = (settlement) => {
    const release = shouldReleaseNativeOrderDragOnSettle({
      dragActive: orderDragState.active.value,
      handoff: orderHandoffRef.current,
      objectId: settlement.action.objectId,
      objectType: settlement.action.objectType,
    });
    if (!release) return;

    const handoff = orderHandoffRef.current;
    orderHandoffRef.current = null;
    releaseNativeOrderDragAfterCommit(handoff);
  };

  const syncNativeBracketDragStateForSnapshot = useCallback(() => {
    // Nothing retires a live gesture - see `shouldClearNativeOrderDragForSnapshot`.
    if (bracketDragInteractionState.active.value) return;

    const pendingObserved = shouldClearNativeBracketDragForSnapshot({
      state: bracketDragInteractionState,
      orderLines: lineSnapshot.orderLines,
      positionLines: lineSnapshot.positionLines,
      getOrderObjectId: getNativeOrderObjectId,
      getPositionObjectId: getNativePositionObjectId,
    });
    // `handoff` is set only between a commit and the projection catching up, so
    // this cannot retire a preview whose action has not been started yet. Within
    // that window a bracket action settles on its callback rather than on the
    // feed, so it can be gone before any render sees it pending - retiring on
    // "no action either" is what keeps that case off the timeout.
    const handoff = bracketHandoffRef.current;
    const settled = handoff ? !oemsActions.getAction(handoff.objectType, handoff.objectId) : false;
    if (!pendingObserved && !settled) return;

    const handoffToRelease = bracketHandoffRef.current;
    bracketHandoffRef.current = null;
    releaseNativeBracketDragAfterCommit(handoffToRelease);
  }, [
    bracketDragInteractionState,
    releaseNativeBracketDragAfterCommit,
    lineSnapshot.orderLines,
    lineSnapshot.positionLines,
    oemsActions,
  ]);

  const syncNativeOemsDragStateForSnapshot = useCallback(() => {
    syncNativeOrderDragStateForSnapshot();
    syncNativeBracketDragStateForSnapshot();
  }, [syncNativeBracketDragStateForSnapshot, syncNativeOrderDragStateForSnapshot]);

  return {
    clearNativeBracketDrag,
    clearNativeOrderDrag,
    commitBracketMove,
    commitOrderMove,
    commitTradeLineAction,
    lineSnapshot,
    syncNativeOemsDragStateForSnapshot,
  };
}
