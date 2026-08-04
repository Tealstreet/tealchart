import { describe, expect, it } from 'vitest';

import { getNativeCountdownNextTickDelay } from './useNativeCountdownClock';

describe('native countdown clock', () => {
  it('aligns ticks to wall-clock second boundaries', () => {
    expect(getNativeCountdownNextTickDelay(1_000)).toBe(1_000);
    expect(getNativeCountdownNextTickDelay(1_001)).toBe(999);
    expect(getNativeCountdownNextTickDelay(1_999)).toBe(1);
  });

  it('falls back to one second for invalid inputs', () => {
    expect(getNativeCountdownNextTickDelay(Number.NaN)).toBe(1_000);
    expect(getNativeCountdownNextTickDelay(1_000, 0)).toBe(1_000);
  });
});
