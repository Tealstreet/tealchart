import type { ChartSettings, ChartStore } from '../state/chartState';
import type { ISaveLoadAdapter } from '../transformer/saveLoadIntegration';
import type { TealchartKeyValueStorage } from '../transformer/storageSaveLoadAdapter';

import { useCallback, useEffect, useRef, useState } from 'react';

import { CHART_SETTINGS_VERSION } from '../state/safeDeepMerge';
import { loadAsTealchart, saveTealchartLayout, updateTealchartLayout } from '../transformer/saveLoadIntegration';
import { StorageSaveLoadAdapter } from '../transformer/storageSaveLoadAdapter';

const DEFAULT_NATIVE_AUTO_SAVE_DELAY_SECONDS = 1;
const DEFAULT_NATIVE_LAYOUT_NAME = 'tealstreet';

export interface NativeLayoutPersistenceOptions {
  autoSaveDelay?: number;
  chartKey: string;
  disableDefaultLayoutPersistence?: boolean;
  saveLoadAdapter?: ISaveLoadAdapter | null;
  storage?: TealchartKeyValueStorage | null;
}

export interface NativeResolvedLayoutPersistence {
  autoSaveDelay?: number;
  saveLoadAdapter: ISaveLoadAdapter | null;
}

export interface NativeLayoutPersistenceInput {
  autoSaveDelay?: number;
  chartStore: ChartStore;
  currentSettings: ChartSettings;
  onApplyLayout: (settings: ChartSettings) => Promise<void> | void;
  readyToCreateDefaultLayout: boolean;
  saveLoadAdapter: ISaveLoadAdapter | null;
}

export interface NativeLayoutPersistenceRuntime {
  initialLayoutLoaded: boolean;
  markNativeLayoutDirty: () => void;
}

export function resolveNativeDefaultLayoutPersistence({
  autoSaveDelay,
  chartKey,
  disableDefaultLayoutPersistence,
  saveLoadAdapter,
  storage,
}: NativeLayoutPersistenceOptions): NativeResolvedLayoutPersistence {
  if (saveLoadAdapter) {
    return { saveLoadAdapter, autoSaveDelay };
  }
  if (disableDefaultLayoutPersistence || !storage) {
    return { saveLoadAdapter: null, autoSaveDelay };
  }
  return {
    saveLoadAdapter: new StorageSaveLoadAdapter(storage, {
      namespace: `tealstreet:tealchart:${chartKey}:native-layouts`,
    }),
    autoSaveDelay: autoSaveDelay ?? DEFAULT_NATIVE_AUTO_SAVE_DELAY_SECONDS,
  };
}

export function createNativeChartLayoutSettings(settings: Omit<ChartSettings, 'version'>): ChartSettings {
  return {
    ...settings,
    version: CHART_SETTINGS_VERSION,
  };
}

