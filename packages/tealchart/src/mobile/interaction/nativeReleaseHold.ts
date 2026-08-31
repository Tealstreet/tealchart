import type { NativePaneFrame } from '../render/nativeChartFrame';
import type { NativePaneRangeOverrides } from '../render/nativePaneRangeOverride';
import type { NativePaneDividerBand } from './nativePaneDivider';

import { resolveSettledNativePaneRangeOverrides } from '../render/nativePaneRangeOverride';
import { nativePaneHeightsMatchRatios } from '../utils/nativePaneLayoutOverrides';

export type NativeReleaseHoldKind =
  | 'dataLoadRender'
  | 'oemsBracketPreview'
  | 'oemsOrderPreview'
  | 'paneDividerResize'
  | 'paneMaximizeLegend'
  | 'paneRangeOverride'
  | 'resizeSnapshot'
  | 'viewport';

export interface NativeReleaseHold<TTarget> {
  kind: NativeReleaseHoldKind;
  releaseFramesRemaining: number;
  target: TTarget;
  token: number;
}

export interface NativeReleaseHoldResolution<TTarget> {
  hold: NativeReleaseHold<TTarget> | null;
  released: boolean;
}

export interface NativePresentationReleaseScheduler {
  frameId: ReturnType<typeof requestAnimationFrame> | null;
  token: number | null;
}

export const NATIVE_RELEASE_HOLD_DEFAULT_RELEASE_FRAMES = 1;

export function createNativeReleaseHold<TTarget>({
  kind,
  releaseFrames = NATIVE_RELEASE_HOLD_DEFAULT_RELEASE_FRAMES,
  target,
  token,
}: {
  kind: NativeReleaseHoldKind;
  releaseFrames?: number;
  target: TTarget;
  token: number;
}): NativeReleaseHold<TTarget> {
  return {
    kind,
    releaseFramesRemaining: Math.max(0, Math.floor(releaseFrames)),
    target,
    token,
  };
}

/**
 * Retires a visual hold only after its committed target is visible in the frame.
 *
 * This is the committed-state gate. Its optional release-frame counter is only
 * for callers whose follow-up work is safe to tie to JS frame observation. When
 * clearing native preview state can expose a stale Skia/Reanimated presentation,
 * use scheduleNativePresentationRelease after this gate releases.
 */
export function resolveNativeReleaseHold<TTarget>({
  caughtUp,
  hold,
}: {
  caughtUp: boolean;
  hold: NativeReleaseHold<TTarget> | null;
}): NativeReleaseHoldResolution<TTarget> {
  if (!hold) return { hold: null, released: false };
  if (!caughtUp) return { hold, released: false };
  if (hold.releaseFramesRemaining > 0) {
    return {
      hold: {
        ...hold,
        releaseFramesRemaining: hold.releaseFramesRemaining - 1,
      },
      released: false,
    };
  }
  return { hold: null, released: true };
}

export function createNativePresentationReleaseScheduler(): NativePresentationReleaseScheduler {
  return {
    frameId: null,
    token: null,
  };
}

export function cancelNativePresentationRelease(scheduler: NativePresentationReleaseScheduler): void {
  if (scheduler.frameId !== null) cancelAnimationFrame(scheduler.frameId);
  scheduler.frameId = null;
  scheduler.token = null;
}

/**
 * Release after real presentation frames, not React render/layout-effect passes.
 *
 * A committed frame can be visible to JS before Skia/Reanimated has presented
 * closures built from it. Dropping a bitmap/shared preview in that seam exposes
 * the pre-gesture canvas. This scheduler is the central handoff primitive for
 * those cases: resolveNativeReleaseHold still decides when the committed target
 * is ready, then this waits for the native presentation clock before clearing
 * preview state.
 */
export function scheduleNativePresentationRelease({
  frames,
  release,
  scheduler,
  token,
}: {
  frames: number;
  release: () => void;
  scheduler: NativePresentationReleaseScheduler;
  token: number;
}): void {
  cancelNativePresentationRelease(scheduler);
  const releaseFrames = Math.max(0, Math.floor(frames));
  if (releaseFrames === 0) {
    release();
    return;
  }
  scheduler.token = token;
  let remaining = releaseFrames;
  const step = () => {
    if (scheduler.token !== token) return;
    if (remaining <= 1) {
      scheduler.frameId = null;
      scheduler.token = null;
      release();
      return;
    }
    remaining -= 1;
    scheduler.frameId = requestAnimationFrame(step);
  };
  scheduler.frameId = requestAnimationFrame(step);
}

export function nativePaneRangeOverridesCaughtUp({
  overrides,
  panes,
}: {
  overrides: NativePaneRangeOverrides;
  panes: readonly NativePaneFrame[];
}): boolean {
  if (Object.keys(overrides).length === 0) return true;
  return Object.keys(resolveSettledNativePaneRangeOverrides({ overrides, panes }).remaining).length === 0;
}

export function nativePaneRangesEqual(
  left: { yMin: number; yMax: number } | undefined,
  right: { yMin: number; yMax: number } | undefined,
): boolean {
  if (!left || !right) return left === right;
  return left.yMin === right.yMin && left.yMax === right.yMax;
}

export function omitReleasedNativePaneRangeOverrides({
  current,
  released,
}: {
  current: NativePaneRangeOverrides;
  released: NativePaneRangeOverrides;
}): NativePaneRangeOverrides {
  const next: NativePaneRangeOverrides = {};
  for (const paneId of Object.keys(current)) {
    if (nativePaneRangesEqual(current[paneId], released[paneId])) continue;
    next[paneId] = current[paneId]!;
  }
  return next;
}

export function createNativePaneRatioTarget(heights: readonly { heightRatio: number; paneId: string }[]): Readonly<Record<string, number>> {
  const target: Record<string, number> = {};
  for (const { heightRatio, paneId } of heights) target[paneId] = heightRatio;
  return target;
}

export function nativePaneRatiosCaughtUp({
  panes,
  ratios,
}: {
  panes: readonly { height: number; id: string }[];
  ratios: Readonly<Record<string, number>>;
}): boolean {
  const targetPanes = panes.filter((pane) => ratios[pane.id] !== undefined);
  return nativePaneHeightsMatchRatios(targetPanes, ratios);
}

export function nativePaneDividerBandsCaughtUp({
  bands,
  panes,
}: {
  bands: readonly Pick<NativePaneDividerBand, 'height' | 'paneId' | 'top'>[];
  panes: readonly { height: number; id: string; top: number }[];
}): boolean {
  if (bands.length === 0) return false;
  const tolerance = 1;
  return bands.every((band) => {
    const pane = panes.find((candidate) => candidate.id === band.paneId);
    if (!pane) return false;
    return Math.abs(pane.top - band.top) <= tolerance && Math.abs(pane.height - band.height) <= tolerance;
  });
}
