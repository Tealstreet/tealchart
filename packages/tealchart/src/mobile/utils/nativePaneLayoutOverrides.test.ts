import type { UnifiedPaneLayout } from '../../types';

import { describe, expect, it } from 'vitest';

import {
  applyNativePaneHeightOverrides,
  createNativePaneLayoutSignature,
  nativePaneHeightsMatchRatios,
  pruneNativePaneHeightOverrides,
} from './nativePaneLayoutOverrides';

function createLayout(mainRatio = 0.75, indicatorRatio = 0.25): UnifiedPaneLayout {
  return {
    panes: [
      { id: 'main', type: 'main', heightRatio: mainRatio, yMin: 0, yMax: 1, fixedRange: false },
      {
        id: 'pane_1',
        type: 'indicator',
        heightRatio: indicatorRatio,
        yMin: -1,
        yMax: 1,
        fixedRange: false,
        indicatorIds: ['macd'],
      },
    ],
    timeAxisHeight: 26,
  };
}

describe('native pane layout overrides', () => {
  it('signs the same layout the same way across fresh wrapper objects', () => {
    const overrides = { main: 0.6, pane_1: 0.4 };

    expect(createNativePaneLayoutSignature(createLayout(), overrides)).toBe(
      createNativePaneLayoutSignature(createLayout(), overrides),
    );
  });

  it('changes the signature when a dragged height changes', () => {
    expect(createNativePaneLayoutSignature(createLayout(), { main: 0.6, pane_1: 0.4 })).not.toBe(
      createNativePaneLayoutSignature(createLayout(), { main: 0.5, pane_1: 0.5 }),
    );
  });

  it('changes the signature when a pane is added or removed', () => {
    const withoutIndicator: UnifiedPaneLayout = { ...createLayout(), panes: [createLayout().panes[0]!] };

    expect(createNativePaneLayoutSignature(createLayout(), {})).not.toBe(
      createNativePaneLayoutSignature(withoutIndicator, {}),
    );
  });

  it('changes the signature when a pane range moves under an override', () => {
    const overrides = { pane_1: 0.4 };
    const scaled = createLayout();
    scaled.panes[1]!.yMin = -2;

    // The pane manager mutates ranges in place, so a signature blind to them
    // would hold a frozen clone and auto-scale would die on the resized pane.
    expect(createNativePaneLayoutSignature(scaled, overrides)).not.toBe(
      createNativePaneLayoutSignature(createLayout(), overrides),
    );
  });

  it('changes the signature when a pane stops auto-scaling', () => {
    const manual = createLayout();
    manual.panes[1]!.autoScale = false;

    expect(createNativePaneLayoutSignature(manual, {})).not.toBe(createNativePaneLayoutSignature(createLayout(), {}));
  });

  it('returns the layout untouched when nothing is overridden', () => {
    const layout = createLayout();

    expect(applyNativePaneHeightOverrides(layout, {})).toBe(layout);
    expect(applyNativePaneHeightOverrides(layout, { pane_9: 0.5 })).toBe(layout);
  });

  it('folds dragged heights into the panes they belong to', () => {
    const applied = applyNativePaneHeightOverrides(createLayout(), { pane_1: 0.4 });

    expect(applied.panes.map((pane) => pane.heightRatio)).toEqual([0.75, 0.4]);
    expect(applied.panes[1]?.indicatorIds).toEqual(['macd']);
  });
});

describe('nativePaneHeightsMatchRatios', () => {
  it('agrees once the panes are laid out at the target ratios', () => {
    expect(
      nativePaneHeightsMatchRatios([{ id: 'main', height: 70 }, { id: 'pane_1', height: 30 }], { main: 0.7, pane_1: 0.3 }),
    ).toBe(true);
  });

  it('disagrees while the layout is still on its way there', () => {
    // What a maximize looks like mid-flight: the ratios say one pane took
    // everything, the frame still has both at their old heights.
    expect(
      nativePaneHeightsMatchRatios([{ id: 'main', height: 70 }, { id: 'pane_1', height: 30 }], { main: 1, pane_1: 0 }),
    ).toBe(false);
    expect(
      nativePaneHeightsMatchRatios([{ id: 'main', height: 100 }, { id: 'pane_1', height: 0 }], { main: 1, pane_1: 0 }),
    ).toBe(true);
  });

  it('normalises both sides, so ratios that do not sum to one still match', () => {
    // A pane that appeared while another was maximised keeps its own height
    // rather than a saved share, so the ratios it lands among sum past one.
    expect(
      nativePaneHeightsMatchRatios(
        [
          { id: 'main', height: 70 },
          { id: 'pane_1', height: 30 },
          { id: 'pane_2', height: 25 },
        ],
        { main: 0.7, pane_1: 0.3, pane_2: 0.25 },
      ),
    ).toBe(true);
  });

  it('ignores panes the ratios say nothing about, and refuses a frame with no height', () => {
    expect(nativePaneHeightsMatchRatios([{ id: 'main', height: 100 }], { pane_9: 0.5 })).toBe(true);
    expect(nativePaneHeightsMatchRatios([{ id: 'main', height: 0 }], { main: 1 })).toBe(false);
  });
});

describe('pruneNativePaneHeightOverrides', () => {
  it('keeps dragged heights while every pane they balanced is present', () => {
    const overrides = { main: 0.4, pane_1: 0.6 };

    expect(pruneNativePaneHeightOverrides(overrides, ['main', 'pane_1'])).toBe(overrides);
  });

  it('keeps them when an unrelated pane is added', () => {
    const overrides = { main: 0.4, pane_1: 0.6 };

    expect(pruneNativePaneHeightOverrides(overrides, ['main', 'pane_1', 'pane_2'])).toBe(overrides);
  });

  it('drops them all when a pane they balanced is deleted', () => {
    // A lone 0.154 lays the main pane out at 15% of the plot and blanks the rest.
    expect(pruneNativePaneHeightOverrides({ main: 0.154, pane_1: 0.846 }, ['main'])).toEqual({});
  });

  it('leaves an empty set alone', () => {
    const overrides = {};

    expect(pruneNativePaneHeightOverrides(overrides, ['main'])).toBe(overrides);
  });
});
