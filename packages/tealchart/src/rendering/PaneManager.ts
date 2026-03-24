/**
 * PaneManager - Unified pane management for chart regions
 *
 * The main chart and indicator panes are all represented as ChartPane objects.
 * This provides a consistent interface for layout calculation and rendering.
 */

import type {
  ChartPane,
  ComputedPane,
  // Legacy types for backward compatibility
  IndicatorPane,
  PaneLayout,
  UnifiedPaneLayout,
} from '../types';

import { DEFAULT_INDICATOR_PANE_HEIGHT, MIN_PANE_HEIGHT } from '../types';

/**
 * Computed pane position for rendering (legacy - use ComputedPane instead)
 * @deprecated Use ComputedPane from types.ts
 */
export interface PaneOffset {
  /** Pixel offset from top of chart */
  top: number;
  /** Pixel height of this pane */
  height: number;
  /** Y-axis minimum for this pane */
  yMin: number;
  /** Y-axis maximum for this pane */
  yMax: number;
}

/**
 * Options for adding an indicator to a pane
 */
export interface AddIndicatorOptions {
  indicatorId: string;
  overlay: boolean;
  yAxisRange?: { min: number; max: number };
}

/**
 * PaneManager handles layout and Y-axis calculations for all chart panes.
 * Uses the unified ChartPane system where main chart is "just another pane".
 */
export class PaneManager {
  /** All panes in render order (main first, then indicators) */
  private panes: ChartPane[] = [];
  private paneIdCounter = 0;

  /** Pixels reserved for time axis */
  private timeAxisHeight = 30;

  /** Which pane is maximized (null = normal mode) */
  private _maximizedPaneId: string | null = null;
  /** Saved height ratios before maximize (for restore) */
  private _savedHeightRatios: Map<string, number> | null = null;

  constructor() {
    // Initialize with just the main pane
    this.panes = [this.createMainPane()];
  }

  /**
   * Create the main pane (always present)
   */
  private createMainPane(): ChartPane {
    return {
      id: 'main',
      type: 'main',
      heightRatio: 1.0, // Takes all space when alone
      yMin: 0,
      yMax: 0, // Set from viewport at render time
      fixedRange: false,
    };
  }

  /**
   * Add an indicator to the pane system
   * - Overlay indicators: render on main pane (no-op)
   * - Non-overlay indicators: create new pane or add to existing
   */
  addIndicator(options: AddIndicatorOptions): void {
    const { indicatorId, overlay, yAxisRange } = options;

    if (overlay) {
      // Overlay indicators render on main pane, nothing to do
      return;
    }

    // If maximized, restore first so the new pane gets proper layout
    if (this._maximizedPaneId !== null) {
      this._restoreFromMaximize();
    }

    // Check if we can add to an existing indicator pane with same yAxisRange
    const existingPane = this.findCompatiblePane(yAxisRange);

    if (existingPane) {
      existingPane.indicatorIds = existingPane.indicatorIds || [];
      existingPane.indicatorIds.push(indicatorId);
      return;
    }

    // Create new indicator pane
    const newPane: ChartPane = {
      id: `pane_${++this.paneIdCounter}`,
      type: 'indicator',
      heightRatio: DEFAULT_INDICATOR_PANE_HEIGHT,
      yMin: yAxisRange?.min ?? 0,
      yMax: yAxisRange?.max ?? 100,
      fixedRange: yAxisRange !== undefined,
      indicatorIds: [indicatorId],
    };

    this.panes.push(newPane);
    this.rebalanceHeights();
  }

  /**
   * Remove an indicator from the pane system
   */
  removeIndicator(indicatorId: string): void {
    for (let i = this.panes.length - 1; i >= 0; i--) {
      const pane = this.panes[i];

      // Skip main pane
      if (pane.type === 'main') continue;

      const indicatorIds = pane.indicatorIds || [];
      const idx = indicatorIds.indexOf(indicatorId);

      if (idx !== -1) {
        indicatorIds.splice(idx, 1);

        // Remove empty indicator panes
        if (indicatorIds.length === 0) {
          // If the maximized pane is being removed, restore first
          if (this._maximizedPaneId === pane.id) {
            this._restoreFromMaximize();
          }
          // Also clean up saved ratios for this pane
          this._savedHeightRatios?.delete(pane.id);

          this.panes.splice(i, 1);
          this.rebalanceHeights();
        }
        return;
      }
    }
  }

