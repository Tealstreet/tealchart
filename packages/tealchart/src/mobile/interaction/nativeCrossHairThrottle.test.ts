import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createNativeCrossHairThrottle } from './nativeCrossHairThrottle';

describe('createNativeCrossHairThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits the first move immediately', () => {
    const emit = vi.fn();
    const throttle = createNativeCrossHairThrottle(emit, 50);

    throttle.push(1, 100);

    expect(emit).toHaveBeenCalledWith(1, 100);
  });

  it('coalesces a burst and emits its last move when the window closes', () => {
    const emit = vi.fn();
    const throttle = createNativeCrossHairThrottle(emit, 50);

    throttle.push(1, 100);
    throttle.push(2, 101);
    throttle.push(3, 102);
    expect(emit).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(50);

    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenLastCalledWith(3, 102);
  });

  it('drops the pending move on cancel', () => {
    const emit = vi.fn();
    const throttle = createNativeCrossHairThrottle(emit, 50);

    throttle.push(1, 100);
    throttle.push(2, 101);
    throttle.cancel();
    vi.advanceTimersByTime(100);

    expect(emit).toHaveBeenCalledTimes(1);
  });
});
