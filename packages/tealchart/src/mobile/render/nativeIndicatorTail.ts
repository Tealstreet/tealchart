import type { PlotOutput } from '@tealstreet/tealscript';
import type { SharedValue } from 'react-native-reanimated';

/** Identity of a plot across worker results: its script and its id within that script. */
export function getNativeIndicatorPlotKey(plot: Pick<PlotOutput, 'id' | 'scriptId'>): string {
  return `${plot.scriptId ?? ''}\n${plot.id}`;
}

/** A worker result that moved only the last bar of some `plot` series. */
export interface NativeIndicatorPlotTailDiff {
  index: number;
  keys: string[];
}

/** The live last point of each moved plot, as the plot paths draw it. */
export interface NativeIndicatorTailPoint {
  color: string | null;
  value: number | null;
}

export interface NativeIndicatorTail {
  market: string;
  time: number;
  points: Readonly<Record<string, NativeIndicatorTailPoint>>;
}

export type NativeIndicatorTailSharedValue = SharedValue<NativeIndicatorTail | null>;

function areNativeArraysEqualExceptLast(previous: readonly unknown[], next: readonly unknown[]): boolean {
  if (previous.length !== next.length) return false;
  for (let index = 0; index < next.length - 1; index += 1) {
    if (!Object.is(previous[index], next[index])) return false;
  }
  return true;
}

function areNativePlotFieldsEqual(previous: unknown, next: unknown): boolean {
  if (previous === next) return true;
  if (previous === null || next === null || typeof previous !== 'object' || typeof next !== 'object') return false;
  // Nested objects (a gradient) arrive as fresh JSON every result.
  return JSON.stringify(previous) === JSON.stringify(next);
}

/** Whether `next` is `previous` with only its last bar moved; whether it moved at all is separate. */
function isNativePlotTailOnlyChange(previous: PlotOutput, next: PlotOutput): { moved: boolean } | null {
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  let moved = false;
  for (const key of keys) {
    const before = (previous as unknown as Record<string, unknown>)[key];
    const after = (next as unknown as Record<string, unknown>)[key];
    if (Array.isArray(before) || Array.isArray(after)) {
      if (!Array.isArray(before) || !Array.isArray(after)) return null;
      if (before === after) continue;
      if (!areNativeArraysEqualExceptLast(before, after)) return null;
      if (!Object.is(before[before.length - 1], after[after.length - 1])) moved = true;
      continue;
    }
    if (!areNativePlotFieldsEqual(before, after)) return null;
  }
  return { moved };
}

/**
 * The plots a worker result moved, when all it moved was their last bar and every one is
 * a plain `plot` series the live channel can redraw: no offset, no trackprice, and no
 * fill in its script, since a fill reads its boundaries' values. `unchanged` when the
 * result re-sent identical content; null for anything that needs a render.
 */
export function diffNativeIndicatorPlotTail(
  previous: readonly PlotOutput[],
  next: readonly PlotOutput[],
): NativeIndicatorPlotTailDiff | 'unchanged' | null {
  if (previous.length !== next.length) return null;
  const keys: string[] = [];
  let index = -1;
  const scriptsWithFills = new Set<string | undefined>();
  for (const plot of next) {
    if (plot.type === 'fill') scriptsWithFills.add(plot.scriptId);
  }

  for (let position = 0; position < next.length; position += 1) {
    const before = previous[position]!;
    const after = next[position]!;
    if (before === after) continue;
    if (getNativeIndicatorPlotKey(before) !== getNativeIndicatorPlotKey(after) || before.type !== after.type) {
      return null;
    }
    const change = isNativePlotTailOnlyChange(before, after);
    if (!change) return null;
    if (!change.moved) continue;
    if (after.type !== 'plot' || (after.offset ?? 0) !== 0 || after.trackprice) return null;
    if (scriptsWithFills.has(after.scriptId)) return null;
    const lastIndex = after.values.length - 1;
    if (lastIndex < 0 || (index !== -1 && index !== lastIndex)) return null;
    index = lastIndex;
    keys.push(getNativeIndicatorPlotKey(after));
  }

  return keys.length > 0 ? { index, keys } : 'unchanged';
}

/** Folds a later result's moved points into the tail already published for the same bar. */
export function mergeNativeIndicatorTail(
  current: NativeIndicatorTail | null,
  next: NativeIndicatorTail,
): NativeIndicatorTail {
  if (!current || current.market !== next.market || current.time !== next.time) return next;
  return { ...next, points: { ...current.points, ...next.points } };
}

export function applyNativeIndicatorTailToPoints<
  T extends { color: string | null; time: number; value: number | null },
>(points: readonly T[], tail: NativeIndicatorTail | null, key: string, market: string): readonly T[] {
  'worklet';
  if (!tail || !market || tail.market !== market) return points;
  const point = tail.points[key];
  const last = points[points.length - 1];
  if (!point || !last || last.time !== tail.time) return points;
  const next = points.slice();
  next[next.length - 1] = { ...last, color: point.color, value: point.value };
  return next;
}

function areNativeStructurallyEqual(previous: unknown, next: unknown): boolean {
  if (Object.is(previous, next)) return true;
  if (typeof previous !== 'object' || typeof next !== 'object' || previous === null || next === null) return false;
  if (Array.isArray(previous) !== Array.isArray(next)) return false;
  const previousKeys = Object.keys(previous);
  if (previousKeys.length !== Object.keys(next).length) return false;
  return previousKeys.every((key) =>
    areNativeStructurallyEqual((previous as Record<string, unknown>)[key], (next as Record<string, unknown>)[key]),
  );
}

/** Drawings compared by content: the worker re-sends unchanged ones as new objects. */
export function areNativeDrawingOutputsEqual(previous: readonly unknown[], next: readonly unknown[]): boolean {
  return (
    previous.length === next.length &&
    previous.every((drawing, index) => areNativeStructurallyEqual(drawing, next[index]))
  );
}
