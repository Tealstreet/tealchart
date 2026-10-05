import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const bars = Array.from({ length: 16 }, (_, index) => {
  const phase = index % 8;
  return {
    time: index * 120000,
    open: phase === 5 ? NaN : 3.5,
    high: 8,
    low: 0,
    close: phase === 2 || phase === 3 ? NaN : phase,
    volume: 1,
  };
});

const expected = {
  cross: [0, 0, -1, -1, 1, -1, 0, 0, 1, 0, -1, -1, 1, -1, 0, 0],
  crossover: [0, 0, -1, -1, 1, -1, 0, 0, 0, 0, -1, -1, 1, -1, 0, 0],
  crossunder: [0, 0, -1, -1, 0, -1, 0, 0, 1, 0, -1, -1, 0, -1, 0, 0],
};

describe('captured v5 nullable crossing results', () => {
  it.each(['cross', 'crossover', 'crossunder'] as const)(
    '%s publishes missing operands and retains recovery',
    (name) => {
      const result = executeScript(
        parse(`//@version=5
indicator("nullable cross")
value = ta.${name}(close, open)
plot(na(value) ? -1 : value ? 1 : 0)`),
        bars,
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(result.plots[0].values).toEqual(expected[name]);
    },
  );

  it.each(['cross', 'crossover', 'crossunder'] as const)('%s keeps v6 missing operands false', (name) => {
    const result = executeScript(
      parse(`//@version=6
indicator("two-valued cross")
plot(int(ta.${name}(close, open)))`),
      bars,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual(expected[name].map((value) => (value === -1 ? 0 : value)));
  });

  it.each(['cross', 'crossover', 'crossunder'] as const)('%s uses the same publication in a named UDF call', (name) => {
    const result = executeScript(
      parse(`//@version=5
indicator("scoped nullable cross")
crossing(float first, float second) => ta.${name}(source1=first, source2=second)
value = crossing(close, open)
plot(na(value) ? -1 : value ? 1 : 0)`),
      bars,
    );
    expect(result.errors).toEqual([]);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    expect(result.plots[0].values).toEqual(expected[name]);
  });

  it('evaluates each operand once while publishing a missing result', () => {
    const result = executeScript(
      parse(`//@version=5
indicator("cross argument evaluation")
var reads = array.new_int(1, 0)
operand(float value) =>
    array.set(reads, 0, array.get(reads, 0) + 1)
    value
value = ta.cross(operand(close), operand(open))
plot(na(value) ? -1 : value ? 1 : 0, "cross")
plot(array.get(reads, 0), "reads")`),
      bars,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual(expected.cross);
    expect(result.plots[1].values).toEqual(bars.map((_, index) => (index + 1) * 2));
  });
});
