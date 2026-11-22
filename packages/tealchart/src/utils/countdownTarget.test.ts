import { describe, expect, it } from 'vitest';

import { countdownTargetMs } from './countdownTarget';

describe('countdownTargetMs (AGT-90)', () => {
  const close = 1_000_000;
  const next = close + 60_000;

  it('runs to the current close until it passes', () => {
    expect(countdownTargetMs(close, next, close - 1)).toBe(close);
  });

  it('runs to the following close from the moment the current one passes, not 00:00', () => {
    expect(countdownTargetMs(close, next, close)).toBe(next);
    expect(countdownTargetMs(close, next, close + 1_600)).toBe(next);
  });

  it('keeps the old behaviour when no following close is known', () => {
    expect(countdownTargetMs(close, undefined, close + 1_600)).toBe(close);
  });
});
