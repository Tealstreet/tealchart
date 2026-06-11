import { NumericSeries } from './runtime';

export interface Saveable {
  save(): unknown;
  restore(snap: unknown): void;
}

// ==========================================================================
// SMA — Simple Moving Average
// ==========================================================================

interface SMASnapshot {
  buf: Float64Array;
  head: number;
  size: number;
  sum: number;
  barCount: number;
}

export class SMA implements Saveable {
  private buf: Float64Array;
  private head: number = 0;
  private size: number = 0;
  private sum: number = 0;
  private barCount: number = 0;
  private readonly length: number;

  private snap: SMASnapshot | null = null;

  constructor(length: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.buf = new Float64Array(this.length);
    this.buf.fill(NaN);
  }

  compute(src: number): number {
    this.snap = {
      buf: new Float64Array(this.buf),
      head: this.head,
      size: this.size,
      sum: this.sum,
      barCount: this.barCount,
    };
    return this._advance(src);
  }

  recompute(src: number): number {
    if (this.snap) {
      this.buf.set(this.snap.buf);
      this.head = this.snap.head;
      this.size = this.snap.size;
      this.sum = this.snap.sum;
      this.barCount = this.snap.barCount;
    }
    return this._advance(src);
  }

  private _advance(src: number): number {
    this.barCount++;
    if (src !== src) return NaN; // NaN check

    if (this.size < this.length) {
      this.buf[this.size] = src;
      this.sum += src;
      this.size++;
      this.head = 0;
      if (this.size < this.length) return NaN;
      return this.sum / this.length;
    }

    const oldest = this.buf[this.head];
    this.sum -= oldest;
    this.sum += src;
    this.buf[this.head] = src;
    this.head = (this.head + 1) % this.length;

    // Periodic exact sum recalculation to avoid drift
    if (this.barCount % 1000 === 0) {
      this.sum = 0;
      for (let i = 0; i < this.length; i++) {
        this.sum += this.buf[i];
      }
    }

    return this.sum / this.length;
  }

  save(): SMASnapshot {
    return {
      buf: new Float64Array(this.buf),
      head: this.head,
      size: this.size,
      sum: this.sum,
      barCount: this.barCount,
    };
  }

  restore(snap: SMASnapshot): void {
    this.buf.set(snap.buf);
    this.head = snap.head;
    this.size = snap.size;
    this.sum = snap.sum;
    this.barCount = snap.barCount;
    this.snap = null;
  }
}

// ==========================================================================
// EMA — Exponential Moving Average
// ==========================================================================

interface EMASnapshot {
  value: number;
}

export class EMA implements Saveable {
  private value: number = NaN;
  private readonly alpha: number;

  private snap: EMASnapshot | null = null;

  constructor(length: number) {
    this.alpha = 2 / (Math.max(1, Math.trunc(length)) + 1);
  }

  compute(src: number): number {
    this.snap = { value: this.value };
    return this._advance(src);
  }

  recompute(src: number): number {
    if (this.snap) {
      this.value = this.snap.value;
    }
    return this._advance(src);
  }

  private _advance(src: number): number {
    if (src !== src) return NaN;
    if (this.value !== this.value) {
      this.value = src;
    } else {
      this.value = this.alpha * src + (1 - this.alpha) * this.value;
    }
    return this.value;
  }

  save(): EMASnapshot {
    return { value: this.value };
  }

  restore(snap: EMASnapshot): void {
    this.value = snap.value;
    this.snap = null;
  }
}

// ==========================================================================
// RMA — Running Moving Average (Wilder's smoothing)
// ==========================================================================

interface RMASnapshot {
  value: number;
  seedBuf: Float64Array;
  seedCount: number;
}

export class RMA implements Saveable {
  private value: number = NaN;
  private readonly alpha: number;
  private readonly length: number;
  private seedBuf: Float64Array;
  private seedCount: number = 0;

  private snap: RMASnapshot | null = null;

  constructor(length: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.alpha = 1 / this.length;
    this.seedBuf = new Float64Array(this.length);
  }

  compute(src: number): number {
    this.snap = {
      value: this.value,
      seedBuf: new Float64Array(this.seedBuf),
      seedCount: this.seedCount,
    };
    return this._advance(src);
  }

