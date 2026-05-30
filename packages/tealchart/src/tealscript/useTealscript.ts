/**
 * useTealscript - React hook for Tealscript integration with tealchart
 *
 * This hook manages the lifecycle of Tealscript execution and provides
 * reactive plot outputs for rendering.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { TealscriptManager, type TealscriptManagerOptions } from './TealscriptManager';
import type { PlotOutput, DrawingOutput, InputDefinition, WorkerError, Bar } from '@tealstreet/tealscript';

/**
 * Options for useTealscript hook
 */
export interface UseTealscriptOptions {
  /**
   * URL to the bundled worker script.
   * Example: new URL('@tealstreet/tealscript/worker', import.meta.url)
   */
  workerUrl: string | URL;

  /**
   * Called when any script encounters an error
   */
  onError?: (scriptId: string, error: WorkerError) => void;

  /**
   * Called when input definitions are discovered for a script
   */
  onInputsDiscovered?: (scriptId: string, inputs: InputDefinition[]) => void;
}

/**
 * Return type for useTealscript hook
 */
export interface UseTealscriptReturn {
  /** All plot outputs from all scripts */
  plots: PlotOutput[];

  /** All drawing outputs from all scripts */
  drawings: DrawingOutput[];

  /** Add a new script */
  addScript: (scriptId: string, code: string, inputs?: Record<string, unknown>) => Promise<void>;

  /** Remove a script */
  removeScript: (scriptId: string) => void;

  /** Update bars for all scripts */
  setBars: (bars: Bar[]) => void;

  /** Update a single bar (realtime tick) */
  updateBar: (bar: Bar) => void;

  /** Set input values for a script */
  setInputs: (scriptId: string, inputs: Record<string, unknown>) => void;

  /** Get input definitions for a script */
  getInputDefinitions: (scriptId: string) => InputDefinition[];

  /** Get drawings for a script */
  getDrawings: (scriptId: string) => DrawingOutput[];

  /** Get error for a script */
  getError: (scriptId: string) => WorkerError | undefined;

  /** Check if a script is ready */
  isScriptReady: (scriptId: string) => boolean;

  /** Get all script IDs */
  getScriptIds: () => string[];
}

/**
 * React hook for integrating Tealscript with tealchart
 *
 * Usage:
 * ```tsx
 * const { plots, addScript, setBars, updateBar } = useTealscript({
 *   workerUrl: new URL('@tealstreet/tealscript/worker', import.meta.url),
 * });
 *
 * // Add a script
 * await addScript('sma', '//@version=6\nindicator("SMA")\nplot(ta.sma(close, 14))');
 *
 * // Update bars when they change
 * useEffect(() => {
 *   setBars(bars);
 * }, [bars, setBars]);
 *
 * // Render plots in the chart
 * renderer.renderPlots(plots, bars, viewport);
 * ```
 */
export function useTealscript(options: UseTealscriptOptions): UseTealscriptReturn {
  const managerRef = useRef<TealscriptManager | null>(null);
  const [plots, setPlots] = useState<PlotOutput[]>([]);
  const [drawings, setDrawings] = useState<DrawingOutput[]>([]);

  // Initialize manager on mount
  useEffect(() => {
    const managerOptions: TealscriptManagerOptions = {
      createWorker: () => new Worker(options.workerUrl, { type: 'module' }),
      onPlotsUpdated: (newPlots) => {
        setPlots(newPlots);
      },
      onDrawingsUpdated: (newDrawings) => {
        setDrawings(newDrawings);
      },
      onError: options.onError,
      onInputsDiscovered: options.onInputsDiscovered,
    };

    managerRef.current = new TealscriptManager(managerOptions);

    // Cleanup on unmount
    return () => {
      managerRef.current?.dispose();
      managerRef.current = null;
    };
  }, [options.workerUrl, options.onError, options.onInputsDiscovered]);

  const addScript = useCallback(
    async (scriptId: string, code: string, inputs?: Record<string, unknown>) => {
      if (managerRef.current) {
        await managerRef.current.addScript(scriptId, code, inputs);
      }
    },
    []
  );

  const removeScript = useCallback((scriptId: string) => {
    managerRef.current?.removeScript(scriptId);
  }, []);

  const setBars = useCallback((bars: Bar[]) => {
    managerRef.current?.setBars(bars);
  }, []);

  const updateBar = useCallback((bar: Bar) => {
    managerRef.current?.updateBar(bar);
  }, []);

  const setInputs = useCallback((scriptId: string, inputs: Record<string, unknown>) => {
    managerRef.current?.setInputs(scriptId, inputs);
  }, []);

  const getInputDefinitions = useCallback((scriptId: string): InputDefinition[] => {
    return managerRef.current?.getInputDefinitions(scriptId) ?? [];
  }, []);

  const getDrawings = useCallback((scriptId: string): DrawingOutput[] => {
    return managerRef.current?.getDrawings(scriptId) ?? [];
  }, []);

  const getError = useCallback((scriptId: string): WorkerError | undefined => {
    return managerRef.current?.getError(scriptId);
  }, []);

  const isScriptReady = useCallback((scriptId: string): boolean => {
    return managerRef.current?.isScriptReady(scriptId) ?? false;
  }, []);

  const getScriptIds = useCallback((): string[] => {
    return managerRef.current?.getScriptIds() ?? [];
  }, []);

  return {
    plots,
    drawings,
    addScript,
    removeScript,
    setBars,
    updateBar,
    setInputs,
    getInputDefinitions,
    getDrawings,
    getError,
    isScriptReady,
    getScriptIds,
  };
}
