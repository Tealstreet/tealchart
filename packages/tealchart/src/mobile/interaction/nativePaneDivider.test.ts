import type { NativeChartFrame, NativePaneFrame } from '../render/nativeChartFrame';

import { describe, expect, it } from 'vitest';

import {
  NATIVE_PANE_DIVIDER_HIT_ZONE,
  resolveNativePaneDividerAtY,
  resolveNativePaneDividerBands,
  resolveNativePaneDividerHeights,
} from './nativePaneDivider';

function pane(id: string, top: number, height: number, type: 'main' | 'indicator' = 'indicator'): NativePaneFrame {
  return { bottom: top + height, height, id, top, type, yMax: 1, yMin: 0 };
}

/** 400pt of pane area: main 200, then two indicator panes of 100. */
function frameWithPanes(panes: NativePaneFrame[]): NativeChartFrame {
  return { mainPane: panes[0]!, panes } as NativeChartFrame;
}

const FRAME = frameWithPanes([pane('main', 0, 200, 'main'), pane('pane_1', 200, 100), pane('pane_2', 300, 100)]);

describe('resolveNativePaneDividerAtY', () => {
  it('captures every pane, so each gets its own bitmap to stretch', () => {
    expect(resolveNativePaneDividerAtY(FRAME, 200)?.panes).toEqual([
      { height: 200, paneId: 'main', top: 0 },
      { height: 100, paneId: 'pane_1', top: 200 },
      { height: 100, paneId: 'pane_2', top: 300 },
    ]);
  });

  it('derives ratios from the frame, which already sums to the pane area', () => {
    const target = resolveNativePaneDividerAtY(FRAME, 200);
    expect(target).toMatchObject({
      availableHeight: 400,
      dividerIndex: 0,
      paneAboveId: 'main',
      paneAboveRatio: 0.5,
      paneBelowId: 'pane_1',
      paneBelowRatio: 0.25,
      y: 200,
    });
  });

  it('accepts a touch anywhere in the hit zone and rejects one outside it', () => {
    expect(resolveNativePaneDividerAtY(FRAME, 200 + NATIVE_PANE_DIVIDER_HIT_ZONE)).not.toBeNull();
    expect(resolveNativePaneDividerAtY(FRAME, 200 + NATIVE_PANE_DIVIDER_HIT_ZONE + 1)).toBeNull();
  });

  it('finds the divider between two indicator panes', () => {
    expect(resolveNativePaneDividerAtY(FRAME, 300)?.paneAboveId).toBe('pane_1');
  });

  // The last pane's bottom is the time axis, not a divider; dragging it would
  // resize a pane against nothing.
  it('never reports a divider below the last pane', () => {
    expect(resolveNativePaneDividerAtY(FRAME, 400)).toBeNull();
  });

  it('reports nothing when there is only one pane', () => {
    expect(resolveNativePaneDividerAtY(frameWithPanes([pane('main', 0, 400, 'main')]), 400)).toBeNull();
  });
});

describe('resolveNativePaneDividerHeights', () => {
  const target = resolveNativePaneDividerAtY(FRAME, 300)!;

  it('grows the pane above when the finger moves down, conserving the pair', () => {
    const [above, below] = resolveNativePaneDividerHeights({ target, translationY: 40 });
    expect(above).toEqual({ heightRatio: 0.35, paneId: 'pane_1' });
    expect(below).toEqual({ heightRatio: 0.15, paneId: 'pane_2' });
    expect(above!.heightRatio + below!.heightRatio).toBeCloseTo(0.5);
  });

  it('grows the pane below when the finger moves up', () => {
    const [above, below] = resolveNativePaneDividerHeights({ target, translationY: -40 });
    expect(above!.heightRatio).toBeCloseTo(0.15);
    expect(below!.heightRatio).toBeCloseTo(0.35);
  });

  // Without this a pane can be dragged to zero height and then never grabbed again.
  it('clamps each pane to a tenth of the pair, however far the drag goes', () => {
    const [above, below] = resolveNativePaneDividerHeights({ target, translationY: 10_000 });
    expect(above!.heightRatio).toBeCloseTo(0.45);
    expect(below!.heightRatio).toBeCloseTo(0.05);

    const [aboveUp, belowUp] = resolveNativePaneDividerHeights({ target, translationY: -10_000 });
    expect(aboveUp!.heightRatio).toBeCloseTo(0.05);
    expect(belowUp!.heightRatio).toBeCloseTo(0.45);
  });

  it('is a no-op at zero translation', () => {
    const [above, below] = resolveNativePaneDividerHeights({ target, translationY: 0 });
    expect(above!.heightRatio).toBeCloseTo(target.paneAboveRatio);
    expect(below!.heightRatio).toBeCloseTo(target.paneBelowRatio);
  });
});

describe('resolveNativePaneDividerBands', () => {
  it('stretches only the dragged pair and leaves every other pane where it was', () => {
    const target = resolveNativePaneDividerAtY(FRAME, 300)!;
    expect(resolveNativePaneDividerBands({ target, translationY: 40 })).toEqual([
      { height: 200, paneId: 'main', srcHeight: 200, srcTop: 0, top: 0 },
      { height: 140, paneId: 'pane_1', srcHeight: 100, srcTop: 200, top: 200 },
      { height: 60, paneId: 'pane_2', srcHeight: 100, srcTop: 300, top: 340 },
    ]);
  });

  // The bands must tile the pane area exactly, or the drag shows a seam where
  // two bitmaps meet, or one overlaps the next.
  it('tiles the pane area with no gap or overlap, at any drag distance', () => {
    const target = resolveNativePaneDividerAtY(FRAME, 200)!;
    for (const translationY of [-10_000, -37, 0, 12, 10_000]) {
      const bands = resolveNativePaneDividerBands({ target, translationY });
      for (let index = 1; index < bands.length; index += 1) {
        expect(bands[index]!.top).toBeCloseTo(bands[index - 1]!.top + bands[index - 1]!.height);
      }
      const last = bands[bands.length - 1]!;
      expect(last.top + last.height).toBeCloseTo(400);
    }
  });

  it('keeps every source rect pointing at what was captured', () => {
    const target = resolveNativePaneDividerAtY(FRAME, 200)!;
    const bands = resolveNativePaneDividerBands({ target, translationY: 25 });
    expect(bands.map((band) => [band.paneId, band.srcTop, band.srcHeight])).toEqual([
      ['main', 0, 200],
      ['pane_1', 200, 100],
      ['pane_2', 300, 100],
    ]);
  });
});
