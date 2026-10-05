import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram, checkSemanticTypeInvariants } from '../../semantic';
import { executeScript } from '../compiledOnly';

const bars = [10, 20, 30].map((close, index) => ({
  time: (index + 1) * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

// Native v3 ledger-division-v4/v5 captures settle these literal integer signs.
// Float and input controls in the same captures remain fractional.
describe('native v3 signed constant integer division', () => {
  for (const version of [4, 5, 6]) {
    const header = `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("native division")\n`;
    it.each([
      ['(-5) / 2', -2, -2.5],
      ['5 / (-2)', -2, -2.5],
      ['(-5) / (-2)', 2, 2.5],
      ['5 / 2', 2, 2.5],
    ])(`returns the captured result of %s in v${version}`, (expression, integer, fractional) => {
      const ast = parse(`${header}result = ${expression}\nplot(result, "OUTCOME")`);
      const checked = checkProgram(ast);
      expect(checked.diagnostics).toEqual([]);
      expect(checked.symbols.find((symbol) => symbol.name === 'result')?.type).toEqual({
        ...(version >= 5 ? { integerDivision: true } : {}),
        kind: version < 6 ? 'int' : 'float',
        qualifier: 'const',
      });
      expect(checkSemanticTypeInvariants(ast, checked)).toEqual([]);
      const result = executeScript(ast, bars);
      expect(result.errors).toEqual([]);
      expect(result.plots[0]!.values).toEqual(bars.map(() => (version < 6 ? integer : fractional)));
    });

    it.each(['(-5.0) / 2', '(-5) / 2.0'])(`retains float operand division in v${version}: %s`, (expression) => {
      const result = executeScript(parse(`${header}plot(${expression})`), bars);
      expect(result.errors).toEqual([]);
      expect(result.plots[0]!.values).toEqual([-2.5, -2.5, -2.5]);
    });

    it(`retains the native input control and runtime qualifiers in v${version}`, () => {
      const input =
        version === 4
          ? 'input(2, "Denominator", type=input.integer, minval=1)'
          : 'input.int(2, "Denominator", minval=1)';
      const ast = parse(
        `${header}denominator = ${input}\nsimple int simpleDenominator = 2\nseries int seriesDenominator = bar_index - bar_index + 2\nplot((-5) / denominator)\nplot((-5) / simpleDenominator)\nplot((-5) / seriesDenominator)`,
      );
      expect(checkProgram(ast).diagnostics).toEqual([]);
      const result = executeScript(ast, bars);
      expect(result.errors).toEqual([]);
      expect(result.plots.map((plot) => plot.values)).toEqual(Array.from({ length: 3 }, () => [-2.5, -2.5, -2.5]));
    });

    it(`passes signed const arithmetic through nested UDFs in v${version}`, () => {
      const ast = parse(
        `${header}half(x) => x / 2\nwrapper(x) => half(x)\nplot(wrapper(-5))\nplot(wrapper(-5.0))\nplot(wrapper(bar_index - 5))`,
      );
      const result = executeScript(ast, bars);
      expect(result.errors).toEqual([]);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        bars.map(() => (version < 6 ? -2 : -2.5)),
        [-2.5, -2.5, -2.5],
        [-2.5, -2, -1.5],
      ]);
    });
  }
});
