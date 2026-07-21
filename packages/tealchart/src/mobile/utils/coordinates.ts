/**
 * Coordinate transformation utilities for tealchart mobile
 *
 * These functions convert between price/time values and pixel coordinates.
 * Used by both the Skia renderer and React Native interactive components.
 */

import type { Viewport, ChartMargins } from '../../types';

export interface ChartDimensions {
  width: number;
  height: number;
  margins: ChartMargins;
}

export interface PaneInfo {
  id: string;
  type: 'main' | 'indicator';
  top: number;      // pixel Y position of pane top
  height: number;   // pixel height of pane
  yMin: number;     // value range minimum
  yMax: number;     // value range maximum
}

/**
 * Convert a price value to Y pixel coordinate
 */
export function priceToY(
  price: number,
  viewport: Viewport,
  dimensions: ChartDimensions,
  pane?: PaneInfo
): number {
  const { margins } = dimensions;

  // Use pane bounds if provided, otherwise use main chart area
  const top = pane?.top ?? margins.top;
  const height = pane?.height ?? (dimensions.height - margins.top - margins.bottom);
  const priceMin = pane?.yMin ?? viewport.priceMin;
  const priceMax = pane?.yMax ?? viewport.priceMax;

  // Price increases upward, Y increases downward
  const priceRange = priceMax - priceMin;
  if (priceRange === 0) return top + height / 2;

  const ratio = (priceMax - price) / priceRange;
  return top + ratio * height;
}

/**
 * Convert a Y pixel coordinate to price value
 */
export function yToPrice(
  y: number,
  viewport: Viewport,
  dimensions: ChartDimensions,
  pane?: PaneInfo
): number {
  const { margins } = dimensions;

  const top = pane?.top ?? margins.top;
  const height = pane?.height ?? (dimensions.height - margins.top - margins.bottom);
  const priceMin = pane?.yMin ?? viewport.priceMin;
  const priceMax = pane?.yMax ?? viewport.priceMax;

  const priceRange = priceMax - priceMin;
  const ratio = (y - top) / height;

  // Invert because Y increases downward but price increases upward
  return priceMax - ratio * priceRange;
}

/**
 * Convert a timestamp to X pixel coordinate
 */
export function timeToX(
  time: number,
  viewport: Viewport,
  dimensions: ChartDimensions
): number {
  const { margins } = dimensions;
  const chartWidth = dimensions.width - margins.left - margins.right;

  const timeRange = viewport.endTime - viewport.startTime;
  if (timeRange === 0) return margins.left + chartWidth / 2;

  const ratio = (time - viewport.startTime) / timeRange;
  return margins.left + ratio * chartWidth;
}

/**
 * Convert an X pixel coordinate to timestamp
 */
export function xToTime(
  x: number,
  viewport: Viewport,
  dimensions: ChartDimensions
): number {
  const { margins } = dimensions;
  const chartWidth = dimensions.width - margins.left - margins.right;

  const timeRange = viewport.endTime - viewport.startTime;
  const ratio = (x - margins.left) / chartWidth;

  return viewport.startTime + ratio * timeRange;
}

/**
 * Check if a point is within the price axis zone (right margin)
 */
export function isInPriceAxisZone(
  x: number,
  y: number,
  dimensions: ChartDimensions
): boolean {
  const { margins } = dimensions;
  const chartRight = dimensions.width - margins.right;
  const chartBottom = dimensions.height - margins.bottom;

  return x > chartRight && y > margins.top && y < chartBottom;
}

/**
 * Check if a point is within the time axis zone (bottom margin)
 */
export function isInTimeAxisZone(
  x: number,
  y: number,
  dimensions: ChartDimensions
): boolean {
  const { margins } = dimensions;
  const chartRight = dimensions.width - margins.right;
  const chartBottom = dimensions.height - margins.bottom;

  return y > chartBottom && x > margins.left && x < chartRight;
}

/**
 * Check if a point is within the main chart area
 */
export function isInChartArea(
  x: number,
  y: number,
  dimensions: ChartDimensions
): boolean {
  const { margins } = dimensions;
  const chartRight = dimensions.width - margins.right;
  const chartBottom = dimensions.height - margins.bottom;

  return x > margins.left && x < chartRight && y > margins.top && y < chartBottom;
}

/**
 * Get the gesture zone for a touch point
 */
export type GestureZone = 'chart' | 'priceAxis' | 'timeAxis' | 'outside';

export function getGestureZone(
  x: number,
  y: number,
  dimensions: ChartDimensions
): GestureZone {
  if (isInPriceAxisZone(x, y, dimensions)) return 'priceAxis';
  if (isInTimeAxisZone(x, y, dimensions)) return 'timeAxis';
  if (isInChartArea(x, y, dimensions)) return 'chart';
  return 'outside';
}
