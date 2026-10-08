export function roundRuntimeNumber(value: number, precision = 0): number {
  const factor = 10 ** Math.trunc(precision);
  return (Math.sign(value) * Math.round(Math.abs(value) * factor)) / factor;
}
