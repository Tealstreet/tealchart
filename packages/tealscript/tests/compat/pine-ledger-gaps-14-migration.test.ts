import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-reference/v6/';
const migration = 'https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/';

for (const [legacy, modern, argument, value, selector] of [
  ['sum', 'math.sum', 'close, 1', 102, 'functions[173]'],
  ['wma', 'ta.wma', 'close, 1', 102, 'functions[177]'],
  ['rma', 'ta.rma', 'close, 1', 102, 'functions[198]'],
] as const) {
  describe(`${reference} ${selector}; migration ${migration}`, () => {
    it(`executes v4 ${legacy} and v5 ${modern} positional calls`, () => {
      for (const [version, declaration, name] of [[4, 'study', legacy], [5, 'indicator', modern]] as const) {
        const result = runCompatScript(`//@version=${version}
${declaration}("Migration positional")
plot(${name}(${argument}), title="Value")
`, { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Value').values).toEqual([value]);
      }
    });

    it(`refuses the v4 ${legacy} global in v5 while accepting ${modern}`, () => {
      const invalid = checkProgram(parse(`//@version=5
indicator("Legacy refusal")
plot(${legacy}(${argument}))
`));
      expect(invalid.diagnostics.some((diagnostic) => diagnostic.code === 'version-mismatch')).toBe(true);
      const valid = checkProgram(parse(`//@version=5
indicator("Modern acceptance")
plot(${modern}(${argument}))
`));
      expect(valid.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    });
  });
}

for (const [name, modernSlot, argument, value, selector] of [
  ['log', 'number', '1', 0, 'functions[100-103]'],
  ['floor', 'number', '-1.5', -2, 'functions[148-151]'],
  ['cos', 'angle', '0', 1, 'functions[124-127]'],
] as const) {
  describe(`${reference} ${selector}; named-slot migration ${migration}`, () => {
    it(`binds v4 ${name}(x) and v5 math.${name}(${modernSlot})`, () => {
      for (const [version, declaration, call] of [[4, 'study', `${name}(x=${argument})`], [5, 'indicator', `math.${name}(${modernSlot}=${argument})`]] as const) {
        const result = runCompatScript(`//@version=${version}
${declaration}("Named migration")
plot(${call}, title="Value")
`, { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Value').values).toEqual([value]);
      }
      const rejected = checkProgram(parse(`//@version=5
indicator("Old named slot refusal")
plot(math.${name}(x=${argument}))
`));
      expect(rejected.diagnostics.some((diagnostic) => diagnostic.code === 'unknown-argument')).toBe(true);
    });
  });
}

describe(`${reference} variables[29]; https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-4/#renaming-of-built-in-constants-variables-and-functions`, () => {
  it('resolves the v3 ticker variable and its v4 syminfo.ticker replacement', () => {
    for (const [version, name] of [[3, 'ticker'], [4, 'syminfo.ticker']] as const) {
      const result = runCompatScript(`//@version=${version}
study("Ticker variable migration")
plot(${name} == "AAPL" ? 1 : 0, title="Ticker")
`, { bars: compatibilityBars.slice(0, 1), engineOptions: { runtime: { syminfo: { ticker: 'AAPL', prefix: 'NASDAQ' } } } });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Ticker').values).toEqual([1]);
    }
  });
});
