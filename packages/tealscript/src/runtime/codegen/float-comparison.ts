export function comparisonEqual(a: unknown, b: unknown): boolean {
  return a === b || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 1e-10);
}
