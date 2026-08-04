import type { SharedValue } from 'react-native-reanimated';
import type { Viewport } from '../../types';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';

import { describe, expect, it } from 'vitest';

import { createNativeChartFrameFromPanes } from '../render/nativeChartFrame';
import {
  isNativeCrosshairContextMenuButtonTap,
  NATIVE_CROSSHAIR_CONTEXT_MENU_BUTTON_HIT_RADIUS,
  NATIVE_CROSSHAIR_CONTEXT_MENU_BUTTON_RADIUS,
  nativeCrosshairXToTime,
  nativeCrosshairYToPrice,
  resolveNativeCrosshairContextMenuButtonLayout,
  resolveNativeCrosshairPriceLabelLayout,
} from './nativeCrosshairContextMenu';

function shared<T>(value: T): SharedValue<T> {
  return { value } as SharedValue<T>;
}

function sharedViewport(viewport: Viewport): NativeViewportSharedValues {
  return {
    startTime: shared(viewport.startTime),
    endTime: shared(viewport.endTime),
    priceMin: shared(viewport.priceMin),
    priceMax: shared(viewport.priceMax),
  };
}

const frame = createNativeChartFrameFromPanes({
  dimensions: { width: 220, height: 180, margins: { top: 0, right: 50, bottom: 40, left: 20 } },
  panes: [{ id: 'main', type: 'main', top: 36, height: 104, yMin: 62_000, yMax: 64_000 }],
});

const widePriceAxisFrame = createNativeChartFrameFromPanes({
  dimensions: { width: 390, height: 320, margins: { top: 0, right: 160, bottom: 40, left: 20 } },
  panes: [{ id: 'main', type: 'main', top: 36, height: 244, yMin: 1_800, yMax: 1_900 }],
});

describe('native crosshair context menu geometry', () => {
  it('places the plus button just left of the crosshair price label', () => {
    const priceLabel = resolveNativeCrosshairPriceLabelLayout(frame, 2);

    expect(resolveNativeCrosshairContextMenuButtonLayout(frame, 80, 2)).toEqual({
      centerX: priceLabel.x - 11,
      centerY: 80,
      radius: NATIVE_CROSSHAIR_CONTEXT_MENU_BUTTON_RADIUS,
      hitRadius: NATIVE_CROSSHAIR_CONTEXT_MENU_BUTTON_HIT_RADIUS,
    });
  });

  it('keeps the plus button near a right-aligned price label in a wide price axis lane', () => {
    const priceLabel = resolveNativeCrosshairPriceLabelLayout(widePriceAxisFrame, 1);
    const button = resolveNativeCrosshairContextMenuButtonLayout(widePriceAxisFrame, 180, 1);

    expect(priceLabel.x).toBeGreaterThan(widePriceAxisFrame.priceAxisLeft);
    expect(button.centerX).toBe(priceLabel.x - 11);
  });

  it('sizes crosshair price labels from the displayed price text', () => {
    const capacityLabel = resolveNativeCrosshairPriceLabelLayout(widePriceAxisFrame, 0.0001);
    const displayedLabel = resolveNativeCrosshairPriceLabelLayout(widePriceAxisFrame, 0.0001, '2.1033');
    const displayedButton = resolveNativeCrosshairContextMenuButtonLayout(widePriceAxisFrame, 180, 0.0001, '2.1033');
    const viewport = sharedViewport({ startTime: 1_000, endTime: 2_000, priceMin: 1.9, priceMax: 2.3 });

    expect(displayedLabel.width).toBeLessThan(capacityLabel.width);
    expect(displayedLabel.x).toBeGreaterThan(capacityLabel.x);
    expect(displayedButton.centerX).toBe(displayedLabel.x - 11);
    expect(
      isNativeCrosshairContextMenuButtonTap({
        frame: widePriceAxisFrame,
        crosshairY: 158,
        pricePrecision: 0.0001,
        sharedViewport: viewport,
        x: displayedButton.centerX,
        y: 180,
      }),
    ).toBe(true);
  });

  it('lets wide crosshair price labels grow left without truncating the menu anchor', () => {
    const label = resolveNativeCrosshairPriceLabelLayout(frame, 0.000001, '63,777.000000');
    const button = resolveNativeCrosshairContextMenuButtonLayout(frame, 80, 0.000001, '63,777.000000');
    const right = frame.dimensions.width - 4;

    expect(label.x).toBeLessThan(frame.priceAxisLeft);
    expect(label.x + label.width).toBe(right);
    expect(label.textX + Math.ceil('63,777.000000'.length * 6.8)).toBe(right - 6);
    expect(button.centerX).toBe(label.x - 11);
  });

  it('hit-tests the generous mobile plus button target', () => {
    const layout = resolveNativeCrosshairContextMenuButtonLayout(frame, 80, 2);

    expect(
      isNativeCrosshairContextMenuButtonTap({
        frame,
        crosshairY: 80,
        pricePrecision: 2,
        x: layout.centerX,
        y: layout.centerY,
      }),
    ).toBe(true);
    expect(
      isNativeCrosshairContextMenuButtonTap({
        frame,
        crosshairY: 80,
        pricePrecision: 2,
        x: layout.centerX + layout.hitRadius + 0.1,
        y: layout.centerY,
      }),
    ).toBe(false);
  });

  it('projects crosshair coordinates to context menu callback time and price', () => {
    const viewport = sharedViewport({ startTime: 1_000, endTime: 2_000, priceMin: 62_000, priceMax: 64_000 });

    expect(nativeCrosshairXToTime((frame.contentLeft + frame.contentRight) / 2, viewport, frame)).toBe(1_500);
    expect(nativeCrosshairYToPrice(frame.mainPane.top, viewport, frame)).toBe(64_000);
    expect(nativeCrosshairYToPrice(frame.mainPane.bottom, viewport, frame)).toBe(62_000);
  });
});
