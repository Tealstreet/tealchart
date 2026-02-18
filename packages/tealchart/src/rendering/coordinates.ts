import type { ChartMargins, Viewport } from '../types';

/**
 * Convert price to Y coordinate
 */
export function priceToY(price: number, viewport: Viewport, priceHeight: number, margins: ChartMargins): number {
  const ratio = (viewport.priceMax - price) / (viewport.priceMax - viewport.priceMin);
  return margins.top + ratio * priceHeight;
}

/**
 * Convert Y coordinate to price
 */
export function yToPrice(y: number, viewport: Viewport, priceHeight: number, margins: ChartMargins): number {
  const ratio = (y - margins.top) / priceHeight;
  return viewport.priceMax - ratio * (viewport.priceMax - viewport.priceMin);
}

/**
 * Convert time to X coordinate
 */
export function timeToX(time: number, viewport: Viewport, chartWidth: number, margins: ChartMargins): number {
  const ratio = (time - viewport.startTime) / (viewport.endTime - viewport.startTime);
  return margins.left + ratio * chartWidth;
}

/**
 * Convert X coordinate to time
 */
export function xToTime(x: number, viewport: Viewport, chartWidth: number, margins: ChartMargins): number {
  const ratio = (x - margins.left) / chartWidth;
  return viewport.startTime + ratio * (viewport.endTime - viewport.startTime);
}

/**
 * Generate price markers that fit nicely in the available height
 * Ensures minimum pixel spacing between labels to avoid overlap
 */
export function generatePriceMarkers(viewport: Viewport, priceHeight: number): number[] {
  const minLabelSpacing = 24;
  const maxLabels = Math.floor(priceHeight / minLabelSpacing);
  const minLabels = Math.max(4, Math.floor(maxLabels * 0.5));

  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange <= 0) return [];

  const magnitude = Math.floor(Math.log10(priceRange));
  const spacings = [
    1 * Math.pow(10, magnitude - 2),
    2 * Math.pow(10, magnitude - 2),
    5 * Math.pow(10, magnitude - 2),
    1 * Math.pow(10, magnitude - 1),
    2 * Math.pow(10, magnitude - 1),
    5 * Math.pow(10, magnitude - 1),
    1 * Math.pow(10, magnitude),
    2 * Math.pow(10, magnitude),
    5 * Math.pow(10, magnitude),
    1 * Math.pow(10, magnitude + 1),
    2 * Math.pow(10, magnitude + 1),
  ].sort((a, b) => a - b);

  for (const spacing of spacings) {
    const firstMarker = Math.floor(viewport.priceMin / spacing) * spacing;
    const markers: number[] = [];
    for (let price = firstMarker; price <= viewport.priceMax + spacing * 0.01; price += spacing) {
      markers.push(price);
    }
    if (markers.length >= minLabels && markers.length <= maxLabels) {
      return markers;
    }
  }

  for (const spacing of [...spacings].reverse()) {
    const firstMarker = Math.floor(viewport.priceMin / spacing) * spacing;
    const markers: number[] = [];
    for (let price = firstMarker; price <= viewport.priceMax + spacing * 0.01; price += spacing) {
      markers.push(price);
    }
    if (markers.length <= maxLabels && markers.length >= 2) {
      return markers;
    }
  }

  const step = priceRange / Math.max(minLabels, 4);
  const markers: number[] = [];
  for (let price = viewport.priceMin; price <= viewport.priceMax; price += step) {
    markers.push(price);
  }
  return markers;
}

/**
 * Generate time markers that fit nicely in the available width
 */
export function generateTimeMarkers(
  viewport: Viewport,
  chartWidth: number,
): Array<{ time: number; showMonthLabel: boolean; step: number }> {
  const minLabelSpacing = 70;
  const maxLabels = Math.max(2, Math.floor(chartWidth / minLabelSpacing));

  const timeRange = viewport.endTime - viewport.startTime;
  if (timeRange <= 0) return [];

  const intervals = [
    1000, 5000, 10000, 30000, 60000, 300000, 600000, 900000, 1800000, 3600000, 7200000, 14400000, 28800000, 43200000,
    86400000, 172800000, 604800000, 1209600000, 2592000000, 5184000000, 7776000000, 15552000000, 31536000000,
    63072000000, 157680000000, 315360000000,
  ];

  let bestInterval = intervals[intervals.length - 1];
  for (const interval of intervals) {
    const count = Math.ceil(timeRange / interval);
    if (count <= maxLabels) {
      bestInterval = interval;
      break;
    }
  }

  let count = Math.ceil(timeRange / bestInterval);
  while (count > maxLabels) {
    bestInterval *= 2;
    count = Math.ceil(timeRange / bestInterval);
  }

  const startTime = Math.ceil(viewport.startTime / bestInterval) * bestInterval;
  const markers: Array<{ time: number; showMonthLabel: boolean; step: number }> = [];
  let lastMonth = -1;
  let lastYear = -1;

  for (let time = startTime; time <= viewport.endTime; time += bestInterval) {
    const date = new Date(time);
    const month = date.getMonth();
    const year = date.getFullYear();
    const showMonthLabel = month !== lastMonth || year !== lastYear;
    markers.push({ time, showMonthLabel, step: bestInterval });
    lastMonth = month;
    lastYear = year;
  }

  return markers;
}

/**
 * Format time label based on step size (TradingView style)
 */
export function formatTimeLabel(time: number, step: number, showMonthLabel = false): string {
  const date = new Date(time);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const yearShort = date.getFullYear().toString().slice(-2);

  if (step >= 31536000000) {
    return date.getFullYear().toString();
  }
  if (step >= 2592000000) {
    return `${months[date.getMonth()]} '${yearShort}`;
  }
  if (step >= 86400000) {
    if (showMonthLabel) {
      return `${months[date.getMonth()]} '${yearShort}`;
    }
    return date.getDate().toString();
  }
  if (step >= 3600000) {
    if (showMonthLabel) {
      return `${date.getDate()} ${months[date.getMonth()]}`;
    }
    return `${date.getHours()}:00`;
  }
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Calculate a "nice" step value for axis labels
 */
export function calculateNiceStep(range: number, targetSteps: number): number {
  const roughStep = range / targetSteps;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;

  let niceStep: number;
  if (normalized <= 1) niceStep = 1;
  else if (normalized <= 2) niceStep = 2;
  else if (normalized <= 5) niceStep = 5;
  else niceStep = 10;

  return niceStep * magnitude;
}
