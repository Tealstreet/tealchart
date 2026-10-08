import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Reference: pine-v6-reference-v1.json indicator/library parameter signatures.
// Checks declaration transport with supplied hourly bars, not chart rendering.
const bars = [7, -3].map((close, index) => ({
  time: (index + 1) * 3_600_000, open: close, high: close, low: close, close, volume: 10,
}));
const indicators = [
  'indicator("Transport", behind_chart=false, dynamic_requests=false, max_polylines_count=7, calc_bars_count=0, max_boxes_count=6, max_labels_count=4, max_lines_count=5, explicit_plot_zorder=true, timeframe_gaps=false, timeframe="60", max_bars_back=2, scale=scale.left, precision=3, format=format.volume, overlay=true, shorttitle="T")',
];
const libraries = [
  'library("Library transport", true, false)',
  'library("Library transport", dynamic_requests=false, overlay=true)',
];

function run(declaration: string, body: string) {
  const source = `//@version=6\n${declaration}\n${body}`;
  expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const result = runCompatScript(source, {
    bars, engineOptions: { runtime: { timeframe: { period: '60', multiplier: 60, isminutes: true, isintraday: true } } },
  });
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'Result').values).toEqual([7, -3]);
  return result.declaration;
}

describe('v6 declaration option transport', () => {
  it.each(indicators)('preserves named indicator options: %s', (declaration) => {
    expect(run(declaration, 'plot(close, "Result")')).toEqual({
      title: 'Transport', shortTitle: 'T', overlay: true, precision: 3, format: 'volume', scale: 'left',
      timeframe: '60', timeframeGaps: false, explicitPlotZOrder: true, behindChart: false,
      calcBarsCount: 0, maxBarsBack: 2, dynamicRequests: false,
      drawingLimits: { label: 4, line: 5, box: 6, polyline: 7 },
    });
  });
  it.each(libraries)('preserves all library options: %s', (declaration) => {
    expect(run(declaration, 'export identity(float x) => x\nplot(identity(close), "Result")')).toMatchObject({
      title: 'Library transport', overlay: true, dynamicRequests: false,
    });
  });
});
