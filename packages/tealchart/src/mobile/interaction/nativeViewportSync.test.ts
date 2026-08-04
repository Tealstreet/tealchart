import type { SharedValue } from 'react-native-reanimated';
import type { Viewport } from '../../types';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';

import { describe, expect, it } from 'vitest';

import {
  applyNativeViewportSync,
  beginNativeViewportOwnership,
  cancelNativeViewportOwnership,
  commitNativeViewportOwnership,
  createNativeViewportOwnershipState,
  getNativeSharedViewport,
  nativeSharedViewportsMatch,
  nativeViewportsMatch,
  requestNativeSharedViewportSync,
  shouldApplyNativeAutoViewport,
  syncNativeSharedViewport,
  syncNativeSharedViewportIfIdle,
} from './nativeViewportSync';

function shared(value: number): SharedValue<number> {
  return { value } as SharedValue<number>;
}

function sharedViewport(values: Viewport): NativeViewportSharedValues {
  return {
    startTime: shared(values.startTime),
    endTime: shared(values.endTime),
    priceMin: shared(values.priceMin),
    priceMax: shared(values.priceMax),
  };
}

function readSharedViewport(values: NativeViewportSharedValues): Viewport {
  return {
    startTime: values.startTime.value,
    endTime: values.endTime.value,
    priceMin: values.priceMin.value,
    priceMax: values.priceMax.value,
  };
}

const viewport: Viewport = {
  startTime: 1,
  endTime: 2,
  priceMin: 100,
  priceMax: 200,
};

