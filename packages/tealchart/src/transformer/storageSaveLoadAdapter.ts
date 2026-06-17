/**
 * Storage-backed SaveLoad adapter
 *
 * A backend-agnostic `ISaveLoadAdapter` implementation that persists named
 * layouts through a minimal key/value storage interface. Ship a localStorage
 * backing on web and an AsyncStorage backing on mobile; hosts can swap in a
 * server-backed `ISaveLoadAdapter` instead.
 */

import type { ISaveLoadAdapter } from './saveLoadIntegration';
import type { TvChartData } from './types';

/**
 * Minimal key/value storage contract. Methods may return synchronously
 * (localStorage) or asynchronously (AsyncStorage); both are awaited internally.
 */
export interface TealchartKeyValueStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

/** Subset of `@react-native-async-storage/async-storage` we depend on. */
export interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface StorageSaveLoadAdapterOptions {
  /** Key prefix for all stored entries. Defaults to `tealchart:layouts`. */
  namespace?: string;
  /** Override id generation (useful for deterministic tests). */
  generateId?: () => string;
}

interface LayoutIndexEntry {
  id: string;
  name: string;
  symbol: string;
  resolution: string;
}

export const DEFAULT_LAYOUT_STORAGE_NAMESPACE = 'tealchart:layouts';

let idCounter = 0;
function defaultGenerateId(): string {
  idCounter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now().toString(36)}-${idCounter.toString(36)}-${rand}`;
}

/**
 * Persists `TvChartData` layouts via a `TealchartKeyValueStorage`. Maintains a
 * lightweight index entry per layout so `getAllCharts` avoids reading every blob.
 */
export class StorageSaveLoadAdapter implements ISaveLoadAdapter {
  private readonly storage: TealchartKeyValueStorage;
  private readonly namespace: string;
  private readonly generateId: () => string;
  // Serializes index read-modify-write so concurrent autosaves can't corrupt it.
  private mutationQueue: Promise<unknown> = Promise.resolve();

  constructor(storage: TealchartKeyValueStorage, options: StorageSaveLoadAdapterOptions = {}) {
    this.storage = storage;
    this.namespace = options.namespace ?? DEFAULT_LAYOUT_STORAGE_NAMESPACE;
    this.generateId = options.generateId ?? defaultGenerateId;
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.mutationQueue.then(fn, fn);
    this.mutationQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private indexKey(): string {
    return `${this.namespace}:index`;
  }

  private chartKey(id: string): string {
    return `${this.namespace}:chart:${id}`;
  }

  private async readIndex(): Promise<LayoutIndexEntry[]> {
    const raw = await this.storage.getItem(this.indexKey());
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (entry): entry is LayoutIndexEntry =>
          entry != null &&
          typeof entry === 'object' &&
          typeof entry.id === 'string' &&
          typeof entry.name === 'string' &&
          typeof entry.symbol === 'string',
      );
    } catch {
      return [];
    }
  }

  private async writeIndex(entries: LayoutIndexEntry[]): Promise<void> {
    await this.storage.setItem(this.indexKey(), JSON.stringify(entries));
  }

  async saveChart(data: TvChartData): Promise<string> {
    return this.enqueue(async () => {
      const hasId = data.id != null && String(data.id) !== '';
      const id = hasId ? String(data.id) : this.generateId();
      const meta: LayoutIndexEntry = {
        id,
        name: data.name,
        symbol: data.symbol,
        resolution: data.resolution,
      };
      // Index first so a failed blob write leaves a recoverable phantom entry
      // (loads empty, can be deleted) rather than an invisible orphaned blob.
      const index = await this.readIndex();
      await this.writeIndex([...index.filter((entry) => entry.id !== id), meta]);
      await this.storage.setItem(this.chartKey(id), JSON.stringify({ ...data, id }));
      return id;
    });
  }

  async getChartContent(chartId: string | number): Promise<string> {
    const raw = await this.storage.getItem(this.chartKey(String(chartId)));
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw) as TvChartData;
      return typeof parsed.content === 'string' ? parsed.content : '';
    } catch {
      return '';
    }
  }

  async getAllCharts(): Promise<Array<{ id: string | number; name: string; symbol: string }>> {
    const index = await this.readIndex();
    return index.map((entry) => ({ id: entry.id, name: entry.name, symbol: entry.symbol }));
  }

  async removeChart(id: string | number): Promise<void> {
    await this.enqueue(async () => {
      const key = String(id);
      // Drop the index entry first so the layout disappears from listings even
      // if the blob removal fails (a stale blob is harmless and overwritten on reuse).
      const index = await this.readIndex();
      const next = index.filter((entry) => entry.id !== key);
      if (next.length !== index.length) await this.writeIndex(next);
      await this.storage.removeItem(this.chartKey(key));
    });
  }
}

/**
 * localStorage-backed key/value storage, or `null` when `window.localStorage`
 * is unavailable (SSR, hardened environments). All access is failure-tolerant.
 */
export function createLocalStorageKeyValueStorage(): TealchartKeyValueStorage | null {
  let ls: Storage;
  try {
    // Accessing window.localStorage can throw SecurityError in hardened /
    // privacy contexts (e.g. blocked storage), not merely be undefined.
    if (typeof window === 'undefined' || !window.localStorage) return null;
    ls = window.localStorage;
  } catch {
    return null;
  }
  return {
    getItem: (key) => {
      try {
        return ls.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        ls.setItem(key, value);
      } catch {
        // ignore quota / access errors
      }
    },
    removeItem: (key) => {
      try {
        ls.removeItem(key);
      } catch {
        // ignore access errors
      }
    },
  };
}

/** Wrap an AsyncStorage-like backend (React Native) as failure-tolerant KV storage. */
export function createAsyncStorageKeyValueStorage(asyncStorage: AsyncStorageLike): TealchartKeyValueStorage {
  return {
    getItem: (key) => asyncStorage.getItem(key).catch(() => null),
    setItem: (key, value) =>
      asyncStorage
        .setItem(key, value)
        .then(() => undefined)
        .catch(() => undefined),
    removeItem: (key) =>
      asyncStorage
        .removeItem(key)
        .then(() => undefined)
        .catch(() => undefined),
  };
}

/**
 * Convenience factory for the default web persistence: a `StorageSaveLoadAdapter`
 * over localStorage, or `null` when localStorage is unavailable.
 */
export function createLocalStorageSaveLoadAdapter(
  options: StorageSaveLoadAdapterOptions = {},
): StorageSaveLoadAdapter | null {
  const storage = createLocalStorageKeyValueStorage();
  if (!storage) return null;
  return new StorageSaveLoadAdapter(storage, options);
}
