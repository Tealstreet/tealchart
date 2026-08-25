import { describe, expect, it } from 'vitest';

import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import {
  resolveNativeIndicatorPaneAxisSlot,
  resolveNativeIndicatorPaneAxisSlots,
} from './NativeIndicatorPaneAxisLayer';

const dimensions = {
  width: 402,
  height: 504,
  margins: { top: 36, right: 64, bottom: 26, left: 0 },
};

function frameWith(indicatorPane: { yMin: number; yMax: number; top?: number; height?: number }) {
  return createNativeChartFrameFromPanes({
    dimensions,
    panes: [
      { id: 'main', type: 'main', top: 36, height: 376, yMin: 0, yMax: 1 },
      {
        id: 'pane_1',
        type: 'indicator',
        top: indicatorPane.top ?? 412,
        height: indicatorPane.height ?? 66,
        yMin: indicatorPane.yMin,
        yMax: indicatorPane.yMax,
      },
    ],
  });
}

function slotsFor(pane: { yMin: number; yMax: number; top?: number; height?: number }) {
  const frame = frameWith(pane);
  const indicator = frame.panes.find((entry) => entry.type === 'indicator')!;
  return resolveNativeIndicatorPaneAxisSlots({
    frame,
    labelLeft: 346,
    maxCharacters: 9,
    pane: indicator,
  });
}

describe('NativeIndicatorPaneAxisLayer', () => {
  // Two properties at once. The end ticks land exactly on pane.top and
  // pane.bottom, and culling them left the axis blank. And an indicator pane is
  // a fraction of the main pane's height carrying a full range, so on the main
  // pane's label spacing it got nothing between them.
  it('fills a short fixed-range pane rather than showing only its ends', () => {
    const visible = slotsFor({ yMin: 0, yMax: 100 }).filter((slot) => slot.visible);

    expect(visible.map((slot) => slot.labelText)).toEqual(['0', '50', '100']);
  });

  it('keeps every label inside its own pane', () => {
    const frame = frameWith({ yMin: 0, yMax: 100 });
    const pane = frame.panes.find((entry) => entry.type === 'indicator')!;

    for (const slot of slotsFor({ yMin: 0, yMax: 100 }).filter((entry) => entry.visible)) {
      expect(slot.labelY).toBeGreaterThanOrEqual(pane.top);
      expect(slot.labelY).toBeLessThanOrEqual(pane.bottom);
      expect(slot.y).toBeGreaterThanOrEqual(pane.top - 0.5);
      expect(slot.y).toBeLessThanOrEqual(pane.bottom + 0.5);
    }
  });

  it('scales ticks to the pane, not to the main price viewport', () => {
    const frame = frameWith({ yMin: 0, yMax: 100 });
    const pane = frame.panes.find((entry) => entry.type === 'indicator')!;
    const visible = slotsFor({ yMin: 0, yMax: 100 }).filter((slot) => slot.visible);

    const top = visible.find((slot) => slot.value === 100)!;
    const bottom = visible.find((slot) => slot.value === 0)!;

    expect(top.y).toBeCloseTo(pane.top, 5);
    expect(bottom.y).toBeCloseTo(pane.bottom, 5);
  });

  // MACD on a 2-decimal market still needs whatever the step requires, so the
  // decimals come from the tick spacing rather than the instrument's precision.
  it('takes decimals from the tick spacing', () => {
    const labels = slotsFor({ yMin: -0.4, yMax: 0.4 })
      .filter((slot) => slot.visible)
      .map((slot) => slot.labelText);

    expect(labels.length).toBeGreaterThan(0);
    expect(labels.some((label) => label.includes('.'))).toBe(true);
  });

  it('left-aligns labels to the shared axis lane edge', () => {
    const slots = slotsFor({ yMin: 0, yMax: 100 }).filter((slot) => slot.visible);

    for (const slot of slots) {
      expect(slot.labelX).toBe(346);
    }
  });

  it('renders nothing for a collapsed or rangeless pane', () => {
    expect(slotsFor({ yMin: 0, yMax: 100, height: 0 })).toEqual([]);
    expect(slotsFor({ yMin: 5, yMax: 5 })).toEqual([]);
  });

  // The batch helper returns early on a zero-height pane, so it never exercised
  // the per-slot path. A pane collapsed by a maximize goes through that path,
  // where top === bottom made every tick "visible" and dropped its label 10px
  // below the seam, into the pane underneath.
  it('draws nothing for a pane a maximize has collapsed', () => {
    const frame = frameWith({ yMin: 0, yMax: 100 });
    const indicator = frame.panes.find((entry) => entry.type === 'indicator')!;
    const collapsed = { ...indicator, top: 400, bottom: 400, height: 0 };
    const slot = resolveNativeIndicatorPaneAxisSlot({
      frame,
      index: 0,
      labelLeft: 346,
      maxCharacters: 9,
      pane: collapsed,
      range: { yMin: 0, yMax: 100 },
    });

    expect(slot.visible).toBe(false);
  });
});
