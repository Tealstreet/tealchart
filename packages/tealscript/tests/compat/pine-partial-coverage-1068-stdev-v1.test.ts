import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const bars = [{ time: 60_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }];
const run = (body: string) => {
  const result = executeScript(parse(`//@version=6\nindicator("Stdev clauses")\n${body}`), bars);
  expect(result.errors).toEqual([]);
  expect(result.plots).toHaveLength(3);
  expect(result.plots.every((plot) => plot.values.length === 1)).toBe(true);
  return result.plots.map((plot) => plot.values[0]);
};

describe('PARTIAL 1068-1075: population, sample and empty array stdev', () => {
  // Frozen reference functions[523-524], methods[112-113], remarks[0-1].
  // Integer examples have integral results; fractional integer policy stays open.
  for (const receiver of [false, true]) {
    for (const kind of ['float', 'int'] as const) {
      const call = (id: string, tail = '') =>
        receiver ? `${id}.stdev(${tail})` : `array.stdev(${id}${tail ? `, ${tail}` : ''})`;

      it(`${kind} ${receiver ? 'receiver' : 'namespace'} distinguishes population and sample denominators`, () => {
        const populations = kind === 'float' ? 'array.from(2.0, 4.0, 6.0)' : 'array.from(1, 3)';
        const samples = kind === 'float' ? 'array.from(2.0, 4.0, 6.0)' : 'array.from(1, 3, 5)';
        const values = run(`population = ${populations}
sample = ${samples}
plot(${call('population')}, "default population")
plot(${call('population', 'biased = true')}, "explicit population")
plot(${call('sample', 'biased = false')}, "sample")`);
        const population = kind === 'float' ? Math.sqrt(8 / 3) : 1;
        expect(values[0]).toBeCloseTo(population, 10);
        expect(values[1]).toBeCloseTo(population, 10);
        expect(values[2]).toBeCloseTo(2, 10);
      });

      it(`${kind} ${receiver ? 'receiver' : 'namespace'} returns NA for empty arrays with either bias`, () => {
        const values = run(`empty = array.new<${kind}>(0)
plot(${call('empty')}, "default population")
plot(${call('empty', 'biased = true')}, "explicit population")
plot(${call('empty', 'biased = false')}, "sample")`);
        expect(values).toEqual([null, null, null]);
      });
    }
  }
});