  /**
   * Get the pane for an indicator (or null if overlay/on main pane)
   */
  getPaneForIndicator(indicatorId: string): ChartPane | null {
    for (const pane of this.panes) {
      if (pane.type === 'indicator' && pane.indicatorIds?.includes(indicatorId)) {
        return pane;
      }
    }
    return null;
  }

  /**
   * Check if an indicator is an overlay (renders on main pane)
   */
  isOverlay(indicatorId: string): boolean {
    return this.getPaneForIndicator(indicatorId) === null;
  }

  /**
   * Get the main pane
   */
  getMainPane(): ChartPane {
    return this.panes.find((p) => p.type === 'main')!;
  }

  /**
   * Get all panes in render order
   */
  getPanes(): ChartPane[] {
    return this.panes;
  }

  /**
   * Get indicator panes only (excludes main)
   */
  getIndicatorPanes(): ChartPane[] {
    return this.panes.filter((p) => p.type === 'indicator');
  }

  /**
   * Get the unified pane layout
   */
  getUnifiedLayout(): UnifiedPaneLayout {
    return {
      panes: this.panes,
      timeAxisHeight: this.timeAxisHeight,
    };
  }

  /**
   * Compute pixel positions for all panes
   *
   * @param totalHeight - Total canvas height including time axis
   * @returns Array of ComputedPane with pixel positions
   */
  computeLayout(totalHeight: number): ComputedPane[] {
    // Available height for panes (excluding time axis)
    const availableHeight = totalHeight - this.timeAxisHeight;
    let currentTop = 0;

    return this.panes.map((pane) => {
      const height = availableHeight * pane.heightRatio;
      const computed: ComputedPane = {
        ...pane,
        top: currentTop,
        height,
        bottom: currentTop + height,
      };
      currentTop += height;
      return computed;
    });
  }

  /**
   * Update Y-axis range for a pane (for auto-scaling)
   */
  updatePaneRange(paneId: string, yMin: number, yMax: number): void {
    const pane = this.panes.find((p) => p.id === paneId);
    if (pane && !pane.fixedRange) {
      pane.yMin = yMin;
      pane.yMax = yMax;
    }
  }

  /**
   * Convert a value to Y pixel position within a computed pane
   */
  valueToY(value: number, pane: ComputedPane): number {
    const range = pane.yMax - pane.yMin;
    if (range === 0) return pane.top + pane.height / 2;

    const ratio = (pane.yMax - value) / range;
    return pane.top + ratio * pane.height;
  }

  /**
   * Convert Y pixel position to value within a computed pane
   */
  yToValue(y: number, pane: ComputedPane): number {
    const ratio = (y - pane.top) / pane.height;
    return pane.yMax - ratio * (pane.yMax - pane.yMin);
  }

  /**
   * Find which pane contains a given Y coordinate
   */
  getPaneAtY(y: number, computedPanes: ComputedPane[]): ComputedPane | null {
    for (const pane of computedPanes) {
      if (y >= pane.top && y < pane.bottom) {
        return pane;
      }
    }
    return null;
  }

  /**
   * Find a pane compatible with the given yAxisRange
   * (same fixed range indicators can share a pane)
   */
  private findCompatiblePane(yAxisRange?: { min: number; max: number }): ChartPane | null {
    if (!yAxisRange) {
      // Non-fixed range indicators get their own pane
      return null;
    }

    // Look for existing indicator pane with exact same range
    for (const pane of this.panes) {
      if (
        pane.type === 'indicator' &&
        pane.fixedRange &&
        pane.yMin === yAxisRange.min &&
        pane.yMax === yAxisRange.max
      ) {
        return pane;
      }
    }

    return null;
  }

