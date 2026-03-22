/**
 * ViewScale — pure functions for capturing and restoring proportional viewport state.
 *
 * Used by both web (TealchartWidget / ChartCore) and native (SkiaTealchart) to
 * preserve the user's zoom/scroll when switching symbols, intervals, or accounts.
 *
 * No DOM, Skia, or React dependencies — keep this module pure.
 */

import type { Bar, Viewport, ViewScaleState } from '../types';

import { TealchartRenderer } from '../TealchartRenderer';

/**
 * Find the highest high and lowest low among bars within [startTime, endTime].
 * Returns null if no bars fall within the range.
 */
export function getVisibleBarsBoundingBox(
  bars: Bar[],
  startTime: number,
  endTime: number,
): { highest: number; lowest: number } | null {
  let highest = -Infinity;
  let lowest = Infinity;
  let found = false;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    if (bar.time >= startTime && bar.time <= endTime) {
      if (bar.high > highest) highest = bar.high;
      if (bar.low < lowest) lowest = bar.low;
      found = true;
    }
  }

  if (!found) return null;
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
    const safePadding = dataRange > 0 ? dataRange : fullBbox.highest * 0.01 || 1;
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
    const safePadding = bbox.highest * 0.01 || 1;
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