describe('native viewport sync', () => {
  it('writes every viewport coordinate into shared values', () => {
    const target = sharedViewport({
      startTime: 0,
      endTime: 1,
      priceMin: 0,
      priceMax: 1,
    });

    syncNativeSharedViewport(target, viewport);

    expect(readSharedViewport(target)).toEqual(viewport);
    expect(getNativeSharedViewport(target)).toEqual(viewport);
  });

  it('records a sync target and epoch with the render viewport values', () => {
    const live = sharedViewport({
      startTime: 0,
      endTime: 1,
      priceMin: 0,
      priceMax: 1,
    });
    const panStart = sharedViewport({
      startTime: 0,
      endTime: 1,
      priceMin: 0,
      priceMax: 1,
    });
    const target = sharedViewport({
      startTime: 0,
      endTime: 1,
      priceMin: 0,
      priceMax: 1,
    });
    const targetEpoch = shared(0);
    const renderEpoch = shared(0);

    const syncComplete = requestNativeSharedViewportSync({
      epoch: 7,
      panStartViewport: panStart,
      sharedViewport: live,
      syncTargetEpoch: targetEpoch,
      syncTargetViewport: target,
      viewport,
      viewportSyncEpoch: renderEpoch,
    });

    expect(syncComplete).toBe(true);
    expect(readSharedViewport(live)).toEqual(viewport);
    expect(readSharedViewport(panStart)).toEqual(viewport);
    expect(readSharedViewport(target)).toEqual(viewport);
    expect(targetEpoch.value).toBe(7);
    expect(renderEpoch.value).toBe(7);
    expect(nativeSharedViewportsMatch(live, target)).toBe(true);

    live.priceMax.value += 1;
    expect(nativeSharedViewportsMatch(live, target)).toBe(false);
  });

  it('syncs live and gesture-start viewports only while idle', () => {
    const live = sharedViewport({
      startTime: 0,
      endTime: 1,
      priceMin: 0,
      priceMax: 1,
    });
    const panStart = sharedViewport({
      startTime: 0,
      endTime: 1,
      priceMin: 0,
      priceMax: 1,
    });

    syncNativeSharedViewportIfIdle({
      sharedViewport: live,
      panStartViewport: panStart,
      nativeInteractionActive: false,
      nativeViewportOwned: false,
      viewport,
    });

    expect(readSharedViewport(live)).toEqual(viewport);
    expect(readSharedViewport(panStart)).toEqual(viewport);

    syncNativeSharedViewportIfIdle({
      sharedViewport: live,
      panStartViewport: panStart,
      nativeInteractionActive: true,
      nativeViewportOwned: false,
      viewport: {
        startTime: 10,
        endTime: 11,
        priceMin: 300,
        priceMax: 400,
      },
    });

    expect(readSharedViewport(live)).toEqual(viewport);
    expect(readSharedViewport(panStart)).toEqual(viewport);
  });

  it('matches viewports with a small floating-point tolerance', () => {
    expect(
      nativeViewportsMatch(viewport, {
        startTime: viewport.startTime + 0.5e-6,
        endTime: viewport.endTime - 0.5e-6,
        priceMin: viewport.priceMin + 0.5e-6,
        priceMax: viewport.priceMax - 0.5e-6,
      }),
    ).toBe(true);
    expect(
      nativeViewportsMatch(viewport, {
        ...viewport,
        priceMax: viewport.priceMax + 2e-6,
      }),
    ).toBe(false);
  });

  it('tracks manual/native viewport ownership state', () => {
    const initial = createNativeViewportOwnershipState();

    expect(shouldApplyNativeAutoViewport(initial, viewport)).toBe(true);

    const interaction = beginNativeViewportOwnership(initial);
    expect(interaction.nativeViewportOwned).toBe(true);
    expect(interaction.hasManualViewport).toBe(false);

    const committed = commitNativeViewportOwnership(interaction, viewport);
    expect(committed).toEqual({
      hasManualViewport: true,
      nativeViewportOwned: true,
      pendingNativeViewportCommit: viewport,
    });
    expect(shouldApplyNativeAutoViewport(committed, viewport)).toBe(false);

    expect(cancelNativeViewportOwnership(committed)).toEqual({
      hasManualViewport: true,
      nativeViewportOwned: false,
      pendingNativeViewportCommit: null,
    });
  });

  it('confirms a pending native viewport commit when React catches up', () => {
    const live = sharedViewport({
      startTime: 0,
      endTime: 1,
      priceMin: 0,
      priceMax: 1,
    });
    const panStart = sharedViewport({
      startTime: 0,
      endTime: 1,
      priceMin: 0,
      priceMax: 1,
    });
    const state = commitNativeViewportOwnership(createNativeViewportOwnershipState(), viewport);

    const result = applyNativeViewportSync({
      state,
      sharedViewport: live,
      panStartViewport: panStart,
      nativeInteractionActive: false,
      viewport,
    });

    expect(result.type).toBe('confirmed');
    expect(result.state.nativeViewportOwned).toBe(false);
    expect(result.state.pendingNativeViewportCommit).toBeNull();
    expect(readSharedViewport(live)).toEqual(viewport);
    expect(readSharedViewport(panStart)).toEqual(viewport);
  });

  it('skips external viewport sync while native owns viewport or interaction is active', () => {
    const live = sharedViewport({
      startTime: 0,
      endTime: 1,
      priceMin: 0,
      priceMax: 1,
    });
    const panStart = sharedViewport({
      startTime: 0,
      endTime: 1,
      priceMin: 0,
      priceMax: 1,
    });
    const ownedState = beginNativeViewportOwnership(createNativeViewportOwnershipState());

    expect(
      applyNativeViewportSync({
        state: ownedState,
        sharedViewport: live,
        panStartViewport: panStart,
        nativeInteractionActive: false,
        viewport,
      }).type,
    ).toBe('skipped');

    expect(readSharedViewport(live)).toEqual({
      startTime: 0,
      endTime: 1,
      priceMin: 0,
      priceMax: 1,
    });

    const idleState = cancelNativeViewportOwnership(ownedState);
    expect(
      applyNativeViewportSync({
        state: idleState,
        sharedViewport: live,
        panStartViewport: panStart,
        nativeInteractionActive: true,
        viewport,
      }).type,
    ).toBe('skipped');
  });
});
