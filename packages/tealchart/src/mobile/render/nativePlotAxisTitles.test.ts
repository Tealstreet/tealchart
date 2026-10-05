import type { PlotOutput } from '@tealstreet/tealscript';

import { describe, expect, it } from 'vitest';

import { testBars, testFrame, testPlot } from '../../test/nativePlotPaintHarness';
import { resolveNativeIndicatorOutputAxisLabels } from './NativeIndicatorOutputAxisLabelLayer';

const families = ['plot', 'plotshape', 'plotchar', 'plotarrow', 'plotbar', 'plotcandle'] as const;
describe('native plot axis titles', () => {
  it.each(families)('includes the authored %s title only when the scale setting enables it', (type) => {
    const plot: PlotOutput = testPlot({
      type,
      scriptId: 's',
      title: 'Authored title',
      values: [10, 20, 30, 40, 50],
      openValues: [10, 20, 30, 40, 50],
      highValues: [10, 20, 30, 40, 50],
      lowValues: [10, 20, 30, 40, 50],
      closeValues: [10, 20, 30, 40, 50],
      display: 8,
      precision: 2,
      format: 'percent',
      forceOverlay: true,
    });
    const args = {
      bars: testBars,
      frame: testFrame,
      indicatorPaneInfo: { s: { overlay: false, paneId: 'study' } },
      mainPaneRange: { yMin: 0, yMax: 100 },
      plots: [plot],
      totalBarCount: 5,
    };
    const plain = resolveNativeIndicatorOutputAxisLabels(args);
    expect(plain).toHaveLength(1);
    expect(plain[0].text).toBe('50.00%');
    expect(plain[0].pane.id).toBe('main');
    expect(resolveNativeIndicatorOutputAxisLabels({ ...args, showIndicatorOutputAxisLabelTitles: true })[0].text).toBe(
      'Authored title 50.00%',
    );
    expect(resolveNativeIndicatorOutputAxisLabels({ ...args, showIndicatorOutputAxisLabelTitles: false })[0].text).toBe(
      '50.00%',
    );
  });
});
