import { describe, expect, it } from 'vitest';

import { OemsActionManager } from '../../interaction/oemsActionManager';
import {
  shouldReleaseNativeOrderDragForSnapshot,
  shouldReleaseNativeOrderDragOnSettle,
} from './useNativeOemsLineRuntime';

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

// This predicate existed and was correct, and the preview still lingered, because
// nothing ever asked it. Its only caller runs from a layout effect keyed on the
// snapshot's order lines - and a cancelled move rolls the optimistic price back to
// the one already there, so the snapshot comes back identical, the list is reused,
// the effect does not re-run and the question is never put. Retiring on the settle
// is what closes that, so the settle path gets its own coverage here.
describe('shouldReleaseNativeOrderDragOnSettle', () => {
  const handoff = { objectId: 'order_1' };

  it('lets go when the action this drag started settles', () => {
    expect(
      shouldReleaseNativeOrderDragOnSettle({ dragActive: false, handoff, objectId: 'order_1', objectType: 'order' }),
    ).toBe(true);
  });

  it('holds while the finger is still down', () => {
    expect(
      shouldReleaseNativeOrderDragOnSettle({ dragActive: true, handoff, objectId: 'order_1', objectType: 'order' }),
    ).toBe(false);
  });

  it('ignores a settle for some other line, or for a position', () => {
    expect(
      shouldReleaseNativeOrderDragOnSettle({ dragActive: false, handoff, objectId: 'order_2', objectType: 'order' }),
    ).toBe(false);
    expect(
      shouldReleaseNativeOrderDragOnSettle({ dragActive: false, handoff, objectId: 'order_1', objectType: 'position' }),
    ).toBe(false);
  });

  it('ignores a settle with no commit behind it', () => {
    expect(
      shouldReleaseNativeOrderDragOnSettle({
        dragActive: false,
        handoff: null,
        objectId: 'order_1',
        objectType: 'order',
      }),
    ).toBe(false);
  });
});

// The other half: the signal has to actually fire on a cancel. A host cancel
// resolves the awaited callback with `false`, which fails the action rather than
// confirming it - and a failed action settles exactly like a confirmed one.
describe('a cancelled order move settles', () => {
  it('notifies onSettle when the callback resolves false', async () => {
    const settlements: Array<{ objectId: string; status: string }> = [];
    const manager = new OemsActionManager({
      onSettle: ({ action, status }) => settlements.push({ objectId: action.objectId, status }),
    });

    manager.startAction({
      objectType: 'order',
      objectId: 'order_1',
      kind: 'move',
      originalState: { price: 100 },
      optimisticState: { price: 110 },
      callback: () => Promise.resolve(false),
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(settlements).toEqual([{ objectId: 'order_1', status: 'failed' }]);
    expect(manager.getAction('order', 'order_1')).toBeNull();
  });
});

