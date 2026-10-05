import type { PlotOutput } from '@tealstreet/tealscript';

import { describe, expect, it } from 'vitest';

import { MobileIndicatorManager } from './MobileIndicatorManager';

function rangeFor(plot: PlotOutput) {
  const manager = new MobileIndicatorManager();
  const panes = manager.getPaneManager();
  panes.addIndicator({ indicatorId: 'script', overlay: false });
  (manager as unknown as { _updateAutoPaneRanges(plots: PlotOutput[]): void })._updateAutoPaneRanges([plot]);
  const pane = panes.getIndicatorPanes()[0];
  return { min: pane.yMin, max: pane.yMax };
}

function plotFor(type: 'plotbar' | 'plotcandle'): PlotOutput {
  return {
    id: 'ohlc',
    scriptId: 'script',
    type,
    title: 'Raw OHLC',
    values: [108, 108],
    openValues: [100, 100],
    highValues: [114, 114],
    lowValues: [96, 96],
    closeValues: [108, 108],
    color: '#abcdef',
  };
}

describe('native pane ranges preserve the former complete OHLC producer mask', () => {
  for (const type of ['plotbar', 'plotcandle'] as const) {
    for (const field of ['openValues', 'highValues', 'lowValues', 'closeValues'] as const) {
      it.each([null, Number.NaN, Number.POSITIVE_INFINITY])(
        `${type}: ignores the entire raw quartet when ${field} is %s`,
        (missing) => {
          // The former producer emitted four null fields for this bar.
          const oldPacket = plotFor(type);
          for (const key of ['openValues', 'highValues', 'lowValues', 'closeValues'] as const) {
            oldPacket[key]![1] = null;
          }
          oldPacket.values[1] = null;
          const rawPacket = plotFor(type);
          rawPacket.openValues![1] = 10_000;
          rawPacket.highValues![1] = 20_000;
          rawPacket.lowValues![1] = -20_000;
          rawPacket.closeValues![1] = -10_000;
          rawPacket[field]![1] = missing;
          rawPacket.values[1] = null;
          const before = structuredClone(rawPacket);

          const previousRange = rangeFor(oldPacket);
          expect(previousRange).toEqual({ min: 94.2, max: 115.8 });
          expect(rangeFor(rawPacket)).toEqual(previousRange);
          expect(rawPacket).toEqual(before);
        },
      );
    }

    it(`${type}: preserves a complete inconsistent quartet's old range`, () => {
      const rawPacket = plotFor(type);
      rawPacket.openValues = [100, 130];
      rawPacket.highValues = [114, 90];
      rawPacket.lowValues = [96, 120];
      rawPacket.closeValues = [108, 80];
      const oldPacket = { ...rawPacket, highValues: [114, 130], lowValues: [96, 80] };
      expect(rangeFor(rawPacket)).toEqual(rangeFor(oldPacket));
      expect(rangeFor(rawPacket)).toEqual({ min: 75, max: 135 });
    });

    it(`${type}: retains show_last, pane visibility and force_overlay eligibility`, () => {
      const packet = plotFor(type);
      packet.openValues![0] = 10_000;
      packet.highValues![0] = 20_000;
      packet.lowValues![0] = -20_000;
      packet.closeValues![0] = -10_000;
      packet.showLast = 1;
      packet.offset = 50;
      expect(rangeFor(packet)).toEqual({ min: 94.2, max: 115.8 });
      expect(rangeFor({ ...packet, showLast: 0 })).toEqual({ min: 0, max: 100 });
      expect(rangeFor({ ...packet, display: 0 })).toEqual({ min: 0, max: 100 });
      expect(rangeFor({ ...packet, display: 8 })).toEqual({ min: 0, max: 100 });
      expect(rangeFor({ ...packet, forceOverlay: true })).toEqual({ min: 0, max: 100 });
    });
  }
});
