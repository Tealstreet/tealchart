import type { Awaitable, OemsActionResult } from '../types';

export type OemsActionObjectType = 'order' | 'position';

export type OemsActionKind =
  | 'orderMove'
  | 'orderCancel'
  | 'positionClose'
  | 'positionReverse'
  | 'orderTpMove'
  | 'orderSlMove'
  | 'positionTpMove'
  | 'positionSlMove'
  | 'tpClick'
  | 'slClick';

export type OemsActionPhase = 'awaitingCallback' | 'awaitingConfirmation';

export interface OemsActionState {
  [key: string]: unknown;
  price?: number;
  takeProfit?: number;
  stopLoss?: number;
  partialPercent?: number;
  visible?: boolean;
}

export interface OemsAction<TState extends OemsActionState = OemsActionState> {
  sequence: number;
  objectType: OemsActionObjectType;
  objectId: string;
  kind: OemsActionKind;
  phase: OemsActionPhase;
  originalState: TState;
  optimisticState: TState;
  startedAt: number;
  expiresAt: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
  confirmsRemoved: boolean;
  settleOnCallback: boolean;
}

export interface OemsActionStartArgs<TState extends OemsActionState = OemsActionState> {
  objectType: OemsActionObjectType;
  objectId: string;
  kind: OemsActionKind;
  originalState: TState;
  optimisticState?: TState;
  confirmsRemoved?: boolean;
  settleOnCallback?: boolean;
  callback?: () => Awaitable<OemsActionResult>;
}

export interface OemsActionStartResult<TState extends OemsActionState = OemsActionState> {
  accepted: boolean;
  completedSynchronously: boolean;
  action: OemsAction<TState> | null;
  reason?: 'conflicting-action' | 'callback-failed';
  error?: unknown;
}

export interface OemsActionObjectStatus<TState extends OemsActionState = OemsActionState> {
  action: OemsAction<TState> | null;
  state: TState;
  isPending: boolean;
  isAwaitingCallback: boolean;
  isAwaitingConfirmation: boolean;
}

export interface OemsActionSettlement<TState extends OemsActionState = OemsActionState> {
  action: OemsAction<TState>;
  /**
   * `superseded` is a second action taking the object while the first was only
   * waiting for the venue's echo; `abandoned` is the object leaving the chart
   * before that echo arrived. Neither says anything went wrong.
   */
  status: 'confirmed' | 'failed' | 'timedOut' | 'superseded' | 'abandoned';
  error?: unknown;
}

export interface OemsActionManagerOptions<TState extends OemsActionState = OemsActionState> {
  timeoutMs?: number;
  now?: () => number;
  setTimeout?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimeout?: (timeoutId: ReturnType<typeof setTimeout>) => void;
  onChange?: () => void;
  onSettle?: (settlement: OemsActionSettlement<TState>) => void;
  stateEquals?: (expected: TState, actual: TState) => boolean;
  /**
   * Current price tick, read fresh so a symbol change is picked up. Confirming
   * a price-bearing action against an exchange fill needs slack: see
   * `createOemsStateEquals`.
   */
  priceTolerance?: () => number;
}

const DEFAULT_OEMS_ACTION_TIMEOUT_MS = 30000;

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function';
}

function getObjectKey(objectType: OemsActionObjectType, objectId: string): string {
  return `${objectType}:${objectId}`;
}

// Typed against the state so adding a price-bearing field without listing it
// here fails the build rather than silently keeping the exact comparison.
const OEMS_PRICE_STATE_KEYS = new Set<keyof OemsActionState>(['price', 'takeProfit', 'stopLoss']);

/**
 * Compares an optimistic action against what the exchange came back with.
 *
 * Prices need a tolerance. We send the price the user dragged to, the exchange
 * rounds it to its own tick, and the confirmation comes back a fraction away -
 * so an exact comparison never confirms, and the optimistic overlay sits on the
 * chart beside the real order until the action times out. Everything else still
 * compares exactly.
 *
 * Where no tick is known, a small relative figure stands in for it.
 */
