import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: https://www.tradingview.com/pine-script-reference/v6/ fun_ta.supertrend.
// Rename: https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#ta-namespace-for-technical-analysis-functions-and-variables
describe('ledger817 Supertrend namespace migration', () => {
  it.each([[4, 'supertrend'], [5, 'ta.supertrend']] as const)('runs Pine%s %s', (version, name) => {
    const source = `//@version=${version}\n${version < 5 ? 'study' : 'indicator'}("Supertrend rename")\n[line, direction] = ${name}(2, 3)\nplot(line, "Line")\nplot(direction, "Direction")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Line').values[2]).toBeCloseTo(114.66666666666667, 8);
    expect(getPlot(result, 'Direction').values[2]).toBe(1);
  });
  it('refuses the old bare function name in Pine5', () => {
    const checked = checkProgram(parse('//@version=5\nindicator("Old Supertrend")\n[line, direction] = supertrend(2, 3)\nplot(line)'));
    expect(checked.diagnostics).toEqual([expect.objectContaining({ code: 'version-mismatch' })]);
  });
});
