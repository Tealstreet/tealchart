import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot } from './fixtures';

// array.from parameter entries483..489: preserve type and argument order.
// Limits/remarks rows464-466/468/470/472/474/476/478/480 remain lane-e owned.
describe('array.from ledger parameter witnesses', () => {
  it.each([
    ['int', 'array<int> a = array.from(3, 1, bar_index)', 'array.get(a, 0) * 100 + array.get(a, 1) * 10 + array.get(a, 2)', [310, 311, 312]],
    ['float', 'array<float> a = array.from(3.5, 1, close)', 'array.get(a, 0) + array.get(a, 1) + array.get(a, 2)', [106.5, 109.5, 111.5]],
    ['bool', 'array<bool> a = array.from(true, false, bar_index == 1)', '(array.get(a, 0) ? 100 : 0) + (array.get(a, 1) ? 10 : 0) + (array.get(a, 2) ? 1 : 0)', [100, 101, 100]],
    ['string', 'array<string> a = array.from("first", "second", "third")', 'array.get(a, 0) == "first" and array.get(a, 1) == "second" and array.get(a, 2) == "third" ? 1 : 0', [1, 1, 1]],
    ['color', 'array<color> a = array.from(color.red, color.blue)', 'array.get(a, 0) == color.red and array.get(a, 1) == color.blue ? 1 : 0', [1, 1, 1]],
    ['label', 'label first = label.new(bar_index, close)\nlabel secondHandle = label.new(bar_index, high)\narray<label> a = array.from(first, secondHandle)', 'array.get(a, 0) == first and array.get(a, 1) == secondHandle ? 1 : 0', [1, 1, 1]],
    ['line', 'line first = line.new(bar_index, close, bar_index+1, close)\nline secondHandle = line.new(bar_index, high, bar_index+1, high)\narray<line> a = array.from(first, secondHandle)', 'array.get(a, 0) == first and array.get(a, 1) == secondHandle ? 1 : 0', [1, 1, 1]],
  ] as const)('retains %s variadic values and source order (rows467/469/471/473/475/477/479)', (_kind, setup, expression, expected) => {
    const source = `//@version=6\nindicator("From parameters")\n${setup}\nplot(${expression}, "Value")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = executeScript(parse(source), compatibilityBars.slice(0, 3));
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Value').values).toEqual(expected);
  });
});
