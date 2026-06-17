import type { UserDrawing, UserDrawingState } from '../../drawings';
import type { AsyncStorageLike, TealchartKeyValueStorage } from '../../transformer';

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { addUserDrawing, createUserDrawingState } from '../../drawings';
import { createAsyncStorageKeyValueStorage } from '../../transformer';
import {
  loadPersistedUserDrawingLayout,
  savePersistedUserDrawingLayout,
  useTealchartLayoutPersistence,
} from './useTealchartLayoutPersistence';

function makeStorage(): TealchartKeyValueStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  const backend: AsyncStorageLike = {
    getItem: (k) => Promise.resolve(map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v);
      return Promise.resolve();
    },
    removeItem: (k) => {
      map.delete(k);
      return Promise.resolve();
    },
  };
  return Object.assign(createAsyncStorageKeyValueStorage(backend), { map });
}

function stateWithDrawing(): UserDrawingState {
  const now = 1781678051371;
  const drawing: UserDrawing = {
    id: 'd1',
    kind: 'trendLine',
    paneId: 'main',
    visible: true,
    locked: false,
    createdAt: now,
    updatedAt: now,
    style: { lineColor: '#22c55e', lineWidth: 2, lineStyle: 'solid' },
    points: [
      { time: now - 86400000, price: 64000 },
      { time: now, price: 66000 },
    ],
    extend: 'none',
  };
  return addUserDrawing(createUserDrawingState(), drawing);
}

const KEY = 'tealchart:drawings:test';

describe('persisted drawing layout helpers', () => {
  it('round-trips a non-empty state', async () => {
    const storage = makeStorage();
    await savePersistedUserDrawingLayout(storage, KEY, stateWithDrawing());
    const loaded = await loadPersistedUserDrawingLayout(storage, KEY);
    expect(loaded?.drawings).toHaveLength(1);
    expect(loaded?.drawings[0]?.kind).toBe('trendLine');
  });

  it('removes the record when saving an empty state', async () => {
    const storage = makeStorage();
    await savePersistedUserDrawingLayout(storage, KEY, stateWithDrawing());
    expect(storage.map.has(KEY)).toBe(true);
    await savePersistedUserDrawingLayout(storage, KEY, createUserDrawingState());
    expect(storage.map.has(KEY)).toBe(false);
  });

  it('returns undefined for missing or corrupt records', async () => {
    const storage = makeStorage();
    expect(await loadPersistedUserDrawingLayout(storage, KEY)).toBeUndefined();
    storage.map.set(KEY, '{not json');
    expect(await loadPersistedUserDrawingLayout(storage, KEY)).toBeUndefined();
  });
});

describe('useTealchartLayoutPersistence', () => {
  it('loads persisted state on mount and exposes it once ready', async () => {
    const storage = makeStorage();
    await savePersistedUserDrawingLayout(storage, KEY, stateWithDrawing());

    const { result } = renderHook(() =>
      useTealchartLayoutPersistence({ storage, storageKey: KEY, autoSaveDelayMs: 10 }),
    );

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.initialUserDrawingState?.drawings).toHaveLength(1);
  });

  it('autosaves drawing changes after the debounce', async () => {
    const storage = makeStorage();
    const { result } = renderHook(() =>
      useTealchartLayoutPersistence({ storage, storageKey: KEY, autoSaveDelayMs: 10 }),
    );
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => result.current.onUserDrawingStateChange(stateWithDrawing()));
    await waitFor(() => expect(storage.map.has(KEY)).toBe(true));

    const loaded = await loadPersistedUserDrawingLayout(storage, KEY);
    expect(loaded?.drawings).toHaveLength(1);
  });

  it('invokes the passthrough on every change', async () => {
    const storage = makeStorage();
    const seen: number[] = [];
    const { result } = renderHook(() =>
      useTealchartLayoutPersistence({
        storage,
        storageKey: KEY,
        autoSaveDelayMs: 10,
        onUserDrawingStateChange: (s) => seen.push(s.drawings.length),
      }),
    );
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.onUserDrawingStateChange(stateWithDrawing()));
    expect(seen).toEqual([1]);
  });

  it('clear removes the persisted record', async () => {
    const storage = makeStorage();
    await savePersistedUserDrawingLayout(storage, KEY, stateWithDrawing());
    const { result } = renderHook(() =>
      useTealchartLayoutPersistence({ storage, storageKey: KEY, autoSaveDelayMs: 10 }),
    );
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => {
      await result.current.clear();
    });
    expect(storage.map.has(KEY)).toBe(false);
  });

  it('does not leak state across a storageKey change', async () => {
    const storage = makeStorage();
    await savePersistedUserDrawingLayout(storage, 'keyA', stateWithDrawing());

    const { result, rerender } = renderHook(
      ({ k }: { k: string }) => useTealchartLayoutPersistence({ storage, storageKey: k, autoSaveDelayMs: 10 }),
      { initialProps: { k: 'keyA' } },
    );
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.initialUserDrawingState?.drawings).toHaveLength(1);

    rerender({ k: 'keyB' });
    await waitFor(() => expect(result.current.initialUserDrawingState).toBeUndefined());
    await act(async () => {
      await result.current.saveNow();
    });
    // The previous key's state must not bleed into the new key.
    expect(storage.map.has('keyB')).toBe(false);
    expect(storage.map.has('keyA')).toBe(true);
  });

  it('does not persist when disabled', async () => {
    const storage = makeStorage();
    const { result } = renderHook(() =>
      useTealchartLayoutPersistence({ storage, storageKey: KEY, enabled: false, autoSaveDelayMs: 10 }),
    );
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.onUserDrawingStateChange(stateWithDrawing()));
    await new Promise((r) => setTimeout(r, 30));
    expect(storage.map.has(KEY)).toBe(false);
  });
});
