import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Pine v6 reference indicator.max_bars_back: const int, inclusive range 0..5000.
// https://www.tradingview.com/pine-script-reference/v6/#fun_indicator
const makeSource = (depth: string, setup = '') => `//@version=6
${setup}indicator("Declared history boundary", max_bars_back=${depth})
plot(close, "Close")`;

describe('indicator historical depth inclusive boundary, series-history-na-v3 row202', () => {
  it.each([
    ['5001', ''],
    ['5000 + 1', ''],
    ['DEPTH', 'const int DEPTH = 5001\n'],
    ['DEPTH', 'const int BASE = 5000\nconst int DEPTH = BASE + 1\n'],
  ])('refuses the above-limit const depth %s (%s)', (depth, setup) => {
    const checked = checkProgram(parse(makeSource(depth, setup)));
    expect(checked.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: 'error', code: 'invalid-argument', message: expect.stringContaining('5000') }),
    ]));
  });

  it.each(['0', '5000', '4999 + 1'])('retains accepted boundary depth %s and unchanged plotted values', (depth) => {
    const source = makeSource(depth);
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const bars = compatibilityBars.slice(0, 3);
    const result = runCompatScript(source, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Close').values).toEqual(bars.map((bar) => bar.close));
    expect(result.indicatorMaxBarsBack).toBe(depth === '0' ? 0 : 5000);
  });
});
