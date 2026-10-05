import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Ledger series-history-na-v3#10/#12/#69/#70/#266. Expectations are derived
// from the documented unavailable-history and na-arithmetic rules, rather than
// recorded engine output. Only three hand-built bars from fixtures are used.
// https://www.tradingview.com/pine-script-docs/v5/language/operators/
// https://www.tradingview.com/pine-script-reference/v6/#fun_float
describe('ledger: missing numeric and color values', () => {
  it.each(['+', '-'] as const)('unary %s preserves na and signed defined controls', (operator) => {
    const result = runCompatScript(
      `//@version=6
indicator("Unary unavailable")
float absent = na
value = bar_index == 0 ? -3.5 : bar_index == 1 ? 0.0 : 2.25
plot(na(${operator}absent) ? 1 : 0, title="Missing")
plot(${operator}value, title="Defined")
`,
      { bars: compatibilityBars.slice(0, 3) },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([1, 1, 1]);
    expect(getPlot(result, 'Defined').values.map((value) => (value === 0 ? 0 : value))).toEqual(
      operator === '+' ? [-3.5, 0, 2.25] : [3.5, 0, -2.25],
    );
  });

  it('float(na) remains a constant unavailable float alongside a defined cast', () => {
    const source = `//@version=6
indicator("Float unavailable cast")
absent = float(na)
present = float(-7)
plot(na(absent) ? 1 : 0, title="Missing")
plot(present, title="Defined")
`;
    const checked = checkProgram(parse(source));
    expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const type = checked.symbols.find((symbol) => symbol.name === 'absent')?.type;
    expect(type?.kind).toBe('float');
    expect(type?.qualifier ?? 'const').toBe('const');
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([1, 1, 1]);
    expect(getPlot(result, 'Defined').values).toEqual([-7, -7, -7]);
  });

  it('float and color history are unavailable before the first bar and recover independently', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Typed unavailable history")
float value = bar_index == 0 ? -3.5 : bar_index == 1 ? 0.0 : 2.25
tint = bar_index == 0 ? #123456 : bar_index == 1 ? #ABCDEF : #654321
plot(value[1], title="Float")
plot(na(value[1]) ? 1 : 0, title="Float missing")
plot(na(tint[1]) ? 1 : 0, title="Color missing")
plot(color.r(tint[1]), title="Red")
plot(close, color=tint[1], title="History color")
`,
      { bars: compatibilityBars.slice(0, 3) },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Float').values).toEqual([null, -3.5, 0]);
    expect(getPlot(result, 'Float missing').values).toEqual([1, 0, 0]);
    expect(getPlot(result, 'Color missing').values).toEqual([1, 0, 0]);
    expect(getPlot(result, 'Red').values).toEqual([null, 18, 171]);
    expect(getPlot(result, 'History color').color).toEqual([null, '#123456', '#ABCDEF']);
  });
});
