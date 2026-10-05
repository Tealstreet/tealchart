import { Path, Skia } from '@shopify/react-native-skia';
import { describe, expect, it, vi } from 'vitest';

import { nativePrimitives, testBars, testFrame, testPlot } from '../../test/nativePlotPaintHarness';
import { NativeIndicatorPlotLayerImpl } from './NativeIndicatorPlotLayer';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));
function colors(explicitPlotZOrder: boolean) {
  const plots = [
    testPlot({ scriptId: 's', color: 'red', zOrder: 2 }),
    testPlot({ scriptId: 's', id: 'q', color: 'blue', zOrder: 0 }),
    testPlot({ scriptId: 's', type: 'fill', id: 'f', color: 'green', plot1Id: 'p', plot2Id: 'q', zOrder: 1 }),
  ];
  return nativePrimitives(
    NativeIndicatorPlotLayerImpl({
      bars: testBars,
      visibleBars: testBars,
      frame: testFrame,
      totalBarCount: 5,
      plots,
      indicatorPaneInfo: { s: { overlay: true, explicitPlotZOrder } },
      textFont: Skia.Font(null, 12),
      sharedViewport: {
        startTime: { value: 0 },
        endTime: { value: 4000 },
        priceMin: { value: 0 },
        priceMax: { value: 100 },
      },
    }),
  )
    .filter((p) => p.type === Path)
    .map((p) => p.props.color);
}
describe('native plot stacking', () => {
  it('paints default fills beneath their script plots', () => expect(colors(false)).toEqual(['green', 'red', 'blue']));
  it('honors explicit plot call order for plots, levels and fills', () =>
    expect(colors(true)).toEqual(['blue', 'green', 'red']));
});
