import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_str.format_time';
const cases = [
  { qualifier: 'const', time: '1000', expected: ['01', '01', '01'] },
  { qualifier: 'input', time: 'input.int(1000)', expected: ['01', '01', '01'] },
  { qualifier: 'simple', time: '1000', expected: ['01', '01', '01'] },
  { qualifier: 'series', time: '(bar_index + 1) * 1000', expected: ['01', '02', '03'] },
] as const;

// functions91 accepts const through series arguments and declares series string.
// Integer milliseconds, seconds format and UTC avoid timezone/literal ambiguity.
for (const testCase of cases) {
  describe(`str.format_time ${testCase.qualifier} time [functions:91]`, () => {
    let checked: ReturnType<typeof checkProgram>;
    let values: Array<number | null>;
    beforeAll(() => {
      const source = `//@version=6
indicator("Time format result qualifier")
${testCase.qualifier} int timeValue = ${testCase.time}
formattedValue = str.format_time(time=timeValue, format="ss", timezone="UTC")
positionalValue = str.format_time(timeValue, "ss", "UTC")
expectedValue = bar_index == 0 ? ${JSON.stringify(testCase.expected[0])} : bar_index == 1 ? ${JSON.stringify(testCase.expected[1])} : ${JSON.stringify(testCase.expected[2])}
plot(formattedValue == expectedValue ? 1 : 0, "named")
plot(positionalValue == expectedValue ? 1 : 0, "positional")`;
      checked = checkProgram(parse(source));
      expect(
        checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
        citation,
      ).toEqual([]);
      for (const name of ['formattedValue', 'positionalValue']) {
        expect(checked.symbols.find((symbol) => symbol.name === name)?.type?.kind, citation).toBe('string');
      }
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors, citation).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
      values = ['named', 'positional'].flatMap((name) => {
        const plot = getPlot(result, name).values;
        expect(plot, citation).toHaveLength(3);
        return plot;
      });
    });

    it('retains the native-backed series result', () => {
      for (const name of ['formattedValue', 'positionalValue']) {
        expect(checked.symbols.find((symbol) => symbol.name === name)?.type?.qualifier, citation).toBe('series');
      }
    });

    it('formats integer milliseconds identically through named and positional calls', () => {
      expect(values, citation).toEqual([1, 1, 1, 1, 1, 1]);
    });
  });
}
