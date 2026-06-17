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
  return `${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/**
 * Persists `TvChartData` layouts via a `TealchartKeyValueStorage`. Maintains a
 * lightweight index entry per layout so `getAllCharts` avoids reading every blob.
 */
export class StorageSaveLoadAdapter implements ISaveLoadAdapter {
  private readonly storage: TealchartKeyValueStorage;
  private readonly namespace: string;
  private readonly generateId: () => string;

  constructor(storage: TealchartKeyValueStorage, options: StorageSaveLoadAdapterOptions = {}) {
    this.storage = storage;
    this.namespace = options.namespace ?? DEFAULT_LAYOUT_STORAGE_NAMESPACE;
    this.generateId = options.generateId ?? defaultGenerateId;
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
    const hasId = data.id != null && String(data.id) !== '';
    const id = hasId ? String(data.id) : this.generateId();
    const record: TvChartData = { ...data, id };
    await this.storage.setItem(this.chartKey(id), JSON.stringify(record));

    const index = await this.readIndex();
    const meta: LayoutIndexEntry = {
      id,
      name: data.name,
      symbol: data.symbol,
      resolution: data.resolution,
    };
    const next = index.filter((entry) => entry.id !== id);
    next.push(meta);
    await this.writeIndex(next);
    return id;
  }

  async getChartContent(chartId: string | number): Promise<string> {
    const raw = await this.storage.getItem(this.chartKey(String(chartId)));
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw) as TvChartData;
      return parsed.content ?? '';
    } catch {
      return '';
    }
  }

  async getAllCharts(): Promise<Array<{ id: string | number; name: string; symbol: string }>> {
    const index = await this.readIndex();
    return index.map((entry) => ({ id: entry.id, name: entry.name, symbol: entry.symbol }));
  }

  async removeChart(id: string | number): Promise<void> {
    const key = String(id);
    await this.storage.removeItem(this.chartKey(key));
    const index = await this.readIndex();
    const next = index.filter((entry) => entry.id !== key);
    if (next.length !== index.length) await this.writeIndex(next);
  }
}

/**
 * localStorage-backed key/value storage, or `null` when `window.localStorage`
 * is unavailable (SSR, hardened environments). All access is failure-tolerant.
 */
export function createLocalStorageKeyValueStorage(): TealchartKeyValueStorage | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null;
  const ls = window.localStorage;
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
