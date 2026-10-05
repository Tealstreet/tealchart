import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const bars = Array.from({ length: 20 }, (_, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: index + 1,
  high: index + 1,
  low: index + 1,
  close: index + 1,
  volume: 1,
}));

describe('UDF terminal declaration results', () => {
  it('runs the unmodified official ta.stdev example', () => {
    // Verbatim examples[0] from the archived v6 reference entry ta.stdev.
    // On this integer ramp, both definitions have five-sample variance 2.
    const source = readFileSync(
      new URL('../../../tests/compat/fixtures/official-stdev-example.pine', import.meta.url),
      'utf8',
    );
    const result = executeScript(parse(source), bars);
    expect(result.errors).toEqual([]);
    const expected = bars.map((_, index) => (index < 4 ? null : Math.sqrt(2)));
    expect(result.plots[0].values).toEqual(expected);
    expect(result.plots[1].values).toEqual(expected);
  });

  it.each([5, 6])('v%i returns scalar declarations through nested functions', (version) => {
    const result = executeScript(
      parse(`//@version=${version}
indicator("Declared results")
inner(x) =>
    int answer = x + 1
outer(x) =>
    answer = inner(x) * 3
named(x) =>
    named = x + 2
asText(x) =>
    result = str.tostring(x)
plot(outer(bar_index))
plot(named(bar_index))
plot(str.length(asText(bar_index)))`),
      bars.slice(0, 3),
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [3, 6, 9],
      [2, 3, 4],
      [1, 1, 1],
    ]);
  });

  it('evaluates a declaration initializer once', () => {
    const result = executeScript(
      parse(`//@version=6
indicator("Initializer once")
var calls = array.new_int(1, 0)
advance() =>
    array.set(calls, 0, array.get(calls, 0) + 1)
    result = array.get(calls, 0)
plot(advance())
plot(array.get(calls, 0))`),
      bars.slice(0, 3),
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [1, 2, 3],
      [1, 2, 3],
    ]);
  });

  it.each(['var', 'varip'])('returns persistent %s declarations independently per call', (kind) => {
    const result = executeScript(
      parse(`//@version=6
indicator("Persistent declared result")
seed(x) =>
    ${kind} int stored = x
plot(seed(bar_index + 7))
plot(seed(bar_index + 20))`),
      bars.slice(0, 3),
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [7, 7, 7],
      [20, 20, 20],
    ]);
  });

  it('preserves terminal tuple declarations', () => {
    const result = executeScript(
      parse(`//@version=6
indicator("Tuple declaration")
pair(x) => [x, x + 1]
wrapper(x) =>
    [first, second] = pair(x)
[a, b] = wrapper(bar_index)
plot(a)
plot(b)`),
      bars.slice(0, 3),
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [0, 1, 2],
      [1, 2, 3],
    ]);
  });
  it.each([5, 6])('v%i returns assignments and declarations from final branches', (version) => {
    const result = executeScript(
      parse(`//@version=${version}
indicator("Branch results")
assigned(x) =>
    result = x
    if x == 0
        result := 10
    else
        if x == 1
            result += 20
        else
            result := 30
declared(x) =>
    if x == 0
        int result = 10
    else
        int result = x + 20
plot(assigned(bar_index))
plot(declared(bar_index))`),
      bars.slice(0, 3),
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [10, 21, 30],
      [10, 21, 22],
    ]);
  });
});
