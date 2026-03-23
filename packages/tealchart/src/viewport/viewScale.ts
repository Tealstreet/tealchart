/**
 * ViewScale — pure functions for capturing and restoring proportional viewport state.
 *
 * Used by both web (TealchartWidget / ChartCore) and native (SkiaTealchart) to
 * preserve the user's zoom/scroll when switching symbols, intervals, or accounts.
 *
 * No DOM, Skia, or React dependencies — keep this module pure.
 */

import type { PlotOutput } from '@tealstreet/tealscript';
import type { Bar, Viewport, ViewScaleState } from '../types';

import { TealchartRenderer } from '../TealchartRenderer';

/**
 * Find the index of the first bar whose time >= target using binary search.
 * Returns bars.length if no such bar exists.
 */
function lowerBound(bars: Bar[], target: number): number {
  let lo = 0;
  let hi = bars.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (bars[mid].time < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Find the index of the first bar whose time > target using binary search.
 * Returns bars.length if no such bar exists.
 */
function upperBound(bars: Bar[], target: number): number {
  let lo = 0;
  let hi = bars.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (bars[mid].time <= target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Find the highest high and lowest low among bars within [startTime, endTime].
 * Uses binary search to locate the visible range since bars are sorted by time.
 * Returns null if no bars fall within the range.
 */
export function getVisibleBarsBoundingBox(
  bars: Bar[],
  startTime: number,
  endTime: number,
): { highest: number; lowest: number } | null {
  if (bars.length === 0) return null;

  // Binary search for the first bar with time >= startTime
  const startIdx = lowerBound(bars, startTime);
  // Binary search for the first bar with time > endTime
  const endIdx = upperBound(bars, endTime);

  if (startIdx >= endIdx) return null;

  let highest = -Infinity;
  let lowest = Infinity;

  for (let i = startIdx; i < endIdx; i++) {
    const bar = bars[i];
    if (bar.high > highest) highest = bar.high;
    if (bar.low < lowest) lowest = bar.low;
  }

  return { highest, lowest };
}

/**
 * Capture the current proportional view state from an absolute viewport + bars.
 *
 * Time axis: stored in ms — works across intervals without conversion.
 * Price axis: stored as proportional padding — works across symbols.
 */
export function captureViewScale(viewport: Viewport, bars: Bar[]): ViewScaleState {
  const visibleTimeRange = viewport.endTime - viewport.startTime;

  // Default right offset: assume latest bar is at the right edge
  let rightOffsetMs = 0;
  if (bars.length > 0) {
    const latestBarTime = bars[bars.length - 1].time;
    rightOffsetMs = viewport.endTime - latestBarTime;
  }

  // Default proportional padding
  let pricePaddingTop = 0.05;
  let pricePaddingBottom = 0.05;

  if (bars.length > 0) {
    const bbox = getVisibleBarsBoundingBox(bars, viewport.startTime, viewport.endTime);

    if (bbox) {
      const dataRange = bbox.highest - bbox.lowest;

      if (dataRange > 0) {
        pricePaddingTop = (viewport.priceMax - bbox.highest) / dataRange;
        pricePaddingBottom = (bbox.lowest - viewport.priceMin) / dataRange;
      }
      // dataRange === 0 means all bars are the same price — keep default 0.05
    }
    // No visible bars in the range — keep default 0.05
  }

  return {
    visibleTimeRange,
    rightOffsetMs,
    pricePaddingTop,
    pricePaddingBottom,
  };
}

/**
 * Auto-scale the price axis to fit visible bars with padding.
 *
 * Returns a new viewport with priceMin/priceMax adjusted to fit the visible
 * candles. Time axis is left unchanged. If no visible bars exist, returns the
 * viewport unchanged.
 */
export function applyAutoScale(viewport: Viewport, bars: Bar[], padding: number = 0.1): Viewport {
  const bbox = getVisibleBarsBoundingBox(bars, viewport.startTime, viewport.endTime);
  if (!bbox) return viewport;

  const dataRange = bbox.highest - bbox.lowest;

  if (dataRange === 0) {
    // All visible bars are the same price — use a small default range
    const safePadding = Math.abs(bbox.highest) * 0.01 || 1;
    return {
      ...viewport,
      priceMax: bbox.highest + safePadding,
      priceMin: bbox.lowest - safePadding,
    };
  }

  return {
    ...viewport,
    priceMax: bbox.highest + dataRange * padding,
    priceMin: bbox.lowest - dataRange * padding,
  };
}

/**
 * Reconstruct an absolute viewport from a proportional ViewScaleState + new bars.
 *
 * If bars are empty, falls back to TealchartRenderer.calculateViewport defaults.
 */
export function restoreViewport(viewScale: ViewScaleState, bars: Bar[]): Viewport {
  if (bars.length === 0) {
    // No bars — cannot reconstruct. Return a default viewport.
    return TealchartRenderer.calculateViewport(bars);
  }

  const latestBarTime = bars[bars.length - 1].time;
  const endTime = latestBarTime + viewScale.rightOffsetMs;
  const startTime = endTime - viewScale.visibleTimeRange;

  // Find the bounding box of visible bars in the new data
  const bbox = getVisibleBarsBoundingBox(bars, startTime, endTime);

  if (!bbox) {
    // No bars visible in the restored time range — fall back to full range bbox
    const fullBbox = getVisibleBarsBoundingBox(bars, bars[0].time, latestBarTime);
    if (!fullBbox) {
      return TealchartRenderer.calculateViewport(bars);
    }
    const dataRange = fullBbox.highest - fullBbox.lowest;
    const safePadding = dataRange > 0 ? dataRange : Math.abs(fullBbox.highest) * 0.01 || 1;
    return {
      startTime,
      endTime,
      priceMax: fullBbox.highest + safePadding * viewScale.pricePaddingTop,
      priceMin: fullBbox.lowest - safePadding * viewScale.pricePaddingBottom,
    };
  }

  const dataRange = bbox.highest - bbox.lowest;

  if (dataRange === 0) {
    // All visible bars are the same price — use a small default range
    const safePadding = Math.abs(bbox.highest) * 0.01 || 1;
    return {
      startTime,
      endTime,
      priceMax: bbox.highest + safePadding * viewScale.pricePaddingTop,
      priceMin: bbox.lowest - safePadding * viewScale.pricePaddingBottom,
    };
  }

  return {
    startTime,
    endTime,
    priceMax: bbox.highest + dataRange * viewScale.pricePaddingTop,
    priceMin: bbox.lowest - dataRange * viewScale.pricePaddingBottom,
  };
}

/**
 * Get the min/max Y range for indicator plot values within a visible time range.
 *
 * Plot values are indexed parallel to the bars array. Uses binary search to find
 * the visible bar index range, then scans only those plot values for min/max.
 *
 * @param plots - All plot outputs
 * @param indicatorIds - Script IDs to include in the range calculation
 * @param bars - The bars array (parallel to plot values)
 * @param startTime - Visible range start time
 * @param endTime - Visible range end time
 * @param padding - Proportional padding to add (default 0.1 = 10%)
 * @returns {min, max} with padding, or null if no valid values in range
 */
export function getVisiblePlotRange(
  plots: PlotOutput[],
  indicatorIds: string[],
  bars: Bar[],
  startTime: number,
  endTime: number,
  padding: number = 0.1,
): { min: number; max: number } | null {
  if (bars.length === 0) return null;

  // Binary search for visible bar index range
  const startIdx = lowerBound(bars, startTime);
  const endIdx = upperBound(bars, endTime);

  if (startIdx >= endIdx) return null;

  let min = Infinity;
  let max = -Infinity;
  let hasValue = false;

  for (const plot of plots) {
    const scriptId = plot.scriptId ?? 'unknown';
    if (!indicatorIds.includes(scriptId)) continue;
    if (plot.type !== 'plot' || !plot.values) continue;

    const values = plot.values;
    // Scan only the visible range (plot values are parallel to bars)
    const scanEnd = Math.min(endIdx, values.length);
    for (let i = startIdx; i < scanEnd; i++) {
      const v = values[i];
      if (v !== null && !isNaN(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
        hasValue = true;
      }
    }
  }

  if (!hasValue) return null;

  const range = max - min;
  if (range === 0) {
    // All values are the same - use a small default range
    const safePadding = Math.abs(max) * 0.01 || 1;
    return { min: min - safePadding, max: max + safePadding };
  }

  return {
    min: min - range * padding,
    max: max + range * padding,
  };
}