  recompute(src: number): number {
    if (this.snap) {
      this.value = this.snap.value;
      this.seedBuf.set(this.snap.seedBuf);
      this.seedCount = this.snap.seedCount;
    }
    return this._advance(src);
  }

  private _advance(src: number): number {
    if (src !== src) return NaN;

    if (this.seedCount < this.length) {
      this.seedBuf[this.seedCount] = src;
      this.seedCount++;
      if (this.seedCount < this.length) return NaN;
      let sum = 0;
      for (let i = 0; i < this.length; i++) sum += this.seedBuf[i];
      this.value = sum / this.length;
      return this.value;
    }

    this.value = this.alpha * src + (1 - this.alpha) * this.value;
    return this.value;
  }

  save(): RMASnapshot {
    return {
      value: this.value,
      seedBuf: new Float64Array(this.seedBuf),
      seedCount: this.seedCount,
    };
  }

  restore(snap: RMASnapshot): void {
    this.value = snap.value;
    this.seedBuf.set(snap.seedBuf);
    this.seedCount = snap.seedCount;
    this.snap = null;
  }
}

// ==========================================================================
// RSI — Relative Strength Index
// ==========================================================================

interface RSISnapshot {
  prevSrc: number;
  gainRMA: unknown;
  lossRMA: unknown;
}

export class RSI implements Saveable {
  private prevSrc: number = NaN;
  private gainRMA: RMA;
  private lossRMA: RMA;

  private snap: RSISnapshot | null = null;

  constructor(length: number) {
    this.gainRMA = new RMA(length);
    this.lossRMA = new RMA(length);
  }

  compute(src: number): number {
    this.snap = {
      prevSrc: this.prevSrc,
      gainRMA: this.gainRMA.save(),
      lossRMA: this.lossRMA.save(),
    };
    return this._advance(src, false);
  }

  recompute(src: number): number {
    if (this.snap) {
      this.prevSrc = this.snap.prevSrc;
      this.gainRMA.restore(this.snap.gainRMA as RMASnapshot);
      this.lossRMA.restore(this.snap.lossRMA as RMASnapshot);
    }
    return this._advance(src, true);
  }

  private _advance(src: number, isRecompute: boolean): number {
    if (src !== src) return NaN;

    if (this.prevSrc !== this.prevSrc) {
      this.prevSrc = src;
      return NaN;
    }

    const change = src - this.prevSrc;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    const avgGain = isRecompute ? this.gainRMA.recompute(gain) : this.gainRMA.compute(gain);
    const avgLoss = isRecompute ? this.lossRMA.recompute(loss) : this.lossRMA.compute(loss);

    this.prevSrc = src;

    if (avgGain !== avgGain || avgLoss !== avgLoss) return NaN;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  save(): RSISnapshot {
    return {
      prevSrc: this.prevSrc,
      gainRMA: this.gainRMA.save(),
      lossRMA: this.lossRMA.save(),
    };
  }

  restore(snap: RSISnapshot): void {
    this.prevSrc = snap.prevSrc;
    this.gainRMA.restore(snap.gainRMA as RMASnapshot);
    this.lossRMA.restore(snap.lossRMA as RMASnapshot);
    this.snap = null;
  }
}

// ==========================================================================
// Crossover / Crossunder / Cross
// ==========================================================================

interface CrossSnapshot {
  prevA: number;
  prevB: number;
}

export class Crossover implements Saveable {
  private prevA: number = NaN;
  private prevB: number = NaN;

  private snap: CrossSnapshot | null = null;

  compute(a: number, b: number): boolean {
    this.snap = { prevA: this.prevA, prevB: this.prevB };
    return this._advance(a, b);
  }

  recompute(a: number, b: number): boolean {
    if (this.snap) {
      this.prevA = this.snap.prevA;
      this.prevB = this.snap.prevB;
    }
    return this._advance(a, b);
  }

  private _advance(a: number, b: number): boolean {
    const pA = this.prevA;
    const pB = this.prevB;
    this.prevA = a;
    this.prevB = b;
    if (pA !== pA || pB !== pB || a !== a || b !== b) return false;
    return a > b && pA <= pB;
  }

  save(): CrossSnapshot {
    return { prevA: this.prevA, prevB: this.prevB };
  }

  restore(snap: CrossSnapshot): void {
    this.prevA = snap.prevA;
    this.prevB = snap.prevB;
    this.snap = null;
  }
}

export class Crossunder implements Saveable {
  private prevA: number = NaN;
  private prevB: number = NaN;

