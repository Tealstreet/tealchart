import type { UserDrawing, UserDrawingState } from '../../drawings';
import type { AsyncStorageLike, ISaveLoadAdapter, TvChartData } from '../../transformer';

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { addUserDrawing, createUserDrawingState } from '../../drawings';
import { createAsyncStorageKeyValueStorage, StorageSaveLoadAdapter } from '../../transformer';
import { useTealchartNamedDrawingLayouts } from './useTealchartNamedDrawingLayouts';

function makeAdapter() {
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
  let n = 0;
  return new StorageSaveLoadAdapter(createAsyncStorageKeyValueStorage(backend), { generateId: () => `L${n++}` });
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
      { time: now - 1000, price: 64000 },
      { time: now, price: 66000 },
    ],
    extend: 'none',
  };
  return addUserDrawing(createUserDrawingState(), drawing);
}

describe('useTealchartNamedDrawingLayouts', () => {
  it('saves, lists, loads, renames and removes named layouts', async () => {
    const adapter = makeAdapter();
    const applyDrawingState = vi.fn();
    const { result } = renderHook(() =>
      useTealchartNamedDrawingLayouts({
        adapter,
        getDrawingState: () => stateWithDrawing(),
        applyDrawingState,
        symbol: 'BTCUSDT',
      }),
    );
    await waitFor(() => expect(result.current.ready).toBe(true));

    let id = '';
    await act(async () => {
      id = await result.current.saveAs('Scalp');
    });
    expect(result.current.layouts).toEqual([{ id, name: 'Scalp', symbol: 'BTCUSDT', isTealchart: true }]);
    expect(result.current.currentLayoutId).toBe(id);

    await act(async () => {
      await result.current.load(id);
    });
    expect(applyDrawingState).toHaveBeenCalledTimes(1);
    expect(applyDrawingState.mock.calls[0][0].drawings).toHaveLength(1);

    await act(async () => {
      await result.current.rename(id, 'Scalp v2');
    });
    expect(result.current.layouts[0].name).toBe('Scalp v2');

    await act(async () => {
      await result.current.remove(id);
    });
    expect(result.current.layouts).toEqual([]);
    expect(result.current.currentLayoutId).toBeNull();
  });

  it('keeps multiple layouts and saveCurrent overwrites the active one', async () => {
    const adapter = makeAdapter();
    let stateToSave = createUserDrawingState();
    const { result } = renderHook(() =>
      useTealchartNamedDrawingLayouts({
        adapter,
        getDrawingState: () => stateToSave,
        applyDrawingState: vi.fn(),
      }),
    );
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.saveAs('A');
    });
    await act(async () => {
      await result.current.saveAs('B');
    });
    expect(result.current.layouts.map((l) => l.name).sort()).toEqual(['A', 'B']);

    // Update the active layout (B) with a non-empty state.
    stateToSave = stateWithDrawing();
    await act(async () => {
      await result.current.saveCurrent();
    });
    expect(result.current.layouts).toHaveLength(2);
    const activeId = result.current.currentLayoutId!;
    const content = await adapter.getChartContent(activeId);
    expect(content).toContain('trendLine');
  });

  it('never re-saves empty content on rename', async () => {
    const saved: TvChartData[] = [];
    const fakeAdapter: ISaveLoadAdapter = {
      saveChart: async (data) => {
        saved.push(data);
        return String(data.id ?? 'x');
      },
      getChartContent: async () => '', // simulate a missing/corrupt record
      getAllCharts: async () => [{ id: 'x', name: 'X', symbol: '' }],
      removeChart: async () => {},
    };
    const { result } = renderHook(() =>
      useTealchartNamedDrawingLayouts({
        adapter: fakeAdapter,
        getDrawingState: () => undefined,
        applyDrawingState: vi.fn(),
      }),
    );
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => {
      await result.current.rename('x', 'Renamed');
    });
    expect(saved.at(-1)?.content).toBe(JSON.stringify(null));
    expect(saved.at(-1)?.content).not.toBe('');
  });
});
