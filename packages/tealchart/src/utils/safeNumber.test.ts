import { describe, expect, it, vi } from 'vitest';

import { safeNum, safeToFixed } from './safeNumber';

describe('safeToFixed', () => {
  it('preserves fixed decimal formatting for invalid values', () => {
    expect(safeToFixed(undefined, 2)).toBe('0.00');
    expect(safeToFixed(null, 3)).toBe('0.000');
    expect(safeToFixed(Number.NaN, 1)).toBe('0.0');
    expect(safeToFixed(Infinity, 4)).toBe('0.0000');
  });

  it('coerces numeric strings and warns once per key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(safeToFixed('12.345', 2, 'safeToFixed.test')).toBe('12.35');
    expect(safeToFixed('oops', 2, 'safeToFixed.test')).toBe('0.00');
    expect(safeToFixed('still-oops', 2, 'safeToFixed.test')).toBe('0.00');

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('safeNum', () => {
  it('coerces finite numeric values and falls back for invalid ones', () => {
    expect(safeNum('12.5')).toBe(12.5);
    expect(safeNum(undefined, 7)).toBe(7);
    expect(safeNum(null, 5)).toBe(0);
    expect(safeNum(Number.NaN, 9)).toBe(9);
    expect(safeNum(Infinity, 11)).toBe(11);
  });

  it('warns only once per callsite key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    safeNum('oops', 0, 'safeNum.test');
    safeNum('still-oops', 0, 'safeNum.test');

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
