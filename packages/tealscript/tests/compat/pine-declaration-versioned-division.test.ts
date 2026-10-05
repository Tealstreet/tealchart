import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// The v6 migration changes const-int division; float operands retain fractions.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants
describe('declaration properties use the script division rules', () => {
  it.each([
    [5, '7 / 2', '', 3],
    [6, '7 / 2', '', 3.5],
    [5, '(7 / 2) + 1', '', 4],
    [5, '(7 / 2) / 2', '', 1],
    [5, 'N / 2', 'const int N = 7\n', 3],
    [5, 'N / 2', 'const float N = 7\n', 3.5],
    [5, '7.0 / 2', '', 3.5],
    [5, '7 / 2.0', '', 3.5],
  ])('v%s evaluates %s consistently', (version, value, setup, expected) => {
    const result = runCompatScript(
      `//@version=${version}\n${setup}indicator("Versioned precision", precision=${value})\nplot(${value}, "Division")`,
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Division').values.every((sample) => sample === expected)).toBe(true);
    expect(result.declaration.precision).toBe(expected);
    expect(result.indicatorPrecision).toBe(expected);
  });

  it('uses the same legacy division for runtime and published drawing limits', () => {
    const result = runCompatScript(
      '//@version=5\nindicator("Versioned limits", max_labels_count=7 / 2, max_lines_count=7 / 2, max_boxes_count=7 / 2, max_polylines_count=7 / 2)\nplot(close)',
    );
    expect(result.errors).toEqual([]);
    expect(result.declaration.drawingLimits).toEqual({ label: 3, line: 3, box: 3, polyline: 3 });
    expect(result.indicatorDrawingLimits).toEqual(result.declaration.drawingLimits);
  });

  it('uses legacy division for calculated bars and declared history depth', () => {
    const source = (value: string) =>
      `//@version=5\nindicator("Versioned windows", calc_bars_count=${value}, max_bars_back=${value})\nplot(close)`;
    const result = runCompatScript(source('7 / 2'));
    expect(result.errors).toEqual([]);
    expect(result.declaration.calcBarsCount).toBe(3);
    expect(result.declaration.maxBarsBack).toBe(3);
    expect(result.indicatorMaxBarsBack).toBe(3);
    expect(result.plots).toEqual(runCompatScript(source('3')).plots);
  });
});
