import { describe, expect, it } from 'vitest';

import { bracketPartialPercent } from './bracketPartial';

describe('bracketPartialPercent', () => {
  it('returns full size when partial mode is disabled', () => {
    expect(bracketPartialPercent(false, 300)).toBe(100);
  });

  it('maps horizontal drag distance to partial size bands', () => {
    expect(bracketPartialPercent(true, 0)).toBe(100);
    expect(bracketPartialPercent(true, 27)).toBe(100);
    expect(bracketPartialPercent(true, 28)).toBe(75);
    expect(bracketPartialPercent(true, -82)).toBe(75);
    expect(bracketPartialPercent(true, 83)).toBe(50);
    expect(bracketPartialPercent(true, 138)).toBe(25);
    expect(bracketPartialPercent(true, 193)).toBe(10);
  });
});
