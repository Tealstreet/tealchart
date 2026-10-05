import type { PlotOutput } from '@tealstreet/tealscript';

import { describe, expect, it, vi } from 'vitest';

import { nativePlotHarness, testPlot } from '../../test/nativePlotPaintHarness';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));

function drawing(plot: PlotOutput, staticMode: boolean) {
  return nativePlotHarness([plot], staticMode)
    .paths()
    .map((paint) => {
      const commands = (['moveTo', 'lineTo', 'close', 'addRect'] as const)
        .flatMap((method) => {
          const mock = vi.mocked(paint.path[method]);
          return mock.mock.calls.map((arguments_, index) => ({
            order: mock.mock.invocationCallOrder[index],
            command: [method, ...arguments_],
          }));
        })
        .sort((a, b) => a.order - b.order)
        .map(({ command }) => command);
      return {
        color: paint.props.color,
        style: paint.props.style ?? 'fill',
        strokeWidth: paint.props.strokeWidth,
        opacity: paint.opacity,
        commands,
      };
    })
    .filter((paint) => paint.commands.length > 0);
}

// This is the OLD producer packet for the five raw inputs below, calculated
// by the removed Math.max/Math.min(open,high,low,close) producer contract.
// It preserves current rendering behavior; it is not a TV geometry oracle.
const oldFields = {
  openValues: [10, 30, 5, 25, 10],
  highValues: [20, 30, 30, 35, 10],
  lowValues: [5, 5, 5, 15, 10],
  closeValues: [15, 5, 30, 20, 10],
};
const rawFields = {
  ...oldFields,
  highValues: [20, 10, 20, 15, 10],
  lowValues: [5, 20, 10, 35, 10],
};

describe('native raw OHLC adapter preserves the old producer geometry', () => {
  for (const type of ['plotbar', 'plotcandle'] as const) {
    it.each([false, true])(`preserves every ${type} draw command and style (static=%s)`, (staticMode) => {
      const options = {
        type,
        values: [15, 5, 30, 20, 10],
        color: '#12345680',
        wickColor: '#65432180',
        borderColor: '#abcdef40',
      };
      const baseline = drawing(testPlot({ ...options, ...oldFields }), staticMode);
      expect(baseline.length).toBeGreaterThan(0);
      if (process.env.NATIVE_OHLC_PRESERVATION_CAPTURE) {
        console.log(`OHLC_BASELINE ${type}/${staticMode} ${JSON.stringify(baseline)}`);
      }
      const packet = testPlot({ ...options, ...rawFields });
      const before = JSON.stringify(packet);
      expect(JSON.stringify(drawing(packet, staticMode))).toBe(JSON.stringify(baseline));
      expect(JSON.stringify(packet)).toBe(before);
    });

    for (const field of ['openValues', 'highValues', 'lowValues', 'closeValues'] as const) {
      for (const missing of [null, Number.NaN, Number.POSITIVE_INFINITY]) {
        it.each([false, true])(
          `suppresses complete ${type} glyphs with ${field}=${missing} (static=%s)`,
          (staticMode) => {
            const packet = testPlot({
              type,
              values: [15],
              openValues: [10],
              highValues: [20],
              lowValues: [5],
              closeValues: [15],
              [field]: [missing],
              color: '#12345680',
              wickColor: '#65432180',
              borderColor: '#abcdef40',
            });
            expect(drawing(packet, staticMode)).toEqual([]);
          },
        );
      }
    }
  }
});
