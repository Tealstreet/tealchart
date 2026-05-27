/**
 * Indicator CRUD Actions
 *
 * Provides functions for adding, removing, updating, and toggling indicators.
 * Framework-agnostic - works with any JavaScript environment.
 */

import { getChartStore, type IndicatorInstance } from './chartState';

// ============================================================================
// Helper: Generate unique indicator instance ID
// ============================================================================

/**
 * Generate a unique ID for an indicator instance
 */
export function generateIndicatorId(builtinId: string): string {
  return `${builtinId}_${Date.now()}`;
}

// ============================================================================
// Indicator Action Functions
// ============================================================================

/**
 * Add an indicator instance to a chart
 *
 * @param chartKey - The chart key for scoped storage
 * @param payload - The indicator data to add
 * @returns The new indicator's ID
 */
export function addIndicator(
  chartKey: string,
  payload: { builtinId: string; name: string; inputs?: Record<string, unknown> }
): string {
  const store = getChartStore(chartKey).settings;
  const settings = store.get();

  const newIndicator: IndicatorInstance = {
    id: generateIndicatorId(payload.builtinId),
    name: payload.name,
    builtinId: payload.builtinId,
    inputs: payload.inputs ?? {},
    isVisible: true,
    createdAt: Date.now(),
  };

  store.setKey('indicators', [...settings.indicators, newIndicator]);

  return newIndicator.id;
}

/**
 * Remove an indicator by ID
 *
 * @param chartKey - The chart key for scoped storage
 * @param indicatorId - The indicator ID to remove
 */
export function removeIndicator(chartKey: string, indicatorId: string): void {
  const store = getChartStore(chartKey).settings;
  const settings = store.get();

  store.setKey(
    'indicators',
    settings.indicators.filter((ind) => ind.id !== indicatorId)
  );
}

/**
 * Update an indicator's inputs
 *
 * @param chartKey - The chart key for scoped storage
 * @param payload - The indicator ID and new inputs
 */
export function updateIndicatorInputs(
  chartKey: string,
  payload: { id: string; inputs: Record<string, unknown> }
): void {
  const store = getChartStore(chartKey).settings;
  const settings = store.get();

  store.setKey(
    'indicators',
    settings.indicators.map((ind) =>
      ind.id === payload.id
        ? { ...ind, inputs: { ...ind.inputs, ...payload.inputs } }
        : ind
    )
  );
}

/**
 * Toggle an indicator's visibility
 *
 * @param chartKey - The chart key for scoped storage
 * @param indicatorId - The indicator ID to toggle
 */
export function toggleIndicatorVisibility(chartKey: string, indicatorId: string): void {
  const store = getChartStore(chartKey).settings;
  const settings = store.get();

  store.setKey(
    'indicators',
    settings.indicators.map((ind) =>
      ind.id === indicatorId ? { ...ind, isVisible: !ind.isVisible } : ind
    )
  );
}

/**
 * Update an indicator's display name
 *
 * @param chartKey - The chart key for scoped storage
 * @param payload - The indicator ID and new name
 */
export function updateIndicatorName(
  chartKey: string,
  payload: { id: string; name: string }
): void {
  const store = getChartStore(chartKey).settings;
  const settings = store.get();

  store.setKey(
    'indicators',
    settings.indicators.map((ind) =>
      ind.id === payload.id ? { ...ind, name: payload.name } : ind
    )
  );
}

/**
 * Update an indicator's style overrides
 *
 * @param chartKey - The chart key for scoped storage
 * @param payload - The indicator ID and style overrides
 */
export function updateIndicatorStyles(
  chartKey: string,
  payload: { id: string; styleOverrides: IndicatorInstance['styleOverrides'] }
): void {
  const store = getChartStore(chartKey).settings;
  const settings = store.get();

  store.setKey(
    'indicators',
    settings.indicators.map((ind) =>
      ind.id === payload.id ? { ...ind, styleOverrides: payload.styleOverrides } : ind
    )
  );
}

/**
 * Get a specific indicator by ID
 *
 * @param chartKey - The chart key for scoped storage
 * @param indicatorId - The indicator ID to find
 * @returns The indicator instance or undefined
 */
export function getIndicator(chartKey: string, indicatorId: string): IndicatorInstance | undefined {
  const store = getChartStore(chartKey).settings;
  return store.get().indicators.find((ind) => ind.id === indicatorId);
}

/**
 * Get all indicators for a chart
 *
 * @param chartKey - The chart key for scoped storage
 * @returns Array of indicator instances
 */
export function getIndicators(chartKey: string): IndicatorInstance[] {
  return getChartStore(chartKey).settings.get().indicators;
}

