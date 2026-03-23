/**
 * ViewportController — shared viewport orchestration for web and mobile.
 *
 * Owns ViewScaleState and AutoScaleManager, providing a single interface
 * for viewport preservation across symbol/interval changes, auto-scaling,
 * and indicator pane Y-range computation.
 *
 * No DOM, React, or Skia dependencies — pure TypeScript class.
 */

import type { PlotOutput } from '@tealstreet/tealscript';
import type { Bar, Viewport, ViewScaleState } from '../types';

import { TealchartRenderer } from '../TealchartRenderer';
import { AutoScaleManager } from './AutoScaleManager';
import { captureViewScale, restoreViewport } from './viewScale';

export class ViewportController {
  private _viewScale: ViewScaleState | null = null;
  private _autoScaleManager = new AutoScaleManager();

  // ---------------------------------------------------------------------------
  // Core viewport operations
  // ---------------------------------------------------------------------------

  /**
   * Called on every viewport change (pan, zoom, etc.).
   *
   * Applies auto-scale if enabled, captures the viewScale state, and returns
   * the (possibly auto-scaled) viewport.
   */
  handleViewportChange(viewport: Viewport, bars: Bar[], intervalMs: number): Viewport {
    const fitted = this._autoScaleManager.applyToViewport(viewport, bars);
    this._viewScale = captureViewScale(fitted, bars, intervalMs);
    return fitted;
  }

  /**
   * Called when new bars arrive (symbol/interval/reset change).
   *
   * If a viewScale exists, restores the viewport from it; otherwise calculates
   * a default viewport (first load). Then applies auto-scale and captures state.
   */
  handleBarsLoaded(bars: Bar[], intervalMs: number): Viewport {
    let vp: Viewport;
    if (this._viewScale) {
      vp = restoreViewport(this._viewScale, bars, intervalMs);
    } else {
      vp = TealchartRenderer.calculateViewport(bars);
    }

    vp = this._autoScaleManager.applyToViewport(vp, bars);
    this._viewScale = captureViewScale(vp, bars, intervalMs);
    return vp;
  }

  /**
   * Called when the user clicks the reset button.
   *
   * Re-enables auto-scale for all panes, recalculates the default viewport,
   * applies auto-scale, and captures state.
   */
  handleReset(bars: Bar[], intervalMs: number): Viewport {
    this._autoScaleManager.resetAll();
    let vp = TealchartRenderer.calculateViewport(bars);
    vp = this._autoScaleManager.applyToViewport(vp, bars);
    this._viewScale = captureViewScale(vp, bars, intervalMs);
    return vp;
  }

  // ---------------------------------------------------------------------------
  // Auto-scale delegation
  // ---------------------------------------------------------------------------

  /**
   * Check if auto-scale is enabled for a given pane.
   */
  isAutoScale(paneId: string): boolean {
    return this._autoScaleManager.isAutoScale(paneId);
  }

  /**
   * Disable auto-scale for a specific pane (e.g., when user Y-axis drags).
   */
  disableAutoScale(paneId: string): void {
    this._autoScaleManager.disableAutoScale(paneId);
  }

  /**
   * Check if any pane has had auto-scale disabled (for reset button visibility).
   */
  hasDisabledAutoScale(): boolean {
    return this._autoScaleManager.hasDisabledPanes();
  }

  // ---------------------------------------------------------------------------
  // Indicator pane Y ranges
  // ---------------------------------------------------------------------------

  /**
   * Compute auto-scaled Y ranges for indicator panes.
   *
   * @param panes - Array of indicator pane descriptors
   * @param plots - All plot outputs from tealscript
   * @param bars - The bars array
   * @param startTime - Visible range start time
   * @param endTime - Visible range end time
   * @returns Map from pane ID to { yMin, yMax }
   */
  computePaneYRanges(
    panes: { id: string; fixedRange?: boolean; indicatorIds: string[] }[],
    plots: PlotOutput[],
    bars: Bar[],
    startTime: number,
    endTime: number,
  ): Map<string, { yMin: number; yMax: number }> {
    const ranges = new Map<string, { yMin: number; yMax: number }>();

    for (const pane of panes) {
      if (pane.fixedRange) continue;

      const range = this._autoScaleManager.applyToPaneYRange(
        pane.id,
        plots,
        pane.indicatorIds,
        bars,
        startTime,
        endTime,
      );

      if (range) {
        ranges.set(pane.id, range);
      }
    }

    return ranges;
  }
}
