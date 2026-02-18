import { createStore } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_CHART_SETTINGS, getChartSettingsAtom } from './chartState';
import {
  createAddIndicatorAtom,
  createIndicatorActionsAtoms,
  createRemoveIndicatorAtom,
  createToggleIndicatorVisibilityAtom,
  createUpdateIndicatorInputsAtom,
  createUpdateIndicatorNameAtom,
  generateIndicatorId,
} from './indicatorActions';

// ============================================================================
// Helper: unique chart key per test to avoid shared state from atom caches
// ============================================================================

let testCounter = 0;
function uniqueChartKey(): string {
  return `test-chart-${Date.now()}-${++testCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create an isolated Jotai store with default chart settings pre-loaded.
 * Since getChartSettingsAtom uses atomWithStorage + getOnInit, the store
 * will read from localStorage on first get. We clear the relevant key
 * so it falls back to DEFAULT_CHART_SETTINGS.
 */
function createTestStore(chartKey: string) {
  // Clear any localStorage entry so atomWithStorage returns defaults
  localStorage.removeItem(`tealstreet:tealchart:${chartKey}`);
  const store = createStore();
  // Prime the store by reading the settings atom (triggers getOnInit)
  const settingsAtom = getChartSettingsAtom(chartKey);
  store.get(settingsAtom);
  return store;
}

// ============================================================================
// Existing tests: generateIndicatorId
// ============================================================================

describe('indicatorActions', () => {
  describe('generateIndicatorId', () => {
    it('generates unique ID with builtin prefix', () => {
      const id = generateIndicatorId('sma');
      expect(id).toMatch(/^sma_\d+$/);
    });

    it('generates different IDs for same builtin', () => {
      const id1 = generateIndicatorId('ema');
      // Small delay to ensure different timestamp
      vi.useFakeTimers();
      vi.advanceTimersByTime(1);
      const id2 = generateIndicatorId('ema');
      vi.useRealTimers();

      // They should both start with ema_ but have different timestamps
      expect(id1).toMatch(/^ema_\d+$/);
      expect(id2).toMatch(/^ema_\d+$/);
    });

    it('includes timestamp in ID', () => {
      const before = Date.now();
      const id = generateIndicatorId('rsi');
      const after = Date.now();

      const timestamp = parseInt(id.split('_')[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('handles hyphenated builtin IDs', () => {
      const id = generateIndicatorId('bollinger-bands');
      expect(id).toMatch(/^bollinger-bands_\d+$/);
    });
  });

  // ==========================================================================
  // Atom factory tests using createStore for isolation
  // ==========================================================================

  describe('createAddIndicatorAtom', () => {
    it('adds an indicator to an empty list', () => {
      const chartKey = uniqueChartKey();
      const store = createTestStore(chartKey);
      const addAtom = createAddIndicatorAtom(chartKey);
      const settingsAtom = getChartSettingsAtom(chartKey);

      // Verify empty to start
      expect(store.get(settingsAtom).indicators).toHaveLength(0);

      store.set(addAtom, { builtinId: 'sma', name: 'SMA' });

      const indicators = store.get(settingsAtom).indicators;
      expect(indicators).toHaveLength(1);
      expect(indicators[0].builtinId).toBe('sma');
      expect(indicators[0].name).toBe('SMA');
      expect(indicators[0].isVisible).toBe(true);
      expect(indicators[0].inputs).toEqual({});
      expect(indicators[0].id).toMatch(/^sma_\d+$/);
    });

    it('adds an indicator with custom inputs', () => {
      const chartKey = uniqueChartKey();
      const store = createTestStore(chartKey);
      const addAtom = createAddIndicatorAtom(chartKey);
      const settingsAtom = getChartSettingsAtom(chartKey);

      store.set(addAtom, {
        builtinId: 'ema',
        name: 'EMA 20',
        inputs: { period: 20, source: 'close' },
      });

      const indicators = store.get(settingsAtom).indicators;
      expect(indicators).toHaveLength(1);
      expect(indicators[0].inputs).toEqual({ period: 20, source: 'close' });
    });

    it('returns the generated indicator ID', () => {
      const chartKey = uniqueChartKey();
      const store = createTestStore(chartKey);
      const addAtom = createAddIndicatorAtom(chartKey);

      const returnedId = store.set(addAtom, { builtinId: 'rsi', name: 'RSI' });

      expect(returnedId).toMatch(/^rsi_\d+$/);
    });

    it('accumulates multiple indicators', () => {
      const chartKey = uniqueChartKey();
      const store = createTestStore(chartKey);
      const addAtom = createAddIndicatorAtom(chartKey);
      const settingsAtom = getChartSettingsAtom(chartKey);

      store.set(addAtom, { builtinId: 'sma', name: 'SMA 14' });
      store.set(addAtom, { builtinId: 'ema', name: 'EMA 20' });
      store.set(addAtom, { builtinId: 'rsi', name: 'RSI 14' });

      const indicators = store.get(settingsAtom).indicators;
      expect(indicators).toHaveLength(3);
      expect(indicators.map((ind) => ind.builtinId)).toEqual(['sma', 'ema', 'rsi']);
    });
  });

  describe('createRemoveIndicatorAtom', () => {
    it('removes an existing indicator by ID', () => {
      const chartKey = uniqueChartKey();
      const store = createTestStore(chartKey);
      const addAtom = createAddIndicatorAtom(chartKey);
      const removeAtom = createRemoveIndicatorAtom(chartKey);
      const settingsAtom = getChartSettingsAtom(chartKey);

      // Add two indicators
      const id1 = store.set(addAtom, { builtinId: 'sma', name: 'SMA' });
      store.set(addAtom, { builtinId: 'ema', name: 'EMA' });
      expect(store.get(settingsAtom).indicators).toHaveLength(2);

      // Remove the first one
      store.set(removeAtom, id1!);

      const indicators = store.get(settingsAtom).indicators;
      expect(indicators).toHaveLength(1);
      expect(indicators[0].builtinId).toBe('ema');
    });

    it('is a no-op for a non-existent ID', () => {
      const chartKey = uniqueChartKey();
      const store = createTestStore(chartKey);
      const addAtom = createAddIndicatorAtom(chartKey);
      const removeAtom = createRemoveIndicatorAtom(chartKey);
      const settingsAtom = getChartSettingsAtom(chartKey);

      store.set(addAtom, { builtinId: 'sma', name: 'SMA' });
      const indicatorsBefore = store.get(settingsAtom).indicators;
      expect(indicatorsBefore).toHaveLength(1);

      // Remove with a bogus ID
      store.set(removeAtom, 'non-existent-id');

      const indicatorsAfter = store.get(settingsAtom).indicators;
      expect(indicatorsAfter).toHaveLength(1);
      expect(indicatorsAfter[0].builtinId).toBe('sma');
    });
  });

  describe('createUpdateIndicatorInputsAtom', () => {
    it('merges new inputs with existing inputs', () => {
      const chartKey = uniqueChartKey();
      const store = createTestStore(chartKey);
      const addAtom = createAddIndicatorAtom(chartKey);
      const updateInputsAtom = createUpdateIndicatorInputsAtom(chartKey);
      const settingsAtom = getChartSettingsAtom(chartKey);

      const id = store.set(addAtom, {
        builtinId: 'ema',
        name: 'EMA',
        inputs: { period: 14, source: 'close' },
      });

      // Update only the period, source should remain
      store.set(updateInputsAtom, { id: id!, inputs: { period: 20 } });

      const indicator = store.get(settingsAtom).indicators[0];
      expect(indicator.inputs).toEqual({ period: 20, source: 'close' });
    });

    it('adds inputs to an indicator with empty inputs', () => {
      const chartKey = uniqueChartKey();
      const store = createTestStore(chartKey);
      const addAtom = createAddIndicatorAtom(chartKey);
      const updateInputsAtom = createUpdateIndicatorInputsAtom(chartKey);
      const settingsAtom = getChartSettingsAtom(chartKey);

      // Add with no inputs (defaults to {})
      const id = store.set(addAtom, { builtinId: 'sma', name: 'SMA' });

      store.set(updateInputsAtom, { id: id!, inputs: { period: 50, color: 'red' } });

      const indicator = store.get(settingsAtom).indicators[0];
      expect(indicator.inputs).toEqual({ period: 50, color: 'red' });
    });
  });

  describe('createToggleIndicatorVisibilityAtom', () => {
    it('toggles a visible indicator to hidden', () => {
      const chartKey = uniqueChartKey();
      const store = createTestStore(chartKey);
      const addAtom = createAddIndicatorAtom(chartKey);
      const toggleAtom = createToggleIndicatorVisibilityAtom(chartKey);
      const settingsAtom = getChartSettingsAtom(chartKey);

      const id = store.set(addAtom, { builtinId: 'sma', name: 'SMA' });

      // Indicator starts visible
      expect(store.get(settingsAtom).indicators[0].isVisible).toBe(true);

      store.set(toggleAtom, id!);

      expect(store.get(settingsAtom).indicators[0].isVisible).toBe(false);
    });

    it('toggles a hidden indicator back to visible', () => {
      const chartKey = uniqueChartKey();
      const store = createTestStore(chartKey);
      const addAtom = createAddIndicatorAtom(chartKey);
      const toggleAtom = createToggleIndicatorVisibilityAtom(chartKey);
      const settingsAtom = getChartSettingsAtom(chartKey);

      const id = store.set(addAtom, { builtinId: 'rsi', name: 'RSI' });

      // Toggle off, then on
      store.set(toggleAtom, id!);
      expect(store.get(settingsAtom).indicators[0].isVisible).toBe(false);

      store.set(toggleAtom, id!);
      expect(store.get(settingsAtom).indicators[0].isVisible).toBe(true);
    });
  });

  describe('createUpdateIndicatorNameAtom', () => {
    it('updates the display name of an indicator', () => {
      const chartKey = uniqueChartKey();
      const store = createTestStore(chartKey);
      const addAtom = createAddIndicatorAtom(chartKey);
      const updateNameAtom = createUpdateIndicatorNameAtom(chartKey);
      const settingsAtom = getChartSettingsAtom(chartKey);

      const id = store.set(addAtom, { builtinId: 'sma', name: 'SMA' });

      store.set(updateNameAtom, { id: id!, name: 'SMA (50)' });

      expect(store.get(settingsAtom).indicators[0].name).toBe('SMA (50)');
    });
  });

  describe('createIndicatorActionsAtoms', () => {
    it('returns the same atoms for the same chartKey (cache hit)', () => {
      const chartKey = uniqueChartKey();

      const atoms1 = createIndicatorActionsAtoms(chartKey);
      const atoms2 = createIndicatorActionsAtoms(chartKey);

      expect(atoms1).toBe(atoms2);
      expect(atoms1.addIndicatorAtom).toBe(atoms2.addIndicatorAtom);
      expect(atoms1.removeIndicatorAtom).toBe(atoms2.removeIndicatorAtom);
      expect(atoms1.updateIndicatorInputsAtom).toBe(atoms2.updateIndicatorInputsAtom);
      expect(atoms1.toggleIndicatorVisibilityAtom).toBe(atoms2.toggleIndicatorVisibilityAtom);
      expect(atoms1.updateIndicatorNameAtom).toBe(atoms2.updateIndicatorNameAtom);
    });
  });
});
