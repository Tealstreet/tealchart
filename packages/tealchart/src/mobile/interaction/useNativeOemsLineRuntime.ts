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

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { OemsActionManager } from '../../interaction/oemsActionManager';
import {
  getOemsOrderLineState,
  getOemsOrderObjectId,
  getOemsPositionLineState,
  getOemsPositionObjectId,
} from '../../interaction/oemsLineState';
import { getTealchartApiLineRenderSnapshot } from '../../TealchartApi';
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

/** Long enough that a normal venue round trip never hits it, short enough that a
 *  stranded preview is not left on the chart. */
const NATIVE_BRACKET_PREVIEW_HANDOFF_TIMEOUT_MS = 6000;

export interface NativeOemsDragHandoff {
  objectId: string;
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
  if (!oemsActionsRef.current) {
    oemsActionsRef.current = new OemsActionManager<NativeOemsTradingLineState>({
      priceTolerance: () => pricePrecisionRef.current,
      onChange: forceUpdate,
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
  const bracketHandoffSeqRef = useRef(0);
  const rawLineSnapshot = getTealchartApiLineRenderSnapshot(chartApi);

  useEffect(() => {
    confirmNativeOrderLineSnapshots(oemsActions, rawLineSnapshot.orderLines);
    confirmNativePositionLineSnapshots(oemsActions, rawLineSnapshot.positionLines);
  }, [oemsActions, rawLineSnapshot.orderLines, rawLineSnapshot.positionLines]);


  const lineSnapshot = useMemo(
    () => ({

      orderLines: rawLineSnapshot.orderLines.map((line) => applyNativeOrderActionState(line, oemsActions)),
      positionLines: rawLineSnapshot.positionLines.map((line) => applyNativePositionActionState(line, oemsActions)),
      executionLines: rawLineSnapshot.executionLines,
    }),
    [oemsActions, rawLineSnapshot.executionLines, rawLineSnapshot.orderLines, rawLineSnapshot.positionLines],
  );

  useEffect(() => {
    latestOrderLinesRef.current = rawLineSnapshot.orderLines;
    latestPositionLinesRef.current = rawLineSnapshot.positionLines;
  }, [rawLineSnapshot.orderLines, rawLineSnapshot.positionLines]);

  const clearNativeOrderDrag = useCallback(() => {
    orderHandoffRef.current = null;
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
  const releaseNativeOrderDragAfterCommit = useCallback(() => {
    requestAnimationFrame(() => {
      clearNativeOrderDragState(orderDragState);
    });
  }, [orderDragState]);

  const clearNativeBracketDrag = useCallback(() => {
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

    orderHandoffRef.current = null;
    releaseNativeOrderDragAfterCommit();
  }, [lineSnapshot.orderLines, oemsActions, orderDragState, releaseNativeOrderDragAfterCommit]);

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

    bracketHandoffRef.current = null;
    clearNativeBracketDrag();
  }, [
    bracketDragInteractionState,
    clearNativeBracketDrag,
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
