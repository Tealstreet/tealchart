import { DashPathEffect, Path } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { executePlotstyleV93 } from '../../../../tealscript/tests/helpers/plotstyleV93';

import { nativePlotHarness, testPlot } from '../../test/nativePlotPaintHarness';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));

describe('native plot audit gaps', () => {
  it.each([false, true])('closes every areabr island (static=%s)', (staticMode) => {
    const paths = nativePlotHarness(
      [testPlot({ style: 'areabr', values: [10, 20, null, 40, 50] })],
      staticMode,
    ).paths();
    const fill = paths.find((path) => path.props.style !== 'stroke')!;
    expect(fill.path.close).toHaveBeenCalledTimes(2);
  });
  it('keeps the residual trackprice line during a historical pan', () => {
    const harness = nativePlotHarness([testPlot({ trackprice: true })]);
    harness.sharedViewport.endTime.value = 2000;
    expect(
      harness.paths().some(({ path }) => vi.mocked(path.lineTo).mock.calls.some(([x, y]) => x === 400 && y === 100)),
    ).toBe(true);
  });
  it('does not join point markers across na', () => {
    const paths = nativePlotHarness([
      testPlot({ style: 'circles', join: true, values: [10, 20, null, 40, 50] }),
    ]).paths();
    const joined = paths.find((path) => path.props.style === 'stroke')!;
    expect(joined.path.moveTo).toHaveBeenCalledTimes(2);
  });
  it('preserves histogram alpha without an extra native opacity', () => {
    expect(nativePlotHarness([testPlot({ style: 'histogram' })]).paths()[0]!.opacity).toBe(1);
  });
  it('paints trackprice at the latest visible value with the default dotted stroke', () => {
    const harness = nativePlotHarness([testPlot({ trackprice: true })]);
    const paths = harness.paths();
    expect(
      paths.some(
        ({ path }) =>
          vi.mocked(path.moveTo).mock.calls.some(([x, y]) => x === 0 && y === 100) &&
          vi.mocked(path.lineTo).mock.calls.some(([x, y]) => x === 400 && y === 100),
      ),
    ).toBe(true);
    expect(
      harness
        .primitives()
        .some((primitive) => primitive.type === DashPathEffect && primitive.props.intervals.join(',') === '2,3'),
    ).toBe(true);
  });
});


// Same authenticated v93 item-8 v6 plots as the web stroke-class lock. Synthetic
// five-bar geometry isolates Skia stroke classes; it earns no native pixel credit.
describe('v93 plotstyle native stroke classes', () => {
  for (const staticMode of [false, true]) {
    it.each(['SOLID', 'DASHED', 'DOTTED'])('%s keeps its class in Skia (static=' + staticMode + ')', title => {
      const { result } = executePlotstyleV93();
      const plot = result.plots.find(p => p.title === title)!;
      const harness = nativePlotHarness([{ ...plot, scriptId: 's', values: plot.values.slice(0, 5),
        color: Array.isArray(plot.color) ? plot.color.slice(0, 5) : plot.color }], staticMode);
      expect(harness.paths().filter(p => p.props.style === 'stroke').length).toBeGreaterThan(0);
      const effects = harness.primitives().filter(p => p.type === DashPathEffect);
      if (title === 'SOLID') expect(effects).toHaveLength(0);
      else {
        expect(effects.length).toBeGreaterThan(0);
        effects.forEach(effect => {
          const pattern = effect.props.intervals as number[];
          expect(pattern).toHaveLength(2);
          expect(pattern.every(n => n > 0)).toBe(true);
          if (title === 'DASHED') expect(pattern[0]).toBeGreaterThan(pattern[1]);
          else expect(pattern[0]).toBeLessThan(pattern[1]);
        });
      }
    });
  }
});
