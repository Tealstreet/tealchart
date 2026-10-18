import { describe, expect, it, vi } from 'vitest';
import { Skia } from '@shopify/react-native-skia';
import { executeStack, stackEntries } from '../../../../tealscript/tests/fixtures/v102Stack';
import { testFrame } from '../../test/nativePlotPaintHarness';
import { NativeIndicatorPlotLayerImpl } from './NativeIndicatorPlotLayer';

vi.mock('react', async (importOriginal) => ({ ...await importOriginal<typeof import('react')>(), useMemo: <T,>(factory: () => T) => factory() }));
function plotTitles(node: any): string[] {
  if (Array.isArray(node)) return node.flatMap(plotTitles);
  if (!node?.props) return [];
  const plot = node.props.plot ?? node.props.fill;
  return plot ? [plot.title] : plotTitles(node.props.children);
}
describe('v102 native plot layer: captured default and explicit control', () => {
  for (const entry of stackEntries) it(entry.id, () => {
    const { result, bars } = executeStack(entry);
    const mobileBars = bars.map((bar, sourceIndex) => ({ ...bar, sourceIndex, interval: 120000, x: sourceIndex }));
    const node = NativeIndicatorPlotLayerImpl({ bars: mobileBars, visibleBars: mobileBars, frame: testFrame, totalBarCount: bars.length,
      plots: result.plots.map(plot => ({ ...plot, scriptId: 'captured' })),
      indicatorPaneInfo: { captured: { overlay: false, paneId: 'study', explicitPlotZOrder: result.declaration.explicitPlotZOrder } },
      textFont: Skia.Font(null, 12), sharedViewport: { startTime: { value: bars[0].time }, endTime: { value: bars[bars.length - 1].time }, priceMin: { value: 0 }, priceMax: { value: 100 } },
    });
    const titles = plotTitles(node);
    for (const title of ['LATE_FILL', 'BLUE_PLOT', 'GREEN_HLINE']) expect(titles).toContain(title);
    const fill = titles.indexOf('LATE_FILL');
    for (const title of ['BLUE_PLOT', 'GREEN_HLINE']) {
      if (entry.id.includes('-true-')) expect(fill).toBeGreaterThan(titles.indexOf(title));
      else expect(fill).toBeLessThan(titles.indexOf(title));
    }
  });
});