  private snap: CrossSnapshot | null = null;

  compute(a: number, b: number): boolean {
    this.snap = { prevA: this.prevA, prevB: this.prevB };
    return this._advance(a, b);
  }

  recompute(a: number, b: number): boolean {
    if (this.snap) {
      this.prevA = this.snap.prevA;
      this.prevB = this.snap.prevB;
    }
    return this._advance(a, b);
  }

  private _advance(a: number, b: number): boolean {
    const pA = this.prevA;
    const pB = this.prevB;
    this.prevA = a;
    this.prevB = b;
    if (pA !== pA || pB !== pB || a !== a || b !== b) return false;
    return a < b && pA >= pB;
  }

  save(): CrossSnapshot {
    return { prevA: this.prevA, prevB: this.prevB };
  }

  restore(snap: CrossSnapshot): void {
    this.prevA = snap.prevA;
    this.prevB = snap.prevB;
    this.snap = null;
  }
}

// ==========================================================================
// Change — difference from N bars ago
// ==========================================================================

interface ChangeSnapshot {
  buf: Float64Array;
  head: number;
  size: number;
}

export class Change implements Saveable {
  private buf: Float64Array;
  private head: number = 0;
  private size: number = 0;
  private readonly maxLength: number;

  private snap: ChangeSnapshot | null = null;

  constructor(maxLength: number = 1) {
    this.maxLength = Math.max(1, Math.trunc(maxLength));
    this.buf = new Float64Array(this.maxLength + 1);
    this.buf.fill(NaN);
  }

  compute(src: number, length: number = 1): number {
    this.snap = {
      buf: new Float64Array(this.buf),
      head: this.head,
      size: this.size,
    };
    return this._advance(src, length);
  }

  recompute(src: number, length: number = 1): number {
    if (this.snap) {
      this.buf.set(this.snap.buf);
      this.head = this.snap.head;
      this.size = this.snap.size;
    }
    return this._advance(src, length);
  }

  private _advance(src: number, length: number): number {
    const cap = this.maxLength + 1;
    // push src
    this.head = this.head === 0 ? cap - 1 : this.head - 1;
    this.buf[this.head] = src;
    if (this.size < cap) this.size++;

    if (length >= this.size) return NaN;
    let idx = this.head + length;
    if (idx >= cap) idx -= cap;
    const prev = this.buf[idx];
    if (src !== src || prev !== prev) return NaN;
    return src - prev;
  }

  save(): ChangeSnapshot {
    return {
      buf: new Float64Array(this.buf),
      head: this.head,
      size: this.size,
    };
  }

  restore(snap: ChangeSnapshot): void {
    this.buf.set(snap.buf);
    this.head = snap.head;
    this.size = snap.size;
    this.snap = null;
  }
}

// ==========================================================================
// Highest / Lowest — sliding window max/min
// ==========================================================================

interface HighestLowestSnapshot {
  series: unknown;
}

export class Highest implements Saveable {
  private series: NumericSeries;
  private readonly length: number;

  private snap: HighestLowestSnapshot | null = null;

  constructor(length: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.series = new NumericSeries(this.length);
  }

  compute(src: number): number {
    this.snap = { series: this.series.save() };
    return this._advance(src);
  }

  recompute(src: number): number {
    if (this.snap) {
      this.series.restore(this.snap.series as ReturnType<NumericSeries['save']>);
    }
    return this._advance(src);
  }

  private _advance(src: number): number {
    this.series.push(src);
    const len = Math.min(this.length, this.series.length);
    let max = -Infinity;
    for (let i = 0; i < len; i++) {
      const v = this.series.get(i);
      if (v !== v) return NaN;
      if (v > max) max = v;
    }
    return max;
  }

