import { describe, expect, it } from 'vitest';

import { createNativeOrderMoveLease, NATIVE_ORDER_MOVE_MAX_AGE_MS } from './nativeOrderMoveLease';

describe('native order move touch lease', () => {
  const line = { id: 'line', price: 100 };
  it('consumes before callback/re-render and never re-arms a completed touch', () => {
    const lease = createNativeOrderMoveLease(() => 1000);
    const gesture = { sequence: 1, startedAt: 1000 };
    expect(lease.begin('line', gesture, line)).toBe(true);
    expect(lease.consume('line', gesture)).toBe(line);
    expect(lease.begin('line', gesture, line)).toBe(false);
    expect(lease.consume('line', gesture)).toBeUndefined();
    const second = { sequence: 2, startedAt: 1000 };
    expect(lease.begin('line', second, line)).toBe(true);
    expect(lease.consume('line', second)).toBe(line);
  });
  it('refuses a begin delivered a minute after its physical touch', () => {
    const lease = createNativeOrderMoveLease(() => 61_000);
    const gesture = { sequence: 1, startedAt: 1000 };
    expect(lease.begin('line', gesture, line)).toBe(false);
    expect(lease.consume('line', gesture)).toBeUndefined();
  });
  it('measures commit expiry from the original touch, without renewal on begin', () => {
    let now = 1000;
    const lease = createNativeOrderMoveLease(() => now);
    const gesture = { sequence: 1, startedAt: 1000 };
    now += NATIVE_ORDER_MOVE_MAX_AGE_MS - 1;
    expect(lease.begin('line', gesture, line)).toBe(true);
    now += 1;
    expect(lease.consume('line', gesture)).toBeUndefined();
    expect(lease.begin('line', gesture, line)).toBe(false);
  });
  it('does not let an old begin or commit steal a newer touch', () => {
    const lease = createNativeOrderMoveLease(() => 1000);
    const first = { sequence: 1, startedAt: 1000 },
      second = { sequence: 2, startedAt: 1000 };
    lease.begin('old', first, line);
    lease.begin('new', second, line);
    expect(lease.begin('old', first, line)).toBe(false);
    expect(lease.consume('old', first)).toBeUndefined();
    expect(lease.consume('wrong', second)).toBeUndefined();
    expect(lease.consume('new', second)).toBe(line);
  });
  it('retains the consumed floor when the chart/line is retired', () => {
    const lease = createNativeOrderMoveLease(() => 1000);
    const gesture = { sequence: 1, startedAt: 1000 };
    lease.begin('line', gesture, line);
    lease.retire();
    expect(lease.begin('line', gesture, line)).toBe(false);
    expect(lease.consume('line', gesture)).toBeUndefined();
  });
  it('starts a replacement chart above every touch already issued by its native state', () => {
    const lease = createNativeOrderMoveLease(() => 1000, 7);
    expect(lease.begin('line', { sequence: 7, startedAt: 1000 }, line)).toBe(false);
    expect(lease.begin('line', { sequence: 8, startedAt: 1000 }, line)).toBe(true);
  });
  it.each([0, -1, NaN, Infinity, 1.5])('refuses malformed touch sequence %s', (sequence) => {
    const lease = createNativeOrderMoveLease(() => 1000);
    const gesture = { sequence, startedAt: 1000 };
    expect(lease.begin('line', gesture, line)).toBe(false);
    expect(lease.consume('line', gesture)).toBeUndefined();
  });
});
