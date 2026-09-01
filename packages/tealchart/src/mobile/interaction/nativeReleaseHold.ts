import type { NativePaneDividerBand } from './nativePaneDivider';

import { nativePaneHeightsMatchRatios } from '../utils/nativePaneLayoutOverrides';

export type NativeReleaseHoldKind =
  | 'dataLoadRender'
  | 'paneDividerResize'
  | 'paneMaximizeLegend'
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
 * This is the committed-state gate, and a commit is not a paint. A hold whose
 * preview would otherwise expose the commit's all-old frame must then wait for
 * createNativePaneGeometrySignature to echo back through the canvas.
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

/**
 * Identity of the pane geometry a frame paints.
 *
 * Compared on both sides of the Skia propagation seam: React holds the
 * committed frame's signature, and a mirrored derived value reports the same
 * string once Reanimated has rebuilt the canvas mappers on it. Rounded because
 * this is an identity, not a measurement - sub-pixel drift would never match.
 */
export function createNativePaneGeometrySignature(
  panes: readonly { height: number; id: string; top: number }[],
): string {
  return panes.map((pane) => `${pane.id}:${Math.round(pane.top)}:${Math.round(pane.height)}`).join('|');
}
