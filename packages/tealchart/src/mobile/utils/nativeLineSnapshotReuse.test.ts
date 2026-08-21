import { describe, expect, it } from 'vitest';

import { areNativeRenderEntriesEqual, reuseNativeRenderList } from './nativeLineSnapshotReuse';

describe('areNativeRenderEntriesEqual', () => {
  it('sees through a re-minted wrapper object one level down', () => {
    const onMove = () => undefined;

    expect(
      areNativeRenderEntriesEqual({ id: 'a', price: 1, callbacks: { onMove } }, { id: 'a', price: 1, callbacks: { onMove } }),
    ).toBe(true);
  });

  it('catches a changed field, a changed nested value and a changed key set', () => {
    expect(areNativeRenderEntriesEqual({ id: 'a', price: 1 }, { id: 'a', price: 2 })).toBe(false);
    expect(
      areNativeRenderEntriesEqual({ id: 'a', brackets: { tp: 1 } }, { id: 'a', brackets: { tp: 2 } }),
    ).toBe(false);
    expect(areNativeRenderEntriesEqual({ id: 'a' }, { id: 'a', price: 1 })).toBe(false);
  });

  it('does not compare more than one level down', () => {
    // Deeper than the render data ever nests, and cheap beats exhaustive here.
    expect(
      areNativeRenderEntriesEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } }),
    ).toBe(false);
  });

  it('tells an explicitly undefined field from a populated one', () => {
    // The shape the OEMS pass actually produces: it always assigns the key, so
    // both sides have it and only the value distinguishes an active action.
    expect(
      areNativeRenderEntriesEqual({ id: 'a', actionState: { isPending: true } }, { id: 'a', actionState: undefined }),
    ).toBe(false);
    expect(areNativeRenderEntriesEqual({ id: 'a', actionState: undefined }, { id: 'a', actionState: undefined })).toBe(
      true,
    );
  });

  it('treats a swapped callback as a change', () => {
    expect(
      areNativeRenderEntriesEqual({ callbacks: { onMove: () => 1 } }, { callbacks: { onMove: () => 2 } }),
    ).toBe(false);
  });
});

describe('reuseNativeRenderList', () => {
  const previous = [
    { id: 'a', price: 1 },
    { id: 'b', price: 2 },
  ];

  it('hands back the previous list when every entry still matches', () => {
    expect(reuseNativeRenderList(previous, [{ id: 'a', price: 1 }, { id: 'b', price: 2 }])).toBe(previous);
  });

  it('keeps the identity of the entries that did not change', () => {
    const next = reuseNativeRenderList(previous, [{ id: 'a', price: 1 }, { id: 'b', price: 9 }]);

    expect(next).not.toBe(previous);
    expect(next[0]).toBe(previous[0]);
    expect(next[1]).toEqual({ id: 'b', price: 9 });
  });

  it('takes the new list when the length changes or there is nothing to reuse', () => {
    const shorter = [{ id: 'a', price: 1 }];
    expect(reuseNativeRenderList(previous, shorter)).toBe(shorter);
    expect(reuseNativeRenderList(undefined, shorter)).toBe(shorter);
  });

  it('does not hand a reordered entry the identity of whatever sat at its index', () => {
    // The api emits id-less lines before orderId-bearing ones, so a line gaining
    // an orderId reorders the list. `id` differs, so nothing is falsely reused.
    const swapped = reuseNativeRenderList(previous, [{ id: 'b', price: 2 }, { id: 'a', price: 1 }]);

    expect(swapped[0]).not.toBe(previous[0]);
    expect(swapped[0]).not.toBe(previous[1]);
    expect(swapped).toEqual([{ id: 'b', price: 2 }, { id: 'a', price: 1 }]);
  });
});
