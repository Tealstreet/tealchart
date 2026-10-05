import type { RollingSumState } from './rolling-sum';

import { advanceRollingSum, copyRollingSumState, createRollingSumState } from './rolling-sum';

interface SourceSeries {
  readonly length: number;
  get(offset: number): unknown;
  current?(): unknown;
}

interface FixedWindowUndo {
  total: number;
  compensation: number;
  seen: number;
  width: number;
  rawLength: number;
  rawTail: number;
  realizedTail: number;
}

interface SourceSMASnapshot {
  state: RollingSumState;
  beforeCurrent: RollingSumState | null;
  lastBar: number;
  fixedBeforeCurrent: FixedWindowUndo | null;
}

/** The unconditional compiled SMA history route consumes the shared sum machine. */
export class SourceSeriesSMA {
  private state = createRollingSumState();
  private beforeCurrent: RollingSumState | null = null;
  private lastBar = -1;
  private fixedLengthValue: number | undefined;
  private fixedBeforeCurrent: FixedWindowUndo | null = null;

  constructor(private capacity: number, private readonly fixedLength = false) {}

  compute(series: SourceSeries, length: unknown, barIndex: number): number {
    let n = this.fixedLength ? this.fixedLengthValue : undefined;
    if (n === undefined || n !== length) {
      n = Number(length);
      if (!Number.isFinite(n) || Math.trunc(n) !== n || n < 1) {
        throw new Error(
          `TA length must be a positive integer; got ${Number.isNaN(n) ? 'na' : n}. TradingView rejects zero, negative, fractional, and na lengths, so guard computed lengths or add one before calling TA functions`,
        );
      }
      if (this.fixedLength) this.fixedLengthValue = n;
    }
    if (this.fixedLength) this.capacity = n + 1;
    if (this.lastBar === barIndex && this.fixedBeforeCurrent) {
      this.undoFixedWindow(this.fixedBeforeCurrent);
    } else if (this.lastBar === barIndex && this.beforeCurrent) {
      this.state = copyRollingSumState(this.beforeCurrent);
    } else {
      // Keep the existing source-series clock, including retained earlier bars
      // when this unconditional route is first reached after a runtime error.
      const pending = Math.min(series.length, barIndex - this.lastBar);
      for (let offset = pending - 1; offset > 0; offset -= 1) {
        advanceRollingSum(this.state, Number(series.get(offset)), n, this.capacity);
      }
      if (this.fixedLength) {
        const { total, compensation, seen, width, raw, realized } = this.state;
        const before = this.fixedBeforeCurrent ??= { total: 0, compensation: 0, seen: 0, width: 0, rawLength: 0, rawTail: 0, realizedTail: 0 };
        before.total = total;
        before.compensation = compensation;
        before.seen = seen;
        before.width = width;
        before.rawLength = raw.length;
        before.rawTail = raw[raw.length - 1];
        before.realizedTail = realized[realized.length - 1];
      } else {
        this.beforeCurrent = copyRollingSumState(this.state);
      }
    }
    this.lastBar = barIndex;
    const source = series.current ? series.current() : series.get(0);
    return advanceRollingSum(this.state, Number(source), n, this.capacity) / n;
  }

  private undoFixedWindow(before: FixedWindowUndo): void {
    const { raw, realized } = this.state;
    if (this.state.seen > before.seen) {
      raw.shift();
      realized.shift();
      if (raw.length < before.rawLength) {
        raw.push(before.rawTail);
        realized.push(before.realizedTail);
      }
    }
    this.state.total = before.total;
    this.state.compensation = before.compensation;
    this.state.seen = before.seen;
    this.state.width = before.width;
  }

  save(): SourceSMASnapshot {
    return {
      state: copyRollingSumState(this.state),
      beforeCurrent: this.beforeCurrent ? copyRollingSumState(this.beforeCurrent) : null,
      lastBar: this.lastBar,
      fixedBeforeCurrent: this.fixedBeforeCurrent ? { ...this.fixedBeforeCurrent } : null,
    };
  }

  restore(snapshot: SourceSMASnapshot): void {
    this.state = copyRollingSumState(snapshot.state);
    this.beforeCurrent = snapshot.beforeCurrent ? copyRollingSumState(snapshot.beforeCurrent) : null;
    this.lastBar = snapshot.lastBar;
    this.fixedBeforeCurrent = snapshot.fixedBeforeCurrent ? { ...snapshot.fixedBeforeCurrent } : null;
  }
}
