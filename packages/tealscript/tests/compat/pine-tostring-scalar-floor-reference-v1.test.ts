import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const contracts = [
  { kind: 'int', value: '3', alternate: '4', text: '3', alternateText: '4' },
  { kind: 'float', value: '3.5', alternate: '2.25', text: '3.5', alternateText: '2.25' },
  { kind: 'bool', value: 'true', alternate: 'false', text: 'true', alternateText: 'false' },
  { kind: 'string', value: '"A"', alternate: '"B"', text: 'A', alternateText: 'B' },
] as const;
const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_str.tostring';

// Frozen v6 one-argument tostring309/310 returns simple/series for primitives.
// Const overload311 accepts const enum; enum titles are independent literal oracles.
// Primitive floors remain native-unobserved; default precision/NA/collections are separate.
for (const contract of contracts) {
  for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
    for (const binding of ['positional', 'named'] as const) {
      const expectedRed = qualifier === 'const' || qualifier === 'input';
      describe(`str.tostring one argument: ${qualifier} ${contract.kind} ${binding} [functions:309-311]`, () => {
        let checked: ReturnType<typeof checkProgram>;
        beforeAll(() => {
          const expression =
            qualifier === 'series' ? `bar_index == 1 ? ${contract.alternate} : ${contract.value}` : contract.value;
          const declaration =
            qualifier === 'input'
              ? `sourceValue = input.${contract.kind}(${contract.value})`
              : `${qualifier} ${contract.kind} sourceValue = ${expression}`;
          const argument = binding === 'named' ? 'value=sourceValue' : 'sourceValue';
          const source = `//@version=6
indicator("Scalar tostring return floor")
${declaration}
measured = str.tostring(${argument})
alias = measured
label.new(bar_index, high, measured)
label.new(bar_index, low, alias)`;
          checked = checkProgram(parse(source));
          expect(checked.diagnostics, citation).toEqual([]);
          expect(checked.symbols.find((symbol) => symbol.name === 'sourceValue')?.type, citation).toMatchObject({
            kind: contract.kind,
            qualifier,
          });
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
          expect(result.errors, citation).toEqual([]);
          expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
          const labels = result.drawings.filter((drawing) => drawing.type === 'label');
          expect(labels, citation).toHaveLength(6);
          const middle = qualifier === 'series' ? contract.alternateText : contract.text;
          const expected = [contract.text, middle, contract.text];
          expect(
            labels.filter((_, index) => index % 2 === 0).map((label) => label.text),
            citation,
          ).toEqual(expected);
          expect(
            labels.filter((_, index) => index % 2 === 1).map((label) => label.text),
            citation,
          ).toEqual(expected);
        });
        const test = expectedRed ? it.fails : it;
        test(
          expectedRed
            ? 'str.tostring.scalar-result-qualifier-floor: primitives return at least simple string'
            : 'preserves the primitive result qualifier through an alias',
          () => {
            for (const name of ['measured', 'alias']) {
              expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
                kind: 'string',
                qualifier: qualifier === 'series' ? 'series' : 'simple',
              });
            }
          },
        );
      });
    }
  }
}

for (const binding of ['positional', 'named'] as const) {
  describe(`str.tostring one argument: const enum ${binding} [functions:311]`, () => {
    let checked: ReturnType<typeof checkProgram>;
    beforeAll(() => {
      const argument = binding === 'named' ? 'value=Direction.up' : 'Direction.up';
      const source = `//@version=6
indicator("Const enum tostring control")
enum Direction
    up = "UP"
measured = str.tostring(${argument})
alias = measured
label.new(bar_index, high, measured)
label.new(bar_index, low, alias)`;
      checked = checkProgram(parse(source));
      expect(checked.diagnostics, citation).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors, citation).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
      const labels = result.drawings.filter((drawing) => drawing.type === 'label');
      expect(labels, citation).toHaveLength(6);
      expect(
        labels.map((label) => label.text),
        citation,
      ).toEqual(['UP', 'UP', 'UP', 'UP', 'UP', 'UP']);
    });
    it('preserves the eligible const enum overload and title through an alias', () => {
      for (const name of ['measured', 'alias'])
        expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
          kind: 'string',
          qualifier: 'const',
        });
    });
  });
}
