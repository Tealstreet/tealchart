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
  timeoutId?: ReturnType<typeof setTimeout>;
  confirmsRemoved: boolean;
}

export interface OemsActionStartArgs<TState extends OemsActionState = OemsActionState> {
  objectType: OemsActionObjectType;
  objectId: string;
  kind: OemsActionKind;
  originalState: TState;
  optimisticState?: TState;
  confirmsRemoved?: boolean;
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
  status: 'confirmed' | 'failed' | 'timedOut';
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
}

const DEFAULT_OEMS_ACTION_TIMEOUT_MS = 30000;

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

function getObjectKey(objectType: OemsActionObjectType, objectId: string): string {
  return `${objectType}:${objectId}`;
}

function defaultStateEquals<TState extends OemsActionState>(expected: TState, actual: TState): boolean {
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (expectedValue === undefined) continue;
    if (!Object.is(actual[key as keyof TState], expectedValue)) {
      return false;
    }
  }
  return true;
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
    this.stateEquals = options.stateEquals ?? defaultStateEquals;
  }

  startAction(args: OemsActionStartArgs<TState>): OemsActionStartResult<TState> {
    const objectKey = getObjectKey(args.objectType, args.objectId);
    if (this.actionsByObject.has(objectKey)) {
      return {
        accepted: false,
        completedSynchronously: false,
        action: this.actionsByObject.get(objectKey) ?? null,
        reason: 'conflicting-action',
      };
    }

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

  getObjectStatus(objectType: OemsActionObjectType, objectId: string, currentState: TState): OemsActionObjectStatus<TState> {
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
      if (action.timeoutId !== undefined) {
        this.clearTimer(action.timeoutId);
      }
    }
    this.actionsByObject.clear();
  }

  private createAction(args: OemsActionStartArgs<TState>): OemsAction<TState> {
    const startedAt = this.now();
    const sequence = ++this.nextSequence;
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
      confirmsRemoved: Boolean(args.confirmsRemoved),
    };
    action.timeoutId = this.setTimer(() => {
      this.timeOutAction(action);
    }, this.timeoutMs);
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

  private settleAction(action: OemsAction<TState>, status: OemsActionSettlement<TState>['status'], error?: unknown): void {
    if (action.timeoutId !== undefined) {
      this.clearTimer(action.timeoutId);
    }
    this.actionsByObject.delete(getObjectKey(action.objectType, action.objectId));
    this.onSettle?.({ action, status, error });
    this.onChange?.();
  }

  private isCurrent(action: OemsAction<TState>): boolean {
    return this.getAction(action.objectType, action.objectId)?.sequence === action.sequence;
  }
}
