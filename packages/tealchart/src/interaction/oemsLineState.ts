import type { OrderLineRenderData, PositionLineRenderData } from '../types';
import type { OemsActionManager, OemsActionState } from './oemsActionManager';

/**
 * The adapter between trade-line render data and the optimistic action engine.
 *
 * Shared because it was written twice. `ChartCore` and the native runtime each
 * carried their own copy of every function here, character-identical apart from
 * `private method` versus `exported function` - so a fix to one silently left
 * the other behind, which is exactly what happened to the bracket case below.
 */

export interface OemsTradingLineState extends OemsActionState {
  price?: number;
  takeProfit?: number;
  stopLoss?: number;
  visible?: boolean;
}

export function getOemsOrderObjectId(line: OrderLineRenderData): string {
  return line.orderId || line.id;
}

export function getOemsPositionObjectId(line: PositionLineRenderData): string {
  return line.positionId || line.id;
}

export function getOemsOrderLineState(line: OrderLineRenderData): OemsTradingLineState {
  return {
    price: line.price,
    takeProfit: line.brackets?.takeProfit,
    stopLoss: line.brackets?.stopLoss,
    visible: true,
  };
}

export function getOemsPositionLineState(line: PositionLineRenderData): OemsTradingLineState {
  return {
    price: line.price,
    takeProfit: line.brackets?.takeProfit,
    stopLoss: line.brackets?.stopLoss,
    visible: true,
  };
}

/**
 * Merges an optimistic TP/SL into a line's brackets.
 *
 * A line whose brackets are null still gets them, because a bracket the user
 * has just dragged into existence has nowhere else to live: the native copy
 * returned early on null and dropped the optimistic price entirely, so dragging
 * a stop onto a position with no stop drew nothing at all until the exchange
 * echoed back. Only the no-brackets-and-nothing-optimistic case passes through
 * untouched.
 */
export function applyOemsBracketActionState<
  TBracket extends OrderLineRenderData['brackets'] | PositionLineRenderData['brackets'],
>(brackets: TBracket, state: OemsTradingLineState): TBracket {
  if (!brackets && typeof state.takeProfit !== 'number' && typeof state.stopLoss !== 'number') return brackets;
  const nextBrackets = { ...(brackets ?? {}) };
  if (typeof state.takeProfit === 'number') {
    nextBrackets.takeProfit = state.takeProfit;
  }
  if (typeof state.stopLoss === 'number') {
    nextBrackets.stopLoss = state.stopLoss;
  }
  return { ...nextBrackets } as TBracket;
}

export function applyOemsOrderActionState(
  line: OrderLineRenderData,
  manager: OemsActionManager<OemsTradingLineState>,
): OrderLineRenderData {
  const status = manager.getObjectStatus('order', getOemsOrderObjectId(line), getOemsOrderLineState(line));
  if (!status.action) return { ...line, actionState: undefined };

  return {
    ...line,
    price: typeof status.state.price === 'number' ? status.state.price : line.price,
    brackets: applyOemsBracketActionState(line.brackets, status.state),
    actionState: {
      kind: status.action.kind,
      isPending: status.isPending,
      isAwaitingCallback: status.isAwaitingCallback,
      isAwaitingConfirmation: status.isAwaitingConfirmation,
    },
  };
}

export function applyOemsPositionActionState(
  line: PositionLineRenderData,
  manager: OemsActionManager<OemsTradingLineState>,
): PositionLineRenderData {
  const status = manager.getObjectStatus('position', getOemsPositionObjectId(line), getOemsPositionLineState(line));
  if (!status.action) return { ...line, actionState: undefined };

  return {
    ...line,
    price: typeof status.state.price === 'number' ? status.state.price : line.price,
    brackets: applyOemsBracketActionState(line.brackets, status.state),
    actionState: {
      kind: status.action.kind,
      isPending: status.isPending,
      isAwaitingCallback: status.isAwaitingCallback,
      isAwaitingConfirmation: status.isAwaitingConfirmation,
    },
  };
}

export function confirmOemsOrderLineSnapshots(
  manager: OemsActionManager<OemsTradingLineState>,
  lines: readonly OrderLineRenderData[],
): void {
  const seen = new Set(lines.map((line) => getOemsOrderObjectId(line)));
  for (const line of lines) {
    manager.confirmState('order', getOemsOrderObjectId(line), getOemsOrderLineState(line));
  }

  for (const action of manager.getActions()) {
    if (action.objectType === 'order' && action.confirmsRemoved && !seen.has(action.objectId)) {
      manager.confirmRemoved('order', action.objectId);
    }
  }
}

export function confirmOemsPositionLineSnapshots(
  manager: OemsActionManager<OemsTradingLineState>,
  lines: readonly PositionLineRenderData[],
): void {
  const seen = new Set(lines.map((line) => getOemsPositionObjectId(line)));
  for (const line of lines) {
    manager.confirmState('position', getOemsPositionObjectId(line), getOemsPositionLineState(line));
  }

  for (const action of manager.getActions()) {
    if (action.objectType === 'position' && action.confirmsRemoved && !seen.has(action.objectId)) {
      manager.confirmRemoved('position', action.objectId);
    }
  }
}
