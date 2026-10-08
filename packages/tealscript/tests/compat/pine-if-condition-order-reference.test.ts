import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript, type Bar } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';

const bars: Bar[] = Array.from({ length: 8 }, (_, index) => ({
  time: (index + 1) * 60_000,
  open: 10,
  high: 20,
  low: 0,
  close: 12,
  volume: 100,
}));

describe('documented if condition evaluation order', () => {
  for (const version of [5, 6]) {
    for (const form of ['statement', 'returning']) {
      // Reference entry if: only false conditions reach the next else-if.
      // https://www.tradingview.com/pine-script-docs/language/conditional-structures/#if-used-for-its-side-effects
      // Trace records false tests, the chosen body, and skipped later tests.
      it(`v${version} ${form} stops testing conditions after the first match`, () => {
        const result = form === 'returning' ? 'selected = if' : 'selected = 0\nif';
        const value = (number: number) => form === 'returning' ? `${number}` : `selected := ${number}`;
        const ast = parse(`//@version=${version}
indicator("Conditional test order")
record(array<int> trace, int digit) =>
    array.set(trace, 0, array.get(trace, 0) * 10 + digit)
    digit
test(array<int> trace, int digit, bool matches) =>
    record(trace, digit)
    matches
trace = array.new<int>(1, 0)
${result} test(trace, 1, bar_index % 4 == 0)
    record(trace, 7)
    ${value(-5)}
else if test(trace, 2, bar_index % 4 <= 1)
    record(trace, 8)
    ${value(11)}
else if test(trace, 3, bar_index % 4 <= 2)
    record(trace, 9)
    ${value(-7)}
else
    record(trace, 6)
    ${value(3)}
plot(array.get(trace, 0), "Trace")
plot(selected, "Selected")`);
        expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
        const execution = executeScript(ast, bars);
        expect(execution.errors).toEqual([]);
        expect(execution.profile.swallowedErrors ?? []).toEqual([]);
        const values = (title: string) => {
          const plot = execution.plots.find((candidate) => candidate.title === title);
          expect(plot, title).toBeDefined();
          return plot!.values;
        };
        expect(values('Trace')).toEqual([17, 128, 1239, 1236, 17, 128, 1239, 1236]);
        expect(values('Selected')).toEqual([-5, 11, -7, 3, -5, 11, -7, 3]);
      });
    }
  }
});
