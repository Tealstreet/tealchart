import type { OemsActionManager } from '../../interaction/oemsActionManager';
import type { OrderLineRenderData, PositionLineRenderData } from '../../types';
import type { NativeTradeLineBracketType } from './nativeOemsDragState';
import {
  getNativeOrderObjectId,
  getNativePositionObjectId,
  type NativeTradeLineActionType,
  type NativeTradeLineObjectType,
} from '../utils/tradeLineLayout';

import {
  getNativeOrderLineState,
  getNativePositionLineState,
  isNativeOrderLineRenderData,
  type NativeOemsTradingLineState,
} from './nativeOemsLineState';

export interface NativeOemsCommitResult {
  forceUpdate: boolean;
}

export interface NativeOemsDragCommitResult extends NativeOemsCommitResult {
  clearDrag: boolean;
}

export function startNativeOrderMoveAction({
  manager,
  orderLines,
  objectId,
  nextPrice,
}: {
  manager: OemsActionManager<NativeOemsTradingLineState>;
  orderLines: readonly OrderLineRenderData[];
  objectId: string;
  nextPrice: number;
}): NativeOemsDragCommitResult {
  const order = orderLines.find((line) => getNativeOrderObjectId(line) === objectId);
  if (!order?.callbacks?.onMove) {
    return { clearDrag: true, forceUpdate: false };
  }

  const originalState = getNativeOrderLineState(order);
  const result = manager.startAction({
    objectType: 'order',
    objectId,
    kind: 'orderMove',
    originalState,
    optimisticState: {
      ...originalState,
      price: nextPrice,
    },
    callback: () => order.callbacks?.onMove?.(nextPrice),
  });

  return {
    clearDrag: !result.accepted || result.completedSynchronously,
    forceUpdate: !result.accepted || result.completedSynchronously,
  };
}

export function startNativeBracketMoveAction({
  manager,
  orderLines,
  positionLines,
  objectType,
  objectId,
  bracketType,
  price,
  partialPercent,
}: {
  manager: OemsActionManager<NativeOemsTradingLineState>;
  orderLines: readonly OrderLineRenderData[];
  positionLines: readonly PositionLineRenderData[];
  objectType: NativeTradeLineObjectType;
  objectId: string;
  bracketType: NativeTradeLineBracketType;
  price: number;
  partialPercent?: number;
}): NativeOemsDragCommitResult {
  const line =
    objectType === 'order'
      ? orderLines.find((candidate) => getNativeOrderObjectId(candidate) === objectId)
      : positionLines.find((candidate) => getNativePositionObjectId(candidate) === objectId);
  if (!line) {
    return { clearDrag: true, forceUpdate: false };
  }

  const originalState = isNativeOrderLineRenderData(line) ? getNativeOrderLineState(line) : getNativePositionLineState(line);
  const callback = bracketType === 'tp' ? line.callbacks?.onTPMoveEnd : line.callbacks?.onSLMoveEnd;
  const result = manager.startAction({
    objectType,
    objectId,
    kind:
      objectType === 'order'
        ? bracketType === 'tp'
          ? 'orderTpMove'
          : 'orderSlMove'
        : bracketType === 'tp'
          ? 'positionTpMove'
          : 'positionSlMove',
    originalState,
    optimisticState: {
      ...originalState,
      ...(bracketType === 'tp' ? { takeProfit: price } : { stopLoss: price }),
    },
    callback: () => callback?.(price, partialPercent),
  });

  return {
    clearDrag: !result.accepted || result.completedSynchronously,
    forceUpdate: !result.accepted || result.completedSynchronously,
  };
}

export function startNativeTradeLineAction({
  manager,
  orderLines,
  positionLines,
  objectType,
  objectId,
  actionType,
}: {
  manager: OemsActionManager<NativeOemsTradingLineState>;
  orderLines: readonly OrderLineRenderData[];
  positionLines: readonly PositionLineRenderData[];
  objectType: NativeTradeLineObjectType;
  objectId: string;
  actionType: NativeTradeLineActionType;
}): NativeOemsCommitResult {
  if (objectType === 'order') {
    const order = orderLines.find((line) => getNativeOrderObjectId(line) === objectId);
    if (!order || order.actionState?.isPending) return { forceUpdate: false };
    const originalState = getNativeOrderLineState(order);
    const callback =
      actionType === 'cancel'
        ? order.callbacks?.onCancel
        : actionType === 'tp'
          ? order.callbacks?.onTPClick
          : actionType === 'sl'
            ? order.callbacks?.onSLClick
            : undefined;
    if (!callback) return { forceUpdate: false };
    const result = manager.startAction({
      objectType,
      objectId,
      kind: actionType === 'cancel' ? 'orderCancel' : actionType === 'tp' ? 'tpClick' : 'slClick',
      originalState,
      optimisticState: originalState,
      confirmsRemoved: actionType === 'cancel',
      callback,
    });
    return { forceUpdate: result.completedSynchronously };
  }

  const position = positionLines.find((line) => getNativePositionObjectId(line) === objectId);
  if (!position || position.actionState?.isPending) return { forceUpdate: false };
  const originalState = getNativePositionLineState(position);
  const callback =
    actionType === 'close'
      ? position.callbacks?.onClose
      : actionType === 'reverse'
        ? position.callbacks?.onReverse
        : actionType === 'tp'
          ? position.callbacks?.onTPClick
          : actionType === 'sl'
            ? position.callbacks?.onSLClick
            : undefined;
  if (!callback) return { forceUpdate: false };
  const result = manager.startAction({
    objectType,
    objectId,
    kind:
      actionType === 'close'
        ? 'positionClose'
        : actionType === 'reverse'
          ? 'positionReverse'
          : actionType === 'tp'
            ? 'tpClick'
            : 'slClick',
    originalState,
    optimisticState: originalState,
    confirmsRemoved: actionType === 'close' || actionType === 'reverse',
    callback,
  });
  return { forceUpdate: result.completedSynchronously };
}
