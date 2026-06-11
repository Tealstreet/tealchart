import { describe, expect, it } from 'vitest';
import { NumericSeries } from './runtime';

describe('NumericSeries', () => {
  it('starts empty', () => {
    const s = new NumericSeries(10);
    expect(s.length).toBe(0);
    expect(s.get(0)).toBeNaN();
    expect(s.current()).toBeNaN();
  });

  it('push and get', () => {
    const s = new NumericSeries(10);
    s.push(1);
    s.push(2);
    s.push(3);
    expect(s.get(0)).toBe(3);
    expect(s.get(1)).toBe(2);
    expect(s.get(2)).toBe(1);
    expect(s.get(3)).toBeNaN();
    expect(s.length).toBe(3);
    expect(s.current()).toBe(3);
  });

  it('update replaces current without advancing', () => {
    const s = new NumericSeries(10);
    s.push(1);
    s.push(2);
    s.update(20);
    expect(s.get(0)).toBe(20);
    expect(s.get(1)).toBe(1);
    expect(s.length).toBe(2);
  });

  it('update on empty pushes', () => {
    const s = new NumericSeries(10);
    s.update(5);
    expect(s.get(0)).toBe(5);
    expect(s.length).toBe(1);
  });

  it('ring buffer wraps around', () => {
    const s = new NumericSeries(3);
    s.push(1);
    s.push(2);
    s.push(3);
    s.push(4);
    expect(s.get(0)).toBe(4);
    expect(s.get(1)).toBe(3);
    expect(s.get(2)).toBe(2);
    expect(s.get(3)).toBeNaN();
    expect(s.length).toBe(3);
  });

  it('wraps correctly with many pushes', () => {
    const s = new NumericSeries(4);
    for (let i = 0; i < 20; i++) {
      s.push(i);
    }
    expect(s.get(0)).toBe(19);
    expect(s.get(1)).toBe(18);
    expect(s.get(2)).toBe(17);
    expect(s.get(3)).toBe(16);
    expect(s.get(4)).toBeNaN();
  });

  it('NaN as na', () => {
    const s = new NumericSeries(10);
    s.push(1);
    s.push(NaN);
    s.push(3);
    expect(s.get(0)).toBe(3);
    expect(s.get(1)).toBeNaN();
    expect(s.get(2)).toBe(1);
  });

  it('negative offset returns NaN', () => {
    const s = new NumericSeries(10);
    s.push(1);
    expect(s.get(-1)).toBeNaN();
  });

  it('save and restore', () => {
    const s = new NumericSeries(10);
    s.push(1);
    s.push(2);
    s.push(3);

    const snap = s.save();

    s.push(4);
    s.push(5);
    expect(s.get(0)).toBe(5);

    s.restore(snap);
    expect(s.get(0)).toBe(3);
    expect(s.get(1)).toBe(2);
    expect(s.get(2)).toBe(1);
    expect(s.length).toBe(3);
  });

  it('save/restore preserves ring buffer wrap state', () => {
    const s = new NumericSeries(3);
    s.push(1);
    s.push(2);
    s.push(3);
    s.push(4); // wraps

    const snap = s.save();
    s.push(5);
    s.push(6);

    s.restore(snap);
    expect(s.get(0)).toBe(4);
    expect(s.get(1)).toBe(3);
    expect(s.get(2)).toBe(2);
  });

  it('toArray returns values newest-first', () => {
    const s = new NumericSeries(10);
    s.push(1);
    s.push(2);
    s.push(3);
    expect(s.toArray()).toEqual([3, 2, 1]);
  });

  it('toArray with length limit', () => {
    const s = new NumericSeries(10);
    s.push(1);
    s.push(2);
    s.push(3);
    expect(s.toArray(2)).toEqual([3, 2]);
  });

  it('toPlotArray returns chronological with null padding', () => {
    const s = new NumericSeries(10);
    s.push(10);
    s.push(20);
    s.push(30);

    const plot = s.toPlotArray(5);
    expect(plot).toEqual([null, null, 10, 20, 30]);
  });

  it('toPlotArray converts NaN to null', () => {
    const s = new NumericSeries(10);
    s.push(1);
    s.push(NaN);
    s.push(3);

    const plot = s.toPlotArray(3);
    expect(plot).toEqual([1, null, 3]);
  });

  it('capacity 1 works', () => {
    const s = new NumericSeries(1);
    s.push(1);
    expect(s.get(0)).toBe(1);
    s.push(2);
    expect(s.get(0)).toBe(2);
    expect(s.get(1)).toBeNaN();
  });

  it('large capacity sequential push/get', () => {
    const cap = 1000;
    const s = new NumericSeries(cap);
    for (let i = 0; i < cap + 100; i++) {
      s.push(i);
    }
    for (let offset = 0; offset < cap; offset++) {
      expect(s.get(offset)).toBe(cap + 99 - offset);
    }
    expect(s.get(cap)).toBeNaN();
  });
});
