import type { UserDrawingState } from '../../drawings';
import type { ISaveLoadAdapter, LayoutMetadata } from '../../transformer';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  exportMobileUserDrawingStateForLayout,
  importMobileUserDrawingStateFromLayout,
} from '../utils/drawingPersistence';

function sameId(a: string | number | null | undefined, b: string | number): boolean {
  return a != null && String(a) === String(b);
}

export interface UseTealchartNamedDrawingLayoutsOptions {
  /** Save/load backend, e.g. new StorageSaveLoadAdapter(createAsyncStorageKeyValueStorage(AsyncStorage)). */
  adapter: ISaveLoadAdapter;
  /** Read the chart's current drawing state, e.g. () => chartRef.current?.exportUserDrawingStateForLayout(). */
  getDrawingState: () => UserDrawingState | undefined;
  /** Apply a loaded drawing state to the chart, e.g. (s) => chartRef.current?.setUserDrawingState(s). */
  applyDrawingState: (state: UserDrawingState) => void;
  /** Optional metadata stored alongside the layout. */
  symbol?: string;
  resolution?: string;
}

export interface UseTealchartNamedDrawingLayoutsResult {
  ready: boolean;
  layouts: LayoutMetadata[];
  currentLayoutId: string | number | null;
  refresh: () => Promise<void>;
  saveAs: (name: string) => Promise<string>;
  saveCurrent: () => Promise<void>;
  load: (id: string | number) => Promise<void>;
  rename: (id: string | number, name: string) => Promise<void>;
  remove: (id: string | number) => Promise<void>;
}

/**
 * Named-layout management for the chart's drawing state, backed by an
 * ISaveLoadAdapter. Pairs with <LayoutSelectorSheet/>. The host supplies
 * getDrawingState/applyDrawingState (wired to a SkiaTealchart handle); symbol/
 * interval/indicator persistence remains the host's concern.
 */
export function useTealchartNamedDrawingLayouts(
  options: UseTealchartNamedDrawingLayoutsOptions,
): UseTealchartNamedDrawingLayoutsResult {
  const { adapter, getDrawingState, applyDrawingState, symbol = '', resolution = '' } = options;

  const [ready, setReady] = useState(false);
  const [layouts, setLayouts] = useState<LayoutMetadata[]>([]);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | number | null>(null);

  const getStateRef = useRef(getDrawingState);
  getStateRef.current = getDrawingState;
  const applyStateRef = useRef(applyDrawingState);
  applyStateRef.current = applyDrawingState;

  const refresh = useCallback(async (): Promise<void> => {
    const charts = await adapter.getAllCharts();
    setLayouts(charts.map((c) => ({ id: c.id, name: c.name, symbol: c.symbol, isTealchart: true })));
  }, [adapter]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    refresh().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const currentContent = useCallback((): string => {
    const state = getStateRef.current();
    const layout = state ? exportMobileUserDrawingStateForLayout(state) : undefined;
    return JSON.stringify(layout ?? null);
  }, []);

  const saveAs = useCallback(
    async (name: string): Promise<string> => {
      const id = await adapter.saveChart({ name, symbol, resolution, content: currentContent() });
      setCurrentLayoutId(id);
      await refresh();
      return id;
    },
    [adapter, symbol, resolution, currentContent, refresh],
  );

  const saveCurrent = useCallback(async (): Promise<void> => {
    if (currentLayoutId == null) return;
    const existing = layouts.find((l) => sameId(currentLayoutId, l.id));
    await adapter.saveChart({
      id: currentLayoutId,
      name: existing?.name ?? 'Layout',
      symbol,
      resolution,
      content: currentContent(),
    });
    await refresh();
  }, [adapter, currentLayoutId, layouts, symbol, resolution, currentContent, refresh]);

  const load = useCallback(
    async (id: string | number): Promise<void> => {
      const content = await adapter.getChartContent(id);
      if (!content) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        return;
      }
      applyStateRef.current(importMobileUserDrawingStateFromLayout(parsed));
      setCurrentLayoutId(id);
    },
    [adapter],
  );

  const rename = useCallback(
    async (id: string | number, name: string): Promise<void> => {
      const content = await adapter.getChartContent(id);
      const existing = layouts.find((l) => sameId(id, l.id));
      await adapter.saveChart({ id, name, symbol: existing?.symbol ?? symbol, resolution, content });
      await refresh();
    },
    [adapter, layouts, symbol, resolution, refresh],
  );

  const remove = useCallback(
    async (id: string | number): Promise<void> => {
      await adapter.removeChart(id);
      setCurrentLayoutId((cur) => (sameId(cur, id) ? null : cur));
      await refresh();
    },
    [adapter, refresh],
  );

  return { ready, layouts, currentLayoutId, refresh, saveAs, saveCurrent, load, rename, remove };
}
