import type { ChartSettings, ChartStore, CurrentLayoutState } from '../state/chartState';
import type { ISaveLoadAdapter, LayoutMetadata } from '../transformer/saveLoadIntegration';
import type { TealchartKeyValueStorage } from '../transformer/storageSaveLoadAdapter';

import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_LAYOUT_NAME } from '../layoutDefaults';
import { CHART_SETTINGS_VERSION } from '../state/safeDeepMerge';
import {
  deleteLayout,
  getAllLayouts,
  loadAsTealchart,
  saveTealchartLayout,
  updateTealchartLayout,
} from '../transformer/saveLoadIntegration';
import { StorageSaveLoadAdapter } from '../transformer/storageSaveLoadAdapter';

const DEFAULT_NATIVE_AUTO_SAVE_DELAY_SECONDS = 1;

export interface NativeLayoutPersistenceOptions {
  autoSaveDelay?: number;
  chartKey: string;
  disableDefaultLayoutPersistence?: boolean;
  saveLoadAdapter?: ISaveLoadAdapter | null;
  storage?: TealchartKeyValueStorage | null;
}

export interface NativeResolvedLayoutPersistence {
  autoSaveDelay?: number;
  currentLayoutStorage: TealchartKeyValueStorage | null;
  currentLayoutStorageKey: string | null;
  saveLoadAdapter: ISaveLoadAdapter | null;
}

export interface NativeLayoutPersistenceInput {
  autoSaveDelay?: number;
  chartStore: ChartStore;
  currentSettings: ChartSettings;
  currentLayoutStorage: TealchartKeyValueStorage | null;
  currentLayoutStorageKey: string | null;
  onApplyLayout: (settings: ChartSettings) => Promise<void> | void;
  readyToCreateDefaultLayout: boolean;
  saveLoadAdapter: ISaveLoadAdapter | null;
}

export interface NativeLayoutPersistenceRuntime {
  deleteNativeLayout: (layoutId: string | number) => Promise<void>;
  getNativeLayouts: () => Promise<LayoutMetadata[]>;
  initialLayoutLoaded: boolean;
  loadNativeLayout: (layoutId: string | number) => Promise<void>;
  markNativeLayoutDirty: () => void;
  renameNativeLayout: (layoutId: string | number, nextName: string) => Promise<void>;
  saveNativeLayoutAs: (layoutName: string) => Promise<void>;
  saveNativeLayoutNow: () => Promise<void>;
}

export function resolveNativeDefaultLayoutPersistence({
  autoSaveDelay,
  chartKey,
  disableDefaultLayoutPersistence,
  saveLoadAdapter,
  storage,
}: NativeLayoutPersistenceOptions): NativeResolvedLayoutPersistence {
  const currentLayoutStorageKey = `tealstreet:tealchart:${chartKey}:native-current-layout`;
  if (saveLoadAdapter) {
    return {
      saveLoadAdapter,
      autoSaveDelay,
      currentLayoutStorage: storage ?? null,
      currentLayoutStorageKey: storage ? currentLayoutStorageKey : null,
    };
  }
  if (disableDefaultLayoutPersistence || !storage) {
    return {
      saveLoadAdapter: null,
      autoSaveDelay,
      currentLayoutStorage: null,
      currentLayoutStorageKey: null,
    };
  }
  return {
    saveLoadAdapter: new StorageSaveLoadAdapter(storage, {
      namespace: `tealstreet:tealchart:${chartKey}:native-layouts`,
    }),
    autoSaveDelay: autoSaveDelay ?? DEFAULT_NATIVE_AUTO_SAVE_DELAY_SECONDS,
    currentLayoutStorage: storage,
    currentLayoutStorageKey,
  };
}

export function createNativeChartLayoutSettings(settings: Omit<ChartSettings, 'version'>): ChartSettings {
  return {
    ...settings,
    version: CHART_SETTINGS_VERSION,
  };
}

export async function loadNativeCurrentLayoutState(
  storage: TealchartKeyValueStorage | null,
  key: string | null,
): Promise<CurrentLayoutState | null> {
  if (!storage || !key) return null;
  try {
    const raw = await storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CurrentLayoutState>;
    if (parsed == null || typeof parsed !== 'object') return null;
    if (parsed.layoutId == null || parsed.layoutName == null) return null;
    if (typeof parsed.layoutId !== 'string' && typeof parsed.layoutId !== 'number') return null;
    if (typeof parsed.layoutName !== 'string') return null;
    return {
      layoutId: parsed.layoutId,
      layoutName: parsed.layoutName,
    };
  } catch {
    return null;
  }
}

export async function saveNativeCurrentLayoutState(
  storage: TealchartKeyValueStorage | null,
  key: string | null,
  state: CurrentLayoutState,
): Promise<void> {
  if (!storage || !key) return;
  try {
    if (state.layoutId == null || state.layoutName == null) {
      await storage.removeItem(key);
      return;
    }
    await storage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage errors.
  }
}

