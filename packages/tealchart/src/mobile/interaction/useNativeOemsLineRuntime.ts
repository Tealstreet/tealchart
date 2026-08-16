import type { OemsLineIdentities } from '../../interaction/oemsLineState';
import type {
  ExecutionLineRenderData,
  OrderLineRenderData,
  PositionLineRenderData,
} from '../../types';
import type { TealchartApi } from '../../TealchartApi';
import type {
  NativeBracketDragInteractionState,
  NativeBracketDragSharedValues,
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
  defaultOemsOrderIdentity,
  defaultOemsPositionIdentity,
  getOemsOrderObjectId,
  getOemsPositionLineState,
  getOemsPositionObjectId,
  OemsLineHold,
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

export interface NativeOemsLineSnapshot {
  orderLines: readonly OrderLineRenderData[];
  positionLines: readonly PositionLineRenderData[];
  executionLines: readonly ExecutionLineRenderData[];
}

export interface NativeOemsLineRuntimeInput {
  /**
   * Opt in to holding a dragged line through a cancel-and-replace amend.
   *
   * Supply this only when your ids change across an amend. A host that keeps
   * its own optimistic row under the original id should leave it unset: the
   * chart will trust the ids it is given and hold nothing.
   */
  oemsLineIdentity?: OemsLineIdentities;
  bracketDragInteractionState: NativeBracketDragInteractionState;
  bracketDragState: NativeBracketDragSharedValues;
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
  oemsLineIdentity,
  bracketDragInteractionState,
  bracketDragState,
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

  // Held across renders: the hold has to remember the line that just left the
  // feed, and a fresh projector every render would have nothing to remember.
  const orderHoldRef = useRef<OemsLineHold<OrderLineRenderData> | null>(null);
  if (!orderHoldRef.current) {
    orderHoldRef.current = new OemsLineHold(
      'order',
      getOemsOrderObjectId,
      getOemsOrderLineState,
      applyNativeOrderActionState,
      oemsLineIdentity?.order ?? defaultOemsOrderIdentity,
    );
  }
  const positionHoldRef = useRef<OemsLineHold<PositionLineRenderData> | null>(null);
  if (!positionHoldRef.current) {
    positionHoldRef.current = new OemsLineHold(
      'position',
      getOemsPositionObjectId,
      getOemsPositionLineState,
      applyNativePositionActionState,
      oemsLineIdentity?.position ?? defaultOemsPositionIdentity,
    );
  }

  const lineSnapshot = useMemo(
    () => ({
      orderLines: orderHoldRef.current!.project(rawLineSnapshot.orderLines, oemsActions),
      positionLines: positionHoldRef.current!.project(rawLineSnapshot.positionLines, oemsActions),
      executionLines: rawLineSnapshot.executionLines,
    }),
    [oemsActions, rawLineSnapshot.executionLines, rawLineSnapshot.orderLines, rawLineSnapshot.positionLines],
  );

  useEffect(() => {
    latestOrderLinesRef.current = rawLineSnapshot.orderLines;
    latestPositionLinesRef.current = rawLineSnapshot.positionLines;
  }, [rawLineSnapshot.orderLines, rawLineSnapshot.positionLines]);

  const clearNativeOrderDrag = useCallback(() => {
    clearNativeOrderDragState(orderDragState);
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
    if (
      shouldClearNativeOrderDragForSnapshot({
        state: orderDragState,
        orderLines: lineSnapshot.orderLines,
        getOrderObjectId: getNativeOrderObjectId,
      })
    ) {
      clearNativeOrderDrag();
    }
  }, [clearNativeOrderDrag, lineSnapshot.orderLines, orderDragState]);

  const syncNativeBracketDragStateForSnapshot = useCallback(() => {
    const pendingObserved = shouldClearNativeBracketDragForSnapshot({
      state: bracketDragState,
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
  }, [bracketDragState, clearNativeBracketDrag, lineSnapshot.orderLines, lineSnapshot.positionLines, oemsActions]);

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
