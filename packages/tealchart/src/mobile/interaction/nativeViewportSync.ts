import type { SharedValue } from 'react-native-reanimated';
import type { Viewport } from '../../types';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type { NativeReleaseHold } from './nativeReleaseHold';

import { createNativeReleaseHold, resolveNativeReleaseHold } from './nativeReleaseHold';

const VIEWPORT_MATCH_EPSILON = 1e-6;

export function syncNativeSharedViewport(sharedViewport: NativeViewportSharedValues, viewport: Viewport): void {
  'worklet';
  sharedViewport.startTime.value = viewport.startTime;
  sharedViewport.endTime.value = viewport.endTime;
  sharedViewport.priceMin.value = viewport.priceMin;
  sharedViewport.priceMax.value = viewport.priceMax;
}

export function syncNativeSharedViewportIfChanged(
  sharedViewport: NativeViewportSharedValues,
  viewport: Viewport,
): boolean {
  'worklet';
  if (
    Math.abs(sharedViewport.startTime.value - viewport.startTime) <= VIEWPORT_MATCH_EPSILON &&
    Math.abs(sharedViewport.endTime.value - viewport.endTime) <= VIEWPORT_MATCH_EPSILON &&
    Math.abs(sharedViewport.priceMin.value - viewport.priceMin) <= VIEWPORT_MATCH_EPSILON &&
    Math.abs(sharedViewport.priceMax.value - viewport.priceMax) <= VIEWPORT_MATCH_EPSILON
  ) {
    return false;
  }
  syncNativeSharedViewport(sharedViewport, viewport);
  return true;
}

export function getNativeSharedViewport(sharedViewport: NativeViewportSharedValues): Viewport {
  'worklet';
  return {
    startTime: sharedViewport.startTime.value,
    endTime: sharedViewport.endTime.value,
    priceMin: sharedViewport.priceMin.value,
    priceMax: sharedViewport.priceMax.value,
  };
}

export function nativeSharedViewportsMatch(
  left: NativeViewportSharedValues,
  right: NativeViewportSharedValues,
): boolean {
  'worklet';
  return (
    Math.abs(left.startTime.value - right.startTime.value) <= VIEWPORT_MATCH_EPSILON &&
    Math.abs(left.endTime.value - right.endTime.value) <= VIEWPORT_MATCH_EPSILON &&
    Math.abs(left.priceMin.value - right.priceMin.value) <= VIEWPORT_MATCH_EPSILON &&
    Math.abs(left.priceMax.value - right.priceMax.value) <= VIEWPORT_MATCH_EPSILON
  );
}

export function requestNativeSharedViewportSync({
  epoch,
  panStartViewport,
  sharedViewport,
  syncTargetEpoch,
  syncTargetViewport,
  viewport,
  viewportSyncEpoch,
}: {
  epoch: number;
  panStartViewport: NativeViewportSharedValues;
  sharedViewport: NativeViewportSharedValues;
  syncTargetEpoch: SharedValue<number>;
  syncTargetViewport: NativeViewportSharedValues;
  viewport: Viewport;
  viewportSyncEpoch: SharedValue<number>;
}): boolean {
  'worklet';
  syncNativeSharedViewport(syncTargetViewport, viewport);
  syncTargetEpoch.value = epoch;
  syncNativeSharedViewportIfChanged(sharedViewport, viewport);
  syncNativeSharedViewportIfChanged(panStartViewport, viewport);
  viewportSyncEpoch.value = epoch;
  return nativeSharedViewportsMatch(sharedViewport, syncTargetViewport);
}

export interface NativeViewportOwnershipState {
  hasManualViewport: boolean;
  nativeViewportOwned: boolean;
  releaseHoldToken: number;
  viewportReleaseHold: NativeReleaseHold<Viewport> | null;
}

export type NativeViewportSyncResult =
  | {
      type: 'confirmed';
      state: NativeViewportOwnershipState;
    }
  | {
      type: 'synced' | 'skipped';
      state: NativeViewportOwnershipState;
    };

export function createNativeViewportOwnershipState(): NativeViewportOwnershipState {
  return {
    hasManualViewport: false,
    nativeViewportOwned: false,
    releaseHoldToken: 0,
    viewportReleaseHold: null,
  };
}

export function beginNativeViewportOwnership(state: NativeViewportOwnershipState): NativeViewportOwnershipState {
  return {
    ...state,
    nativeViewportOwned: true,
  };
}

export function cancelNativeViewportOwnership(state: NativeViewportOwnershipState): NativeViewportOwnershipState {
  return {
    ...state,
    nativeViewportOwned: false,
    viewportReleaseHold: null,
  };
}

export function commitNativeViewportOwnership(
  state: NativeViewportOwnershipState,
  nextViewport: Viewport,
): NativeViewportOwnershipState {
  return {
    hasManualViewport: true,
    nativeViewportOwned: true,
    releaseHoldToken: state.releaseHoldToken + 1,
    viewportReleaseHold: createNativeReleaseHold({
      kind: 'viewport',
      releaseFrames: 0,
      target: nextViewport,
      token: state.releaseHoldToken + 1,
    }),
  };
}

export function applyNativeViewportSync({
  state,
  sharedViewport,
  panStartViewport,
  nativeInteractionActive,
  viewport,
}: {
  state: NativeViewportOwnershipState;
  sharedViewport: NativeViewportSharedValues;
  panStartViewport: NativeViewportSharedValues;
  nativeInteractionActive: boolean;
  viewport: Viewport;
}): NativeViewportSyncResult {
  if (state.viewportReleaseHold) {
    const nextHold = resolveNativeReleaseHold({
      caughtUp: nativeViewportsMatch(viewport, state.viewportReleaseHold.target),
      hold: state.viewportReleaseHold,
    });
    if (!nextHold.released) {
      return {
        type: 'skipped',
        state: nextHold.hold === state.viewportReleaseHold ? state : { ...state, viewportReleaseHold: nextHold.hold },
      };
    }

    syncNativeSharedViewportIfChanged(sharedViewport, viewport);
    syncNativeSharedViewportIfChanged(panStartViewport, viewport);
    return {
      type: 'confirmed',
      state: {
        ...state,
        nativeViewportOwned: false,
        viewportReleaseHold: null,
      },
    };
  }

  if (state.nativeViewportOwned || nativeInteractionActive) {
    return { type: 'skipped', state };
  }

  syncNativeSharedViewportIfChanged(sharedViewport, viewport);
  syncNativeSharedViewportIfChanged(panStartViewport, viewport);
  return { type: 'synced', state };
}

export function nativeViewportsMatch(left: Viewport, right: Viewport): boolean {
  return (
    Math.abs(left.startTime - right.startTime) <= VIEWPORT_MATCH_EPSILON &&
    Math.abs(left.endTime - right.endTime) <= VIEWPORT_MATCH_EPSILON &&
    Math.abs(left.priceMin - right.priceMin) <= VIEWPORT_MATCH_EPSILON &&
    Math.abs(left.priceMax - right.priceMax) <= VIEWPORT_MATCH_EPSILON
  );
}
