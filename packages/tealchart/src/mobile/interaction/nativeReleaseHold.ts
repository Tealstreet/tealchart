import type { NativePaneFrame } from '../render/nativeChartFrame';
import type { NativePaneRangeOverrides } from '../render/nativePaneRangeOverride';

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
 * The extra release frame covers the native timing seam where shared values
 * update immediately but a Skia worklet closure receives new React props on the
 * next propagation. Inline release is what creates the visible flap.
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

export function nativePaneRangeOverridesCaughtUp({
  overrides,
  panes,
}: {
  overrides: NativePaneRangeOverrides;
  panes: readonly NativePaneFrame[];
}): boolean {
  if (Object.keys(overrides).length === 0) return true;
  return resolveSettledNativePaneRangeOverrides({ overrides, panes }).settled;
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
  return nativePaneHeightsMatchRatios(panes, ratios);
}
