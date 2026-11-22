import type { ChartSettings } from '../state/chartState';
import type { TealchartKeyValueStorage } from '../transformer/storageSaveLoadAdapter';
import type { ResolutionString } from '../types';

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_LAYOUT_NAME } from '../layoutDefaults';
import { clearChartStoreCache, getChartStore } from '../state/chartState';
import { CHART_SETTINGS_VERSION } from '../state/safeDeepMerge';
import { saveTealchartLayout } from '../transformer/saveLoadIntegration';
import {
  loadNativeCurrentLayoutState,
  resolveNativeDefaultLayoutPersistence,
  saveNativeCurrentLayoutState,
  shouldRestoreNativeLayoutViewport,
  useNativeLayoutPersistence,
} from './useNativeLayoutPersistence';

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

describe('restoring a saved layout viewport', () => {
  it('restores it on the market it was saved from', () => {
    expect(shouldRestoreNativeLayoutViewport({ layoutSymbol: 'BTCUSDT', symbol: 'BTCUSDT' })).toBe(true);
  });

  // The host owns the symbol, so a layout saved elsewhere still applies here -
  // but its price range belongs to that other market and would pin the axis to
  // prices this one never trades at.
  it('drops it when the layout was saved on another market', () => {
    expect(shouldRestoreNativeLayoutViewport({ layoutSymbol: 'BTCUSDT', symbol: 'XIAOMIUSDT' })).toBe(false);
  });

  it('drops it when the layout records no symbol to check against', () => {
    expect(shouldRestoreNativeLayoutViewport({ layoutSymbol: undefined, symbol: 'XIAOMIUSDT' })).toBe(false);
    expect(shouldRestoreNativeLayoutViewport({ layoutSymbol: '', symbol: 'XIAOMIUSDT' })).toBe(false);
  });
});

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
      name: 'Default',
      resolution: '15',
      symbol: 'BTC',
    });

    expect(storage.values.has('tealstreet:tealchart:native-chart:native-layouts:index')).toBe(true);
    expect(storage.values.has(`tealstreet:tealchart:native-chart:native-layouts:chart:${layoutId}`)).toBe(true);
    expect(resolved.currentLayoutStorage).toBe(storage);
    expect(resolved.currentLayoutStorageKey).toBe('tealstreet:tealchart:native-chart:native-current-layout');
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
        disableDefaultLayoutPersistence: true,
        storage: createMemoryStorage(),
      }).currentLayoutStorage,
    ).toBeNull();

    expect(
      resolveNativeDefaultLayoutPersistence({
        chartKey: 'native-chart',
        storage: null,
      }).saveLoadAdapter,
    ).toBeNull();
  });

  it('persists the selected native layout through chart-keyed key/value storage', async () => {
    const storage = createMemoryStorage();
    const key = 'tealstreet:tealchart:native-chart:native-current-layout';

    await saveNativeCurrentLayoutState(storage, key, { layoutId: 'layout-1', layoutName: 'Scalp' });

    expect(await loadNativeCurrentLayoutState(storage, key)).toEqual({
      layoutId: 'layout-1',
      layoutName: 'Scalp',
    });
  });

  it('clears invalid or empty selected native layout state', async () => {
    const storage = createMemoryStorage();
    const key = 'tealstreet:tealchart:native-chart:native-current-layout';

    await saveNativeCurrentLayoutState(storage, key, { layoutId: 'layout-1', layoutName: 'Scalp' });
    await saveNativeCurrentLayoutState(storage, key, { layoutId: null, layoutName: null });

    expect(storage.values.has(key)).toBe(false);

    storage.values.set(key, JSON.stringify({ layoutId: 'layout-1' }));
    expect(await loadNativeCurrentLayoutState(storage, key)).toBeNull();
  });
});

// AGT-104/AGT-148: the layout restored when the chart mounts opens centred on the
// newest candle, while one the user picks later restores where it was left. The
// apply callback is told which one it is.
describe('native layout apply context', () => {
  afterEach(() => clearChartStoreCache());

  const settings: ChartSettings = {
    symbol: 'BTCUSDT',
    interval: '60' as ResolutionString,
    showVolume: true,
    showIndicatorOutputAxisLabels: true,
    volumeHeight: 0.2,
    chartType: 'candle',
    autoScale: true,
    indicators: [],
    viewport: { startTime: 1_000, endTime: 2_000, priceMin: 10, priceMax: 20 },
    version: CHART_SETTINGS_VERSION,
  };

  it('marks the mount restore as a cold launch and a picked layout as not one', async () => {
    const storage = createMemoryStorage();
    const persistence = resolveNativeDefaultLayoutPersistence({ chartKey: 'apply-context', storage });
    const layoutId = await saveTealchartLayout(settings, DEFAULT_LAYOUT_NAME, persistence.saveLoadAdapter!);
    const onApplyLayout = vi.fn();

    const { result } = renderHook(() =>
      useNativeLayoutPersistence({
        chartStore: getChartStore('apply-context'),
        currentLayoutStorage: persistence.currentLayoutStorage,
        currentLayoutStorageKey: persistence.currentLayoutStorageKey,
        currentSettings: settings,
        onApplyLayout,
        readyToCreateDefaultLayout: false,
        saveLoadAdapter: persistence.saveLoadAdapter,
      }),
    );

    await waitFor(() => expect(result.current.initialLayoutLoaded).toBe(true));
    expect(onApplyLayout).toHaveBeenCalledTimes(1);
    expect(onApplyLayout.mock.calls[0]![1]).toEqual({ coldLaunch: true });

    await act(() => result.current.loadNativeLayout(layoutId));
    expect(onApplyLayout).toHaveBeenCalledTimes(2);
    expect(onApplyLayout.mock.calls[1]![1]?.coldLaunch).not.toBe(true);
  });
});
