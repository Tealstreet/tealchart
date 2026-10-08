import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const run = (call: string) =>
  runCompatScript(
    `//@version=6
indicator("Matrix fill bounds")
m = matrix.new<float>(2, 3, 4.0)
plot(m.get(0, 0), "Before")
${call}
plot(m.get(0, 0), "First")
plot(m.get(1, 2), "Last")`,
    { bars: compatibilityBars.slice(0, 1) },
  );

// https://www.tradingview.com/pine-script-docs/language/matrices/#error-handling
// Every from_* bound must be strictly less than its corresponding to_* bound.
describe('matrix.fill rejects empty axis ranges', () => {
  it.each([
    'matrix.fill(m, 9.0, 1, 1, 0, 3)',
    'matrix.fill(id=m, value=9.0, from_row=1, to_row=1)',
    'm.fill(9.0, 0, 2, 2, 2)',
    'm.fill(value=9.0, from_column=2, to_column=2)',
  ])('exposes an error before continuing: %s', (call) => {
    const result = run(call);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringMatching(/from_row\/column less than to_row\/column/) }),
      ]),
    );
    expect(getPlot(result, 'Before').values).toEqual([4]);
    expect(result.plots.some((plot) => plot.title === 'First')).toBe(false);
  });

  it.each(['matrix.fill(m, 9.0, 0, 1, 0, 1)', 'm.fill(value=9.0, from_row=0, to_row=1, from_column=0, to_column=1)'])(
    'retains valid half-open bounds: %s',
    (call) => {
      const result = run(call);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'First').values).toEqual([9]);
      expect(getPlot(result, 'Last').values).toEqual([4]);
    },
  );

  it('retains full-matrix default bounds', () => {
    const result = run('m.fill(9.0)');
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'First').values).toEqual([9]);
    expect(getPlot(result, 'Last').values).toEqual([9]);
  });
});
