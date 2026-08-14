const NATIVE_PRICE_GRID_MIN_LABEL_SPACING = 24;
const NATIVE_TIME_GRID_MIN_LABEL_SPACING = 70;
const NATIVE_GRID_EXTRA_SLOT_COUNT = 2;

export interface NativePriceGridSlot {
  visible: boolean;
  price: number;
  spacing: number;
}

export interface NativeTimeGridSlot {
  visible: boolean;
  time: number;
  step: number;
  showMonthLabel: boolean;
}

export function getNativePriceGridSlotCount(priceHeight: number): number {
  return Math.max(2, Math.floor(priceHeight / NATIVE_PRICE_GRID_MIN_LABEL_SPACING) + NATIVE_GRID_EXTRA_SLOT_COUNT);
}

export function getNativeTimeGridSlotCount(chartWidth: number): number {
  return Math.max(2, Math.floor(chartWidth / NATIVE_TIME_GRID_MIN_LABEL_SPACING) + NATIVE_GRID_EXTRA_SLOT_COUNT);
}

function getNativePriceSpacingAtIndex(magnitude: number, index: number): number {
  'worklet';
  const powerOffset = Math.floor(index / 3) - 2;
  const multiplierIndex = index % 3;
  const multiplier = multiplierIndex === 0 ? 1 : multiplierIndex === 1 ? 2 : 5;
  return multiplier * 10 ** (magnitude + powerOffset);
}

/**
 * The finest spacing on the 1/2/5 ladder that still fits, which is the densest
 * readable axis.
 *
 * This used to require the label count to land inside `[maxLabels / 2,
 * maxLabels]`, then fall back to scanning the ladder *downwards* for anything
 * with two or more labels. The window is 2x wide and consecutive ladder steps
 * differ by up to 2.5x, so a step could clear the window entirely - and the
 * downward fallback then answered with the coarsest spacing that qualified,
 * i.e. the emptiest possible axis. That is why the price axis sometimes showed
 * a single label until you scrunched the range and knocked it into the window.
 *
 * `maxLabels` comes from the minimum label spacing, so it is the only bound
 * that was ever load-bearing; a floor on the count is what caused the misses.
 */
export function getNativePriceGridSpacing(priceMin: number, priceMax: number, priceHeight: number): number {
  'worklet';
  const maxLabels = Math.max(2, Math.floor(priceHeight / NATIVE_PRICE_GRID_MIN_LABEL_SPACING));
  const priceRange = priceMax - priceMin;
  if (priceRange <= 0) return 0;

  const magnitude = Math.floor(Math.log10(priceRange));
  for (let index = 0; index <= 10; index += 1) {
    const spacing = getNativePriceSpacingAtIndex(magnitude, index);
    const firstMarker = Math.floor(priceMin / spacing) * spacing;
    const count = Math.floor((priceMax + spacing * 0.01 - firstMarker) / spacing) + 1;
    if (count <= maxLabels) return spacing;
  }

  return priceRange / 2;
}

export function getNativePriceGridSlot(input: {
  index: number;
  priceMin: number;
  priceMax: number;
  priceHeight: number;
}): NativePriceGridSlot {
  'worklet';
  const spacing = getNativePriceGridSpacing(input.priceMin, input.priceMax, input.priceHeight);
  if (spacing <= 0) return { visible: false, price: 0, spacing: 0 };

  const firstMarker = Math.floor(input.priceMin / spacing) * spacing;
  const price = firstMarker + input.index * spacing;
  return {
    visible: price >= input.priceMin - spacing * 0.01 && price <= input.priceMax + spacing * 0.01,
    price,
    spacing,
  };
}

function getNativeTimeIntervalAtIndex(index: number): number {
  'worklet';
  if (index === 0) return 1_000;
  if (index === 1) return 5_000;
  if (index === 2) return 10_000;
  if (index === 3) return 30_000;
  if (index === 4) return 60_000;
  if (index === 5) return 300_000;
  if (index === 6) return 600_000;
  if (index === 7) return 900_000;
  if (index === 8) return 1_800_000;
  if (index === 9) return 3_600_000;
  if (index === 10) return 7_200_000;
  if (index === 11) return 14_400_000;
  if (index === 12) return 28_800_000;
  if (index === 13) return 43_200_000;
  if (index === 14) return 86_400_000;
  if (index === 15) return 172_800_000;
  if (index === 16) return 604_800_000;
  if (index === 17) return 1_209_600_000;
  if (index === 18) return 2_592_000_000;
  if (index === 19) return 5_184_000_000;
  if (index === 20) return 7_776_000_000;
  if (index === 21) return 15_552_000_000;
  if (index === 22) return 31_536_000_000;
  if (index === 23) return 63_072_000_000;
  if (index === 24) return 157_680_000_000;
  return 315_360_000_000;
}

export function getNativeTimeGridStep(timeRange: number, chartWidth: number): number {
  'worklet';
  const maxLabels = Math.max(2, Math.floor(chartWidth / NATIVE_TIME_GRID_MIN_LABEL_SPACING));
  if (timeRange <= 0) return 0;

  let bestInterval = getNativeTimeIntervalAtIndex(25);
  for (let index = 0; index <= 25; index += 1) {
    const interval = getNativeTimeIntervalAtIndex(index);
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

  return bestInterval;
}

export function getNativeTimeGridSlot(input: {
  index: number;
  startTime: number;
  endTime: number;
  chartWidth: number;
}): NativeTimeGridSlot {
  'worklet';
  const timeRange = input.endTime - input.startTime;
  const step = getNativeTimeGridStep(timeRange, input.chartWidth);
  if (step <= 0) {
    return {
      visible: false,
      time: 0,
      step: 0,
      showMonthLabel: false,
    };
  }

  const firstMarker = Math.ceil(input.startTime / step) * step;
  const time = firstMarker + input.index * step;
  const date = new Date(time);
  const previousDate = new Date(time - step);
  const showMonthLabel =
    input.index === 0 ||
    date.getMonth() !== previousDate.getMonth() ||
    date.getFullYear() !== previousDate.getFullYear();

  return {
    visible: time >= input.startTime && time <= input.endTime,
    time,
    step,
    showMonthLabel,
  };
}
