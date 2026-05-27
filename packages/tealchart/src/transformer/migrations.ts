/**
 * Chart Settings Migrations
 *
 * Handles version migrations for Custom Chart settings.
 * Ensures older saved layouts can be loaded and upgraded
 * to the current schema version.
 */

import type { ChartSettings } from '../state/chartState';
import { CHART_SETTINGS_VERSION } from '../state/safeDeepMerge';
import type { Migration } from './types';

// ============================================================================
// Current Version
// ============================================================================

/**
 * Current schema version for chart settings
 * Re-export from safeDeepMerge for convenience
 */
export const CURRENT_VERSION = CHART_SETTINGS_VERSION;

// ============================================================================
// Migration Registry
// ============================================================================

/**
 * All migrations in order
 * Each migration should handle upgrading from the previous version
 */
const MIGRATIONS: Migration[] = [
  // Migration from v0 (no version) to v1
  {
    version: 1,
    description: 'Initial schema with indicators array',
    migrate: (data) => {
      // Ensure indicators array exists
      if (!Array.isArray(data.indicators)) {
        data.indicators = [];
      }
      // Ensure version is set
      data.version = 1;
      return data;
    },
  },

  // Future migrations go here:
  // {
  //   version: 2,
  //   description: 'Add new feature X',
  //   migrate: (data) => {
  //     // Add new field with default value
  //     if (data.newField === undefined) {
  //       data.newField = 'default';
  //     }
  //     data.version = 2;
  //     return data;
  //   },
  // },
];

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Migrate settings from any version to current version
 *
 * @param data - Settings data (may be partial or old version)
 * @returns Migrated settings at current version
 */
export function migrateSettings(data: Partial<ChartSettings>): ChartSettings {
  // Clone to avoid mutation
  let current = { ...data } as ChartSettings;

  // Get stored version (default to 0 for legacy data without version)
  const fromVersion = typeof current.version === 'number' ? current.version : 0;

  // Apply migrations in order
  for (const migration of MIGRATIONS) {
    if (migration.version > fromVersion && migration.version <= CURRENT_VERSION) {
      current = migration.migrate(current);
    }
  }

  // Ensure version is current
  current.version = CURRENT_VERSION;

  return current;
}

/**
 * Check if settings need migration
 */
export function needsMigration(data: Partial<ChartSettings>): boolean {
  const version = typeof data.version === 'number' ? data.version : 0;
  return version < CURRENT_VERSION;
}

/**
 * Get the version of settings data
 */
export function getSettingsVersion(data: Partial<ChartSettings>): number {
  return typeof data.version === 'number' ? data.version : 0;
}

// ============================================================================
// Migration Utilities
// ============================================================================

/**
 * Validate that all required fields are present after migration
 * Fills in defaults for any missing required fields
 */
export function validateAndFillDefaults(data: Partial<ChartSettings>): ChartSettings {
  const defaults: ChartSettings = {
    symbol: 'BTCUSDT',
    interval: '60' as any,
    showVolume: true,
    volumeHeight: 0.2,
    chartType: 'candle',
    autoScale: true,
    indicators: [],
    version: CURRENT_VERSION,
  };

  return {
    ...defaults,
    ...data,
    // Ensure indicators is always an array
    indicators: Array.isArray(data.indicators) ? data.indicators : [],
    version: CURRENT_VERSION,
  };
}
