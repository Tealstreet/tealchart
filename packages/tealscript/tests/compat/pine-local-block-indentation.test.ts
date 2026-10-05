import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const bars = Array.from({ length: 4 }, (_, index) => ({
  time: index * 60_000,
  open: 1,
  high: 1,
  low: 1,
  close: 1,
  volume: 1,
}));

for (const [name, functionIndent, globalIndent] of [
  ['four spaces', '    ', '    '],
  ['tabs', '\t', '\t'],
  ['tab function and space conditional', '\t', '    '],
] as const) {
  it(`retains nested local blocks and the following global consumers with ${name}`, () => {
    const program = parse(`//@version=6
indicator("Local block indentation")
choose(int index) =>
${functionIndent}result = index
${functionIndent}if index % 2 == 0
${functionIndent.repeat(2)}result += 10
${functionIndent}else
${functionIndent.repeat(2)}result += 20
${functionIndent}result
var int total = 0
if bar_index < 2
${globalIndent}total += 1
${globalIndent}if bar_index == 1
${globalIndent.repeat(2)}total += 10
else
${globalIndent}total += 100
plot(choose(bar_index))
plot(total)`);
    expect(program.body.map((statement) => statement.type)).toEqual([
      'IndicatorDeclaration',
      'FunctionDeclaration',
      'VariableDeclaration',
      'IfStatement',
      'ExpressionStatement',
      'ExpressionStatement',
    ]);
    const result = executeScript(program, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [10, 21, 12, 23],
      [1, 12, 112, 212],
    ]);
  });
}