  /**
   * Rebalance pane heights when panes are added/removed
   */
  private rebalanceHeights(): void {
    const indicatorPanes = this.getIndicatorPanes();
    const numIndicatorPanes = indicatorPanes.length;
    const mainPane = this.getMainPane();

    if (numIndicatorPanes === 0) {
      // No indicator panes - main takes all space
      mainPane.heightRatio = 1.0;
      return;
    }

    // Calculate total indicator pane height
    const indicatorPanesHeight = numIndicatorPanes * DEFAULT_INDICATOR_PANE_HEIGHT;

    // Shrink main pane to accommodate indicator panes
    const availableForMain = 1 - indicatorPanesHeight;

    // Ensure minimum main pane height
    const minMainHeight = 0.4;
    mainPane.heightRatio = Math.max(minMainHeight, availableForMain);

    // If we don't have enough space, shrink indicator panes proportionally
    const remainingForIndicators = 1 - mainPane.heightRatio;

    if (numIndicatorPanes > 0) {
      const heightPerPane = Math.max(MIN_PANE_HEIGHT, remainingForIndicators / numIndicatorPanes);
      for (const pane of indicatorPanes) {
        pane.heightRatio = heightPerPane;
      }
    }
  }

  /**
   * Reset the pane manager (clear all indicator panes)
   */
  reset(): void {
    this.panes = [this.createMainPane()];
    this.paneIdCounter = 0;
    this._maximizedPaneId = null;
    this._savedHeightRatios = null;
  }

  // ===========================================================================
  // Maximize / Restore
  // ===========================================================================

  /**
   * Toggle maximize for a pane. If already maximized to this pane, restore.
   * If maximized to a different pane, switch to this one.
   * No-op when only one pane exists.
   */
  toggleMaximizePane(paneId: string): void {
    // No-op with only main pane
    if (this.panes.length <= 1) return;

    // Verify pane exists
    const targetPane = this.panes.find((p) => p.id === paneId);
    if (!targetPane) return;

    if (this._maximizedPaneId === paneId) {
      // Restore from maximize
      this._restoreFromMaximize();
    } else {
      // Save current ratios (only if not already maximized)
      if (this._maximizedPaneId === null) {
        this._savedHeightRatios = new Map();
        for (const pane of this.panes) {
          this._savedHeightRatios.set(pane.id, pane.heightRatio);
        }
      }

      // Maximize: target gets 1.0, others get 0
      for (const pane of this.panes) {
        pane.heightRatio = pane.id === paneId ? 1.0 : 0;
      }
      this._maximizedPaneId = paneId;
    }
  }

  /**
   * Whether any pane is currently maximized
   */
  isMaximized(): boolean {
    return this._maximizedPaneId !== null;
  }

  /**
   * Get the ID of the currently maximized pane (null if none)
   */
  getMaximizedPaneId(): string | null {
    return this._maximizedPaneId;
  }

  /**
   * Restore pane heights from saved ratios
   */
  private _restoreFromMaximize(): void {
    if (!this._savedHeightRatios) return;

    for (const pane of this.panes) {
      const saved = this._savedHeightRatios.get(pane.id);
      if (saved !== undefined) {
        pane.heightRatio = saved;
      }
    }

    // Clean up panes whose saved ratio no longer exists (added while maximized)
    // They'll get rebalanced on next addIndicator

    this._maximizedPaneId = null;
    this._savedHeightRatios = null;
  }

  // ===========================================================================
  // Legacy API for backward compatibility
  // ===========================================================================

  /**
   * Get the legacy PaneLayout format
   * @deprecated Use getUnifiedLayout() instead
   */
  getLayout(): PaneLayout {
    const mainPane = this.getMainPane();
    const indicatorPanes = this.getIndicatorPanes();

    return {
      mainPaneHeight: mainPane.heightRatio,
      volumePaneHeight: 0, // Volume is now an overlay on main pane
      indicatorPanes: indicatorPanes.map((p) => ({
        id: p.id,
        indicatorIds: p.indicatorIds || [],
        heightRatio: p.heightRatio,
        yMin: p.yMin,
        yMax: p.yMax,
        fixedRange: p.fixedRange,
      })),
    };
  }

  /**
   * Calculate pixel offsets in legacy format
   * @deprecated Use computeLayout() instead
   */
  calculatePaneOffsets(totalHeight: number): Map<string, PaneOffset> {
    const computed = this.computeLayout(totalHeight);
    const offsets = new Map<string, PaneOffset>();

    for (const pane of computed) {
      offsets.set(pane.id, {
        top: pane.top,
        height: pane.height,
        yMin: pane.yMin,
        yMax: pane.yMax,
      });
    }

    return offsets;
  }
}
