/**
 * AutoScaleManager - Unified auto-scale state management for all chart panes.
 *
 * Tracks per-pane auto-scale enabled/disabled state and provides methods
 * to compute auto-scaled viewports (main pane) and Y ranges (indicator panes).
 *
 * No DOM, React, or Skia dependencies - pure TypeScript class.
 */

import type { PlotOutput } from '@tealstreet/tealscript';
import type { Bar, Viewport } from '../types';

import { applyAutoScale, getVisiblePlotRange } from './viewScale';

export class AutoScaleManager {
  /**
   * Per-pane auto-scale state. Missing keys default to true (auto-scale enabled).
   * 'main' is the key for the main chart pane.
   */
  private _paneAutoScale = new Map<string, boolean>();

  /**
   * Check if auto-scale is enabled for a given pane.
   * Returns true by default (if the pane hasn't been explicitly disabled).
   */
  isAutoScale(paneId: string): boolean {
    return this._paneAutoScale.get(paneId) ?? true;
  }

  /**
   * Disable auto-scale for a specific pane (e.g., when user Y-axis drags).
   */
  disableAutoScale(paneId: string): void {
    this._paneAutoScale.set(paneId, false);
  }

  /**
   * Enable auto-scale for a specific pane.
   */
  enableAutoScale(paneId: string): void {
    this._paneAutoScale.set(paneId, true);
  }

  /**
   * Re-enable auto-scale for ALL panes (e.g., when user clicks reset button).
   */
  resetAll(): void {
    this._paneAutoScale.clear();
  }

  /**
   * Apply auto-scale to the main pane viewport.
   * If auto-scale is enabled for 'main', fits the price axis to visible bars.
   * Otherwise, returns the viewport unchanged.
   */
  applyToViewport(viewport: Viewport, bars: Bar[], padding: number = 0.1): Viewport {
    if (!this.isAutoScale('main')) {
      return viewport;
    }
    return applyAutoScale(viewport, bars, padding);
  }

  /**
   * Compute the auto-scaled Y range for an indicator pane.
   *
   * Filters plot values to the visible time range [startTime, endTime]
   * and returns {yMin, yMax} with padding. Returns null if auto-scale
   * is disabled for this pane or no visible values exist.
   */
  applyToPaneYRange(
    paneId: string,
    plots: PlotOutput[],
    indicatorIds: string[],
    bars: Bar[],
    startTime: number,
    endTime: number,
    padding: number = 0.1,
  ): { yMin: number; yMax: number } | null {
    if (!this.isAutoScale(paneId)) {
      return null;
    }

    const range = getVisiblePlotRange(plots, indicatorIds, bars, startTime, endTime, padding);
    if (!range) {
      return null;
    }

    return { yMin: range.min, yMax: range.max };
  }
}
