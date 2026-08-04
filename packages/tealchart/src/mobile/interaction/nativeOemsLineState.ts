import type { OemsActionManager, OemsActionState } from '../../interaction/oemsActionManager';
import type {
  OrderLineRenderData,
  PositionLineRenderData,
} from '../../types';
import {
  getNativeOrderObjectId,
  getNativePositionObjectId,
} from '../utils/tradeLineLayout';

export interface NativeOemsTradingLineState extends OemsActionState {
  price?: number;
  takeProfit?: number;
  stopLoss?: number;
  visible?: boolean;
}

export function isNativeOrderLineRenderData(line: OrderLineRenderData | PositionLineRenderData): line is OrderLineRenderData {
  return 'cancellable' in line;
}

export function getNativeOrderLineState(line: OrderLineRenderData): NativeOemsTradingLineState {
  return {
    price: line.price,
    takeProfit: line.brackets?.takeProfit,
    stopLoss: line.brackets?.stopLoss,
    visible: true,
  };
}

export function getNativePositionLineState(line: PositionLineRenderData): NativeOemsTradingLineState {
  return {
    price: line.price,
    takeProfit: line.brackets?.takeProfit,
    stopLoss: line.brackets?.stopLoss,
    visible: true,
  };
}

function applyNativeBracketActionState<TBracket extends OrderLineRenderData['brackets'] | PositionLineRenderData['brackets']>(
  brackets: TBracket,
  state: NativeOemsTradingLineState,
): TBracket {
  if (!brackets) return brackets;
  return {
    ...brackets,
    takeProfit: typeof state.takeProfit === 'number' ? state.takeProfit : brackets.takeProfit,
    stopLoss: typeof state.stopLoss === 'number' ? state.stopLoss : brackets.stopLoss,
  } as TBracket;
}

export function applyNativeOrderActionState(
  line: OrderLineRenderData,
  manager: OemsActionManager<NativeOemsTradingLineState>,
): OrderLineRenderData {
  const status = manager.getObjectStatus('order', getNativeOrderObjectId(line), getNativeOrderLineState(line));
  if (!status.action) return { ...line, actionState: undefined };

  return {
    ...line,
    price: typeof status.state.price === 'number' ? status.state.price : line.price,
    brackets: applyNativeBracketActionState(line.brackets, status.state),
    actionState: {
      kind: status.action.kind,
      isPending: status.isPending,
      isAwaitingCallback: status.isAwaitingCallback,
      isAwaitingConfirmation: status.isAwaitingConfirmation,
    },
  };
}

export function applyNativePositionActionState(
  line: PositionLineRenderData,
  manager: OemsActionManager<NativeOemsTradingLineState>,
): PositionLineRenderData {
  const status = manager.getObjectStatus('position', getNativePositionObjectId(line), getNativePositionLineState(line));
  if (!status.action) return { ...line, actionState: undefined };

  return {
    ...line,
    price: typeof status.state.price === 'number' ? status.state.price : line.price,
    brackets: applyNativeBracketActionState(line.brackets, status.state),
    actionState: {
      kind: status.action.kind,
      isPending: status.isPending,
      isAwaitingCallback: status.isAwaitingCallback,
      isAwaitingConfirmation: status.isAwaitingConfirmation,
    },
  };
}

export function confirmNativeOrderLineSnapshots(
  manager: OemsActionManager<NativeOemsTradingLineState>,
  lines: readonly OrderLineRenderData[],
): void {
  const seen = new Set(lines.map((line) => getNativeOrderObjectId(line)));
  for (const line of lines) {
    manager.confirmState('order', getNativeOrderObjectId(line), getNativeOrderLineState(line));
  }

  for (const action of manager.getActions()) {
    if (action.objectType === 'order' && action.confirmsRemoved && !seen.has(action.objectId)) {
      manager.confirmRemoved('order', action.objectId);
    }
  }
}

export function confirmNativePositionLineSnapshots(
  manager: OemsActionManager<NativeOemsTradingLineState>,
  lines: readonly PositionLineRenderData[],
): void {
  const seen = new Set(lines.map((line) => getNativePositionObjectId(line)));
  for (const line of lines) {
    manager.confirmState('position', getNativePositionObjectId(line), getNativePositionLineState(line));
  }

  for (const action of manager.getActions()) {
    if (action.objectType === 'position' && action.confirmsRemoved && !seen.has(action.objectId)) {
      manager.confirmRemoved('position', action.objectId);
    }
  }
}