export function createOemsStateEquals<TState extends OemsActionState>(
  getPriceTolerance?: () => number,
): (expected: TState, actual: TState) => boolean {
  return (expected, actual) => {
    const reportedTick = getPriceTolerance?.() ?? 0;
    const tick = Number.isFinite(reportedTick) && reportedTick > 0 ? reportedTick : 0;
    for (const [key, expectedValue] of Object.entries(expected)) {
      if (expectedValue === undefined) continue;
      const actualValue = actual[key as keyof TState];
      if (OEMS_PRICE_STATE_KEYS.has(key) && typeof expectedValue === 'number' && typeof actualValue === 'number') {
        // The relative figure is a fallback for an unknown tick, not a floor
        // under a known one: on a high-priced market it is many ticks wide, and
        // it would confirm a nudge the exchange has not acted on yet.
        // Widened by a hair: subtracting two large doubles a single tick apart
        // lands just over the tick (120000.1 - 120000 is 0.1000000000058), and
        // an exact-tick difference must always confirm.
        const tolerance = (tick > 0 ? tick : Math.abs(expectedValue) * 1e-5) * (1 + 1e-9);
        if (Math.abs(actualValue - expectedValue) <= tolerance) continue;
        return false;
      }
      if (!Object.is(actualValue, expectedValue)) {
        return false;
      }
    }
    return true;
  };
}

export class OemsActionManager<TState extends OemsActionState = OemsActionState> {
  private readonly timeoutMs: number;
  private readonly now: () => number;
  private readonly setTimer: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  private readonly clearTimer: (timeoutId: ReturnType<typeof setTimeout>) => void;
  private readonly onChange?: () => void;
  private readonly onSettle?: (settlement: OemsActionSettlement<TState>) => void;
  private readonly stateEquals: (expected: TState, actual: TState) => boolean;
  private readonly actionsByObject = new Map<string, OemsAction<TState>>();
  private nextSequence = 0;

  constructor(options: OemsActionManagerOptions<TState> = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_OEMS_ACTION_TIMEOUT_MS;
    this.now = options.now ?? (() => Date.now());
    this.setTimer = options.setTimeout ?? ((callback, delay) => setTimeout(callback, delay));
    this.clearTimer = options.clearTimeout ?? ((timeoutId) => clearTimeout(timeoutId));
    this.onChange = options.onChange;
    this.onSettle = options.onSettle;
    this.stateEquals = options.stateEquals ?? createOemsStateEquals(options.priceTolerance);
  }

  startAction(args: OemsActionStartArgs<TState>): OemsActionStartResult<TState> {
    const objectKey = getObjectKey(args.objectType, args.objectId);
    const existing = this.actionsByObject.get(objectKey);
    // Only a round trip still in the air owns the object. Once the venue has
    // answered we are merely waiting for a snapshot to echo the new state, and
    // that wait must never cost the user their next drag - an echo that never
    // matches would otherwise hold the object for the whole timeout.
    //
    // A removal is the exception and holds the object outright: it is confirmed
    // by the line leaving the feed, so there is no echo to give up waiting for,
    // and letting a second click through would submit the same cancel twice.
    if (existing && (existing.phase === 'awaitingCallback' || existing.confirmsRemoved)) {
      return {
        accepted: false,
        completedSynchronously: false,
        action: existing,
        reason: 'conflicting-action',
      };
    }
    if (existing) this.settleAction(existing, 'superseded');

    let callbackResult: Awaitable<OemsActionResult>;
    try {
      callbackResult = args.callback?.();
    } catch (error) {
      return {
        accepted: false,
        completedSynchronously: true,
        action: null,
        reason: 'callback-failed',
        error,
      };
    }

    if (callbackResult === false) {
      return {
        accepted: false,
        completedSynchronously: true,
        action: null,
        reason: 'callback-failed',
      };
    }

    if (!isPromiseLike<OemsActionResult>(callbackResult)) {
      return {
        accepted: true,
        completedSynchronously: true,
        action: null,
      };
    }

    const action = this.createAction(args);
    this.actionsByObject.set(objectKey, action);
    this.onChange?.();

    void Promise.resolve(callbackResult).then(
      (result) => {
        if (result === false) {
          this.failAction(action, undefined);
          return;
        }
        if (action.settleOnCallback) {
          this.settleAction(action, 'confirmed');
          return;
        }
        this.advancePastCallback(action);
      },
      (error) => {
        this.failAction(action, error);
      },
    );

    return {
      accepted: true,
      completedSynchronously: false,
      action,
    };
  }

  getAction(objectType: OemsActionObjectType, objectId: string): OemsAction<TState> | null {
    return this.actionsByObject.get(getObjectKey(objectType, objectId)) ?? null;
  }

  getActions(): OemsAction<TState>[] {
    return Array.from(this.actionsByObject.values());
  }

