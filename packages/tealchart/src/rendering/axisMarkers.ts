import type { Viewport } from '../types';

export interface TimeAxisMarker {
  time: number;
  showMonthLabel: boolean;
  step: number;
}

/**
 * The finest spacing on the 1/2/5 ladder whose label pitch still clears
 * `minLabelSpacing`. Pitch is set by the GAP count (`priceRange / spacing`), which
 * depends only on the range - unlike the marker count, which also depends on where
 * the grid happens to land and so flipped the axis between 1x and 2x labels mid-pan.
 *
 * Mirrored in native by `getNativePriceGridSpacing`.
 */
export function generatePriceMarkers(viewport: Viewport, priceHeight: number): number[] {
  const minLabelSpacing = 24;
  const maxGaps = Math.max(2, priceHeight / minLabelSpacing);
  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange <= 0) return [];

  const magnitude = Math.floor(Math.log10(priceRange));
  const spacings = [
    1 * 10 ** (magnitude - 2),
    2 * 10 ** (magnitude - 2),
    5 * 10 ** (magnitude - 2),
    1 * 10 ** (magnitude - 1),
    2 * 10 ** (magnitude - 1),
    5 * 10 ** (magnitude - 1),
    1 * 10 ** magnitude,
    2 * 10 ** magnitude,
    5 * 10 ** magnitude,
    1 * 10 ** (magnitude + 1),
    2 * 10 ** (magnitude + 1),
  ].sort((a, b) => a - b);

  const markersFor = (spacing: number): number[] => {
    const firstMarker = Math.floor(viewport.priceMin / spacing) * spacing;
    const markers: number[] = [];
    for (let price = firstMarker; price <= viewport.priceMax + spacing * 0.01; price += spacing) {
      markers.push(price);
    }
    return markers;
  };

  for (const spacing of spacings) {
    if (priceRange / spacing <= maxGaps) return markersFor(spacing);
  }

  return markersFor(priceRange / 2);
}

export function generateTimeMarkers(viewport: Viewport, chartWidth: number): TimeAxisMarker[] {
  const minLabelSpacing = 70;
  const maxLabels = Math.max(2, Math.floor(chartWidth / minLabelSpacing));
  const timeRange = viewport.endTime - viewport.startTime;
  if (timeRange <= 0) return [];

  const intervals = [
    1_000,
    5_000,
    10_000,
    30_000,
    60_000,
    300_000,
    600_000,
    900_000,
    1_800_000,
    3_600_000,
    7_200_000,
    14_400_000,
    28_800_000,
    43_200_000,
    86_400_000,
    172_800_000,
    604_800_000,
    1_209_600_000,
    2_592_000_000,
    5_184_000_000,
    7_776_000_000,
    15_552_000_000,
    31_536_000_000,
    63_072_000_000,
    157_680_000_000,
    315_360_000_000,
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
  const markers: TimeAxisMarker[] = [];
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

export function formatTimeAxisLabel(time: number, step: number, showMonthLabel = false): string {
  const date = new Date(time);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const yearShort = date.getFullYear().toString().slice(-2);

  if (step >= 31_536_000_000) return date.getFullYear().toString();
  if (step >= 2_592_000_000) return `${months[date.getMonth()]} '${yearShort}`;
  if (step >= 86_400_000) return showMonthLabel ? `${months[date.getMonth()]} '${yearShort}` : date.getDate().toString();
  if (step >= 3_600_000) return showMonthLabel ? `${date.getDate()} ${months[date.getMonth()]}` : `${date.getHours()}:00`;
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
}
