/**
 * Safe Deep Merge Utility
 *
 * Provides safe deep merging of user state with defaults.
 * Handles corrupted/incomplete localStorage data gracefully.
 */


// ============================================================================
// Types
// ============================================================================

/**
 * Corrupted string values that should be treated as missing
 */
const CORRUPTED_STRINGS = ['undefined', 'null', 'NaN', ''];

// ============================================================================
// Core Safe Merge
// ============================================================================

/**
 * Check if a value is a plain object (not array, null, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a value is corrupted and should be replaced with default
 */
function isCorrupted(value: unknown): boolean {
  // Corrupted string values
  if (typeof value === 'string' && CORRUPTED_STRINGS.includes(value)) {
    return true;
  }

  // Non-finite numbers (NaN, Infinity, -Infinity)
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return true;
  }

  return false;
}

/**
 * Safely deep merge user state with defaults.
 *
 * Rules:
 * - Missing properties at any nesting level are filled from defaults
 * - Corrupted string values ('undefined', 'null', 'NaN', '') are replaced
 * - Non-finite numbers (NaN, Infinity) are replaced
 * - Arrays: user array replaces default entirely (no item merging)
 * - Objects: recursively merged
 *
 * @param userState - Potentially incomplete/corrupted user state from localStorage
 * @param defaults - Complete default state with all required properties
 * @returns Merged state with all properties guaranteed present
 */
export function safeDeepMerge<T extends object>(
  userState: Partial<T> | null | undefined,
  defaults: T
): T {
  // If user state is null/undefined/corrupted, return cloned defaults
  if (userState == null || isCorrupted(userState)) {
    return structuredClone(defaults);
  }

  // Start with cloned defaults
  const result = structuredClone(defaults) as Record<string, unknown>;

  // Merge user values
  for (const key of Object.keys(defaults)) {
    const userValue = (userState as Record<string, unknown>)[key];
    const defaultValue = (defaults as Record<string, unknown>)[key];

    // Skip if user value is missing or corrupted
    if (userValue === undefined || isCorrupted(userValue)) {
      continue; // Keep default
    }

    // Handle nested objects (recursively merge)
    if (isPlainObject(defaultValue) && isPlainObject(userValue)) {
      result[key] = safeDeepMerge(
        userValue as Record<string, unknown>,
        defaultValue as Record<string, unknown>
      );
      continue;
    }

    // Arrays: use user's array as-is (no item merging)
    if (Array.isArray(userValue)) {
      result[key] = structuredClone(userValue);
      continue;
    }

    // Primitive values: use user value
    result[key] = userValue;
  }

  return result as T;
}

// ============================================================================
// Chart Settings Migration
// ============================================================================

/**
 * Current schema version
 */
export const CHART_SETTINGS_VERSION = 1;

/**
 * Migrate chart settings from older versions to current.
 * Applies safe merge with defaults after migration.
 *
 * @param stored - Settings from localStorage (may be old version or corrupted)
 * @param defaults - Current default settings
 * @returns Fully migrated and merged settings
 */
export function migrateChartSettings<T extends object>(
  stored: Partial<T> | null | undefined,
  defaults: T
): T {
  if (stored == null) {
    return structuredClone(defaults);
  }

  // Clone to avoid mutation
  const settings = structuredClone(stored) as Record<string, unknown>;

  // Get stored version (default to 0 for legacy data without version)
  const storedVersion = typeof settings.version === 'number' ? settings.version : 0;

  // Apply migrations in order
  if (storedVersion < 1) {
    // v0 -> v1: Add indicators array if missing
    if (!Array.isArray(settings.indicators)) {
      settings.indicators = [];
    }
    // Add version field
    settings.version = 1;
  }

  // Future migrations go here:
  // if (storedVersion < 2) { ... }

  // Apply safe merge to fill any missing fields
  return safeDeepMerge(settings as Partial<T>, defaults);
}