export function useNativeLayoutPersistence({
  autoSaveDelay,
  chartStore,
  currentSettings,
  currentLayoutStorage,
  currentLayoutStorageKey,
  onApplyLayout,
  readyToCreateDefaultLayout,
  saveLoadAdapter,
}: NativeLayoutPersistenceInput): NativeLayoutPersistenceRuntime {
  const [initialLayoutLoaded, setInitialLayoutLoaded] = useState(false);
  const latestSettingsRef = useRef(currentSettings);
  const onApplyLayoutRef = useRef(onApplyLayout);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStatusFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStatusIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const clearSaveStatusTimers = useCallback(() => {
    if (saveStatusFadeTimerRef.current) {
      clearTimeout(saveStatusFadeTimerRef.current);
      saveStatusFadeTimerRef.current = null;
    }
    if (saveStatusIdleTimerRef.current) {
      clearTimeout(saveStatusIdleTimerRef.current);
      saveStatusIdleTimerRef.current = null;
    }
  }, []);

  const setNativeSaveStatus = useCallback(
    (status: 'idle' | 'saving' | 'success' | 'success-fading' | 'error') => {
      clearSaveStatusTimers();
      chartStore.saveStatus.set(status);
    },
    [chartStore, clearSaveStatusTimers],
  );

  const showSaveSuccess = useCallback(() => {
    clearSaveStatusTimers();
    chartStore.saveStatus.set('success');
    saveStatusFadeTimerRef.current = setTimeout(() => {
      saveStatusFadeTimerRef.current = null;
      chartStore.saveStatus.set('success-fading');
      saveStatusIdleTimerRef.current = setTimeout(() => {
        saveStatusIdleTimerRef.current = null;
        chartStore.saveStatus.set('idle');
      }, 500);
    }, 500);
  }, [chartStore, clearSaveStatusTimers]);

  const setCurrentLayout = useCallback(
    (state: CurrentLayoutState) => {
      chartStore.currentLayout.set(state);
      void saveNativeCurrentLayoutState(currentLayoutStorage, currentLayoutStorageKey, state);
    },
    [chartStore, currentLayoutStorage, currentLayoutStorageKey],
  );

  const saveNativeLayout = useCallback(async () => {
    saveTimerRef.current = null;
    if (!saveLoadAdapter || !chartStore.isDirty.get()) return;

    const saveRevision = dirtyRevisionRef.current;
    const settings = latestSettingsRef.current;
    const currentLayout = chartStore.currentLayout.get();
    setNativeSaveStatus('saving');

    try {
      const layoutId =
        currentLayout.layoutId && currentLayout.layoutName
          ? await updateTealchartLayout(
              String(currentLayout.layoutId),
              settings,
              currentLayout.layoutName,
              saveLoadAdapter,
            )
          : await saveTealchartLayout(settings, DEFAULT_LAYOUT_NAME, saveLoadAdapter);
      const layoutName = currentLayout.layoutName ?? DEFAULT_LAYOUT_NAME;

      if (dirtyRevisionRef.current === saveRevision) {
        setCurrentLayout({ layoutId, layoutName });
        chartStore.isDirty.set(false);
        showSaveSuccess();
      }
    } catch {
      if (dirtyRevisionRef.current === saveRevision) {
        setNativeSaveStatus('error');
      }
    }
  }, [chartStore, saveLoadAdapter, setCurrentLayout, setNativeSaveStatus, showSaveSuccess]);

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

  const getNativeLayouts = useCallback(async (): Promise<LayoutMetadata[]> => {
    if (!saveLoadAdapter) return [];
    return getAllLayouts(saveLoadAdapter);
  }, [saveLoadAdapter]);

  const loadNativeLayout = useCallback(
    async (layoutId: string | number): Promise<void> => {
      if (!saveLoadAdapter) return;
      clearSaveTimer();
      dirtyRevisionRef.current += 1;

      const layouts = await getAllLayouts(saveLoadAdapter);
      const layoutName = layouts.find((layout) => String(layout.id) === String(layoutId))?.name ?? 'Untitled';
      const result = await loadAsTealchart(layoutId, saveLoadAdapter);

      applyingLayoutRef.current = true;
      try {
        await onApplyLayoutRef.current(result.data);
        setCurrentLayout({ layoutId: String(layoutId), layoutName });
        chartStore.isDirty.set(false);
        setNativeSaveStatus('idle');
      } finally {
        applyingLayoutRef.current = false;
      }
    },
    [chartStore, clearSaveTimer, saveLoadAdapter, setNativeSaveStatus],
  );

  const saveNativeLayoutNow = useCallback(async (): Promise<void> => {
    if (!saveLoadAdapter) return;
    clearSaveTimer();
    dirtyRevisionRef.current += 1;

    const settings = latestSettingsRef.current;
    const currentLayout = chartStore.currentLayout.get();
    const layoutName = currentLayout.layoutName ?? DEFAULT_LAYOUT_NAME;
    setNativeSaveStatus('saving');

    try {
      const layoutId =
        currentLayout.layoutId && currentLayout.layoutName
          ? await updateTealchartLayout(String(currentLayout.layoutId), settings, layoutName, saveLoadAdapter)
          : await saveTealchartLayout(settings, layoutName, saveLoadAdapter);
      setCurrentLayout({ layoutId, layoutName });
      chartStore.isDirty.set(false);
      showSaveSuccess();
    } catch (error) {
      setNativeSaveStatus('error');
      throw error;
    }
  }, [chartStore, clearSaveTimer, saveLoadAdapter, setNativeSaveStatus, showSaveSuccess]);

  const saveNativeLayoutAs = useCallback(
    async (layoutName: string): Promise<void> => {
      if (!saveLoadAdapter) return;
      const normalizedName = layoutName.trim();
      if (!normalizedName) return;
      clearSaveTimer();
      dirtyRevisionRef.current += 1;
      setNativeSaveStatus('saving');

      try {
        const layoutId = await saveTealchartLayout(latestSettingsRef.current, normalizedName, saveLoadAdapter);
        setCurrentLayout({ layoutId, layoutName: normalizedName });
        chartStore.isDirty.set(false);
        showSaveSuccess();
      } catch (error) {
        setNativeSaveStatus('error');
        throw error;
      }
    },
    [chartStore, clearSaveTimer, saveLoadAdapter, setNativeSaveStatus, showSaveSuccess],
  );

  const renameNativeLayout = useCallback(
    async (layoutId: string | number, nextName: string): Promise<void> => {
      if (!saveLoadAdapter) return;
      const normalizedName = nextName.trim();
      if (!normalizedName) return;
      clearSaveTimer();
      dirtyRevisionRef.current += 1;

      const currentLayout = chartStore.currentLayout.get();
      const settings =
        currentLayout.layoutId && String(currentLayout.layoutId) === String(layoutId)
          ? latestSettingsRef.current
          : (await loadAsTealchart(layoutId, saveLoadAdapter)).data;
      await updateTealchartLayout(String(layoutId), settings, normalizedName, saveLoadAdapter);
      if (currentLayout.layoutId && String(currentLayout.layoutId) === String(layoutId)) {
        setCurrentLayout({ layoutId: currentLayout.layoutId, layoutName: normalizedName });
      }
    },
    [chartStore, clearSaveTimer, saveLoadAdapter, setCurrentLayout],
  );

  const deleteNativeLayout = useCallback(
    async (layoutId: string | number): Promise<void> => {
      if (!saveLoadAdapter) return;
      clearSaveTimer();
      dirtyRevisionRef.current += 1;
      await deleteLayout(layoutId, saveLoadAdapter);
      const currentLayout = chartStore.currentLayout.get();
      if (currentLayout.layoutId && String(currentLayout.layoutId) === String(layoutId)) {
        setCurrentLayout({ layoutId: null, layoutName: null });
        markNativeLayoutDirty();
      }
    },
    [chartStore, clearSaveTimer, markNativeLayoutDirty, saveLoadAdapter, setCurrentLayout],
  );

  useEffect(() => clearSaveTimer, [clearSaveTimer]);
  useEffect(() => clearSaveStatusTimers, [clearSaveStatusTimers]);

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

    // The guard above narrows saveLoadAdapter, but that narrowing does not reach
    // into loadInitialLayout: it is a nested function over a mutable binding.
    const adapter = saveLoadAdapter;
    let cancelled = false;

    async function loadInitialLayout(): Promise<void> {
      try {
        const currentLayout =
          (await loadNativeCurrentLayoutState(currentLayoutStorage, currentLayoutStorageKey)) ??
          chartStore.currentLayout.get();
        const charts = await adapter.getAllCharts();
        const indexedCurrentLayout =
          currentLayout.layoutId != null
            ? charts.find((chart) => String(chart.id) === String(currentLayout.layoutId))
            : null;
        const defaultLayout = indexedCurrentLayout ?? charts.find((chart) => chart.name === DEFAULT_LAYOUT_NAME);
        const layoutId = defaultLayout?.id ?? null;
        const layoutName = defaultLayout?.name ?? null;

        if (!layoutId) {
          setCurrentLayout({ layoutId: null, layoutName: null });
          return;
        }

        const result = await loadAsTealchart(layoutId, adapter);
        if (cancelled) return;

        applyingLayoutRef.current = true;
        await onApplyLayoutRef.current(result.data);
        setCurrentLayout({
          layoutId,
          layoutName: layoutName ?? DEFAULT_LAYOUT_NAME,
        });
        chartStore.isDirty.set(false);
      } catch {
        if (!cancelled) {
          setCurrentLayout({ layoutId: null, layoutName: null });
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
  }, [chartStore, clearSaveTimer, currentLayoutStorage, currentLayoutStorageKey, saveLoadAdapter, setCurrentLayout]);

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
    deleteNativeLayout,
    getNativeLayouts,
    initialLayoutLoaded,
    loadNativeLayout,
    markNativeLayoutDirty,
    renameNativeLayout,
    saveNativeLayoutAs,
    saveNativeLayoutNow,
  };
}
