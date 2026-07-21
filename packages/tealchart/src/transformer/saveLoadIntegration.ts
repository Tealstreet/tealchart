/**
 * SaveLoad Integration
 *
 * High-level API for saving and loading Custom Chart layouts
 * via the TradingView SaveLoadAdapter infrastructure.
 */

import type { ChartSettings } from '../state/chartState';
import type { TransformResult, TvChartData } from './types';
import { toTvFormat } from './toTvFormat';
import { fromTvFormat } from './fromTvFormat';
import { migrateSettings, CURRENT_VERSION } from './migrations';

// ============================================================================
// Types
// ============================================================================

/**
 * Minimal interface for SaveLoadAdapter
 * Matches the subset of methods we need from the full TradingView adapter
 */
export interface ISaveLoadAdapter {
  saveChart(chartData: TvChartData): Promise<string>;
  getChartContent(chartId: string | number): Promise<string>;
  getAllCharts(): Promise<Array<{ id: string | number; name: string; symbol: string }>>;
  removeChart(id: string | number): Promise<void>;
}

/**
 * Layout metadata for listing saved layouts
 */
export interface LayoutMetadata {
  id: string | number;
  name: string;
  symbol: string;
  isTealchart: boolean;
}

// ============================================================================
// Save Functions
// ============================================================================

/**
 * Save Custom Chart layout via TV adapter
 *
 * @param settings - Custom Chart settings to save
 * @param layoutName - Name for the saved layout
 * @param adapter - SaveLoadAdapter instance
 * @returns Chart ID assigned by the adapter
 */
export async function saveTealchartLayout(
  settings: ChartSettings,
  layoutName: string,
  adapter: ISaveLoadAdapter
): Promise<string> {
  // Transform to TV format
  const tvData = toTvFormat(settings, layoutName);

  // Save via adapter
  const chartId = await adapter.saveChart(tvData);

  return chartId;
}

/**
 * Update an existing layout
 *
 * @param chartId - Existing chart ID to update
 * @param settings - New settings
 * @param layoutName - Name for the layout
 * @param adapter - SaveLoadAdapter instance
 */
export async function updateTealchartLayout(
  chartId: string,
  settings: ChartSettings,
  layoutName: string,
  adapter: ISaveLoadAdapter
): Promise<string> {
  // Transform to TV format with existing ID
  const tvData = toTvFormat(settings, layoutName);
  tvData.id = chartId;

  // Save via adapter (will upsert)
  return await adapter.saveChart(tvData);
}

// ============================================================================
// Load Functions
// ============================================================================

/**
 * Load a layout as Custom Chart settings
 *
 * @param chartId - Chart ID to load
 * @param adapter - SaveLoadAdapter instance
 * @returns Transform result with settings and warnings
 */
export async function loadAsTealchart(
  chartId: string | number,
  adapter: ISaveLoadAdapter
): Promise<TransformResult<ChartSettings>> {
  // Get content from adapter
  const content = await adapter.getChartContent(chartId);

  if (!content) {
    console.warn('[loadAsTealchart] Layout not found or empty');
    return {
      data: getEmptySettings(),
      warnings: ['Layout not found or empty'],
    };
  }

  // Transform from TV format
  const result = fromTvFormat(content);

  // Apply any pending migrations
  result.data = migrateSettings(result.data);

  return result;
}

/**
 * Check if a layout was created by Custom Chart
 *
 * @param chartId - Chart ID to check
 * @param adapter - SaveLoadAdapter instance
 */
export async function isTealchartLayout(
  chartId: string | number,
  adapter: ISaveLoadAdapter
): Promise<boolean> {
  try {
    const content = await adapter.getChartContent(chartId);
    if (!content) return false;

    const parsed = JSON.parse(content);
    return parsed._tealstreetTealchart === true;
  } catch {
    return false;
  }
}

// ============================================================================
// List Functions
// ============================================================================

/**
 * Get all saved layouts with metadata
 *
 * @param adapter - SaveLoadAdapter instance
 * @returns Array of layout metadata
 */
export async function getAllLayouts(
  adapter: ISaveLoadAdapter
): Promise<LayoutMetadata[]> {
  const charts = await adapter.getAllCharts();

  const layouts: LayoutMetadata[] = [];

  for (const chart of charts) {
    // Try to determine if it's a custom chart layout
    // This is a lightweight check - we don't parse the full content
    const isCustom = await isTealchartLayout(chart.id, adapter).catch(() => false);

    layouts.push({
      id: chart.id,
      name: chart.name,
      symbol: chart.symbol,
      isTealchart: isCustom,
    });
  }

  return layouts;
}

// ============================================================================
// Delete Functions
// ============================================================================

/**
 * Delete a saved layout
 *
 * @param chartId - Chart ID to delete
 * @param adapter - SaveLoadAdapter instance
 */
export async function deleteLayout(
  chartId: string | number,
  adapter: ISaveLoadAdapter
): Promise<void> {
  await adapter.removeChart(chartId);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get empty settings for error cases
 */
function getEmptySettings(): ChartSettings {
  return {
    symbol: 'BTCUSDT',
    interval: '60' as any,
    showVolume: true,
    volumeHeight: 0.2,
    chartType: 'candle',
    autoScale: true,
    indicators: [],
    version: CURRENT_VERSION,
  };
}

/**
 * Migrate localStorage custom chart data to Supabase
 * Call this on app initialization to sync old local data
 *
 * @param localStorageKey - Key used for localStorage (e.g., 'tealstreet:tealchart:main')
 * @param adapter - SaveLoadAdapter instance
 * @returns True if migration occurred, false if no data to migrate
 */
export async function migrateFromLocalStorage(
  localStorageKey: string,
  layoutName: string,
  adapter: ISaveLoadAdapter
): Promise<{ migrated: boolean; chartId?: string }> {
  if (typeof window === 'undefined') {
    return { migrated: false };
  }

  try {
    const stored = localStorage.getItem(localStorageKey);
    if (!stored) {
      return { migrated: false };
    }

    const settings = JSON.parse(stored) as ChartSettings;

    // Check if already migrated (we mark it after successful save)
    const migratedKey = `${localStorageKey}:migrated`;
    if (localStorage.getItem(migratedKey) === 'true') {
      return { migrated: false };
    }

    // Migrate settings to current version
    const migratedSettings = migrateSettings(settings);

    // Save to Supabase via adapter
    const chartId = await saveTealchartLayout(migratedSettings, layoutName, adapter);

    // Mark as migrated
    localStorage.setItem(migratedKey, 'true');

    return { migrated: true, chartId };
  } catch (e) {
    console.warn('Failed to migrate localStorage chart settings:', e);
    return { migrated: false };
  }
}
