import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('ledger gaps 25 ticker symbol boundaries', () => {
  for (const [qualifier, declaration] of [
    ['const', 'const string symbol = "NASDAQ:AAPL"'],
    ['input', 'symbol = input.string("NASDAQ:AAPL")'],
    ['simple', 'simple string symbol = syminfo.tickerid'],
    ['series', 'symbol = bar_index % 2 == 0 ? "NASDAQ:AAPL" : "NASDAQ:MSFT"'],
  ]) {
    it(`ranks 975–976: heikinashi admits ${qualifier} string symbols`, () => {
      for (const argument of ['symbol', 'symbol=symbol']) {
        const source = `//@version=6\nindicator("Ledger 25 ticker")\n${declaration}\nvalue = ticker.heikinashi(${argument})\nplot(str.length(value) > 0 ? 1 : 0, "Accepted")`;
        expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 2) });
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Accepted').values).toEqual([1, 1]);
      }
    });
  }

  for (const [value, kind] of [
    ['17', 'int'],
    ['input.int(17)', 'int'],
    ['close', 'float'],
    ['true', 'bool'],
    ['array.new_int()', 'array<int>'],
  ]) {
    it(`ranks 975–976: heikinashi refuses non-string symbol ${value}`, () => {
      for (const argument of [value, `symbol=${value}`]) {
        const source = `//@version=6\nindicator("Ledger 25 ticker type")\nvalue = ticker.heikinashi(${argument})`;
        const errors = checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
        expect
          .soft(errors)
          .toEqual([
            expect.objectContaining({
              code: 'type-mismatch',
              message: `ticker.heikinashi symbol must be a string, got ${kind}`,
            }),
          ]);
      }
    });
  }

  it('preserves a local bare heikinashi callable shadow', () => {
    const source = '//@version=4\nstudy("Local ticker shadow")\nheikinashi(x) => x + 1\nplot(heikinashi(17), "Value")';
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 2) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Value').values).toEqual([18, 18]);
  });
});
