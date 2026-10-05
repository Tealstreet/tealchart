import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Ledger series-history-na-v3#278..281 and type-qualifier-system-v3
// #162/#164/#166/#168: each color(x) overload preserves x's qualifier and na.
// Authority: https://www.tradingview.com/pine-script-reference/v6/#fun_color
// and https://www.tradingview.com/pine-script-docs/language/type-system/#na-value
// The channel controls are independent arithmetic: #123456 = (18, 52, 86).
describe('ledger: color cast overloads and unavailable values', () => {
  it.each([
    ['const', 'x = color(na)', 'present = #123456'],
    ['input', 'base = input.color(#123456, "Base")\nx = base == #123456 ? color(na) : base', 'present = base'],
    [
      'simple',
      'x = syminfo.ticker == "TEST" ? color(na) : color(na)',
      'present = syminfo.ticker == "TEST" ? #123456 : #123456',
    ],
    ['series', 'x = bar_index == 0 ? color(na) : color(na)', 'present = bar_index == 0 ? #123456 : #123456'],
  ] as const)('preserves %s color casts and typed na', (qualifier, missing, present) => {
    const source = `//@version=6
indicator("Color cast overload")
${missing}
${present}
converted = color(x)
control = color(present)
plot(na(converted) ? 1 : 0, title="Missing")
plot(na(control) ? 1 : 0, title="Defined")
plot(color.r(control), title="Red")
plot(color.g(control), title="Green")
plot(color.b(control), title="Blue")
`;
    const checked = checkProgram(parse(source));
    expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    for (const name of ['converted', 'control']) {
      const type = checked.symbols.find((symbol) => symbol.name === name)?.type;
      expect(type?.kind).toBe('color');
      // An absent qualifier is the checker's implicit const representation.
      expect(type?.qualifier ?? 'const').toBe(qualifier);
    }
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    for (const [title, value] of [
      ['Missing', 1],
      ['Defined', 0],
      ['Red', 18],
      ['Green', 52],
      ['Blue', 86],
    ] as const) {
      expect(getPlot(result, title).values).toEqual([value, value, value]);
    }
  });
});
