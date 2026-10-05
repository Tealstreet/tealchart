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
    name: 'inferred size strings widen to an input string in v5',
    source: `//@version=5
indicator("semantic invariant gate sizes")
string selectedSize = input.string(size.large)
fontSize = size.normal
if close > open
    fontSize := selectedSize
    label.new(bar_index, close, size=fontSize)
plot(close)
`,
  },
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
pricePlot = plot(close)
midline = hline(50)
plot(holder.marker.get_y() + array.size(values) + map.size(weights) + matrix.rows(grid))
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

// Documented rank: history > unary > multiplicative > additive > relational
// > equality > and > or > ternary. Equal-rank binary operators associate left.
// https://www.tradingview.com/pine-script-docs/language/operators/
const binaryRanks: Array<[string, number]> = [
  ['*', 7], ['/', 7], ['%', 7], ['+', 6], ['-', 6],
  ['<', 5], ['>', 5], ['<=', 5], ['>=', 5], ['==', 4], ['!=', 4], ['and', 3], ['or', 2],
];
const binaryTree = (operator: string, left: unknown, right: unknown): unknown => ['binary', operator, left, right];
const unaryTree = (operator: string, value: unknown): unknown => ['unary', operator, value];
const historyTree = (value: unknown): unknown => ['history', value, 1];
const conditionalTree = (test: unknown, consequent: unknown, alternate: unknown): unknown => ['conditional', test, consequent, alternate];
const precedenceCases = binaryRanks.flatMap(([first, firstRank]) => binaryRanks.map(([second, secondRank]) => ({
  expression: `a ${first} b ${second} c`,
  tree: firstRank < secondRank
    ? binaryTree(first, 'a', binaryTree(second, 'b', 'c'))
    : binaryTree(second, binaryTree(first, 'a', 'b'), 'c'),
})));
for (const [operator] of binaryRanks) {
  precedenceCases.push(
    { expression: `a[1] ${operator} b`, tree: binaryTree(operator, historyTree('a'), 'b') },
    { expression: `a ${operator} b[1]`, tree: binaryTree(operator, 'a', historyTree('b')) },
    { expression: `a ${operator} b ? c : d`, tree: conditionalTree(binaryTree(operator, 'a', 'b'), 'c', 'd') },
    { expression: `a ? b ${operator} c : d`, tree: conditionalTree('a', binaryTree(operator, 'b', 'c'), 'd') },
    { expression: `a ? b : c ${operator} d`, tree: conditionalTree('a', 'b', binaryTree(operator, 'c', 'd')) },
  );
  for (const unary of ['+', '-', 'not']) {
    precedenceCases.push(
      { expression: `${unary} a ${operator} b`, tree: binaryTree(operator, unaryTree(unary, 'a'), 'b') },
      { expression: `a ${operator} ${unary} b`, tree: binaryTree(operator, 'a', unaryTree(unary, 'b')) },
    );
  }
}
for (const unary of ['+', '-', 'not']) {
  precedenceCases.push(
    { expression: `${unary} a[1]`, tree: unaryTree(unary, historyTree('a')) },
    { expression: `${unary} a ? b : c`, tree: conditionalTree(unaryTree(unary, 'a'), 'b', 'c') },
  );
}
precedenceCases.push(
  { expression: 'a[1] ? b : c', tree: conditionalTree(historyTree('a'), 'b', 'c') },
  { expression: 'a ? b ? c : d : e', tree: conditionalTree('a', conditionalTree('b', 'c', 'd'), 'e') },
  { expression: 'a ? b : c ? d : e', tree: conditionalTree('a', 'b', conditionalTree('c', 'd', 'e')) },
);

function expressionTree(expression: import('../parser/ast').Expression): unknown {
  switch (expression.type) {
    case 'Identifier': return expression.name;
    case 'NumericLiteral': return expression.value;
    case 'BinaryExpression': return binaryTree(expression.operator, expressionTree(expression.left), expressionTree(expression.right));
    case 'UnaryExpression': return unaryTree(expression.operator, expressionTree(expression.argument));
    case 'IndexExpression': return ['history', expressionTree(expression.object), expressionTree(expression.index)];
    case 'ConditionalExpression': return conditionalTree(expressionTree(expression.test), expressionTree(expression.consequent), expressionTree(expression.alternate));
    default: throw new Error(`Unexpected precedence node: ${expression.type}`);
  }
}

describe('documented complete operator precedence', () => {
  it.each(precedenceCases)('keeps the documented tree for $expression', ({ expression, tree }) => {
    const source = `//@version=6\nindicator("Precedence contract")\nvalue = ${expression}`;
    const ast = parse(source);
    const declaration = ast.body[1];
    if (declaration?.type !== 'VariableDeclaration' || declaration.init.type === 'IfStatement') {
      throw new Error('Expected an expression declaration');
    }
    expect(expressionTree(declaration.init)).toEqual(tree);
    expect(checkAstStructureInvariants(ast, source)).toEqual([]);
  });
});
