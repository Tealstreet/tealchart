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

export class Cross implements Saveable {
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
    return (a > b && pA <= pB) || (a < b && pA >= pB);
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
// WMA — Weighted Moving Average
// ==========================================================================

interface SeriesSnapshot {
  series: unknown;
}

export class WMA implements Saveable {
  private series: NumericSeries;
  private readonly length: number;

  private snap: SeriesSnapshot | null = null;

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

    let weightedSum = 0;
    let weightSum = 0;
    for (let index = 0; index < this.length; index += 1) {
      const value = this.series.get(index);
      if (value !== value) return NaN;
      const weight = this.length - index;
      weightedSum += value * weight;
      weightSum += weight;
    }
    return weightedSum / weightSum;
  }

  save(): SeriesSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: SeriesSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class VWMA implements Saveable {
  private sourceSeries: NumericSeries;
  private volumeSeries: NumericSeries;
  private readonly length: number;

  private snap: { source: unknown; volume: unknown } | null = null;

  constructor(length: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.sourceSeries = new NumericSeries(this.length);
    this.volumeSeries = new NumericSeries(this.length);
  }

  compute(source: number, volume: number): number {
    this.snap = {
      source: this.sourceSeries.save(),
      volume: this.volumeSeries.save(),
    };
    return this._advance(source, volume);
  }

  recompute(source: number, volume: number): number {
    if (this.snap) {
      this.sourceSeries.restore(this.snap.source as ReturnType<NumericSeries['save']>);
      this.volumeSeries.restore(this.snap.volume as ReturnType<NumericSeries['save']>);
    }
    return this._advance(source, volume);
  }

  private _advance(source: number, volume: number): number {
    this.sourceSeries.push(source);
    this.volumeSeries.push(volume);
    if (this.sourceSeries.length < this.length || this.volumeSeries.length < this.length) return NaN;

    let weightedSum = 0;
    let volumeSum = 0;
    for (let offset = 0; offset < this.length; offset += 1) {
      const value = this.sourceSeries.get(offset);
      const weight = this.volumeSeries.get(offset);
      if (value !== value || weight !== weight) continue;
      weightedSum += value * weight;
      volumeSum += weight;
    }

    return volumeSum === 0 ? NaN : weightedSum / volumeSum;
  }

  save(): { source: unknown; volume: unknown } {
    return {
      source: this.sourceSeries.save(),
      volume: this.volumeSeries.save(),
    };
  }

  restore(snap: { source: unknown; volume: unknown }): void {
    this.sourceSeries.restore(snap.source as ReturnType<NumericSeries['save']>);
    this.volumeSeries.restore(snap.volume as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

// ==========================================================================
// SWMA - Symmetrically Weighted Moving Average
// ==========================================================================

export class SWMA implements Saveable {
  private series = new NumericSeries(4);

  private snap: SeriesSnapshot | null = null;

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
    if (this.series.length < 4) return NaN;
    const current = this.series.get(0);
    const prev1 = this.series.get(1);
    const prev2 = this.series.get(2);
    const prev3 = this.series.get(3);
    if (current !== current || prev1 !== prev1 || prev2 !== prev2 || prev3 !== prev3) return NaN;
    return (current + prev1 * 2 + prev2 * 2 + prev3) / 6;
  }

  save(): SeriesSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: SeriesSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

// ==========================================================================
// ALMA - Arnaud Legoux Moving Average
// ==========================================================================

interface ALMASnapshot {
  series: unknown;
}

export class ALMA implements Saveable {
  private series: NumericSeries;
  private readonly length: number;
  private readonly offset: number;
  private readonly sigma: number;
  private readonly useFlooredOffset: boolean;

  private snap: ALMASnapshot | null = null;

  constructor(length: number, offset: number, sigma: number, useFlooredOffset = true) {
    this.length = Math.max(1, Math.trunc(length));
    this.offset = offset;
    this.sigma = sigma;
    this.useFlooredOffset = useFlooredOffset;
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
    if (this.series.length < this.length || this.offset !== this.offset || !Number.isFinite(this.sigma) || this.sigma === 0) {
      return NaN;
    }

    const m = this.useFlooredOffset ? Math.floor(this.offset * (this.length - 1)) : this.offset * (this.length - 1);
    const s = this.length / this.sigma;
    let weightedSum = 0;
    let weightSum = 0;

    for (let i = 0; i < this.length; i += 1) {
      const value = this.series.get(this.length - 1 - i);
      if (value !== value) return NaN;
      const weight = Math.exp(-Math.pow(i - m, 2) / (2 * s * s));
      weightedSum += value * weight;
      weightSum += weight;
    }

    return weightSum === 0 ? NaN : weightedSum / weightSum;
  }

  save(): ALMASnapshot {
    return { series: this.series.save() };
  }

  restore(snap: ALMASnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

// ==========================================================================
// CCI / CMO / WPR oscillator helpers
// ==========================================================================

export class CCI implements Saveable {
  private series: NumericSeries;
  private readonly length: number;

  private snap: SeriesSnapshot | null = null;

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
    if (this.series.length < this.length || src !== src) return NaN;

    const values = Array.from({ length: this.length }, (_, i) => this.series.get(i));
    if (values.some((value) => value !== value)) return NaN;

    const basis = values.reduce((sum, value) => sum + value, 0) / this.length;
    const meanDeviation = values.reduce((sum, value) => sum + Math.abs(value - basis), 0) / this.length;
    return meanDeviation === 0 ? 0 : (src - basis) / (0.015 * meanDeviation);
  }

  save(): SeriesSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: SeriesSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class CMO implements Saveable {
  private series: NumericSeries;
  private readonly length: number;

  private snap: SeriesSnapshot | null = null;

  constructor(length: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.series = new NumericSeries(this.length + 1);
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
    if (this.series.length < this.length + 1) return NaN;

    let gains = 0;
    let losses = 0;
    for (let index = 0; index < this.length; index += 1) {
      const current = this.series.get(index);
      const previous = this.series.get(index + 1);
      if (current !== current || previous !== previous) return NaN;
      const change = current - previous;
      if (change > 0) gains += change;
      if (change < 0) losses -= change;
    }

    const total = gains + losses;
    return total === 0 ? 0 : ((gains - losses) / total) * 100;
  }

  save(): SeriesSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: SeriesSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

interface WPRSnapshot {
  highs: unknown;
  lows: unknown;
}

export class WPR implements Saveable {
  private highs: NumericSeries;
  private lows: NumericSeries;
  private readonly length: number;

  private snap: WPRSnapshot | null = null;

  constructor(length: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.highs = new NumericSeries(this.length);
    this.lows = new NumericSeries(this.length);
  }

  compute(high: number, low: number, close: number): number {
    this.snap = {
      highs: this.highs.save(),
      lows: this.lows.save(),
    };
    return this._advance(high, low, close);
  }

  recompute(high: number, low: number, close: number): number {
    if (this.snap) {
      this.highs.restore(this.snap.highs as ReturnType<NumericSeries['save']>);
      this.lows.restore(this.snap.lows as ReturnType<NumericSeries['save']>);
    }
    return this._advance(high, low, close);
  }

  private _advance(high: number, low: number, close: number): number {
    if (high !== high || low !== low || close !== close) return NaN;
    this.highs.push(high);
    this.lows.push(low);
    if (this.highs.length < this.length || this.lows.length < this.length) return NaN;

    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let offset = 0; offset < this.length; offset += 1) {
      const highValue = this.highs.get(offset);
      const lowValue = this.lows.get(offset);
      if (highValue !== highValue || lowValue !== lowValue) return NaN;
      if (highValue > highestHigh) highestHigh = highValue;
      if (lowValue < lowestLow) lowestLow = lowValue;
    }

    const range = highestHigh - lowestLow;
    return range === 0 ? NaN : ((close - highestHigh) / range) * 100;
  }

  save(): WPRSnapshot {
    return {
      highs: this.highs.save(),
      lows: this.lows.save(),
    };
  }

  restore(snap: WPRSnapshot): void {
    this.highs.restore(snap.highs as ReturnType<NumericSeries['save']>);
    this.lows.restore(snap.lows as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

// ==========================================================================
// HMA - Hull Moving Average
// ==========================================================================

interface HMASnapshot {
  half: unknown;
  full: unknown;
  raw: unknown;
}

export class HMA implements Saveable {
  private half: WMA;
  private full: WMA;
  private raw: WMA;

  private snap: HMASnapshot | null = null;

  constructor(length: number) {
    const normalized = Math.max(1, Math.trunc(length));
    this.half = new WMA(Math.floor(normalized / 2));
    this.full = new WMA(normalized);
    this.raw = new WMA(Math.round(Math.sqrt(normalized)));
  }

  compute(src: number): number {
    this.snap = {
      half: this.half.save(),
      full: this.full.save(),
      raw: this.raw.save(),
    };
    return this._advance(src, false);
  }

  recompute(src: number): number {
    if (this.snap) {
      this.half.restore(this.snap.half as SeriesSnapshot);
      this.full.restore(this.snap.full as SeriesSnapshot);
      this.raw.restore(this.snap.raw as SeriesSnapshot);
    }
    return this._advance(src, true);
  }

  private _advance(src: number, isRecompute: boolean): number {
    const half = isRecompute ? this.half.recompute(src) : this.half.compute(src);
    const full = isRecompute ? this.full.recompute(src) : this.full.compute(src);
    if (half !== half || full !== full) return NaN;

    const raw = 2 * half - full;
    return isRecompute ? this.raw.recompute(raw) : this.raw.compute(raw);
  }

  save(): HMASnapshot {
    return {
      half: this.half.save(),
      full: this.full.save(),
      raw: this.raw.save(),
    };
  }

  restore(snap: HMASnapshot): void {
    this.half.restore(snap.half as SeriesSnapshot);
    this.full.restore(snap.full as SeriesSnapshot);
    this.raw.restore(snap.raw as SeriesSnapshot);
    this.snap = null;
  }
}

// ==========================================================================
// MOM / ROC — fixed-lookback momentum helpers
// ==========================================================================

export class Mom implements Saveable {
  private series: NumericSeries;
  private readonly length: number;

  private snap: SeriesSnapshot | null = null;

  constructor(length: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.series = new NumericSeries(this.length + 1);
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
    if (this.series.length <= this.length) return NaN;
    const previous = this.series.get(this.length);
    return previous === undefined || previous !== previous || src !== src ? NaN : src - previous;
  }

  save(): SeriesSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: SeriesSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class ROC implements Saveable {
  private series: NumericSeries;
  private readonly length: number;

  private snap: SeriesSnapshot | null = null;

  constructor(length: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.series = new NumericSeries(this.length + 1);
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
    if (this.series.length <= this.length) return NaN;
    const previous = this.series.get(this.length);
    return previous === undefined || previous === 0 || previous !== previous || src !== src
      ? NaN
      : ((src - previous) / previous) * 100;
  }

  save(): SeriesSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: SeriesSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

// ==========================================================================
// OBV — On-Balance Volume
// ==========================================================================

interface OBVSnapshot {
  previousSource: number;
  value: number;
}

export class OBV implements Saveable {
  private previousSource: number = NaN;
  private value = 0;

  private snap: OBVSnapshot | null = null;

  compute(source: number, volume: number): number {
    this.snap = {
      previousSource: this.previousSource,
      value: this.value,
    };
    return this._advance(source, volume);
  }

  recompute(source: number, volume: number): number {
    if (this.snap) {
      this.previousSource = this.snap.previousSource;
      this.value = this.snap.value;
    }
    return this._advance(source, volume);
  }

  private _advance(source: number, volume: number): number {
    if (source !== source || volume !== volume) return NaN;
    if (this.previousSource === this.previousSource) {
      if (source > this.previousSource) this.value += volume;
      if (source < this.previousSource) this.value -= volume;
    }
    this.previousSource = source;
    return this.value;
  }

  save(): OBVSnapshot {
    return {
      previousSource: this.previousSource,
      value: this.value,
    };
  }

  restore(snap: OBVSnapshot): void {
    this.previousSource = snap.previousSource;
    this.value = snap.value;
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
    this.length = Math.trunc(length);
    this.series = new NumericSeries(Math.max(1, this.length));
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
    if (this.length <= 0) return NaN;
    const len = Math.min(this.length, this.series.length);
    let max = -Infinity;
    for (let i = 0; i < len; i++) {
      const v = this.series.get(i);
      if (v !== v) continue;
      if (v > max) max = v;
    }
    return max === -Infinity ? NaN : max;
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
    if (this.length <= 0) return NaN;
    const len = Math.min(this.length, this.series.length);
    let min = Infinity;
    for (let i = 0; i < len; i++) {
      const v = this.series.get(i);
      if (v !== v) continue;
      if (v < min) min = v;
    }
    return min === Infinity ? NaN : min;
  }

  save(): HighestLowestSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: HighestLowestSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class Range implements Saveable {
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
    let min = Infinity;
    for (let i = 0; i < len; i += 1) {
      const value = this.series.get(i);
      if (value !== value) continue;
      if (value > max) max = value;
      if (value < min) min = value;
    }
    return max === -Infinity || min === Infinity ? NaN : max - min;
  }

  save(): HighestLowestSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: HighestLowestSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class HighestBars implements Saveable {
  private series: NumericSeries;
  private readonly length: number;

  private snap: HighestLowestSnapshot | null = null;

  constructor(length: number) {
    this.length = Math.trunc(length);
    this.series = new NumericSeries(Math.max(1, this.length));
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
    if (this.length <= 0) return NaN;
    let highest = -Infinity;
    let offset = NaN;
    for (let index = 0; index < this.series.length; index += 1) {
      const value = this.series.get(index);
      if (value !== value) continue;
      if (value > highest) {
        highest = value;
        offset = index;
      }
    }
    return offset;
  }

  save(): HighestLowestSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: HighestLowestSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class LowestBars implements Saveable {
  private series: NumericSeries;
  private readonly length: number;

  private snap: HighestLowestSnapshot | null = null;

  constructor(length: number) {
    this.length = Math.trunc(length);
    this.series = new NumericSeries(Math.max(1, this.length));
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
    if (this.length <= 0) return NaN;
    let lowest = Infinity;
    let offset = NaN;
    for (let index = 0; index < this.series.length; index += 1) {
      const value = this.series.get(index);
      if (value !== value) continue;
      if (value < lowest) {
        lowest = value;
        offset = index;
      }
    }
    return offset;
  }

  save(): HighestLowestSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: HighestLowestSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class Rising implements Saveable {
  private series: NumericSeries;
  private readonly length: number;

  private snap: HighestLowestSnapshot | null = null;

  constructor(length: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.series = new NumericSeries(this.length + 1);
  }

  compute(src: number): boolean {
    this.snap = { series: this.series.save() };
    return this._advance(src);
  }

  recompute(src: number): boolean {
    if (this.snap) {
      this.series.restore(this.snap.series as ReturnType<NumericSeries['save']>);
    }
    return this._advance(src);
  }

  private _advance(src: number): boolean {
    if (src !== src) return false;
    this.series.push(src);
    if (this.series.length <= this.length) return false;
    for (let offset = 1; offset <= this.length; offset += 1) {
      const value = this.series.get(offset);
      if (value !== value || src <= value) return false;
    }
    return true;
  }

  save(): HighestLowestSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: HighestLowestSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class Falling implements Saveable {
  private series: NumericSeries;
  private readonly length: number;

  private snap: HighestLowestSnapshot | null = null;

  constructor(length: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.series = new NumericSeries(this.length + 1);
  }

  compute(src: number): boolean {
    this.snap = { series: this.series.save() };
    return this._advance(src);
  }

  recompute(src: number): boolean {
    if (this.snap) {
      this.series.restore(this.snap.series as ReturnType<NumericSeries['save']>);
    }
    return this._advance(src);
  }

  private _advance(src: number): boolean {
    if (src !== src) return false;
    this.series.push(src);
    if (this.series.length <= this.length) return false;
    for (let offset = 1; offset <= this.length; offset += 1) {
      const value = this.series.get(offset);
      if (value !== value || src >= value) return false;
    }
    return true;
  }

  save(): HighestLowestSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: HighestLowestSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class Max implements Saveable {
  compute(left: number, right: number): number {
    return left !== left || right !== right ? NaN : Math.max(left, right);
  }

  recompute(left: number, right: number): number {
    return this.compute(left, right);
  }

  save(): null {
    return null;
  }

  restore(): void {
  }
}

export class Min implements Saveable {
  compute(left: number, right: number): number {
    return left !== left || right !== right ? NaN : Math.min(left, right);
  }

  recompute(left: number, right: number): number {
    return this.compute(left, right);
  }

  save(): null {
    return null;
  }

  restore(): void {
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

  compute(src: number): [number, number, number] {
    this.snap = {
      fastEMA: this.fastEMA.save(),
      slowEMA: this.slowEMA.save(),
      signalEMA: this.signalEMA.save(),
    };
    return this._advance(src, false);
  }

  recompute(src: number): [number, number, number] {
    if (this.snap) {
      this.fastEMA.restore(this.snap.fastEMA as EMASnapshot);
      this.slowEMA.restore(this.snap.slowEMA as EMASnapshot);
      this.signalEMA.restore(this.snap.signalEMA as EMASnapshot);
    }
    return this._advance(src, true);
  }

  private _advance(src: number, isRecompute: boolean): [number, number, number] {
    const fast = isRecompute ? this.fastEMA.recompute(src) : this.fastEMA.compute(src);
    const slow = isRecompute ? this.slowEMA.recompute(src) : this.slowEMA.compute(src);
    const macdLine = fast - slow;
    const signalLine = isRecompute ? this.signalEMA.recompute(macdLine) : this.signalEMA.compute(macdLine);
    return [macdLine, signalLine, macdLine - signalLine];
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
// DMI / ADX — Directional Movement Index
// ==========================================================================

interface DMISnapshot {
  prevHigh: number;
  prevLow: number;
  prevClose: number;
  trRma: unknown;
  plusDmRma: unknown;
  minusDmRma: unknown;
  adxRma: unknown;
}

export class DMI implements Saveable {
  private prevHigh: number = NaN;
  private prevLow: number = NaN;
  private prevClose: number = NaN;
  private trRma: RMA;
  private plusDmRma: RMA;
  private minusDmRma: RMA;
  private adxRma: RMA;

  private snap: DMISnapshot | null = null;

  constructor(diLength: number, adxSmoothing: number = diLength) {
    this.trRma = new RMA(diLength);
    this.plusDmRma = new RMA(diLength);
    this.minusDmRma = new RMA(diLength);
    this.adxRma = new RMA(adxSmoothing);
  }

  compute(high: number, low: number, close: number): [number, number, number] {
    this.snap = this.save();
    return this._advance(high, low, close, false);
  }

  recompute(high: number, low: number, close: number): [number, number, number] {
    if (this.snap) {
      this.prevHigh = this.snap.prevHigh;
      this.prevLow = this.snap.prevLow;
      this.prevClose = this.snap.prevClose;
      this.trRma.restore(this.snap.trRma as RMASnapshot);
      this.plusDmRma.restore(this.snap.plusDmRma as RMASnapshot);
      this.minusDmRma.restore(this.snap.minusDmRma as RMASnapshot);
      this.adxRma.restore(this.snap.adxRma as RMASnapshot);
    }
    return this._advance(high, low, close, true);
  }

  private _advance(high: number, low: number, close: number, isRecompute: boolean): [number, number, number] {
    if (high !== high || low !== low || close !== close) return [NaN, NaN, NaN];

    const tr = this.prevClose !== this.prevClose
      ? high - low
      : Math.max(high - low, Math.abs(high - this.prevClose), Math.abs(low - this.prevClose));

    let plusDm = NaN;
    let minusDm = NaN;
    if (this.prevHigh === this.prevHigh && this.prevLow === this.prevLow) {
      const upMove = high - this.prevHigh;
      const downMove = this.prevLow - low;
      plusDm = upMove > downMove && upMove > 0 ? upMove : 0;
      minusDm = downMove > upMove && downMove > 0 ? downMove : 0;
    }

    this.prevHigh = high;
    this.prevLow = low;
    this.prevClose = close;

    const smoothTr = isRecompute ? this.trRma.recompute(tr) : this.trRma.compute(tr);
    const smoothPlusDm = isRecompute ? this.plusDmRma.recompute(plusDm) : this.plusDmRma.compute(plusDm);
    const smoothMinusDm = isRecompute ? this.minusDmRma.recompute(minusDm) : this.minusDmRma.compute(minusDm);
    if (smoothTr !== smoothTr || smoothPlusDm !== smoothPlusDm || smoothMinusDm !== smoothMinusDm) {
      return [NaN, NaN, NaN];
    }

    const diPlus = smoothTr > 0 ? (smoothPlusDm / smoothTr) * 100 : 0;
    const diMinus = smoothTr > 0 ? (smoothMinusDm / smoothTr) * 100 : 0;
    const diSum = diPlus + diMinus;
    const dx = diSum > 0 ? (Math.abs(diPlus - diMinus) / diSum) * 100 : 0;
    const adx = isRecompute ? this.adxRma.recompute(dx) : this.adxRma.compute(dx);

    return [diPlus, diMinus, adx];
  }

  save(): DMISnapshot {
    return {
      prevHigh: this.prevHigh,
      prevLow: this.prevLow,
      prevClose: this.prevClose,
      trRma: this.trRma.save(),
      plusDmRma: this.plusDmRma.save(),
      minusDmRma: this.minusDmRma.save(),
      adxRma: this.adxRma.save(),
    };
  }

  restore(snap: DMISnapshot): void {
    this.prevHigh = snap.prevHigh;
    this.prevLow = snap.prevLow;
    this.prevClose = snap.prevClose;
    this.trRma.restore(snap.trRma as RMASnapshot);
    this.plusDmRma.restore(snap.plusDmRma as RMASnapshot);
    this.minusDmRma.restore(snap.minusDmRma as RMASnapshot);
    this.adxRma.restore(snap.adxRma as RMASnapshot);
    this.snap = null;
  }
}

export class ADX implements Saveable {
  private dmi: DMI;

  constructor(diLength: number, adxSmoothing: number = diLength) {
    this.dmi = new DMI(diLength, adxSmoothing);
  }

  compute(high: number, low: number, close: number): number {
    return this.dmi.compute(high, low, close)[2];
  }

  recompute(high: number, low: number, close: number): number {
    return this.dmi.recompute(high, low, close)[2];
  }

  save(): DMISnapshot {
    return this.dmi.save();
  }

  restore(snap: DMISnapshot): void {
    this.dmi.restore(snap);
  }
}

// ==========================================================================
// Supertrend — ATR-based trend bands
// ==========================================================================

interface SupertrendSnapshot {
  prevClose: number;
  prevUpper: number;
  prevLower: number;
  prevDirection: number;
  atr: unknown;
}

export class Supertrend implements Saveable {
  private prevClose: number = NaN;
  private prevUpper: number = NaN;
  private prevLower: number = NaN;
  private prevDirection: number = NaN;
  private atr: RMA;
  private readonly factor: number;

  private snap: SupertrendSnapshot | null = null;

  constructor(factor: number, atrPeriod: number) {
    this.factor = factor;
    this.atr = new RMA(atrPeriod);
  }

  compute(high: number, low: number, close: number): [number, number] {
    this.snap = this.save();
    return this._advance(high, low, close, false);
  }

  recompute(high: number, low: number, close: number): [number, number] {
    if (this.snap) {
      this.prevClose = this.snap.prevClose;
      this.prevUpper = this.snap.prevUpper;
      this.prevLower = this.snap.prevLower;
      this.prevDirection = this.snap.prevDirection;
      this.atr.restore(this.snap.atr as RMASnapshot);
    }
    return this._advance(high, low, close, true);
  }

  private _advance(high: number, low: number, close: number, isRecompute: boolean): [number, number] {
    if (high !== high || low !== low || close !== close || this.factor !== this.factor) return [NaN, NaN];

    const prevClose = this.prevClose;
    const tr = prevClose !== prevClose
      ? high - low
      : Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    const atr = isRecompute ? this.atr.recompute(tr) : this.atr.compute(tr);
    if (atr !== atr) {
      this.prevClose = close;
      return [NaN, NaN];
    }

    const hl2 = (high + low) / 2;
    const basicUpper = hl2 + this.factor * atr;
    const basicLower = hl2 - this.factor * atr;

    const finalUpper = this.prevUpper !== this.prevUpper || prevClose !== prevClose
      ? basicUpper
      : (basicUpper < this.prevUpper || prevClose > this.prevUpper ? basicUpper : this.prevUpper);
    const finalLower = this.prevLower !== this.prevLower || prevClose !== prevClose
      ? basicLower
      : (basicLower > this.prevLower || prevClose < this.prevLower ? basicLower : this.prevLower);

    let direction: number;
    if (this.prevDirection !== this.prevDirection) {
      direction = close > finalUpper ? -1 : 1;
    } else if (this.prevDirection === 1 && close > finalUpper) {
      direction = -1;
    } else if (this.prevDirection === -1 && close < finalLower) {
      direction = 1;
    } else {
      direction = this.prevDirection;
    }

    this.prevClose = close;
    this.prevUpper = finalUpper;
    this.prevLower = finalLower;
    this.prevDirection = direction;

    return [direction === -1 ? finalLower : finalUpper, direction];
  }

  save(): SupertrendSnapshot {
    return {
      prevClose: this.prevClose,
      prevUpper: this.prevUpper,
      prevLower: this.prevLower,
      prevDirection: this.prevDirection,
      atr: this.atr.save(),
    };
  }

  restore(snap: SupertrendSnapshot): void {
    this.prevClose = snap.prevClose;
    this.prevUpper = snap.prevUpper;
    this.prevLower = snap.prevLower;
    this.prevDirection = snap.prevDirection;
    this.atr.restore(snap.atr as RMASnapshot);
    this.snap = null;
  }
}

// ==========================================================================
// SAR — Parabolic Stop and Reverse
// ==========================================================================

interface SARSnapshot {
  sar: number;
  ep: number;
  af: number;
  trend: number;
  prevHigh1: number;
  prevHigh2: number;
  prevLow1: number;
  prevLow2: number;
}

export class SAR implements Saveable {
  private sar: number = NaN;
  private ep: number = NaN;
  private af: number = NaN;
  private trend: number = NaN;
  private prevHigh1: number = NaN;
  private prevHigh2: number = NaN;
  private prevLow1: number = NaN;
  private prevLow2: number = NaN;
  private readonly start: number;
  private readonly increment: number;
  private readonly maximum: number;

  private snap: SARSnapshot | null = null;

  constructor(start: number, increment: number, maximum: number) {
    this.start = start;
    this.increment = increment;
    this.maximum = maximum;
  }

  compute(high: number, low: number): number {
    this.snap = this.save();
    return this._advance(high, low);
  }

  recompute(high: number, low: number): number {
    if (this.snap) {
      this.sar = this.snap.sar;
      this.ep = this.snap.ep;
      this.af = this.snap.af;
      this.trend = this.snap.trend;
      this.prevHigh1 = this.snap.prevHigh1;
      this.prevHigh2 = this.snap.prevHigh2;
      this.prevLow1 = this.snap.prevLow1;
      this.prevLow2 = this.snap.prevLow2;
    }
    return this._advance(high, low);
  }

  private _advance(high: number, low: number): number {
    if (high !== high || low !== low) return NaN;

    let sar = this.sar;
    let ep = this.ep;
    let af = this.af;
    let trend = this.trend;

    if (sar !== sar || ep !== ep || af !== af || trend !== trend) {
      sar = high;
      ep = low;
      af = this.start;
      trend = -1;
    } else {
      sar = sar + af * (ep - sar);

      if (trend === 1) {
        if (this.prevLow1 === this.prevLow1) sar = Math.min(sar, this.prevLow1);
        if (this.prevLow2 === this.prevLow2) sar = Math.min(sar, this.prevLow2);

        if (low < sar) {
          trend = -1;
          sar = ep;
          ep = low;
          af = this.start;
        } else if (high > ep) {
          ep = high;
          af = Math.min(af + this.increment, this.maximum);
        }
      } else {
        if (this.prevHigh1 === this.prevHigh1) sar = Math.max(sar, this.prevHigh1);
        if (this.prevHigh2 === this.prevHigh2) sar = Math.max(sar, this.prevHigh2);

        if (high > sar) {
          trend = 1;
          sar = ep;
          ep = high;
          af = this.start;
        } else if (low < ep) {
          ep = low;
          af = Math.min(af + this.increment, this.maximum);
        }
      }
    }

    this.sar = sar;
    this.ep = ep;
    this.af = af;
    this.trend = trend;
    this.prevHigh2 = this.prevHigh1;
    this.prevHigh1 = high;
    this.prevLow2 = this.prevLow1;
    this.prevLow1 = low;

    return sar;
  }

  save(): SARSnapshot {
    return {
      sar: this.sar,
      ep: this.ep,
      af: this.af,
      trend: this.trend,
      prevHigh1: this.prevHigh1,
      prevHigh2: this.prevHigh2,
      prevLow1: this.prevLow1,
      prevLow2: this.prevLow2,
    };
  }

  restore(snap: SARSnapshot): void {
    this.sar = snap.sar;
    this.ep = snap.ep;
    this.af = snap.af;
    this.trend = snap.trend;
    this.prevHigh1 = snap.prevHigh1;
    this.prevHigh2 = snap.prevHigh2;
    this.prevLow1 = snap.prevLow1;
    this.prevLow2 = snap.prevLow2;
    this.snap = null;
  }
}

// ==========================================================================
// Stoch — Stochastic oscillator
// ==========================================================================

interface StochSnapshot {
  highest: unknown;
  lowest: unknown;
  samples: number;
}

export class Stoch implements Saveable {
  private highest: Highest;
  private lowest: Lowest;
  private readonly length: number;
  private samples = 0;

  private snap: StochSnapshot | null = null;

  constructor(length: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.highest = new Highest(length);
    this.lowest = new Lowest(length);
  }

  compute(src: number, high: number, low: number): number {
    this.snap = {
      highest: this.highest.save(),
      lowest: this.lowest.save(),
      samples: this.samples,
    };
    return this._advance(src, high, low, false);
  }

  recompute(src: number, high: number, low: number): number {
    if (this.snap) {
      this.highest.restore(this.snap.highest as HighestLowestSnapshot);
      this.lowest.restore(this.snap.lowest as HighestLowestSnapshot);
      this.samples = this.snap.samples;
    }
    return this._advance(src, high, low, true);
  }

  private _advance(src: number, high: number, low: number, isRecompute: boolean): number {
    const hh = isRecompute ? this.highest.recompute(high) : this.highest.compute(high);
    const ll = isRecompute ? this.lowest.recompute(low) : this.lowest.compute(low);
    this.samples += 1;
    if (this.samples < this.length) return NaN;
    if (hh !== hh || ll !== ll) return NaN;
    const range = hh - ll;
    return range === 0 ? 0 : 100 * (src - ll) / range;
  }

  save(): StochSnapshot {
    return {
      highest: this.highest.save(),
      lowest: this.lowest.save(),
      samples: this.samples,
    };
  }

  restore(snap: StochSnapshot): void {
    this.highest.restore(snap.highest as HighestLowestSnapshot);
    this.lowest.restore(snap.lowest as HighestLowestSnapshot);
    this.samples = snap.samples;
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
  private readonly biased: boolean;

  private snap: StdDevSnapshot | null = null;

  constructor(length: number, biased = true) {
    this.length = Math.max(1, Math.trunc(length));
    this.biased = biased;
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
    const divisor = this.biased ? this.length : this.length - 1;
    return divisor <= 0 ? NaN : Math.sqrt(sumSq / divisor);
  }

  save(): StdDevSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: StdDevSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class Variance implements Saveable {
  private series: NumericSeries;
  private readonly length: number;
  private readonly biased: boolean;

  private snap: StdDevSnapshot | null = null;

  constructor(length: number, biased = true) {
    this.length = Math.max(1, Math.trunc(length));
    this.biased = biased;
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
    for (let i = 0; i < this.length; i += 1) {
      const value = this.series.get(i);
      if (value !== value) return NaN;
      sum += value;
    }

    const mean = sum / this.length;
    const divisor = this.biased ? this.length : this.length - 1;
    if (divisor <= 0) return NaN;

    let sumSq = 0;
    for (let i = 0; i < this.length; i += 1) {
      const diff = this.series.get(i) - mean;
      sumSq += diff * diff;
    }
    return sumSq / divisor;
  }

  save(): StdDevSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: StdDevSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class Dev implements Saveable {
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
    for (let i = 0; i < this.length; i += 1) {
      const value = this.series.get(i);
      if (value !== value) return NaN;
      sum += value;
    }

    const mean = sum / this.length;
    let deviation = 0;
    for (let i = 0; i < this.length; i += 1) {
      deviation += Math.abs(this.series.get(i) - mean);
    }
    return deviation / this.length;
  }

  save(): StdDevSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: StdDevSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

interface PairedSeriesSnapshot {
  left: unknown;
  right: unknown;
}

export class Covariance implements Saveable {
  private leftSeries: NumericSeries;
  private rightSeries: NumericSeries;
  private readonly length: number;

  private snap: PairedSeriesSnapshot | null = null;

  constructor(length: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.leftSeries = new NumericSeries(this.length);
    this.rightSeries = new NumericSeries(this.length);
  }

  compute(left: number, right: number): number {
    this.snap = {
      left: this.leftSeries.save(),
      right: this.rightSeries.save(),
    };
    return this._advance(left, right);
  }

  recompute(left: number, right: number): number {
    if (this.snap) {
      this.leftSeries.restore(this.snap.left as ReturnType<NumericSeries['save']>);
      this.rightSeries.restore(this.snap.right as ReturnType<NumericSeries['save']>);
    }
    return this._advance(left, right);
  }

  protected _advance(left: number, right: number): number {
    this.leftSeries.push(left);
    this.rightSeries.push(right);
    const values = this.getWindows();
    if (!values) return NaN;
    const [leftValues, rightValues] = values;
    const leftMean = leftValues.reduce((sum, value) => sum + value, 0) / this.length;
    const rightMean = rightValues.reduce((sum, value) => sum + value, 0) / this.length;
    let covariance = 0;
    for (let index = 0; index < this.length; index += 1) {
      covariance += (leftValues[index] - leftMean) * (rightValues[index] - rightMean);
    }
    return covariance / this.length;
  }

  protected getWindows(): [number[], number[]] | null {
    if (this.leftSeries.length < this.length || this.rightSeries.length < this.length) return null;
    const leftValues: number[] = [];
    const rightValues: number[] = [];
    for (let index = 0; index < this.length; index += 1) {
      const left = this.leftSeries.get(index);
      const right = this.rightSeries.get(index);
      if (left !== left || right !== right) return null;
      leftValues.push(left);
      rightValues.push(right);
    }
    return [leftValues, rightValues];
  }

  save(): PairedSeriesSnapshot {
    return {
      left: this.leftSeries.save(),
      right: this.rightSeries.save(),
    };
  }

  restore(snap: PairedSeriesSnapshot): void {
    this.leftSeries.restore(snap.left as ReturnType<NumericSeries['save']>);
    this.rightSeries.restore(snap.right as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class Correlation extends Covariance {
  protected override _advance(left: number, right: number): number {
    super._advance(left, right);
    const values = this.getWindows();
    if (!values) return NaN;
    const [leftValues, rightValues] = values;
    const length = leftValues.length;
    const leftMean = leftValues.reduce((sum, value) => sum + value, 0) / length;
    const rightMean = rightValues.reduce((sum, value) => sum + value, 0) / length;
    let covariance = 0;
    let leftVariance = 0;
    let rightVariance = 0;

    for (let index = 0; index < length; index += 1) {
      const leftDelta = leftValues[index] - leftMean;
      const rightDelta = rightValues[index] - rightMean;
      covariance += leftDelta * rightDelta;
      leftVariance += leftDelta ** 2;
      rightVariance += rightDelta ** 2;
    }

    const denominator = Math.sqrt(leftVariance * rightVariance);
    return denominator === 0 ? NaN : covariance / denominator;
  }
}

export class COG implements Saveable {
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
    let weighted = 0;
    for (let index = 0; index < this.length; index += 1) {
      const value = this.series.get(index);
      if (value !== value) return NaN;
      sum += value;
      weighted += value * (index + 1);
    }

    return sum === 0 ? NaN : -weighted / sum;
  }

  save(): StdDevSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: StdDevSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class Median implements Saveable {
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
    const values: number[] = [];
    for (let index = 0; index < this.length; index += 1) {
      const value = this.series.get(index);
      if (value !== value) return NaN;
      values.push(value);
    }

    values.sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
  }

  save(): StdDevSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: StdDevSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class Mode implements Saveable {
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
    const values: number[] = [];
    for (let index = 0; index < this.length; index += 1) {
      const value = this.series.get(index);
      if (value !== value) return NaN;
      values.push(value);
    }

    const counts = new Map<number, number>();
    for (const value of values) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    let mode = values[0];
    let modeCount = counts.get(mode) ?? 0;
    for (const [value, count] of counts) {
      if (count > modeCount || (count === modeCount && value < mode)) {
        mode = value;
        modeCount = count;
      }
    }
    return mode;
  }

  save(): StdDevSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: StdDevSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class PercentileNearestRank implements Saveable {
  private series: NumericSeries;
  private readonly length: number;
  private readonly percentage: number;

  private snap: StdDevSnapshot | null = null;

  constructor(length: number, percentage: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.percentage = Math.min(100, Math.max(0, percentage));
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
    if (this.series.length < this.length || this.percentage !== this.percentage) return NaN;
    const sorted = this.getSortedWindow();
    if (!sorted) return NaN;
    const rank = Math.max(1, Math.ceil((this.percentage / 100) * sorted.length));
    return sorted[rank - 1];
  }

  private getSortedWindow(): number[] | null {
    const values: number[] = [];
    for (let index = 0; index < this.length; index += 1) {
      const value = this.series.get(index);
      if (value !== value) return null;
      values.push(value);
    }
    return values.sort((a, b) => a - b);
  }

  save(): StdDevSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: StdDevSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class PercentileLinearInterpolation implements Saveable {
  private series: NumericSeries;
  private readonly length: number;
  private readonly percentage: number;

  private snap: StdDevSnapshot | null = null;

  constructor(length: number, percentage: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.percentage = Math.min(100, Math.max(0, percentage));
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
    if (this.series.length < this.length || this.percentage !== this.percentage) return NaN;
    const sorted: number[] = [];
    for (let index = 0; index < this.length; index += 1) {
      const value = this.series.get(index);
      if (value !== value) return NaN;
      sorted.push(value);
    }
    sorted.sort((a, b) => a - b);

    const rank = (this.percentage / 100) * (sorted.length - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    if (lower === upper) return sorted[lower];

    const fraction = rank - lower;
    return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction;
  }

  save(): StdDevSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: StdDevSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class PercentRank implements Saveable {
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
    if (this.series.length < this.length || src !== src) return NaN;
    let belowOrEqual = 0;
    for (let index = 0; index < this.length; index += 1) {
      const value = this.series.get(index);
      if (value !== value) return NaN;
      if (value <= src) belowOrEqual += 1;
    }
    return (belowOrEqual / this.length) * 100;
  }

  save(): StdDevSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: StdDevSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class LinReg implements Saveable {
  private series: NumericSeries;
  private readonly length: number;
  private readonly offset: number;

  private snap: StdDevSnapshot | null = null;

  constructor(length: number, offset: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.offset = offset;
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
    if (this.series.length < this.length || this.offset !== this.offset) return NaN;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let index = 0; index < this.length; index += 1) {
      const x = index;
      const y = this.series.get(this.length - 1 - index);
      if (y !== y) return NaN;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const denominator = this.length * sumX2 - sumX * sumX;
    if (denominator === 0) return NaN;

    const slope = (this.length * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / this.length;
    return intercept + slope * (this.length - 1 - this.offset);
  }

  save(): StdDevSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: StdDevSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

interface TrueRangeSnapshot {
  prevClose: number | undefined;
}

export class TrueRange implements Saveable {
  private prevClose: number | undefined;
  private readonly handleNa: boolean;

  private snap: TrueRangeSnapshot | null = null;

  constructor(handleNa: boolean = false) {
    this.handleNa = handleNa;
  }

  compute(high: number, low: number, close: number): number {
    this.snap = { prevClose: this.prevClose };
    return this._advance(high, low, close);
  }

  recompute(high: number, low: number, close: number): number {
    if (this.snap) {
      this.prevClose = this.snap.prevClose;
    }
    return this._advance(high, low, close);
  }

  private _advance(high: number, low: number, close: number): number {
    const prevClose = this.prevClose;
    this.prevClose = close;
    if (high !== high || low !== low) return NaN;
    if (prevClose === undefined || prevClose !== prevClose) {
      return this.handleNa ? high - low : NaN;
    }
    return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  }

  save(): TrueRangeSnapshot {
    return { prevClose: this.prevClose };
  }

  restore(snap: TrueRangeSnapshot): void {
    this.prevClose = snap.prevClose;
    this.snap = null;
  }
}

interface MFISnapshot {
  prevSource: number | undefined;
  positive: unknown;
  negative: unknown;
}

export class MFI implements Saveable {
  private prevSource: number | undefined;
  private positive: NumericSeries;
  private negative: NumericSeries;
  private readonly length: number;

  private snap: MFISnapshot | null = null;

  constructor(length: number) {
    this.length = Math.max(1, Math.trunc(length));
    this.positive = new NumericSeries(this.length);
    this.negative = new NumericSeries(this.length);
  }

  compute(source: number, volume: number): number {
    this.snap = {
      prevSource: this.prevSource,
      positive: this.positive.save(),
      negative: this.negative.save(),
    };
    return this._advance(source, volume);
  }

  recompute(source: number, volume: number): number {
    if (this.snap) {
      this.prevSource = this.snap.prevSource;
      this.positive.restore(this.snap.positive as ReturnType<NumericSeries['save']>);
      this.negative.restore(this.snap.negative as ReturnType<NumericSeries['save']>);
    }
    return this._advance(source, volume);
  }

  private _advance(source: number, volume: number): number {
    const previousSource = this.prevSource;
    this.prevSource = source;
    if (source !== source || volume !== volume) return NaN;

    if (previousSource !== undefined && previousSource === previousSource) {
      const rawFlow = source * volume;
      this.positive.push(source > previousSource ? rawFlow : 0);
      this.negative.push(source < previousSource ? rawFlow : 0);
    }

    if (this.positive.length < this.length || this.negative.length < this.length) return NaN;

    let positiveSum = 0;
    let negativeSum = 0;
    for (let index = 0; index < this.length; index += 1) {
      const positive = this.positive.get(index);
      const negative = this.negative.get(index);
      if (positive !== positive || negative !== negative) return NaN;
      positiveSum += positive;
      negativeSum += negative;
    }

    if (negativeSum === 0) return positiveSum === 0 ? 50 : 100;
    if (positiveSum === 0) return 0;
    return 100 - 100 / (1 + positiveSum / negativeSum);
  }

  save(): MFISnapshot {
    return {
      prevSource: this.prevSource,
      positive: this.positive.save(),
      negative: this.negative.save(),
    };
  }

  restore(snap: MFISnapshot): void {
    this.prevSource = snap.prevSource;
    this.positive.restore(snap.positive as ReturnType<NumericSeries['save']>);
    this.negative.restore(snap.negative as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

interface TSISnapshot {
  prevSource: number | undefined;
  momentumLong: unknown;
  absLong: unknown;
  momentumShort: unknown;
  absShort: unknown;
}

export class TSI implements Saveable {
  private prevSource: number | undefined;
  private momentumLong: EMA;
  private absLong: EMA;
  private momentumShort: EMA;
  private absShort: EMA;

  private snap: TSISnapshot | null = null;

  constructor(shortLength: number, longLength: number) {
    this.momentumLong = new EMA(longLength);
    this.absLong = new EMA(longLength);
    this.momentumShort = new EMA(shortLength);
    this.absShort = new EMA(shortLength);
  }

  compute(source: number): number {
    this.snap = {
      prevSource: this.prevSource,
      momentumLong: this.momentumLong.save(),
      absLong: this.absLong.save(),
      momentumShort: this.momentumShort.save(),
      absShort: this.absShort.save(),
    };
    return this._advance(source, false);
  }

  recompute(source: number): number {
    if (this.snap) {
      this.prevSource = this.snap.prevSource;
      this.momentumLong.restore(this.snap.momentumLong as EMASnapshot);
      this.absLong.restore(this.snap.absLong as EMASnapshot);
      this.momentumShort.restore(this.snap.momentumShort as EMASnapshot);
      this.absShort.restore(this.snap.absShort as EMASnapshot);
    }
    return this._advance(source, true);
  }

  private _advance(source: number, isRecompute: boolean): number {
    const previousSource = this.prevSource;
    this.prevSource = source;
    if (source !== source || previousSource === undefined || previousSource !== previousSource) return NaN;

    const momentum = source - previousSource;
    const absMomentum = Math.abs(momentum);
    const smoothedMomentum = isRecompute
      ? this.momentumLong.recompute(momentum)
      : this.momentumLong.compute(momentum);
    const smoothedAbsMomentum = isRecompute
      ? this.absLong.recompute(absMomentum)
      : this.absLong.compute(absMomentum);
    const doubleSmoothedMomentum = isRecompute
      ? this.momentumShort.recompute(smoothedMomentum)
      : this.momentumShort.compute(smoothedMomentum);
    const doubleSmoothedAbsMomentum = isRecompute
      ? this.absShort.recompute(smoothedAbsMomentum)
      : this.absShort.compute(smoothedAbsMomentum);

    return doubleSmoothedAbsMomentum === 0 ? 0 : doubleSmoothedMomentum / doubleSmoothedAbsMomentum;
  }

  save(): TSISnapshot {
    return {
      prevSource: this.prevSource,
      momentumLong: this.momentumLong.save(),
      absLong: this.absLong.save(),
      momentumShort: this.momentumShort.save(),
      absShort: this.absShort.save(),
    };
  }

  restore(snap: TSISnapshot): void {
    this.prevSource = snap.prevSource;
    this.momentumLong.restore(snap.momentumLong as EMASnapshot);
    this.absLong.restore(snap.absLong as EMASnapshot);
    this.momentumShort.restore(snap.momentumShort as EMASnapshot);
    this.absShort.restore(snap.absShort as EMASnapshot);
    this.snap = null;
  }
}

interface BarsSinceSnapshot {
  value: number;
}

export class BarsSince implements Saveable {
  private value: number = NaN;
  private snap: BarsSinceSnapshot | null = null;

  compute(condition: boolean): number {
    this.snap = { value: this.value };
    return this._advance(condition);
  }

  recompute(condition: boolean): number {
    if (this.snap) {
      this.value = this.snap.value;
    }
    return this._advance(condition);
  }

  private _advance(condition: boolean): number {
    this.value = condition ? 0 : this.value !== this.value ? NaN : this.value + 1;
    return this.value;
  }

  save(): BarsSinceSnapshot {
    return { value: this.value };
  }

  restore(snap: BarsSinceSnapshot): void {
    this.value = snap.value;
    this.snap = null;
  }
}

interface ValueWhenSnapshot {
  values: number[];
}

export class ValueWhen implements Saveable {
  private values: number[] = [];
  private readonly occurrence: number;
  private snap: ValueWhenSnapshot | null = null;

  constructor(occurrence: number = 0) {
    this.occurrence = Math.max(0, Math.trunc(occurrence));
  }

  compute(condition: boolean, source: number): number {
    this.snap = { values: [...this.values] };
    return this._advance(condition, source);
  }

  recompute(condition: boolean, source: number): number {
    if (this.snap) {
      this.values = [...this.snap.values];
    }
    return this._advance(condition, source);
  }

  private _advance(condition: boolean, source: number): number {
    if (condition) {
      this.values.unshift(source);
    }
    return this.values[this.occurrence] ?? NaN;
  }

  save(): ValueWhenSnapshot {
    return { values: [...this.values] };
  }

  restore(snap: ValueWhenSnapshot): void {
    this.values = [...snap.values];
    this.snap = null;
  }
}

interface BBWSnapshot {
  bb: unknown;
}

export class BBW implements Saveable {
  private bb: BB;
  private snap: BBWSnapshot | null = null;

  constructor(length: number, mult: number = 2) {
    this.bb = new BB(length, mult);
  }

  compute(src: number): number {
    this.snap = { bb: this.bb.save() };
    return this._advance(src, false);
  }

  recompute(src: number): number {
    if (this.snap) {
      this.bb.restore(this.snap.bb as BBSnapshot);
    }
    return this._advance(src, true);
  }

  private _advance(src: number, isRecompute: boolean): number {
    const [middle, upper, lower] = isRecompute ? this.bb.recompute(src) : this.bb.compute(src);
    if (middle === 0 || middle !== middle || upper !== upper || lower !== lower) return NaN;
    return (upper - lower) / middle;
  }

  save(): BBWSnapshot {
    return { bb: this.bb.save() };
  }

  restore(snap: BBWSnapshot): void {
    this.bb.restore(snap.bb as BBSnapshot);
    this.snap = null;
  }
}

interface KCSnapshot {
  basis: unknown;
  range: unknown;
  prevClose: number;
}

export class KC implements Saveable {
  private basis: EMA;
  private range: EMA;
  private readonly mult: number;
  private readonly useTrueRange: boolean;
  private prevClose: number = NaN;
  private snap: KCSnapshot | null = null;

  constructor(length: number, mult: number, useTrueRange = true) {
    this.basis = new EMA(length);
    this.range = new EMA(length);
    this.mult = mult;
    this.useTrueRange = useTrueRange;
  }

  compute(src: number, high: number, low: number, close: number): [number, number, number] {
    this.snap = {
      basis: this.basis.save(),
      range: this.range.save(),
      prevClose: this.prevClose,
    };
    return this._advance(src, high, low, close, false);
  }

  recompute(src: number, high: number, low: number, close: number): [number, number, number] {
    if (this.snap) {
      this.basis.restore(this.snap.basis as EMASnapshot);
      this.range.restore(this.snap.range as EMASnapshot);
      this.prevClose = this.snap.prevClose;
    }
    return this._advance(src, high, low, close, true);
  }

  private _advance(src: number, high: number, low: number, close: number, isRecompute: boolean): [number, number, number] {
    if (src !== src || high !== high || low !== low || close !== close || !Number.isFinite(this.mult)) {
      return [NaN, NaN, NaN];
    }
    const span = this.useTrueRange && this.prevClose === this.prevClose
      ? Math.max(high - low, Math.abs(high - this.prevClose), Math.abs(low - this.prevClose))
      : high - low;
    this.prevClose = close;
    const middle = isRecompute ? this.basis.recompute(src) : this.basis.compute(src);
    const range = isRecompute ? this.range.recompute(span) : this.range.compute(span);
    return [middle, middle + range * this.mult, middle - range * this.mult];
  }

  save(): KCSnapshot {
    return {
      basis: this.basis.save(),
      range: this.range.save(),
      prevClose: this.prevClose,
    };
  }

  restore(snap: KCSnapshot): void {
    this.basis.restore(snap.basis as EMASnapshot);
    this.range.restore(snap.range as EMASnapshot);
    this.prevClose = snap.prevClose;
    this.snap = null;
  }
}

export class KCW implements Saveable {
  private kc: KC;

  constructor(length: number, mult: number, useTrueRange = true) {
    this.kc = new KC(length, mult, useTrueRange);
  }

  compute(src: number, high: number, low: number, close: number): number {
    const [basis, upper, lower] = this.kc.compute(src, high, low, close);
    return basis === 0 || basis !== basis || upper !== upper || lower !== lower ? NaN : (upper - lower) / basis;
  }

  recompute(src: number, high: number, low: number, close: number): number {
    const [basis, upper, lower] = this.kc.recompute(src, high, low, close);
    return basis === 0 || basis !== basis || upper !== upper || lower !== lower ? NaN : (upper - lower) / basis;
  }

  save(): KCSnapshot {
    return this.kc.save();
  }

  restore(snap: KCSnapshot): void {
    this.kc.restore(snap);
  }
}

interface KSTSnapshot {
  source: unknown;
  rocSma: unknown[];
  signalSma: unknown;
}

class KSTSmaWindow {
  private series: NumericSeries;
  private readonly length: number;

  constructor(length: number) {
    this.length = Math.max(0, Math.trunc(length));
    this.series = new NumericSeries(Math.max(1, this.length));
  }

  compute(src: number): number {
    if (src !== src || this.length < 1) return NaN;
    this.series.push(src);
    if (this.series.length < this.length) return NaN;
    let sum = 0;
    for (let index = 0; index < this.length; index += 1) {
      const value = this.series.get(index);
      if (value !== value) return NaN;
      sum += value;
    }
    return sum / this.length;
  }

  save(): unknown {
    return this.series.save();
  }

  restore(snap: unknown): void {
    this.series.restore(snap as ReturnType<NumericSeries['save']>);
  }
}

export class KST implements Saveable {
  private source: NumericSeries;
  private readonly rocLengths: number[];
  private rocSmas: KSTSmaWindow[];
  private signalSma: KSTSmaWindow;
  private snap: KSTSnapshot | null = null;

  constructor(
    rocLength1: number,
    rocLength2: number,
    rocLength3: number,
    rocLength4: number,
    smaLength1: number,
    smaLength2: number,
    smaLength3: number,
    smaLength4: number,
    signalLength: number,
  ) {
    this.rocLengths = [rocLength1, rocLength2, rocLength3, rocLength4].map((length) => Math.max(0, Math.trunc(length)));
    const maxRocLength = Math.max(...this.rocLengths);
    this.source = new NumericSeries(maxRocLength + 1);
    this.rocSmas = [smaLength1, smaLength2, smaLength3, smaLength4].map((length) => new KSTSmaWindow(length));
    this.signalSma = new KSTSmaWindow(signalLength);
  }

  compute(src: number): [number, number] {
    this.snap = this.save();
    return this._advance(src);
  }

  recompute(src: number): [number, number] {
    if (this.snap) {
      this.source.restore(this.snap.source as ReturnType<NumericSeries['save']>);
      for (let index = 0; index < this.rocSmas.length; index += 1) {
        this.rocSmas[index].restore(this.snap.rocSma[index]);
      }
      this.signalSma.restore(this.snap.signalSma);
    }
    return this._advance(src);
  }

  private _advance(src: number): [number, number] {
    if (src !== src) return [NaN, NaN];
    this.source.push(src);

    const smoothedRocs = this.rocLengths.map((rocLength, index) => {
      if (this.source.length <= rocLength) return NaN;
      const previous = this.source.get(rocLength);
      const roc = previous === undefined || previous === 0 || previous !== previous
        ? NaN
        : ((src - previous) / previous) * 100;
      return this.rocSmas[index].compute(roc);
    });

    if (smoothedRocs.some((value) => value !== value)) return [NaN, NaN];

    const kst = smoothedRocs[0] + 2 * smoothedRocs[1] + 3 * smoothedRocs[2] + 4 * smoothedRocs[3];
    return [kst, this.signalSma.compute(kst)];
  }

  save(): KSTSnapshot {
    return {
      source: this.source.save(),
      rocSma: this.rocSmas.map((sma) => sma.save()),
      signalSma: this.signalSma.save(),
    };
  }

  restore(snap: KSTSnapshot): void {
    this.source.restore(snap.source as ReturnType<NumericSeries['save']>);
    for (let index = 0; index < this.rocSmas.length; index += 1) {
      this.rocSmas[index].restore(snap.rocSma[index]);
    }
    this.signalSma.restore(snap.signalSma);
    this.snap = null;
  }
}

interface VWAPSnapshot {
  cumTpv: number;
  cumVolume: number;
  cumSourceSquaredVolume: number;
}

export class VWAP implements Saveable {
  private cumTpv = 0;
  private cumVolume = 0;
  private cumSourceSquaredVolume = 0;
  private readonly hasBands: boolean;
  private readonly stdevMult: number;
  private snap: VWAPSnapshot | null = null;

  constructor(hasBands: boolean, stdevMult: number) {
    this.hasBands = hasBands;
    this.stdevMult = stdevMult;
  }

  compute(source: number, anchor: boolean, volume: number): number | [number, number, number] {
    this.snap = this.save();
    return this._advance(source, anchor, volume);
  }

  recompute(source: number, anchor: boolean, volume: number): number | [number, number, number] {
    if (this.snap) {
      this.cumTpv = this.snap.cumTpv;
      this.cumVolume = this.snap.cumVolume;
      this.cumSourceSquaredVolume = this.snap.cumSourceSquaredVolume;
    }
    return this._advance(source, anchor, volume);
  }

  private _advance(source: number, anchor: boolean, volume: number): number | [number, number, number] {
    if (source !== source || volume !== volume) return this.hasBands ? [NaN, NaN, NaN] : NaN;

    const prevCumTpv = anchor ? 0 : this.cumTpv;
    const prevCumVolume = anchor ? 0 : this.cumVolume;
    const prevCumSourceSquaredVolume = anchor ? 0 : this.cumSourceSquaredVolume;

    this.cumTpv = prevCumTpv + source * volume;
    this.cumVolume = prevCumVolume + volume;
    this.cumSourceSquaredVolume = prevCumSourceSquaredVolume + source * source * volume;

    const vwap = this.cumVolume > 0 ? this.cumTpv / this.cumVolume : NaN;
    if (!this.hasBands) return vwap;
    if (vwap !== vwap || this.stdevMult !== this.stdevMult) return [vwap, NaN, NaN];

    const weightedVariance = Math.max(this.cumSourceSquaredVolume / this.cumVolume - vwap * vwap, 0);
    const stdev = Math.sqrt(weightedVariance);
    return [vwap, vwap + this.stdevMult * stdev, vwap - this.stdevMult * stdev];
  }

  save(): VWAPSnapshot {
    return {
      cumTpv: this.cumTpv,
      cumVolume: this.cumVolume,
      cumSourceSquaredVolume: this.cumSourceSquaredVolume,
    };
  }

  restore(snap: VWAPSnapshot): void {
    this.cumTpv = snap.cumTpv;
    this.cumVolume = snap.cumVolume;
    this.cumSourceSquaredVolume = snap.cumSourceSquaredVolume;
    this.snap = null;
  }
}

export class RCI implements Saveable {
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

    const window: number[] = [];
    for (let index = 0; index < this.length; index += 1) {
      const value = this.series.get(index);
      if (value !== value) return NaN;
      window.push(value);
    }

    const sorted = [...window].sort((a, b) => a - b);
    let sumDSq = 0;
    for (let index = 0; index < this.length; index += 1) {
      const value = window[index];
      let rank = 0;
      let count = 0;
      for (let rankIndex = 0; rankIndex < sorted.length; rankIndex += 1) {
        if (sorted[rankIndex] === value) {
          rank += rankIndex + 1;
          count += 1;
        }
      }
      const priceRank = rank / count;
      const timeRank = this.length - index;
      const diff = priceRank - timeRank;
      sumDSq += diff * diff;
    }

    return (1 - (6 * sumDSq) / (this.length * (this.length * this.length - 1))) * 100;
  }

  save(): StdDevSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: StdDevSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

abstract class PivotBase implements Saveable {
  protected series: NumericSeries;
  protected readonly leftBars: number;
  protected readonly rightBars: number;
  private readonly windowLength: number;
  private snap: StdDevSnapshot | null = null;

  constructor(leftBars: number, rightBars: number) {
    this.leftBars = Math.max(0, Math.trunc(leftBars));
    this.rightBars = Math.max(0, Math.trunc(rightBars));
    this.windowLength = this.leftBars + this.rightBars + 1;
    this.series = new NumericSeries(this.windowLength);
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
    if (this.series.length < this.windowLength) return NaN;
    const pivotValue = this.series.get(this.rightBars);
    if (pivotValue !== pivotValue) return NaN;

    for (let index = 1; index <= this.leftBars; index += 1) {
      const value = this.series.get(this.rightBars + index);
      if (value !== value || this.rejectLeft(value, pivotValue)) return NaN;
    }

    for (let index = 1; index <= this.rightBars; index += 1) {
      const value = this.series.get(this.rightBars - index);
      if (value !== value || this.rejectRight(value, pivotValue)) return NaN;
    }

    return pivotValue;
  }

  protected abstract rejectLeft(value: number, pivotValue: number): boolean;
  protected abstract rejectRight(value: number, pivotValue: number): boolean;

  save(): StdDevSnapshot {
    return { series: this.series.save() };
  }

  restore(snap: StdDevSnapshot): void {
    this.series.restore(snap.series as ReturnType<NumericSeries['save']>);
    this.snap = null;
  }
}

export class PivotHigh extends PivotBase {
  protected rejectLeft(value: number, pivotValue: number): boolean {
    return value >= pivotValue;
  }

  protected rejectRight(value: number, pivotValue: number): boolean {
    return value >= pivotValue;
  }
}

export class PivotLow extends PivotBase {
  protected rejectLeft(value: number, pivotValue: number): boolean {
    return value <= pivotValue;
  }

  protected rejectRight(value: number, pivotValue: number): boolean {
    return value <= pivotValue;
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

  compute(src: number): [number, number, number] {
    this.snap = {
      sma: this.sma.save(),
      stddev: this.stddev.save(),
    };
    return this._advance(src, false);
  }

  recompute(src: number): [number, number, number] {
    if (this.snap) {
      this.sma.restore(this.snap.sma as SMASnapshot);
      this.stddev.restore(this.snap.stddev as StdDevSnapshot);
    }
    return this._advance(src, true);
  }

  private _advance(src: number, isRecompute: boolean): [number, number, number] {
    const middle = isRecompute ? this.sma.recompute(src) : this.sma.compute(src);
    const dev = isRecompute ? this.stddev.recompute(src) : this.stddev.compute(src);
    return [middle, middle + this.mult * dev, middle - this.mult * dev];
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
    if (src !== src) return NaN;
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

// ==========================================================================
// TA volume/accumulation variables
// ==========================================================================

interface AccumulationDistributionSnapshot {
  value: number;
}

export class AccumulationDistribution implements Saveable {
  private value: number = 0;

  compute(_open: number, high: number, low: number, close: number, volume: number): number {
    const range = high - low;
    if (high === high && low === low && close === close && volume === volume && range !== 0) {
      this.value += (((close - low) - (high - close)) / range) * volume;
    }
    return this.value;
  }

  save(): AccumulationDistributionSnapshot {
    return { value: this.value };
  }

  restore(snap: AccumulationDistributionSnapshot): void {
    this.value = snap.value;
  }
}

export class IntradayIntensityIndex implements Saveable {
  compute(_open: number, high: number, low: number, close: number, volume: number): number {
    const range = high - low;
    return range === 0 ? NaN : ((2 * close - high - low) / range) * volume;
  }

  save(): Record<string, never> {
    return {};
  }

  restore(_snap: Record<string, never>): void {}
}

export class WilliamsVariableAccumulationDistribution implements Saveable {
  compute(open: number, high: number, low: number, close: number, volume: number): number {
    const range = high - low;
    return range === 0 ? NaN : ((close - open) / range) * volume;
  }

  save(): Record<string, never> {
    return {};
  }

  restore(_snap: Record<string, never>): void {}
}

interface VolumeIndexSnapshot {
  value: number;
  prevClose: number;
  prevVolume: number;
}

abstract class VolumeIndex implements Saveable {
  protected value: number;
  private prevClose: number = NaN;
  private prevVolume: number = NaN;

  constructor(initialValue: number) {
    this.value = initialValue;
  }

  compute(_open: number, _high: number, _low: number, close: number, volume: number): number {
    const previousValue = this.value;
    if (
      close === close
      && this.prevClose === this.prevClose
      && this.prevClose !== 0
      && volume === volume
      && this.prevVolume === this.prevVolume
      && this.shouldUpdate(volume, this.prevVolume)
    ) {
      this.value = previousValue + ((close - this.prevClose) / this.prevClose) * previousValue;
    }
    this.prevClose = close;
    this.prevVolume = volume;
    return this.value;
  }

  protected abstract shouldUpdate(volume: number, previousVolume: number): boolean;

  save(): VolumeIndexSnapshot {
    return {
      value: this.value,
      prevClose: this.prevClose,
      prevVolume: this.prevVolume,
    };
  }

  restore(snap: VolumeIndexSnapshot): void {
    this.value = snap.value;
    this.prevClose = snap.prevClose;
    this.prevVolume = snap.prevVolume;
  }
}

export class NegativeVolumeIndex extends VolumeIndex {
  constructor() {
    super(1);
  }

  protected shouldUpdate(volume: number, previousVolume: number): boolean {
    return volume < previousVolume;
  }
}

export class PositiveVolumeIndex extends VolumeIndex {
  constructor() {
    super(1);
  }

  protected shouldUpdate(volume: number, previousVolume: number): boolean {
    return volume > previousVolume;
  }
}

interface PriceVolumeTrendSnapshot {
  value: number;
  prevClose: number;
}

export class PriceVolumeTrend implements Saveable {
  private value: number = 0;
  private prevClose: number = NaN;

  compute(_open: number, _high: number, _low: number, close: number, volume: number): number {
    if (close === close && this.prevClose === this.prevClose && this.prevClose !== 0 && volume === volume) {
      this.value += volume * ((close - this.prevClose) / this.prevClose);
    }
    this.prevClose = close;
    return this.value;
  }

  save(): PriceVolumeTrendSnapshot {
    return {
      value: this.value,
      prevClose: this.prevClose,
    };
  }

  restore(snap: PriceVolumeTrendSnapshot): void {
    this.value = snap.value;
    this.prevClose = snap.prevClose;
  }
}

interface WilliamsAccumulationDistributionSnapshot {
  value: number;
  prevClose: number;
}

export class WilliamsAccumulationDistribution implements Saveable {
  private value: number = 0;
  private prevClose: number = NaN;

  compute(_open: number, high: number, low: number, close: number, _volume: number): number {
    if (high === high && low === low && close === close && this.prevClose === this.prevClose) {
      if (close > this.prevClose) {
        this.value += close - Math.min(low, this.prevClose);
      } else if (close < this.prevClose) {
        this.value += close - Math.max(high, this.prevClose);
      }
    }
    this.prevClose = close;
    return this.value;
  }

  save(): WilliamsAccumulationDistributionSnapshot {
    return {
      value: this.value,
      prevClose: this.prevClose,
    };
  }

  restore(snap: WilliamsAccumulationDistributionSnapshot): void {
    this.value = snap.value;
    this.prevClose = snap.prevClose;
  }
}

interface BarIndexSnapshot {
  value: number;
}

export class BarIndex implements Saveable {
  private value: number = NaN;
  private snap: BarIndexSnapshot | null = null;

  compute(source: number, barIndex: number): number {
    this.snap = { value: this.value };
    return this._advance(source, barIndex);
  }

  recompute(source: number, barIndex: number): number {
    if (this.snap) {
      this.value = this.snap.value;
    }
    return this._advance(source, barIndex);
  }

  private _advance(source: number, barIndex: number): number {
    if (source === source) {
      this.value = barIndex;
    }
    return this.value;
  }

  save(): BarIndexSnapshot {
    return { value: this.value };
  }

  restore(snap: BarIndexSnapshot): void {
    this.value = snap.value;
    this.snap = null;
  }
}