export function useNativeLayoutPersistence({
  autoSaveDelay,
  chartStore,
  currentSettings,
  onApplyLayout,
  readyToCreateDefaultLayout,
  saveLoadAdapter,
}: NativeLayoutPersistenceInput): NativeLayoutPersistenceRuntime {
  const [initialLayoutLoaded, setInitialLayoutLoaded] = useState(false);
  const latestSettingsRef = useRef(currentSettings);
  const onApplyLayoutRef = useRef(onApplyLayout);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyingLayoutRef = useRef(false);
  const dirtyRevisionRef = useRef(0);
  const initialLayoutLoadedRef = useRef(false);
  const defaultLayoutEnsuredRef = useRef(false);

  useEffect(() => {
    latestSettingsRef.current = currentSettings;
  }, [currentSettings]);

  useEffect(() => {
    onApplyLayoutRef.current = onApplyLayout;
  }, [onApplyLayout]);

  const clearSaveTimer = useCallback(() => {
    if (!saveTimerRef.current) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
  }, []);

  const saveNativeLayout = useCallback(async () => {
    saveTimerRef.current = null;
    if (!saveLoadAdapter || !chartStore.isDirty.get()) return;

    const saveRevision = dirtyRevisionRef.current;
    const settings = latestSettingsRef.current;
    const currentLayout = chartStore.currentLayout.get();
    chartStore.saveStatus.set('saving');

    try {
      const layoutId =
        currentLayout.layoutId && currentLayout.layoutName
          ? await updateTealchartLayout(
              String(currentLayout.layoutId),
              settings,
              currentLayout.layoutName,
              saveLoadAdapter,
            )
          : await saveTealchartLayout(settings, DEFAULT_NATIVE_LAYOUT_NAME, saveLoadAdapter);
      const layoutName = currentLayout.layoutName ?? DEFAULT_NATIVE_LAYOUT_NAME;

      if (dirtyRevisionRef.current === saveRevision) {
        chartStore.currentLayout.set({ layoutId, layoutName });
        chartStore.isDirty.set(false);
        chartStore.saveStatus.set('success');
      }
    } catch {
      if (dirtyRevisionRef.current === saveRevision) {
        chartStore.saveStatus.set('error');
      }
    }
  }, [chartStore, saveLoadAdapter]);

  const markNativeLayoutDirty = useCallback(() => {
    if (!saveLoadAdapter || applyingLayoutRef.current || !initialLayoutLoadedRef.current) return;
    dirtyRevisionRef.current += 1;
    chartStore.isDirty.set(true);

    const delay = autoSaveDelay;
    if (!delay || delay <= 0) return;

    clearSaveTimer();
    saveTimerRef.current = setTimeout(() => {
      void saveNativeLayout();
    }, delay * 1000);
  }, [autoSaveDelay, chartStore, clearSaveTimer, saveLoadAdapter, saveNativeLayout]);

  useEffect(() => clearSaveTimer, [clearSaveTimer]);

  useEffect(() => {
    initialLayoutLoadedRef.current = false;
    setInitialLayoutLoaded(false);
    defaultLayoutEnsuredRef.current = false;
    clearSaveTimer();

    if (!saveLoadAdapter) {
      initialLayoutLoadedRef.current = true;
      setInitialLayoutLoaded(true);
      return;
    }

    let cancelled = false;

    async function loadInitialLayout(): Promise<void> {
      try {
        const currentLayout = chartStore.currentLayout.get();
        const charts = await saveLoadAdapter.getAllCharts();
        const indexedCurrentLayout =
          currentLayout.layoutId != null
            ? charts.find((chart) => String(chart.id) === String(currentLayout.layoutId))
            : null;
        const defaultLayout = indexedCurrentLayout ?? charts.find((chart) => chart.name === DEFAULT_NATIVE_LAYOUT_NAME);
        const layoutId = defaultLayout?.id ?? null;
        const layoutName = defaultLayout?.name ?? null;

        if (!layoutId) {
          chartStore.currentLayout.set({ layoutId: null, layoutName: null });
          return;
        }

        const result = await loadAsTealchart(layoutId, saveLoadAdapter);
        if (cancelled) return;

        applyingLayoutRef.current = true;
        await onApplyLayoutRef.current(result.data);
        chartStore.currentLayout.set({
          layoutId,
          layoutName: layoutName ?? DEFAULT_NATIVE_LAYOUT_NAME,
        });
        chartStore.isDirty.set(false);
      } catch {
        if (!cancelled) {
          chartStore.currentLayout.set({ layoutId: null, layoutName: null });
        }
      } finally {
        applyingLayoutRef.current = false;
        if (!cancelled) {
          initialLayoutLoadedRef.current = true;
          setInitialLayoutLoaded(true);
        }
      }
    }

    void loadInitialLayout();

    return () => {
      cancelled = true;
      applyingLayoutRef.current = false;
    };
  }, [chartStore, clearSaveTimer, saveLoadAdapter]);

  useEffect(() => {
    if (!saveLoadAdapter || !initialLayoutLoaded || !readyToCreateDefaultLayout || defaultLayoutEnsuredRef.current) {
      return;
    }
    defaultLayoutEnsuredRef.current = true;
    if (!chartStore.currentLayout.get().layoutId) {
      markNativeLayoutDirty();
    }
  }, [chartStore, initialLayoutLoaded, markNativeLayoutDirty, readyToCreateDefaultLayout, saveLoadAdapter]);

  return {
    initialLayoutLoaded,
    markNativeLayoutDirty,
  };
}
