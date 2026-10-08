import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-reference/v6/#fun_str.split';
const typeSystem = 'https://www.tradingview.com/pine-script-docs/language/type-system/#reference-types';
const defect = 'str-split-array-result-inherits-weaker-source-qualifier';
const cases = [
  { qualifier: 'const', source: '"a|b"', separator: '"|"', expectedRed: true },
  { qualifier: 'input', source: 'input.string("a|b")', separator: 'input.string("|")', expectedRed: true },
  { qualifier: 'simple', source: '"a|b"', separator: '"|"', expectedRed: true },
  { qualifier: 'series', source: 'bar_index % 2 == 0 ? "a|b" : "c|d"', separator: '"|"', expectedRed: false },
] as const;

// functions354 returns an array<string> ID. Reference objects always qualify
// as series, including objects constructed from weaker-qualified value inputs.
for (const testCase of cases) {
  describe(`str.split ${testCase.qualifier} inputs [functions:354]`, () => {
    let checked: ReturnType<typeof checkProgram>;
    let values: Array<number | null>;
    beforeAll(() => {
      const source = `//@version=6
indicator("Split reference qualifier")
${testCase.qualifier} string sourceValue = ${testCase.source}
${testCase.qualifier} string separator = ${testCase.separator}
parts = str.split(string=sourceValue, separator=separator)
alias = parts
plot(array.size(parts), "size")
plot(array.get(alias, 0) == (bar_index % 2 == 0 or ${testCase.qualifier !== 'series'} ? "a" : "c") ? 1 : 0, "first")
plot(array.get(parts, 1) == (bar_index % 2 == 0 or ${testCase.qualifier !== 'series'} ? "b" : "d") ? 1 : 0, "second")
plot(sourceValue == (${testCase.source}) ? 1 : 0, "source unchanged")`;
      checked = checkProgram(parse(source));
      expect(
        checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
        reference,
      ).toEqual([]);
      for (const name of ['parts', 'alias']) {
        expect(checked.symbols.find((symbol) => symbol.name === name)?.type, reference).toMatchObject({
          kind: 'array',
          elementType: { kind: 'string' },
        });
      }
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors, reference).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0, reference).toBe(0);
      values = ['size', 'first', 'second', 'source unchanged'].flatMap((name) => {
        const plot = getPlot(result, name).values;
        expect(plot, reference).toHaveLength(3);
        return plot;
      });
    });

    const test = it;
    test(`array ID and alias remain series [${testCase.expectedRed ? `FIXED-CONTRACT: ${defect}` : 'control'}]`, () => {
      for (const name of ['parts', 'alias']) {
        expect(checked.symbols.find((symbol) => symbol.name === name)?.type?.qualifier, typeSystem).toBe('series');
      }
    });

    it('retains split content and source string across executions', () => {
      expect(values, reference).toEqual([2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    });
  });
}
