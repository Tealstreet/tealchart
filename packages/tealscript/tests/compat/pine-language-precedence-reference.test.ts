import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: archived pine-v6-reference-v1.json operator entries (2026-10-03)
// and the official Operators manual precedence table. Expected vectors are
// independent calculations; each expression distinguishes alternative grouping.

// Red proof: current history (1), low unary priority (2), flattened arithmetic,
// comparison and boolean tiers (5), ungrouped ternary condition (1), right
// association (4), lost parentheses (1); all fourteen restored GREEN.

// Grammar mutants were regenerated with the package's parser build script in
// an isolated source copy. That copy and its generated parsers were discarded;
// production source and parser artifacts were unchanged throughout.
const reference = 'https://www.tradingview.com/pine-script-reference/v6/';
const manual = 'https://www.tradingview.com/pine-script-docs/language/operators/#operator-precedence';
const bars = compatibilityBars.slice(0, 6);
const prelude = `samples = array.from(-7, 4, 1, 9, -2, -3)
value = array.get(samples, bar_index)`;
const repeated = (value: number) => bars.map(() => value);

interface PrecedenceCase {
  name: string;
  entry: string;
  rule: string;
  rejects: string;
  expression: string;
  expected: Array<number | null>;
}

const cases: PrecedenceCase[] = [
  {
    name: 'history binds to its immediate operand before addition',
    entry: 'op_[]',
    rule: 'history rank 9, addition rank 6',
    rejects: 'history of the whole sum, current value substituted for history, delayed left operand',
    expression: 'value + value[1]',
    expected: [null, -3, 5, 10, 7, -5],
  },
  {
    name: 'unary minus binds before addition',
    entry: 'op_-',
    rule: 'unary rank 8, addition rank 6',
    rejects: 'negation of the whole sum, identity instead of negation, addition inside unary operand',
    expression: '-value + 3',
    expected: [10, -1, 2, -6, 5, 6],
  },
  {
    name: 'not binds before and',
    entry: 'kw_not',
    rule: 'unary rank 8, and rank 3',
    rejects: 'not applied to the whole conjunction, conjunction ignored, negation ignored',
    expression: 'not false and false ? 7 : -3',
    expected: repeated(-3),
  },
  {
    name: 'multiplication binds before addition',
    entry: 'op_*',
    rule: 'multiplication rank 7, addition rank 6',
    rejects: 'flat left-to-right evaluation, addition before multiplication, ignored multiplier',
    expression: 'value + 2 * 3',
    expected: [-1, 10, 7, 15, 4, 3],
  },
  {
    name: 'addition binds before relational comparison',
    entry: 'op_>',
    rule: 'addition rank 6, comparison rank 5',
    rejects: 'comparison evaluated before the right-hand sum, flat left-to-right evaluation',
    expression: 'value > 1 + 2 ? 1 : 0',
    expected: [0, 1, 0, 1, 0, 0],
  },
  {
    name: 'relational comparison binds before equality',
    entry: 'op_==',
    rule: 'comparison rank 5, equality rank 4',
    rejects: 'equality before the right-hand comparison, flat left-to-right comparison chain',
    expression: 'false == value < 3 ? 1 : 0',
    expected: [0, 1, 0, 1, 0, 0],
  },
  {
    name: 'equality binds before and',
    entry: 'kw_and',
    rule: 'equality rank 4, and rank 3',
    rejects: 'and evaluated before right-hand equality, equality applied to the conjunction',
    expression: 'false and value > 0 == false ? 1 : 0',
    expected: repeated(0),
  },
  {
    name: 'and binds before or',
    entry: 'kw_or',
    rule: 'and rank 3, or rank 2',
    rejects: 'flat left-to-right booleans, or binds more tightly, whole disjunction anded with false',
    expression: 'true or false and false ? 7 : -3',
    expected: repeated(7),
  },
  {
    name: 'or binds before ternary selection',
    entry: 'op_?:',
    rule: 'or rank 2, ternary rank 1',
    rejects: 'ternary attached only to right-hand operand, boolean returned instead of selected number',
    expression: 'true or false ? 7 : -3',
    expected: repeated(7),
  },
  {
    name: 'same-rank subtraction evaluates left to right',
    entry: 'op_-',
    rule: 'operators at equal precedence are evaluated left to right',
    rejects: 'right association, commutative subtraction, accumulated absolute differences',
    expression: '9 - 4 - 2',
    expected: repeated(3),
  },
  {
    name: 'same-rank division evaluates left to right',
    entry: 'op_/',
    rule: 'operators at equal precedence are evaluated left to right',
    rejects: 'right association, right operands multiplied before division, last operand ignored',
    expression: '24 / 4 / 3',
    expected: repeated(2),
  },
  {
    name: 'mixed multiplication and division evaluate left to right',
    entry: 'op_/',
    rule: 'multiplication and division share rank 7 and evaluate left to right',
    rejects: 'multiplication always precedes division, right association, ignored division',
    expression: '24 / 4 * 3',
    expected: repeated(18),
  },
  {
    name: 'mixed addition and subtraction evaluate left to right',
    entry: 'op_-',
    rule: 'addition and subtraction share rank 6 and evaluate left to right',
    rejects: 'addition always precedes subtraction, right association, ignored subtraction',
    expression: '9 - 4 + 2',
    expected: repeated(7),
  },
  {
    name: 'parentheses override multiplication precedence',
    entry: 'op_*',
    rule: 'parentheses group calculations independently of default precedence',
    rejects: 'parentheses discarded, original precedence reapplied when lowering the grouped expression',
    expression: '(value + 2) * 3',
    expected: [-15, 18, 9, 33, 0, -3],
  },
];

describe('Pine v6 precedence reference behavior', () => {
  for (const testCase of cases) {
    it(`${testCase.name} [${reference}#${testCase.entry}; ${manual}: ${testCase.rule}; rejects ${testCase.rejects}]`, () => {
      const result = runCompatScript(`//@version=6\nindicator("Precedence reference")\n${prelude}\nplot(${testCase.expression}, "Result")`, { bars });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      const values = getPlot(result, 'Result').values;
      expect(values).toHaveLength(bars.length);
      expect(values).toEqual(testCase.expected);
    });
  }
});
