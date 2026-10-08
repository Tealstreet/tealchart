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

describe('documented conditional nested call lifetime', () => {
  for (const mode of ['var', 'varip']) {
    for (const loop of ['for', 'while']) {
      // Reference entries =>, var, varip and loop keyword; written-call scopes:
      // https://www.tradingview.com/pine-script-docs/language/user-defined-functions/#scope-of-a-function-call
      // Rejects shared child state, per-iteration resets, and eager skipped calls.
      it(`${mode} retains separate nested callers through changing ${loop} iterations`, () => {
        const ast = parse(`//@version=6
indicator("Conditional nested lifetime")
var initializations = array.new_int(1, 0)
initialize(float value) =>
    array.set(initializations, 0, array.get(initializations, 0) + 1)
    value
step(float value) =>
    ${mode} float total = initialize(value)
    float regular = value
    total := total + value
    regular := regular + 1
    [total, regular]
outer(float value, bool active) =>
    if active
        step(value)
    else
        [float(na), float(na)]
float first = na
float second = na
float firstRegular = 0
float secondRegular = 0
int iterations = bar_index % 3 + 1
${loop === 'for' ? 'for index = 0 to iterations - 1' : 'int index = 0\nwhile index < iterations'}
    [firstTotal, firstLocal] = outer(close - open + index, bar_index != 0 and bar_index != 2)
    [secondTotal, secondLocal] = outer(value = open - close - index, active = bar_index != 1 and bar_index != 4)
    first := firstTotal
    second := secondTotal
    firstRegular := firstRegular + nz(firstLocal)
    secondRegular := secondRegular + nz(secondLocal)
${loop === 'while' ? '    index := index + 1\n' : ''}plot(first, "First")
plot(second, "Second")
plot(firstRegular, "First regular")
plot(secondRegular, "Second regular")
plot(array.get(initializations, 0), "Initializations")`);
        expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
        const result = executeScript(ast, bars);
        expect(result.errors).toEqual([]);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        const values = (title: string) => {
          const plot = result.plots.find((candidate) => candidate.title === title);
          expect(plot, title).toBeDefined();
          return plot!.values;
        };
        expect(values('First')).toEqual([null, -11, null, -16, -5]);
        expect(values('Second')).toEqual([-14, null, -26, -21, null]);
        expect(values('First regular')).toEqual([0, -5, 0, -4, 13]);
        expect(values('Second regular')).toEqual([-6, 0, -9, 6, 0]);
        expect(values('Initializations')).toEqual([1, 2, 2, 2, 2]);
      });
    }
  }
});
