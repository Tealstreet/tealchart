import type { AsyncStorageLike, TealchartKeyValueStorage } from './storageSaveLoadAdapter';
import type { TvChartData } from './types';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createAsyncStorageKeyValueStorage,
  createLocalStorageKeyValueStorage,
  createLocalStorageSaveLoadAdapter,
  DEFAULT_LAYOUT_STORAGE_NAMESPACE,
  StorageSaveLoadAdapter,
} from './storageSaveLoadAdapter';

function makeSyncStorage(): TealchartKeyValueStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function makeAsyncStorage(): AsyncStorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
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
}

function makeChart(overrides: Partial<TvChartData> = {}): TvChartData {
  return {
    name: 'Layout A',
    symbol: 'BTCUSDT',
    resolution: '60',
    content: JSON.stringify({ _tealstreetTealchart: true, sources: [], panes: [] }),
    ...overrides,
  };
}

describe('StorageSaveLoadAdapter', () => {
  let storage: ReturnType<typeof makeSyncStorage>;
  let ids: string[];
  let adapter: StorageSaveLoadAdapter;

  beforeEach(() => {
    storage = makeSyncStorage();
    ids = ['id-1', 'id-2', 'id-3'];
    let i = 0;
    adapter = new StorageSaveLoadAdapter(storage, { generateId: () => ids[i++]! });
  });

  it('assigns an id, stores the blob, and indexes metadata on save', async () => {
    const id = await adapter.saveChart(makeChart({ name: 'My Layout', symbol: 'ETHUSDT' }));
    expect(id).toBe('id-1');

    const all = await adapter.getAllCharts();
    expect(all).toEqual([{ id: 'id-1', name: 'My Layout', symbol: 'ETHUSDT' }]);

    expect(storage.map.has(`${DEFAULT_LAYOUT_STORAGE_NAMESPACE}:chart:id-1`)).toBe(true);
  });

  it('returns the inner content string from getChartContent', async () => {
    const content = JSON.stringify({ _tealstreetTealchart: true, marker: 42 });
    const id = await adapter.saveChart(makeChart({ content }));
    expect(await adapter.getChartContent(id)).toBe(content);
  });

  it('upserts (no duplicate index entry, refreshed metadata) when id is supplied', async () => {
    const id = await adapter.saveChart(makeChart({ name: 'v1' }));
    await adapter.saveChart(makeChart({ id, name: 'v2', symbol: 'SOLUSDT' }));

    const all = await adapter.getAllCharts();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual({ id, name: 'v2', symbol: 'SOLUSDT' });
  });

  it('removes the blob and index entry', async () => {
    const id = await adapter.saveChart(makeChart());
    await adapter.removeChart(id);

    expect(await adapter.getAllCharts()).toEqual([]);
    expect(await adapter.getChartContent(id)).toBe('');
    expect(storage.map.has(`${DEFAULT_LAYOUT_STORAGE_NAMESPACE}:chart:${id}`)).toBe(false);
  });

  it('keeps multiple layouts independent', async () => {
    const a = await adapter.saveChart(makeChart({ name: 'A', symbol: 'BTCUSDT' }));
    const b = await adapter.saveChart(makeChart({ name: 'B', symbol: 'ETHUSDT' }));
    await adapter.removeChart(a);

    const all = await adapter.getAllCharts();
    expect(all).toEqual([{ id: b, name: 'B', symbol: 'ETHUSDT' }]);
  });

  it('returns empty content for unknown / corrupt records', async () => {
    expect(await adapter.getChartContent('missing')).toBe('');
    storage.map.set(`${DEFAULT_LAYOUT_STORAGE_NAMESPACE}:chart:bad`, '{not json');
    expect(await adapter.getChartContent('bad')).toBe('');
  });

  it('tolerates a corrupt index', async () => {
    storage.map.set(`${DEFAULT_LAYOUT_STORAGE_NAMESPACE}:index`, 'not-an-array');
    expect(await adapter.getAllCharts()).toEqual([]);
    const id = await adapter.saveChart(makeChart());
    expect(await adapter.getAllCharts()).toEqual([{ id, name: 'Layout A', symbol: 'BTCUSDT' }]);
  });

  it('isolates layouts by namespace', async () => {
    const other = new StorageSaveLoadAdapter(storage, { namespace: 'other', generateId: () => 'x' });
    await adapter.saveChart(makeChart({ name: 'default-ns' }));
    expect(await other.getAllCharts()).toEqual([]);
  });

  it('works over an async (AsyncStorage-like) backend', async () => {
    const backend = makeAsyncStorage();
    const asyncAdapter = new StorageSaveLoadAdapter(createAsyncStorageKeyValueStorage(backend), {
      generateId: () => 'async-1',
    });
    const id = await asyncAdapter.saveChart(makeChart({ name: 'Async' }));
    expect(id).toBe('async-1');
    expect(await asyncAdapter.getAllCharts()).toEqual([{ id, name: 'Async', symbol: 'BTCUSDT' }]);
  });
});

describe('createAsyncStorageKeyValueStorage', () => {
  it('swallows backend rejections', async () => {
    const backend: AsyncStorageLike = {
      getItem: () => Promise.reject(new Error('boom')),
      setItem: () => Promise.reject(new Error('boom')),
      removeItem: () => Promise.reject(new Error('boom')),
    };
    const kv = createAsyncStorageKeyValueStorage(backend);
    await expect(Promise.resolve(kv.getItem('k'))).resolves.toBeNull();
    await expect(Promise.resolve(kv.setItem('k', 'v'))).resolves.toBeUndefined();
    await expect(Promise.resolve(kv.removeItem('k'))).resolves.toBeUndefined();
  });
});

describe('createLocalStorageKeyValueStorage / createLocalStorageSaveLoadAdapter', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

  afterEach(() => {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete (globalThis as { window?: unknown }).window;
  });

  it('returns null when window/localStorage is unavailable', () => {
    delete (globalThis as { window?: unknown }).window;
    expect(createLocalStorageKeyValueStorage()).toBeNull();
    expect(createLocalStorageSaveLoadAdapter()).toBeNull();
  });

  it('reads and writes through window.localStorage', () => {
    const map = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
        setItem: (k: string, v: string) => void map.set(k, v),
        removeItem: (k: string) => void map.delete(k),
      },
    };
    const kv = createLocalStorageKeyValueStorage();
    expect(kv).not.toBeNull();
    kv!.setItem('a', '1');
    expect(kv!.getItem('a')).toBe('1');
    kv!.removeItem('a');
    expect(kv!.getItem('a')).toBeNull();
  });

  it('tolerates a throwing localStorage (quota / privacy mode)', () => {
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {
          throw new Error('quota');
        },
        removeItem: () => {
          throw new Error('blocked');
        },
      },
    };
    const kv = createLocalStorageKeyValueStorage();
    expect(kv).not.toBeNull();
    expect(() => kv!.setItem('a', '1')).not.toThrow();
    expect(kv!.getItem('a')).toBeNull();
    expect(() => kv!.removeItem('a')).not.toThrow();
  });
});
