import { describe, expect, it } from 'vitest';

import { MFI } from './ta-classes';

describe('MFI shared flat-change comparison', () => {
  it('suppresses near-flat flows in both directions', () => {
    const mfi = new MFI(2);
    mfi.compute(1e-8, 1);
    expect(mfi.compute(1e-8 + 5e-11, 1)).toBe(50);
    expect(mfi.compute(1e-8, 1)).toBe(100);
  });
  it('restores near-flat flow state for recomputation', () => {
    const mfi = new MFI(2);
    mfi.compute(1e-8, 1);
    mfi.compute(2e-8, 1);
    expect(mfi.recompute(1e-8 + 5e-11, 1)).toBe(50);
    expect(mfi.compute(1e-8, 1)).toBe(100);
  });
});
