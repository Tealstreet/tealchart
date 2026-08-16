import { describe, expect, it } from 'vitest';

import { shouldReleaseNativeOrderDragForSnapshot } from './useNativeOemsLineRuntime';

const never = () => false;
const always = () => true;

describe('shouldReleaseNativeOrderDragForSnapshot', () => {
  it('holds the line while the finger is still down', () => {
    expect(
      shouldReleaseNativeOrderDragForSnapshot({
        dragActive: true,
        handoff: { objectId: 'order_1' },
        hasAction: never,
        pendingObserved: true,
      }),
    ).toBe(false);
  });

  it('lets go once the projection carries the optimistic price', () => {
    expect(
      shouldReleaseNativeOrderDragForSnapshot({
        dragActive: false,
        handoff: { objectId: 'order_1' },
        hasAction: always,
        pendingObserved: true,
      }),
    ).toBe(true);
  });

  it('holds while the action is still in flight', () => {
    expect(
      shouldReleaseNativeOrderDragForSnapshot({
        dragActive: false,
        handoff: { objectId: 'order_1' },
        hasAction: always,
        pendingObserved: false,
      }),
    ).toBe(false);
  });

  // A rejected callback, a `false`, or a timeout can settle the action before
  // any render sees it pending. Nothing else retires the preview, so the line
  // kept drawing where the user dropped it while its drag zone stayed at the
  // price the venue still held - solid, and untouchable.
  it('lets go when the action failed instead of landing', () => {
    expect(
      shouldReleaseNativeOrderDragForSnapshot({
        dragActive: false,
        handoff: { objectId: 'order_1' },
        hasAction: never,
        pendingObserved: false,
      }),
    ).toBe(true);
  });

  // The commit reaches JS a frame after the finger lifts, so "no action" before
  // then means "not started yet", not "failed".
  it('does not read a commit that has not happened yet as a failure', () => {
    expect(
      shouldReleaseNativeOrderDragForSnapshot({
        dragActive: false,
        handoff: null,
        hasAction: never,
        pendingObserved: false,
      }),
    ).toBe(false);
  });
});
