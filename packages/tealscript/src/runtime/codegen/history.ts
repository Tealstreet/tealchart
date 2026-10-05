import { NumericSeries, ValueSeries } from './runtime';

const HISTORY_DISCOVERY_BARS = 244;

class HistoryBufferResize extends Error {}

interface BufferSizing {
  allocated: number;
  required: number;
  minimum: number;
  limit: number;
}

interface SeriesGuard {
  phase: { realtime?: boolean };
  buffer(key: string, initial: number, hint: number): BufferSizing;
  checkBuffer(sizing: BufferSizing, offset: number, realtime: boolean): void;
  realtime(): boolean;
  discovering(): boolean;
}
class GuardedNumericSeries extends NumericSeries {
  private readonly sizing: BufferSizing;
  private validatedOffset = -1;
  constructor(
    private readonly guard: SeriesGuard,
    capacity = 500,
    maxOffset = capacity - 1,
    key = '',
    hint = 0,
  ) {
    const sizing = guard.buffer(key, maxOffset, hint);
    const prefix = guard.discovering() ? HISTORY_DISCOVERY_BARS : 0;
    super(
      Math.max(prefix, sizing.allocated + 1),
      Math.max(prefix - 1, sizing.allocated),
    );
    this.sizing = sizing;
  }
  get(offset: number): number {
    const sizing = this.sizing;
    const realtime = this.guard.phase.realtime ?? this.guard.realtime();
    if (!realtime && Number.isInteger(offset) && offset >= 0
      && offset <= this.validatedOffset && offset <= (this.maxOffset ?? Infinity)) {
      if (offset >= this.size) return NaN;
      const index = this.head + offset;
      return this.buf[index >= this.capacity ? index - this.capacity : index];
    }
    this.guard.checkBuffer(sizing, offset, realtime);
    if (!realtime && offset >= this.capacity) return NaN;
    const value = super.get(offset);
    if (!realtime && Number.isInteger(offset) && offset >= 0) this.validatedOffset = Math.max(this.validatedOffset, offset);
    return value;
  }
}
class GuardedValueSeries extends ValueSeries {
  private readonly sizing: BufferSizing;
  constructor(
    private readonly guard: SeriesGuard,
    capacity = 500,
    maxOffset = capacity - 1,
    key = '',
    hint = 0,
  ) {
    const sizing = guard.buffer(key, maxOffset, hint);
    const prefix = guard.discovering() ? HISTORY_DISCOVERY_BARS : 0;
    super(
      Math.max(prefix, sizing.allocated + 1),
      Math.max(prefix - 1, sizing.allocated),
    );
    this.sizing = sizing;
  }
  get(offset: number): unknown {
    const sizing = this.sizing;
    const realtime = this.guard.phase.realtime ?? this.guard.realtime();
    if (!(
      typeof offset === 'number' &&
      offset >= 0 &&
      offset <= sizing.required &&
      offset <= sizing.allocated &&
      !realtime
    )) {
      this.guard.checkBuffer(sizing, offset, realtime);
    }
    if (!realtime && offset >= this.capacity) return NaN;
    return super.get(offset);
  }
}

export class HistoryBufferSizing {
  private readonly phase: { realtime?: boolean } = {};
  private readonly buffers = new Map<string, BufferSizing>();
  private restarts = 0;
  private barIndex = HISTORY_DISCOVERY_BARS;
  private discoveryComplete = false;
  private resizePending = false;

  beginBar(index: number, realtime: boolean): void {
    if (realtime) this.finishPass();
    this.barIndex = index;
    this.phase.realtime = realtime;
    if (this.discoveryComplete || (!realtime && index < HISTORY_DISCOVERY_BARS)) return;
    this.discoveryComplete = true;
    let resize = false;
    for (const sizing of this.buffers.values()) {
      if (sizing.required === 0) continue;
      const allocation = Math.min(sizing.limit, Math.max(sizing.minimum, sizing.required));
      if (allocation !== sizing.allocated) {
        sizing.allocated = allocation;
        resize = true;
      }
    }
    if (resize) throw new HistoryBufferResize();
  }

  constructor(
    readonly minimum = 0,
    readonly hardLimit?: number,
  ) {
    this.minimum = Math.max(minimum, hardLimit ?? 0);
  }

  private limit(key: string): number {
    return this.hardLimit ?? (/^(open|high|low|close|time)$/.test(key) ? 10000 : 5000);
  }

  private buffer(key: string, initial: number, hint = 0): BufferSizing {
    const minimum = Math.max(this.minimum, hint);
    let sizing = this.buffers.get(key);
    if (!sizing) {
      const limit = this.limit(key);
      sizing = { allocated: Math.min(limit, Math.max(initial, minimum)), required: 0, minimum, limit };
      this.buffers.set(key, sizing);
    }
    sizing.minimum = Math.max(sizing.minimum, minimum);
    return sizing;
  }

  allocation(key: string, initial: number, hint = 0): number {
    return this.buffer(key, initial, hint).allocated;
  }

  check(key: string, offset: number, realtime: boolean, initial: number, hint = 0): void {
    offset = Math.trunc(offset);
    if (!Number.isFinite(offset) || offset < 0) return;
    this.checkBuffer(this.buffer(key, initial, hint), offset, realtime);
  }

  private checkBuffer(sizing: BufferSizing, offset: number, realtime: boolean): void {
    offset = Math.trunc(offset);
    if (!Number.isFinite(offset) || offset < 0) return;
    const limit = sizing.limit;
    const available = realtime ? Math.min(limit, Math.max(sizing.minimum, sizing.required)) : limit;
    if (offset > available) {
      throw new Error(`Historical offset ${offset} exceeds max_bars_back ${available}`);
    }
    if (!realtime) sizing.required = Math.max(sizing.required, offset);
    if (offset > sizing.allocated) {
      if (!realtime && !this.discoveryComplete && this.barIndex < HISTORY_DISCOVERY_BARS) return;
      if (realtime || this.restarts >= 100) {
        throw new Error(`Historical offset ${offset} exceeds max_bars_back ${sizing.allocated}`);
      }
      sizing.allocated = Math.min(limit, Math.max(offset, Math.max(1, sizing.allocated) * 2));
      this.resizePending = true;
    }
  }

  private finishPass(): void {
    if (this.resizePending) throw new HistoryBufferResize();
  }

  run<T>(execute: () => T, restart?: () => void): T {
    for (;;) {
      this.resizePending = false;
      try {
        const result = execute();
        this.finishPass();
        return result;
      } catch (error) {
        if (!(error instanceof HistoryBufferResize) && !this.resizePending) throw error;
        this.restarts += 1;
        restart?.();
      }
    }
  }

  get maxBarsBack(): number {
    let maximum = this.minimum;
    for (const sizing of this.buffers.values()) maximum = Math.max(maximum, sizing.required, sizing.minimum);
    return maximum;
  }

  dependencies(initial: number, realtime: () => boolean) {
    const buffer = this.buffer.bind(this);
    const checkBuffer = this.checkBuffer.bind(this);
    const discovering = () => !this.discoveryComplete;
    const check = (key: string, offset: number, hint = 0) => this.check(key, offset, realtime(), initial, hint);
    return {
      NumericSeries: GuardedNumericSeries.bind(null, { phase: this.phase, buffer, checkBuffer, realtime, discovering }),
      ValueSeries: GuardedValueSeries.bind(null, { phase: this.phase, buffer, checkBuffer, realtime, discovering }),
      historyCheck: check,
    };
  }
}

export function isHistoryBufferResize(error: unknown): boolean {
  return error instanceof HistoryBufferResize;
}
