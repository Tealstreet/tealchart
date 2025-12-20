/**
 * Indicator CRUD Action Atoms
 *
 * Provides atom factories for adding, removing, updating, and toggling indicators.
 * Uses write-only atoms that update the indicators array in chart settings.
 */

import { atom } from 'jotai';
import { getChartSettingsAtom, type IndicatorInstance } from './chartState';

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
// Add Indicator Atom
// ============================================================================

/**
 * Create a write-only atom that adds an indicator instance
 *
 * @param chartKey - The chart key for scoped storage
 * @returns Atom that accepts { builtinId, name, inputs? } and adds to indicators
 */
export function createAddIndicatorAtom(chartKey: string) {
  const settingsAtom = getChartSettingsAtom(chartKey);

  return atom(
    null, // Read: not used
    (get, set, payload: { builtinId: string; name: string; inputs?: Record<string, unknown> }) => {
      const settings = get(settingsAtom);
      const newIndicator: IndicatorInstance = {
        id: generateIndicatorId(payload.builtinId),
        name: payload.name,
        builtinId: payload.builtinId,
        inputs: payload.inputs ?? {},
        isVisible: true,
        createdAt: Date.now(),
      };

      set(settingsAtom, {
        ...settings,
        indicators: [...settings.indicators, newIndicator],
      });

      return newIndicator.id;
    }
  );
}

// ============================================================================
// Remove Indicator Atom
// ============================================================================

/**
 * Create a write-only atom that removes an indicator by ID
 *
 * @param chartKey - The chart key for scoped storage
 * @returns Atom that accepts indicator ID and removes it
 */
export function createRemoveIndicatorAtom(chartKey: string) {
  const settingsAtom = getChartSettingsAtom(chartKey);

  return atom(null, (get, set, indicatorId: string) => {
    const settings = get(settingsAtom);
    set(settingsAtom, {
      ...settings,
      indicators: settings.indicators.filter((ind) => ind.id !== indicatorId),
    });
  });
}

// ============================================================================
// Update Indicator Inputs Atom
// ============================================================================

/**
 * Create a write-only atom that updates an indicator's inputs
 *
 * @param chartKey - The chart key for scoped storage
 * @returns Atom that accepts { id, inputs } and merges inputs
 */
export function createUpdateIndicatorInputsAtom(chartKey: string) {
  const settingsAtom = getChartSettingsAtom(chartKey);

  return atom(
    null,
    (get, set, payload: { id: string; inputs: Record<string, unknown> }) => {
      const settings = get(settingsAtom);
      set(settingsAtom, {
        ...settings,
        indicators: settings.indicators.map((ind) =>
          ind.id === payload.id
            ? { ...ind, inputs: { ...ind.inputs, ...payload.inputs } }
            : ind
        ),
      });
    }
  );
}

// ============================================================================
// Toggle Indicator Visibility Atom
// ============================================================================

/**
 * Create a write-only atom that toggles an indicator's visibility
 *
 * @param chartKey - The chart key for scoped storage
 * @returns Atom that accepts indicator ID and flips isVisible
 */
export function createToggleIndicatorVisibilityAtom(chartKey: string) {
  const settingsAtom = getChartSettingsAtom(chartKey);

  return atom(null, (get, set, indicatorId: string) => {
    const settings = get(settingsAtom);
    set(settingsAtom, {
      ...settings,
      indicators: settings.indicators.map((ind) =>
        ind.id === indicatorId ? { ...ind, isVisible: !ind.isVisible } : ind
      ),
    });
  });
}

// ============================================================================
// Update Indicator Name Atom
// ============================================================================

/**
 * Create a write-only atom that updates an indicator's display name
 *
 * @param chartKey - The chart key for scoped storage
 * @returns Atom that accepts { id, name } and updates the name
 */
export function createUpdateIndicatorNameAtom(chartKey: string) {
  const settingsAtom = getChartSettingsAtom(chartKey);

  return atom(null, (get, set, payload: { id: string; name: string }) => {
    const settings = get(settingsAtom);
    set(settingsAtom, {
      ...settings,
      indicators: settings.indicators.map((ind) =>
        ind.id === payload.id ? { ...ind, name: payload.name } : ind
      ),
    });
  });
}

// ============================================================================
// Factory: Create All Indicator Action Atoms
// ============================================================================

/**
 * Type for the action atoms collection
 */
interface IndicatorActionAtoms {
  addIndicatorAtom: ReturnType<typeof createAddIndicatorAtom>;
  removeIndicatorAtom: ReturnType<typeof createRemoveIndicatorAtom>;
  updateIndicatorInputsAtom: ReturnType<typeof createUpdateIndicatorInputsAtom>;
  toggleIndicatorVisibilityAtom: ReturnType<typeof createToggleIndicatorVisibilityAtom>;
  updateIndicatorNameAtom: ReturnType<typeof createUpdateIndicatorNameAtom>;
}

/**
 * Cache for action atoms by chart key
 */
const actionAtomsCache = new Map<string, IndicatorActionAtoms>();

/**
 * Create all indicator action atoms for a chart
 *
 * @param chartKey - The chart key for scoped storage
 * @returns Object with all action atoms
 */
export function createIndicatorActionsAtoms(chartKey: string): IndicatorActionAtoms {
  let cached = actionAtomsCache.get(chartKey);

  if (!cached) {
    cached = {
      addIndicatorAtom: createAddIndicatorAtom(chartKey),
      removeIndicatorAtom: createRemoveIndicatorAtom(chartKey),
      updateIndicatorInputsAtom: createUpdateIndicatorInputsAtom(chartKey),
      toggleIndicatorVisibilityAtom: createToggleIndicatorVisibilityAtom(chartKey),
      updateIndicatorNameAtom: createUpdateIndicatorNameAtom(chartKey),
    };
    actionAtomsCache.set(chartKey, cached);
  }

  return cached;
}
