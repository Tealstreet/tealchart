import { describe, expect, it } from 'vitest';

import { checkAstStructureInvariants } from '../parser/astStructureInvariants';
import { parse } from '../parser/parser';
import { checkProgram } from '../semantic/checker';
import { checkSemanticTypeInvariants } from '../semantic/semanticTypeInvariants';

interface InvariantCase {
  name: string;
  source: string;
}

const AST_INVARIANT_CASES: InvariantCase[] = [
  {
    name: 'for block with comma-chained break keeps following function return',
    source: `//@version=6
indicator("invariant gate for break boundary")
check(values) =>
    found = false
    for value in values
        if value > 0
            found := true, break
    found
plot(check(array.from(1, 2, 3)) ? 1 : 0)
`,
  },
  {
    name: 'nested switch keeps sibling negative arm on the outer switch',
    source: `//@version=6
indicator("invariant gate nested switch")
score(dir, mode) =>
    switch dir
        1 =>
            switch mode
                1 => 10
                2 => 20
                3 => 30
        -1 =>
            switch mode
                1 => -10
                2 => -20
                3 => -30
        => 0
plot(score(1, 2))
`,
  },
  {
    name: 'loop-valued reassignment does not consume following function return',
    source: `//@version=6
indicator("invariant gate loop value")
make(count) =>
    made = 0
    made := for i = 0 to count
        i
    made := while made < 2
        made + 1
    made
plot(make(2))
`,
  },
  {
    name: 'tuple if initializer owns its same-indent else',
    source: `//@version=6
indicator("invariant gate tuple if")
[basis, upper] = if close > open
    [close, high]
else
    [open, low]
plot(basis + upper)
`,
  },
  {
    name: 'documented operator precedence keeps equality below relational',
    source: `//@version=6
indicator("invariant gate precedence")
value = a or b and c == d > e + f * g
relational = a == b > c
plot(value or relational ? 1 : 0)
`,
  },
];

const SEMANTIC_TYPE_INVARIANT_CASES: InvariantCase[] = [
  {
    name: 'scalar operators and mixed numeric conditionals keep documented types',
    source: `//@version=6
indicator("semantic invariant gate scalars")
whole = 1 + 2 * 3
quotient = 5 / 2
promoted = whole + 1.5
compared = quotient > promoted
logical = compared and close > open
title = "EUR" + "USD"
mixed = compared ? whole : promoted
plot(logical ? mixed : quotient, title = title)
`,
  },
  {
    name: 'reference, special, UDT, and collection values retain series qualifier',
    source: `//@version=6
indicator("semantic invariant gate handles")
type Holder
    label marker
series label marker = label.new(bar_index, close)
series Holder holder = Holder.new(marker)
series array<float> values = array.new<float>()
series map<string, float> weights = map.new<string, float>()
series matrix<float> grid = matrix.new<float>()
series plot pricePlot = plot(close)
series hline midline = hline(50)
plot(holder.marker.get_y() + array.size(values) + map.size(weights) + matrix.rows(grid) + pricePlot + midline)
`,
  },
];

describe('Pine invariant gate', () => {
  it.each(AST_INVARIANT_CASES)('keeps AST invariants green for $name', ({ source }) => {
    const ast = parse(source);

    expect(checkAstStructureInvariants(ast, source)).toEqual([]);
  });

  it.each(SEMANTIC_TYPE_INVARIANT_CASES)('keeps semantic type invariants green for $name', ({ source }) => {
    const ast = parse(source);
    const result = checkProgram(ast);

    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(checkSemanticTypeInvariants(ast, result)).toEqual([]);
  });
});
