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
 * Answers "are these two rows the same order?" - a question only the host can
 * answer, because only the host knows what an order is.
 */
export type OemsLineIdentity<TLine> = (a: TLine, b: TLine) => boolean;

/** What a host passes to override the defaults below, per object type. */
export interface OemsLineIdentities {
  order?: OemsLineIdentity<OrderLineRenderData>;
  position?: OemsLineIdentity<PositionLineRenderData>;
}

/**
 * The defaults are TradingView's own notion of identity: an order is its order
 * id, a position is its position id - which in most hosts is the symbol.
 *
 * A line carrying neither identifies as nothing, not even as itself, and the
 * hold declines to hold it rather than guessing from its other fields. Hosts
 * whose ids survive an amend need nothing else; hosts that cancel-and-replace
 * pass their own comparison, because only they know the two rows are one order.
 */
export function defaultOemsOrderIdentity(a: OrderLineRenderData, b: OrderLineRenderData): boolean {
  return Boolean(a.orderId) && a.orderId === b.orderId;
}

export function defaultOemsPositionIdentity(a: PositionLineRenderData, b: PositionLineRenderData): boolean {
  return Boolean(a.positionId) && a.positionId === b.positionId;
}

/**
 * Keeps a dragged line on the chart while the venue catches up.
 *
 * Without this, a host that does not maintain its own optimistic order store
 * gets a hole: the user drops a line, the app cancels the old order, the row
 * leaves the feed, and there is nothing left to draw the optimistic price on -
 * so the line vanishes until a replacement arrives seconds later. Hosts that DO
 * keep an optimistic store never hit it, because their row never leaves.
 *
 * Holding is OPT IN, and the opt in is the identity function. A host that keeps
 * its own identity across an amend passes nothing and gets a passthrough - the
 * chart trusts the ids it is given, the way TradingView's line adapter does.
 *
 * This used to hash the line's own fields instead, and the hash included
 * `lineColor`. A line whose order is in flight is faded, so the row was captured
 * as `rgba(237,57,95,0.4)` and came back settled as `rgb(237,57,95)`: same
 * order, different string, no match, and the dragged line sat on the chart next
 * to its replacement forever. Identity is not the chart's to guess, and colour
 * is not identity - TradingView's own order model carries no colour at all.
 *
 * Equality rather than a hash because a hash is a serialisation, and that
 * serialisation is where the bug lived. A host comparing fields directly can
 * use a numeric tolerance, ignore anything transient, or treat a synthesised
 * bracket id as its parent - none of which survives being flattened to a key.
 */
/**
 * How long an unmatched hold survives before the line is dropped.
 *
 * This caps the downside at TradingView's behaviour. TradingView holds nothing:
 * when a row leaves the feed its line goes, and the replacement draws when it
 * arrives - a brief gap that heals itself. Holding is meant to be strictly
 * better than that, and it is, right up until identity fails; then it is far
 * worse, because a duplicate line persists where a gap would have healed.
 *
 * Bounded, the trade is safe: hold long enough to cover a venue round trip when
 * identity works, and fall back to a flicker rather than a lasting duplicate
 * when it does not. The action's own 30s timeout is far too long to be the
 * thing that ends it.
 */
export const DEFAULT_OEMS_HOLD_GRACE_MS = 1200;

export class OemsLineHold<TLine> {
  private readonly lastSeen = new Map<string, TLine>();
  private readonly heldSince = new Map<string, number>();

  constructor(
    private readonly objectType: 'order' | 'position',
    private readonly getId: (line: TLine) => string,
    private readonly getState: (line: TLine) => OemsTradingLineState,
    private readonly apply: (line: TLine, manager: OemsActionManager<OemsTradingLineState>) => TLine,
    private readonly isSameLine: OemsLineIdentity<TLine>,
    private readonly graceMs: number = DEFAULT_OEMS_HOLD_GRACE_MS,
    private readonly now: () => number = () => Date.now(),
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
      // A line that does not identify as itself has no identity to hold onto.
      if (!this.isSameLine(held, held)) continue;

      // The replacement, if it has arrived, is an unclaimed row the host calls
      // the same order. `confirmState` still has the last word: it compares the
      // optimistic price against the candidate within a tick, so a match at a
      // different price does not retire the hold.
      const replacement = projected.find(
        (line) => !spokenFor.has(this.getId(line)) && this.isSameLine(held, line),
      );
      if (replacement && manager.confirmState(this.objectType, action.objectId, this.getState(replacement))) {
        this.lastSeen.delete(action.objectId);
        this.heldSince.delete(action.objectId);
        continue;
      }

      // Nothing matched. Give the venue its round trip, then let the line go
      // rather than leaving a dead one on the chart until the action expires.
      const since = this.heldSince.get(action.objectId);
      if (since === undefined) {
        this.heldSince.set(action.objectId, this.now());
      } else if (this.now() - since >= this.graceMs) {
        this.lastSeen.delete(action.objectId);
        this.heldSince.delete(action.objectId);
        continue;
      }

      projected.push(this.apply(held, manager));
    }

    for (const id of Array.from(this.lastSeen.keys())) {
      if (present.has(id) || spokenFor.has(id)) continue;
      this.lastSeen.delete(id);
      this.heldSince.delete(id);
    }

    return projected;
  }
}
