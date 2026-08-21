/**
 * Order and position render data is rebuilt from scratch on every read - the
 * api spreads a fresh object per line, and the action-state pass spreads it
 * again - so the chart saw new identities every render even when nothing about
 * the lines had moved. That invalidated the trade-line geometry memo, which
 * measures Skia text, on renders that had nothing to do with lines.
 *
 * Rebuilding the data is cheap; re-deriving from it is not. So the values are
 * compared and the previous objects handed back where they still hold.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function areShallowEqual(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) return false;
  return leftKeys.every((key) => Object.is(left[key], right[key]));
}

/**
 * Equal when every own field matches, comparing one level into nested objects
 * so a re-minted `callbacks` or `actionState` wrapper is not read as a change.
 */
export function areNativeRenderEntriesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!isPlainObject(left) || !isPlainObject(right)) return false;

  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) return false;

  return leftKeys.every((key) => {
    const leftValue = left[key];
    const rightValue = right[key];
    if (Object.is(leftValue, rightValue)) return true;
    return isPlainObject(leftValue) && isPlainObject(rightValue) && areShallowEqual(leftValue, rightValue);
  });
}

/**
 * `previous` itself when nothing changed, otherwise a new list in which every
 * unchanged entry keeps its previous identity so per-line memos still hold.
 */
export function reuseNativeRenderList<T>(previous: readonly T[] | undefined, next: readonly T[]): readonly T[] {
  if (!previous || previous.length !== next.length) return next;

  let changed = false;
  const reused = next.map((entry, index) => {
    const previousEntry = previous[index]!;
    if (areNativeRenderEntriesEqual(previousEntry, entry)) return previousEntry;
    changed = true;
    return entry;
  });

  return changed ? reused : previous;
}