  save(): HighestLowestSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: HighestLowestSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class Lowest implements Saveable {
  private series: NumericSeries;
  private readonly length: number;

  private snap: HighestLowestSnapshot | null = null;

  constructor(length: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.series = new NumericSeries(this.length);
  }

  compute(src: number): number {
    this.snap = { series: this.series.save() };
    return this._advance(src);
  }

  recompute(src: number): number {
    if (this.snap) {
      this.series.restore(this.snap.series as ReturnType<NumericSeries['save']>);
    }
    return this._advance(src);
  }

  private _advance(src: number): number {
    this.series.push(src);
    const len = Math.min(this.length, this.series.length);
    let min = Infinity;
    for (let i = 0; i < len; i++) {
      const v = this.series.get(i);
      if (v !== v) return NaN;
      if (v < min) min = v;
    }
    return min;
  }

  save(): HighestLowestSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: HighestLowestSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

// ==========================================================================
// MACD — Moving Average Convergence/Divergence
// ==========================================================================

export interface MACDResult {
  macdLine: number;
  signalLine: number;
  histogram: number;
}

interface MACDSnapshot {
  fastEMA: unknown;
  slowEMA: unknown;
  signalEMA: unknown;
}

export class MACD implements Saveable {
  private fastEMA: EMA;
  private slowEMA: EMA;
  private signalEMA: EMA;

  private snap: MACDSnapshot | null = null;

  constructor(fastLength: number, slowLength: number, signalLength: number) {
    this.fastEMA = new EMA(fastLength);
    this.slowEMA = new EMA(slowLength);
    this.signalEMA = new EMA(signalLength);
  }

  compute(src: number): MACDResult {
    this.snap = {
      fastEMA: this.fastEMA.save(),
      slowEMA: this.slowEMA.save(),
      signalEMA: this.signalEMA.save(),
    };
    return this._advance(src, false);
  }

  recompute(src: number): MACDResult {
    if (this.snap) {
      this.fastEMA.restore(this.snap.fastEMA as EMASnapshot);
      this.slowEMA.restore(this.snap.slowEMA as EMASnapshot);
      this.signalEMA.restore(this.snap.signalEMA as EMASnapshot);
    }
    return this._advance(src, true);
  }

  private _advance(src: number, isRecompute: boolean): MACDResult {
    const fast = isRecompute ? this.fastEMA.recompute(src) : this.fastEMA.compute(src);
    const slow = isRecompute ? this.slowEMA.recompute(src) : this.slowEMA.compute(src);
    const macdLine = fast - slow;
    const signalLine = isRecompute ? this.signalEMA.recompute(macdLine) : this.signalEMA.compute(macdLine);
    return {
      macdLine,
      signalLine,
      histogram: macdLine - signalLine,
    };
  }

  save(): MACDSnapshot {
    return {
      fastEMA: this.fastEMA.save(),
      slowEMA: this.slowEMA.save(),
      signalEMA: this.signalEMA.save(),
    };
  }

  restore(snap: MACDSnapshot): void {
    this.fastEMA.restore(snap.fastEMA as EMASnapshot);
    this.slowEMA.restore(snap.slowEMA as EMASnapshot);
    this.signalEMA.restore(snap.signalEMA as EMASnapshot);
    this.snap = null;
  }
}

// ==========================================================================
// ATR — Average True Range
// ==========================================================================

interface ATRSnapshot {
  prevClose: number;
  rma: unknown;
}

export class ATR implements Saveable {
  private prevClose: number = NaN;
  private rma: RMA;

  private snap: ATRSnapshot | null = null;

  constructor(length: number) {
    this.rma = new RMA(length);
  }

  compute(high: number, low: number, close: number): number {
    this.snap = {
      prevClose: this.prevClose,
      rma: this.rma.save(),
    };
    return this._advance(high, low, close, false);
  }

  recompute(high: number, low: number, close: number): number {
    if (this.snap) {
      this.prevClose = this.snap.prevClose;
      this.rma.restore(this.snap.rma as RMASnapshot);
    }
    return this._advance(high, low, close, true);
  }

  private _advance(high: number, low: number, close: number, isRecompute: boolean): number {
    if (high !== high || low !== low || close !== close) return NaN;
    let tr: number;
    if (this.prevClose !== this.prevClose) {
      tr = high - low;
    } else {
      tr = Math.max(high - low, Math.abs(high - this.prevClose), Math.abs(low - this.prevClose));
    }
    this.prevClose = close;
    return isRecompute ? this.rma.recompute(tr) : this.rma.compute(tr);
  }

  save(): ATRSnapshot {
    return {
      prevClose: this.prevClose,
      rma: this.rma.save(),
    };
  }

  restore(snap: ATRSnapshot): void {
    this.prevClose = snap.prevClose;
    this.rma.restore(snap.rma as RMASnapshot);
    this.snap = null;
  }
}

// ==========================================================================
// Stoch — Stochastic oscillator
// ==========================================================================

interface StochSnapshot {
  highest: unknown;
  lowest: unknown;
}

export class Stoch implements Saveable {
  private highest: Highest;
  private lowest: Lowest;

  private snap: StochSnapshot | null = null;

  constructor(length: number) {
    this.highest = new Highest(length);
    this.lowest = new Lowest(length);
  }

  compute(src: number, high: number, low: number): number {
    this.snap = {
      highest: this.highest.save(),
      lowest: this.lowest.save(),
    };
    return this._advance(src, high, low, false);
  }

  recompute(src: number, high: number, low: number): number {
    if (this.snap) {
      this.highest.restore(this.snap.highest as HighestLowestSnapshot);
      this.lowest.restore(this.snap.lowest as HighestLowestSnapshot);
    }
    return this._advance(src, high, low, true);
  }

  private _advance(src: number, high: number, low: number, isRecompute: boolean): number {
    const hh = isRecompute ? this.highest.recompute(high) : this.highest.compute(high);
    const ll = isRecompute ? this.lowest.recompute(low) : this.lowest.compute(low);
    if (hh !== hh || ll !== ll) return NaN;
    const range = hh - ll;
    return range === 0 ? 0 : 100 * (src - ll) / range;
  }

  save(): StochSnapshot {
    return {
      highest: this.highest.save(),
      lowest: this.lowest.save(),
    };
  }

  restore(snap: StochSnapshot): void {
    this.highest.restore(snap.highest as HighestLowestSnapshot);
    this.lowest.restore(snap.lowest as HighestLowestSnapshot);
    this.snap = null;
  }
}

// ==========================================================================
// StdDev — Standard Deviation
// ==========================================================================

interface StdDevSnapshot {
  series: unknown;
}

export class StdDev implements Saveable {
  private series: NumericSeries;
  private readonly length: number;

  private snap: StdDevSnapshot | null = null;

  constructor(length: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.series = new NumericSeries(this.length);
  }

  compute(src: number): number {
    this.snap = { series: this.series.save() };
    return this._advance(src);
  }

  recompute(src: number): number {
    if (this.snap) {
      this.series.restore(this.snap.series as ReturnType<NumericSeries['save']>);
    }
    return this._advance(src);
  }

  private _advance(src: number): number {
    this.series.push(src);
    if (this.series.length < this.length) return NaN;
    let sum = 0;
    for (let i = 0; i < this.length; i++) {
      const v = this.series.get(i);
      if (v !== v) return NaN;
      sum += v;
    }
    const mean = sum / this.length;
    let sumSq = 0;
    for (let i = 0; i < this.length; i++) {
      const d = this.series.get(i) - mean;
      sumSq += d * d;
    }
    return Math.sqrt(sumSq / this.length);
  }

  save(): StdDevSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: StdDevSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

// ==========================================================================
// BB — Bollinger Bands
// ==========================================================================

export interface BBResult {
  middle: number;
  upper: number;
  lower: number;
}

interface BBSnapshot {
  sma: unknown;
  stddev: unknown;
}

export class BB implements Saveable {
  private sma: SMA;
  private stddev: StdDev;
  private readonly mult: number;

  private snap: BBSnapshot | null = null;

  constructor(length: number, mult: number = 2) {
    this.sma = new SMA(length);
    this.stddev = new StdDev(length);
    this.mult = mult;
  }

  compute(src: number): BBResult {
    this.snap = {
      sma: this.sma.save(),
      stddev: this.stddev.save(),
    };
    return this._advance(src, false);
  }

  recompute(src: number): BBResult {
    if (this.snap) {
      this.sma.restore(this.snap.sma as SMASnapshot);
      this.stddev.restore(this.snap.stddev as StdDevSnapshot);
    }
    return this._advance(src, true);
  }

  private _advance(src: number, isRecompute: boolean): BBResult {
    const middle = isRecompute ? this.sma.recompute(src) : this.sma.compute(src);
    const dev = isRecompute ? this.stddev.recompute(src) : this.stddev.compute(src);
    return {
      middle,
      upper: middle + this.mult * dev,
      lower: middle - this.mult * dev,
    };
  }

  save(): BBSnapshot {
    return {
      sma: this.sma.save(),
      stddev: this.stddev.save(),
    };
  }

  restore(snap: BBSnapshot): void {
    this.sma.restore(snap.sma as SMASnapshot);
    this.stddev.restore(snap.stddev as StdDevSnapshot);
    this.snap = null;
  }
}

// ==========================================================================
// DEMA — Double Exponential Moving Average
// ==========================================================================

interface DEMASnapshot {
  ema1: unknown;
  ema2: unknown;
}

export class DEMA implements Saveable {
  private ema1: EMA;
  private ema2: EMA;

  private snap: DEMASnapshot | null = null;

  constructor(length: number) {
    this.ema1 = new EMA(length);
    this.ema2 = new EMA(length);
  }

  compute(src: number): number {
    this.snap = {
      ema1: this.ema1.save(),
      ema2: this.ema2.save(),
    };
    return this._advance(src, false);
  }

  recompute(src: number): number {
    if (this.snap) {
      this.ema1.restore(this.snap.ema1 as EMASnapshot);
      this.ema2.restore(this.snap.ema2 as EMASnapshot);
    }
    return this._advance(src, true);
  }

  private _advance(src: number, isRecompute: boolean): number {
    const e1 = isRecompute ? this.ema1.recompute(src) : this.ema1.compute(src);
    const e2 = isRecompute ? this.ema2.recompute(e1) : this.ema2.compute(e1);
    return 2 * e1 - e2;
  }

  save(): DEMASnapshot {
    return {
      ema1: this.ema1.save(),
      ema2: this.ema2.save(),
    };
  }

  restore(snap: DEMASnapshot): void {
    this.ema1.restore(snap.ema1 as EMASnapshot);
    this.ema2.restore(snap.ema2 as EMASnapshot);
    this.snap = null;
  }
}

// ==========================================================================
// TEMA — Triple Exponential Moving Average
// ==========================================================================

interface TEMASnapshot {
  ema1: unknown;
  ema2: unknown;
  ema3: unknown;
}

export class TEMA implements Saveable {
  private ema1: EMA;
  private ema2: EMA;
  private ema3: EMA;

  private snap: TEMASnapshot | null = null;

  constructor(length: number) {
    this.ema1 = new EMA(length);
    this.ema2 = new EMA(length);
    this.ema3 = new EMA(length);
  }

  compute(src: number): number {
    this.snap = {
      ema1: this.ema1.save(),
      ema2: this.ema2.save(),
      ema3: this.ema3.save(),
    };
    return this._advance(src, false);
  }

  recompute(src: number): number {
    if (this.snap) {
      this.ema1.restore(this.snap.ema1 as EMASnapshot);
      this.ema2.restore(this.snap.ema2 as EMASnapshot);
      this.ema3.restore(this.snap.ema3 as EMASnapshot);
    }
    return this._advance(src, true);
  }

  private _advance(src: number, isRecompute: boolean): number {
    const e1 = isRecompute ? this.ema1.recompute(src) : this.ema1.compute(src);
    const e2 = isRecompute ? this.ema2.recompute(e1) : this.ema2.compute(e1);
    const e3 = isRecompute ? this.ema3.recompute(e2) : this.ema3.compute(e2);
    return 3 * e1 - 3 * e2 + e3;
  }

  save(): TEMASnapshot {
    return {
      ema1: this.ema1.save(),
      ema2: this.ema2.save(),
      ema3: this.ema3.save(),
    };
  }

  restore(snap: TEMASnapshot): void {
    this.ema1.restore(snap.ema1 as EMASnapshot);
    this.ema2.restore(snap.ema2 as EMASnapshot);
    this.ema3.restore(snap.ema3 as EMASnapshot);
    this.snap = null;
  }
}

// ==========================================================================
// Cum — Cumulative sum
// ==========================================================================

interface CumSnapshot {
  sum: number;
}

export class Cum implements Saveable {
  private sum: number = 0;

  private snap: CumSnapshot | null = null;

  compute(src: number): number {
    this.snap = { sum: this.sum };
    return this._advance(src);
  }

  recompute(src: number): number {
    if (this.snap) {
      this.sum = this.snap.sum;
    }
    return this._advance(src);
  }

  private _advance(src: number): number {
    if (src !== src) return this.sum;
    this.sum += src;
    return this.sum;
  }

  save(): CumSnapshot {
    return { sum: this.sum };
  }

  restore(snap: CumSnapshot): void {
    this.sum = snap.sum;
    this.snap = null;
  }
}
