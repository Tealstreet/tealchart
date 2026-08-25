export function snapValueToStep(value: number, step?: number): number {
  'worklet';
  if (!Number.isFinite(value) || !step || !Number.isFinite(step) || step <= 0) return value;
  return Math.round(value / step) * step;
}

export function snapPriceToTick(price: number, tickSize?: number): number {
  'worklet';
  return snapValueToStep(price, tickSize);
}

export function snapTimeToInterval(time: number, intervalMs?: number): number {
  'worklet';
  return snapValueToStep(time, intervalMs);
}
