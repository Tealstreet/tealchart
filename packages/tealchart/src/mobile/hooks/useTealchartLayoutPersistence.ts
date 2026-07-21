import type { UserDrawingState } from '../../drawings';
import type { TealchartKeyValueStorage } from '../../transformer';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  exportMobileUserDrawingStateForLayout,
  importMobileUserDrawingStateFromLayout,
} from '../utils/drawingPersistence';

const DEFAULT_AUTO_SAVE_DELAY_MS = 1000;

/**
 * Read and deserialize a persisted drawing-state layout, or `undefined` when
 * nothing is stored / the record is unreadable.
 */
export async function loadPersistedUserDrawingLayout(
  storage: TealchartKeyValueStorage,
  key: string,
): Promise<UserDrawingState | undefined> {
  const raw = await storage.getItem(key);
  if (!raw) return undefined;
  try {
    return importMobileUserDrawingStateFromLayout(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

/**
 * Persist a drawing-state layout. An empty layout removes the record so a
 * cleared chart does not linger in storage.
 */
export async function savePersistedUserDrawingLayout(
  storage: TealchartKeyValueStorage,
  key: string,
  state: UserDrawingState,
): Promise<void> {
  const layout = exportMobileUserDrawingStateForLayout(state);
  if (!layout) {
    await storage.removeItem(key);
    return;
  }
  await storage.setItem(key, JSON.stringify(layout));
}

export interface UseTealchartLayoutPersistenceOptions {
  /** Key/value storage backend, e.g. createAsyncStorageKeyValueStorage(AsyncStorage). */
  storage: TealchartKeyValueStorage;
  /** Storage key, typically scoped per chart (e.g. `tealchart:drawings:${chartKey}`). */
  storageKey: string;
  /** Disable persistence entirely (ready resolves immediately, nothing is saved). */
  enabled?: boolean;
  /** Debounce before autosaving after a change. Defaults to 1000ms. */
  autoSaveDelayMs?: number;
  /** Optional passthrough invoked on every drawing-state change before autosave. */
  onUserDrawingStateChange?: (state: UserDrawingState) => void;
}

export interface UseTealchartLayoutPersistenceResult {
  /** True once the initial load has settled; gate rendering on this. */
  ready: boolean;
  /** Restored drawing state to feed SkiaTealchart's userDrawingState prop. */
  initialUserDrawingState: UserDrawingState | undefined;
  /** Wire to SkiaTealchart's onUserDrawingStateChange to enable autosave. */
  onUserDrawingStateChange: (state: UserDrawingState) => void;
  /** Flush any pending autosave immediately. */
  saveNow: () => Promise<void>;
  /** Remove the persisted layout. */
  clear: () => Promise<void>;
}

/**
 * Host-side persistence for SkiaTealchart's drawing state. Loads the persisted
 * layout on mount and debounce-autosaves on change, mirroring the web widget's
 * default persistence while respecting the controlled-component design (the host
 * still owns symbol/interval/indicator persistence).
 */
export function useTealchartLayoutPersistence(
  options: UseTealchartLayoutPersistenceOptions,
): UseTealchartLayoutPersistenceResult {
  const {
    storage,
    storageKey,
    enabled = true,
    autoSaveDelayMs = DEFAULT_AUTO_SAVE_DELAY_MS,
    onUserDrawingStateChange,
  } = options;

  const [ready, setReady] = useState(!enabled);
  const [initialState, setInitialState] = useState<UserDrawingState | undefined>(undefined);

  const latestState = useRef<UserDrawingState | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);
  const passthroughRef = useRef(onUserDrawingStateChange);
  passthroughRef.current = onUserDrawingStateChange;

  useEffect(() => {
    // On (re)load — including a storageKey switch — drop any state carried over
    // from the previous key so flush/saveNow can't write it to the new key and
    // initialUserDrawingState never shows a stale value.
    setInitialState(undefined);
    latestState.current = undefined;
    if (!enabled) {
      loadedRef.current = false;
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    loadedRef.current = false;
    loadPersistedUserDrawingLayout(storage, storageKey)
      .then((loaded) => {
        if (cancelled) return;
        setInitialState(loaded);
      })
      .catch(() => {
        // ignore — start fresh
      })
      .finally(() => {
        if (cancelled) return;
        loadedRef.current = true;
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [storage, storageKey, enabled]);

  const flush = useCallback(async (): Promise<void> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!enabled || !loadedRef.current) return;
    const state = latestState.current;
    if (state) await savePersistedUserDrawingLayout(storage, storageKey, state);
  }, [storage, storageKey, enabled]);

  const handleChange = useCallback(
    (state: UserDrawingState) => {
      latestState.current = state;
      passthroughRef.current?.(state);
      // Don't persist before the initial load resolves, to avoid clobbering
      // stored state with a pre-load snapshot.
      if (!enabled || !loadedRef.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void savePersistedUserDrawingLayout(storage, storageKey, state).catch(() => undefined);
      }, autoSaveDelayMs);
    },
    [storage, storageKey, enabled, autoSaveDelayMs],
  );

  const clear = useCallback(async (): Promise<void> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    latestState.current = undefined;
    await storage.removeItem(storageKey);
  }, [storage, storageKey]);

  // Flush pending save on unmount using the latest flush closure.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(
    () => () => {
      void flushRef.current();
    },
    [],
  );

  return {
    ready,
    initialUserDrawingState: initialState,
    onUserDrawingStateChange: handleChange,
    saveNow: flush,
    clear,
  };
}
