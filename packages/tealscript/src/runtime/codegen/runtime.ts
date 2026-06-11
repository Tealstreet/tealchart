export interface NumericSeriesSnapshot {
  head: number;
  size: number;
  buf: Float64Array;
}

export class NumericSeries {
  buf: Float64Array;
  head: number = 0;
  size: number = 0;
  capacity: number;

  constructor(capacity: number = 500) {
    this.capacity = capacity;
    this.buf = new Float64Array(capacity);
    this.buf.fill(NaN);
  }

  push(value: number): void {
    if (this.size === 0) {
      this.buf[0] = value;
      this.head = 0;
      this.size = 1;
    } else {
      this.head = this.head === 0 ? this.capacity - 1 : this.head - 1;
      this.buf[this.head] = value;
      if (this.size < this.capacity) this.size++;
    }
  }

  update(value: number): void {
    if (this.size === 0) {
      this.push(value);
    } else {
      this.buf[this.head] = value;
    }
  }

  get(offset: number): number {
    if (offset < 0 || offset >= this.size) return NaN;
    let idx = this.head + offset;
    if (idx >= this.capacity) idx -= this.capacity;
    return this.buf[idx];
  }

  current(): number {
    return this.size === 0 ? NaN : this.buf[this.head];
  }

  save(): NumericSeriesSnapshot {
    return {
      head: this.head,
      size: this.size,
      buf: new Float64Array(this.buf),
    };
  }

  restore(snap: NumericSeriesSnapshot): void {
    this.head = snap.head;
    this.size = snap.size;
    this.buf.set(snap.buf);
  }

  toArray(length?: number): number[] {
    const n = length !== undefined ? Math.min(length, this.size) : this.size;
    const result: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
      let idx = this.head + i;
      if (idx >= this.capacity) idx -= this.capacity;
      result[i] = this.buf[idx];
    }
    return result;
  }

  toPlotArray(barCount: number): (number | null)[] {
    const result: (number | null)[] = new Array(barCount);
    const start = barCount - this.size;
    for (let i = 0; i < start; i++) {
      result[i] = null;
    }
    for (let i = 0; i < this.size; i++) {
      let idx = this.head + (this.size - 1 - i);
      if (idx >= this.capacity) idx -= this.capacity;
      const val = this.buf[idx];
      result[start + i] = val !== val ? null : val;
    }
    return result;
  }

  get length(): number {
    return this.size;
  }
}