/**
 * Subscribe to indicator changes
 *
 * @param chartKey - The chart key for scoped storage
 * @param callback - Function called when indicators change
 * @returns Unsubscribe function
 */
export function subscribeToIndicators(
  chartKey: string,
  callback: (indicators: IndicatorInstance[]) => void
): () => void {
  const store = getChartStore(chartKey).settings;
  let prevIndicators = store.get().indicators;

  return store.subscribe((settings) => {
    if (settings.indicators !== prevIndicators) {
      prevIndicators = settings.indicators;
      callback(settings.indicators);
    }
  });
}

// ============================================================================
// Backwards Compatibility: Atom-like interface
// ============================================================================

/**
 * Interface for bound action functions (backwards compatibility)
 * @deprecated Use the direct action functions instead
 */
export interface IndicatorActions {
  addIndicator: (payload: { builtinId: string; name: string; inputs?: Record<string, unknown> }) => string;
  removeIndicator: (indicatorId: string) => void;
  updateIndicatorInputs: (payload: { id: string; inputs: Record<string, unknown> }) => void;
  toggleIndicatorVisibility: (indicatorId: string) => void;
  updateIndicatorName: (payload: { id: string; name: string }) => void;
  updateIndicatorStyles: (payload: { id: string; styleOverrides: IndicatorInstance['styleOverrides'] }) => void;
  getIndicator: (indicatorId: string) => IndicatorInstance | undefined;
  getIndicators: () => IndicatorInstance[];
  subscribeToIndicators: (callback: (indicators: IndicatorInstance[]) => void) => () => void;
}

/**
 * Create indicator actions bound to a specific chart key
 * @deprecated Use the direct action functions instead
 *
 * @param chartKey - The chart key for scoped storage
 * @returns Object with all action functions bound to the chart key
 */
export function createIndicatorActions(chartKey: string): IndicatorActions {
  return {
    addIndicator: (payload) => addIndicator(chartKey, payload),
    removeIndicator: (id) => removeIndicator(chartKey, id),
    updateIndicatorInputs: (payload) => updateIndicatorInputs(chartKey, payload),
    toggleIndicatorVisibility: (id) => toggleIndicatorVisibility(chartKey, id),
    updateIndicatorName: (payload) => updateIndicatorName(chartKey, payload),
    updateIndicatorStyles: (payload) => updateIndicatorStyles(chartKey, payload),
    getIndicator: (id) => getIndicator(chartKey, id),
    getIndicators: () => getIndicators(chartKey),
    subscribeToIndicators: (cb) => subscribeToIndicators(chartKey, cb),
  };
}

// ============================================================================
// Legacy Atom Factory Exports (for backwards compatibility)
// ============================================================================

/**
 * @deprecated Use addIndicator() function instead
 */
export function createAddIndicatorAtom(chartKey: string) {
  return {
    write: (payload: { builtinId: string; name: string; inputs?: Record<string, unknown> }) =>
      addIndicator(chartKey, payload),
  };
}

/**
 * @deprecated Use removeIndicator() function instead
 */
export function createRemoveIndicatorAtom(chartKey: string) {
  return {
    write: (indicatorId: string) => removeIndicator(chartKey, indicatorId),
  };
}

/**
 * @deprecated Use updateIndicatorInputs() function instead
 */
export function createUpdateIndicatorInputsAtom(chartKey: string) {
  return {
    write: (payload: { id: string; inputs: Record<string, unknown> }) =>
      updateIndicatorInputs(chartKey, payload),
  };
}

/**
 * @deprecated Use toggleIndicatorVisibility() function instead
 */
export function createToggleIndicatorVisibilityAtom(chartKey: string) {
  return {
    write: (indicatorId: string) => toggleIndicatorVisibility(chartKey, indicatorId),
  };
}

/**
 * @deprecated Use updateIndicatorName() function instead
 */
export function createUpdateIndicatorNameAtom(chartKey: string) {
  return {
    write: (payload: { id: string; name: string }) => updateIndicatorName(chartKey, payload),
  };
}

/**
 * @deprecated Use createIndicatorActions() instead
 */
export function createIndicatorActionsAtoms(chartKey: string) {
  return {
    addIndicatorAtom: createAddIndicatorAtom(chartKey),
    removeIndicatorAtom: createRemoveIndicatorAtom(chartKey),
    updateIndicatorInputsAtom: createUpdateIndicatorInputsAtom(chartKey),
    toggleIndicatorVisibilityAtom: createToggleIndicatorVisibilityAtom(chartKey),
    updateIndicatorNameAtom: createUpdateIndicatorNameAtom(chartKey),
  };
}
