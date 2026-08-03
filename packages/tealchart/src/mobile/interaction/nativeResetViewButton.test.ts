import { describe, expect, it } from 'vitest';

import { createNativeChartFrameFromPanes } from '../render/nativeChartFrame';
import {
  NATIVE_RESET_VIEW_BUTTON_SIZE,
  NATIVE_RESET_VIEW_HIT_SIZE,
  NATIVE_RESET_VIEW_REVEAL_TOP_BUFFER,
  isNativeResetViewButtonTap,
  isNativeResetViewRevealTap,
  isNativeResetViewTapWithinTolerance,
  resolveNativeResetViewButtonLayout,
  resolveNativeResetViewRevealTopY,
  resolveNativeResetViewTapTarget,
} from './nativeResetViewButton';

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 390,
    height: 480,
    margins: { top: 36, right: 76, bottom: 32, left: 62 },
  },
  panes: [{ id: 'main', type: 'main', top: 36, height: 412, yMin: 62_000, yMax: 66_000 }],
});

describe('native reset view button', () => {
  it('matches the web button placement relative to the chart bottom margin', () => {
    expect(resolveNativeResetViewButtonLayout(frame)).toEqual({
      centerX: 195,
      centerY: 418,
      radius: NATIVE_RESET_VIEW_BUTTON_SIZE / 2,
      hitRadius: NATIVE_RESET_VIEW_HIT_SIZE / 2,
    });
  });

  it('reveals from just above the reset button top down to the canvas bottom', () => {
    const layout = resolveNativeResetViewButtonLayout(frame);
    const revealTopY = layout.centerY - layout.radius - NATIVE_RESET_VIEW_REVEAL_TOP_BUFFER;

    expect(resolveNativeResetViewRevealTopY(frame)).toBe(revealTopY);
    expect(isNativeResetViewRevealTap(frame, 100, revealTopY)).toBe(true);
    expect(isNativeResetViewRevealTap(frame, 100, revealTopY - 0.1)).toBe(false);
    expect(isNativeResetViewRevealTap(frame, -1, revealTopY)).toBe(false);
    expect(isNativeResetViewRevealTap(frame, 391, revealTopY)).toBe(false);
  });

  it('uses the same generous circular hit zone as the web hover target', () => {
    const layout = resolveNativeResetViewButtonLayout(frame);

    expect(isNativeResetViewButtonTap(layout, layout.centerX, layout.centerY)).toBe(true);
    expect(isNativeResetViewButtonTap(layout, layout.centerX + layout.hitRadius, layout.centerY)).toBe(true);
    expect(isNativeResetViewButtonTap(layout, layout.centerX + layout.hitRadius + 0.1, layout.centerY)).toBe(false);
  });

  it('resolves passive tap targets without using chart gestures', () => {
    const layout = resolveNativeResetViewButtonLayout(frame);

    expect(
      resolveNativeResetViewTapTarget({
        frame,
        resetButtonVisible: true,
        x: layout.centerX,
        y: layout.centerY,
        isTradeLineTarget: false,
      }),
    ).toBe('button');

    expect(
      resolveNativeResetViewTapTarget({
        frame,
        resetButtonVisible: false,
        x: 100,
        y: 420,
        isTradeLineTarget: false,
      }),
    ).toBe('reveal');

    expect(
      resolveNativeResetViewTapTarget({
        frame,
        resetButtonVisible: false,
        x: 100,
        y: 420,
        isTradeLineTarget: true,
      }),
    ).toBeNull();

    expect(
      resolveNativeResetViewTapTarget({
        frame,
        resetButtonVisible: false,
        x: 100,
        y: 420,
        isControlTarget: true,
        isTradeLineTarget: false,
      }),
    ).toBeNull();
  });

  it('cancels passive reset taps once movement exceeds tolerance', () => {
    expect(isNativeResetViewTapWithinTolerance(80, 360, 84, 364)).toBe(true);
    expect(isNativeResetViewTapWithinTolerance(80, 360, 80, 369)).toBe(false);
  });
});
