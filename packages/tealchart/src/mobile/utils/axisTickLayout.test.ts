import { describe, expect, it } from 'vitest';

import { createNativeChartFrameFromPanes } from '../render/nativeChartFrame';
import {
  clampNativePriceAxisTickLabelY,
  clampNativeTimeAxisTickLabelX,
  createNativePriceAxisTickLabelLayout,
  createNativePriceAxisTickTextLayout,
  createNativeRightAlignedAxisTextX,
  createNativeTimeAxisTickLabelLayout,
  createNativeTimeAxisTickTextLayout,
  getNativeAxisTextCharacterCapacity,
} from './axisTickLayout';

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 390,
    height: 480,
    margins: { bottom: 32, left: 62, right: 76, top: 44 },
  },
  panes: [{ id: 'main', type: 'main', top: 44, height: 404, yMin: 62000, yMax: 66000 }],
});

describe('native axis tick layout', () => {
  it('keeps price labels inside the reserved price-axis lane', () => {
    const layout = createNativePriceAxisTickLabelLayout({
      frame,
      text: '64,000',
      textWidth: 54,
      y: 220,
    });

    expect(layout.x).toBeGreaterThanOrEqual(frame.priceAxisLeft);
    expect(layout.x + 54).toBeLessThanOrEqual(frame.priceAxisRight - 4);
    expect(layout.x + 54).toBe(frame.priceAxisRight - 4);
    expect(layout.text).toBe('64,000');
    expect(layout.y).toBe(224);
    expect(layout.maxWidth).toBe(frame.priceAxisRight - frame.priceAxisLeft - 8);
    expect(layout.right).toBe(frame.priceAxisRight - 4);
  });

  it('separates static price-axis tick text layout from animated y clamping', () => {
    const layout = createNativePriceAxisTickTextLayout({
      frame,
      text: '64,000',
      textWidth: 54,
    });

    expect(layout).toEqual({
      text: '64,000',
      x: frame.priceAxisRight - 4 - 54,
      maxWidth: frame.priceAxisRight - frame.priceAxisLeft - 8,
      right: frame.priceAxisRight - 4,
    });
    expect(clampNativePriceAxisTickLabelY(frame, 220)).toBe(224);
  });

  it('clamps price label baselines to the visible main pane', () => {
    expect(createNativePriceAxisTickLabelLayout({ frame, text: '64,000', textWidth: 54, y: 0 }).y).toBe(frame.mainPane.top + 11);
    expect(createNativePriceAxisTickLabelLayout({ frame, text: '64,000', textWidth: 54, y: 999 }).y).toBe(frame.mainPane.bottom - 3);
  });

  it('fits oversized price labels before aligning to the right axis edge', () => {
    const layout = createNativePriceAxisTickLabelLayout({
      frame,
      text: '1234567890',
      textWidth: 120,
      y: 220,
      fitText: () => ({ text: '123...', width: 42 }),
    });

    expect(layout.text).toBe('123...');
    expect(layout.x + 42).toBe(frame.priceAxisRight - 4);
  });

  it('does not claim oversized text fits without an explicit fitter', () => {
    const layout = createNativePriceAxisTickLabelLayout({
      frame,
      text: '1234567890',
      textWidth: 120,
      y: 220,
    });

    expect(layout.text).toBe('1234567890');
    expect(layout.x).toBe(frame.priceAxisLeft + 4);
    expect(layout.x + 120).toBeGreaterThan(frame.priceAxisRight - 4);
  });

  it('right-aligns live price labels with their own fitted length', () => {
    const right = frame.priceAxisRight - 4;
    const characterWidth = 6;
    const maxWidth = 42;

    expect(createNativeRightAlignedAxisTextX(right, 7, characterWidth, maxWidth)).toBe(right - 42);
    expect(createNativeRightAlignedAxisTextX(right, 5, characterWidth, maxWidth)).toBe(right - 30);
    expect(createNativeRightAlignedAxisTextX(right, 20, characterWidth, maxWidth)).toBe(right - 42);
  });

  it('derives price-label slot capacity from the reserved axis lane', () => {
    expect(getNativeAxisTextCharacterCapacity(68, 7)).toBe(9);
    expect(getNativeAxisTextCharacterCapacity(0, 7)).toBe(1);
    expect(getNativeAxisTextCharacterCapacity(68, 0)).toBe(1);
  });

  it('keeps time labels inside the plot time-content lane', () => {
    const left = createNativeTimeAxisTickLabelLayout({ frame, text: '00:00', textWidth: 36, x: frame.contentLeft });
    const center = createNativeTimeAxisTickLabelLayout({ frame, text: '00:00', textWidth: 36, x: frame.contentLeft + frame.contentWidth / 2 });
    const right = createNativeTimeAxisTickLabelLayout({ frame, text: '00:00', textWidth: 36, x: frame.contentRight });

    expect(left.x).toBe(frame.contentLeft);
    expect(center.x).toBe(frame.contentLeft + frame.contentWidth / 2 - 18);
    expect(right.x + 36).toBe(frame.contentRight);
    expect(center.y).toBe(frame.timeAxisTop + 18);
  });

  it('separates static time-axis tick text layout from animated x clamping', () => {
    const layout = createNativeTimeAxisTickTextLayout({
      frame,
      text: '00:00',
      textWidth: 36,
    });

    expect(layout).toEqual({
      text: '00:00',
      width: 36,
      y: frame.timeAxisTop + 18,
      maxWidth: frame.contentRight - frame.contentLeft,
      right: frame.contentRight,
    });
    expect(clampNativeTimeAxisTickLabelX(frame, frame.contentLeft, 36)).toBe(frame.contentLeft);
    expect(clampNativeTimeAxisTickLabelX(frame, frame.contentRight, 36)).toBe(frame.contentRight - 36);
  });

  it('fits oversized time labels before clamping to the time content lane', () => {
    const narrowFrame = createNativeChartFrameFromPanes({
      dimensions: {
        width: 120,
        height: 220,
        margins: { bottom: 32, left: 62, right: 76, top: 44 },
      },
      panes: [{ id: 'main', type: 'main', top: 44, height: 144, yMin: 62000, yMax: 66000 }],
    });
    const layout = createNativeTimeAxisTickLabelLayout({
      frame: narrowFrame,
      text: '00:00:00',
      textWidth: 96,
      x: narrowFrame.contentRight,
      fitText: () => ({ text: '00...', width: 40 }),
    });

    expect(layout.text).toBe('00...');
    expect(layout.x + 40).toBe(narrowFrame.contentRight);
  });
});
