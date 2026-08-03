import type { TealchartKeyValueStorage } from '../transformer/storageSaveLoadAdapter';

import { describe, expect, it } from 'vitest';

import { resolveNativeDefaultLayoutPersistence } from './useNativeLayoutPersistence';

function createMemoryStorage(): TealchartKeyValueStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe('native layout persistence defaults', () => {
  it('creates a chart-key scoped storage adapter from native key/value storage', async () => {
    const storage = createMemoryStorage();
    const resolved = resolveNativeDefaultLayoutPersistence({
      chartKey: 'native-chart',
      storage,
    });

    expect(resolved.autoSaveDelay).toBe(1);
    const layoutId = await resolved.saveLoadAdapter!.saveChart({
      content: '{}',
      name: 'tealstreet',
      resolution: '15',
      symbol: 'BTC',
    });

    expect(storage.values.has('tealstreet:tealchart:native-chart:native-layouts:index')).toBe(true);
    expect(storage.values.has(`tealstreet:tealchart:native-chart:native-layouts:chart:${layoutId}`)).toBe(true);
  });

  it('does not create default persistence when disabled or no storage is available', () => {
    expect(
      resolveNativeDefaultLayoutPersistence({
        chartKey: 'native-chart',
        disableDefaultLayoutPersistence: true,
        storage: createMemoryStorage(),
      }).saveLoadAdapter,
    ).toBeNull();

    expect(
      resolveNativeDefaultLayoutPersistence({
        chartKey: 'native-chart',
        storage: null,
      }).saveLoadAdapter,
    ).toBeNull();
  });
}