  getObjectStatus(
    objectType: OemsActionObjectType,
    objectId: string,
    currentState: TState,
  ): OemsActionObjectStatus<TState> {
    const action = this.getAction(objectType, objectId);
    const state = action ? action.optimisticState : currentState;

    return {
      action,
      state,
      isPending: action !== null,
      isAwaitingCallback: action?.phase === 'awaitingCallback',
      isAwaitingConfirmation: action?.phase === 'awaitingConfirmation',
    };
  }

  confirmState(objectType: OemsActionObjectType, objectId: string, confirmedState: TState): boolean {
    const action = this.getAction(objectType, objectId);
    if (!action || action.confirmsRemoved) return false;
    if (!this.stateEquals(action.optimisticState, confirmedState)) return false;

    this.settleAction(action, 'confirmed');
    return true;
  }

  /**
   * The object left the chart before its confirmation arrived - a host that
   * retires an adapter on an amend rather than re-pointing it, a symbol change,
   * a line cleared and rebuilt. There is nothing left to confirm against, so
   * the action is dropped rather than held to the timeout.
   *
   * Restricted to `awaitingConfirmation`: a callback still in flight owns the
   * object, and a host that clears and re-adds its lines in one pass must not
   * be able to cancel it.
   */
  abandon(objectType: OemsActionObjectType, objectId: string): boolean {
    const action = this.getAction(objectType, objectId);
    if (!action || action.phase !== 'awaitingConfirmation') return false;

    this.settleAction(action, 'abandoned');
    return true;
  }

  confirmRemoved(objectType: OemsActionObjectType, objectId: string): boolean {
    const action = this.getAction(objectType, objectId);
    if (!action || !action.confirmsRemoved) return false;

    this.settleAction(action, 'confirmed');
    return true;
  }

  fail(objectType: OemsActionObjectType, objectId: string, error?: unknown): boolean {
    const action = this.getAction(objectType, objectId);
    if (!action) return false;

    this.failAction(action, error);
    return true;
  }

  dispose(): void {
    for (const action of this.actionsByObject.values()) {
      if (action.timeoutId) this.clearTimer(action.timeoutId);
    }
    this.actionsByObject.clear();
  }

  private createAction(args: OemsActionStartArgs<TState>): OemsAction<TState> {
    const startedAt = this.now();
    const sequence = ++this.nextSequence;
    // Create the timer before the action so its id is set by the time any
    // callback can run. Assigning `action.timeoutId` after `setTimer` leaves it
    // null for a timer that fires synchronously — fake timers in tests, or a
    // zero timeout — and the settle path then has no id to clear.
    const actionRef: { current?: OemsAction<TState> } = {};
    const timeoutId = this.setTimer(() => {
      const pending = actionRef.current;
      if (pending) this.timeOutAction(pending);
    }, this.timeoutMs);
    const action: OemsAction<TState> = {
      sequence,
      objectType: args.objectType,
      objectId: args.objectId,
      kind: args.kind,
      phase: 'awaitingCallback',
      originalState: args.originalState,
      optimisticState: args.optimisticState ?? args.originalState,
      startedAt,
      expiresAt: startedAt + this.timeoutMs,
      timeoutId,
      confirmsRemoved: Boolean(args.confirmsRemoved),
      settleOnCallback: Boolean(args.settleOnCallback),
    };
    actionRef.current = action;
    return action;
  }

  private advancePastCallback(action: OemsAction<TState>): void {
    if (!this.isCurrent(action)) return;
    action.phase = 'awaitingConfirmation';
    this.onChange?.();
  }

  private failAction(action: OemsAction<TState>, error: unknown): void {
    if (!this.isCurrent(action)) return;
    this.settleAction(action, 'failed', error);
  }

  private timeOutAction(action: OemsAction<TState>): void {
    if (!this.isCurrent(action)) return;
    this.settleAction(action, 'timedOut');
  }

  private settleAction(
    action: OemsAction<TState>,
    status: OemsActionSettlement<TState>['status'],
    error?: unknown,
  ): void {
    if (action.timeoutId) this.clearTimer(action.timeoutId);
    this.actionsByObject.delete(getObjectKey(action.objectType, action.objectId));
    this.onSettle?.({ action, status, error });
    this.onChange?.();
  }

  private isCurrent(action: OemsAction<TState>): boolean {
    return this.getAction(action.objectType, action.objectId)?.sequence === action.sequence;
  }
}
