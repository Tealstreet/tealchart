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

export interface NativeOemsLineSnapshot {
  orderLines: readonly OrderLineRenderData[];
  positionLines: readonly PositionLineRenderData[];
  executionLines: readonly ExecutionLineRenderData[];
}

export interface NativeOemsLineRuntimeInput {
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
        clearNativeBracketDrag();
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
    if (
      shouldClearNativeBracketDragForSnapshot({
        state: bracketDragState,
        orderLines: lineSnapshot.orderLines,
        positionLines: lineSnapshot.positionLines,
        getOrderObjectId: getNativeOrderObjectId,
        getPositionObjectId: getNativePositionObjectId,
      })
    ) {
      clearNativeBracketDrag();
    }
  }, [bracketDragState, clearNativeBracketDrag, lineSnapshot.orderLines, lineSnapshot.positionLines]);

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
