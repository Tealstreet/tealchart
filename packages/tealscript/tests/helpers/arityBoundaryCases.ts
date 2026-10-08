export function arityBoundaryCases<T extends { limit: number }>(
  cases: readonly T[],
  exhaustive = process.env.TEALSCRIPT_ARITY_SWEEP === '1',
): readonly T[] {
  if (exhaustive) return cases;
  const limits = new Set<number>();
  return cases.filter(({ limit }) => {
    if (limits.has(limit)) return false;
    limits.add(limit);
    return true;
  });
}
