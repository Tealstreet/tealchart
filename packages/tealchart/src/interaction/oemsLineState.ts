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

/**
 * Keeps a dragged line on the chart while the venue catches up.
 *
 * Without this, a host that does not maintain its own optimistic order store
 * gets a hole: the user drops a line, the app cancels the old order, the row
 * leaves the feed, and there is nothing left to draw the optimistic price on -
 * so the line vanishes until a replacement arrives seconds later. Hosts that DO
 * keep an optimistic store never hit it, because their row never leaves, which
 * is why this went unnoticed for so long.
 *
 * Two halves, and they only work together. Holding a vanished line without
 * retiring it would draw the held line AND the replacement side by side on any
 * venue where an amend is a cancel followed by a place - which is most of them.
 */
export class OemsLineHold<TLine> {
  private readonly lastSeen = new Map<string, TLine>();

  constructor(
    private readonly objectType: 'order' | 'position',
    private readonly getId: (line: TLine) => string,
    private readonly getState: (line: TLine) => OemsTradingLineState,
    private readonly apply: (line: TLine, manager: OemsActionManager<OemsTradingLineState>) => TLine,
    private readonly getSignature: (line: TLine) => string,
  ) {}

  project(lines: readonly TLine[], manager: OemsActionManager<OemsTradingLineState>): TLine[] {
    const projected = lines.map((line) => this.apply(line, manager));

    const present = new Set<string>();
    for (const line of projected) {
      const id = this.getId(line);
      present.add(id);
      this.lastSeen.set(id, line);
    }

    const actions = manager.getActions().filter((action) => action.objectType === this.objectType);
    // A row that owns a pending action of its own is somebody else's; it must
    // not be mistaken for the replacement another action is waiting on.
    const spokenFor = new Set(actions.map((action) => action.objectId));

    for (const action of actions) {
      // A cancel is *supposed* to end with the row gone. Holding those would
      // keep cancelled orders on the chart until the timeout.
      if (action.confirmsRemoved) continue;
      if (present.has(action.objectId)) continue;

      const held = this.lastSeen.get(action.objectId);
      if (!held) continue;

      // The replacement, if it has arrived, is an unclaimed row that looks like
      // what we dragged. `confirmState` still has the last word: it compares the
      // optimistic price against the candidate within a tick, so a lookalike at
      // a different price does not retire the hold.
      const signature = this.getSignature(held);
      const replacement = projected.find(
        (line) => !spokenFor.has(this.getId(line)) && this.getSignature(line) === signature,
      );
      if (replacement && manager.confirmState(this.objectType, action.objectId, this.getState(replacement))) {
        this.lastSeen.delete(action.objectId);
        continue;
      }

      projected.push(this.apply(held, manager));
    }

    for (const id of Array.from(this.lastSeen.keys())) {
      if (present.has(id) || spokenFor.has(id)) continue;
      this.lastSeen.delete(id);
    }

    return projected;
  }
}

/** Identity for a held line, minus the price - the price is what changed, and
 *  `confirmState` compares it separately with the venue's tick tolerance. */
export function getOemsOrderHoldSignature(line: OrderLineRenderData): string {
  return `${line.quantity}|${line.lineColor}`;
}

export function getOemsPositionHoldSignature(line: PositionLineRenderData): string {
  return `${line.quantity}|${line.lineColor}`;
}
