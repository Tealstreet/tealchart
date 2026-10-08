import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript, type Bar } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';

const bars: Bar[] = [17, 4, 23, 9, 12].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: [10, 8, 20, 14, 7][index]!,
  high: close + 20,
  low: close - 20,
  close,
  volume: 100,
}));

const loops = [
  { name: 'for', header: 'for index = 0 to 3', prelude: '', value: 'array.get(samples, index)' },
  { name: 'while', header: 'while visited < 4', prelude: '    index = visited\n', value: 'array.get(samples, index)' },
  { name: 'for...in', header: 'for [index, item] in samples', prelude: '', value: 'item' },
];

describe('documented tuple loop results after skipped tails', () => {
  for (const loop of loops) {
    for (const control of ['break', 'continue']) {
      // Reference entries for, for...in, while: last evaluated return expression.
      // https://www.tradingview.com/pine-script-docs/language/loops/#keywords-and-return-expressions
      // A skipped tuple tail cannot replace the prior result or invoke its UDF.
      it(`${loop.name} preserves both tuple members across ${control}`, () => {
        const ast = parse(`//@version=6
indicator("Tuple loop flow")
var calls = array.new_int(1, 0)
tail(float value) =>
    array.set(calls, 0, array.get(calls, 0) + 1)
    [value, value > 0]
samples = array.from(close, -open, close - open, close + open)
int visited = 0
[number, positive] = ${loop.header}
${loop.prelude}    value = ${loop.value}
    visited := visited + 1
    if ${control === 'break' ? 'index == 3' : 'index == 1 or index == 3'}
        ${control}
    tail(value)
plot(number, "Number")
plot(positive == false ? 0 : 1, "Positive")
plot(array.get(calls, 0), "Tail calls")
plot(visited, "Visited")`);
        expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
        const result = executeScript(ast, bars);
        expect(result.errors).toEqual([]);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        const values = (title: string) => {
          const plot = result.plots.find((candidate) => candidate.title === title);
          expect(plot, title).toBeDefined();
          return plot!.values;
        };
        expect(values('Number')).toEqual([7, -4, 3, -5, 5]);
        expect(values('Positive')).toEqual([1, 0, 1, 0, 1]);
        expect(values('Tail calls')).toEqual(control === 'break' ? [3, 6, 9, 12, 15] : [2, 4, 6, 8, 10]);
        expect(values('Visited')).toEqual([4, 4, 4, 4, 4]);
      });
    }
  }
});
