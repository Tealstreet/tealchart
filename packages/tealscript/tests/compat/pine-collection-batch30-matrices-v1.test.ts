import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Expected values follow the documented predicates and whole-row ordering on exact numeric matrices.
const predicates = [
  { member: 'is_antisymmetric', rows: 2, columns: 2, values: [0, 3, -3, 0], expected: 1 },
  { member: 'is_antisymmetric', rows: 2, columns: 2, values: [0, 3, 3, 0], expected: 0 },
  { member: 'is_antisymmetric', rows: 2, columns: 2, values: [1, 3, -3, 0], expected: 0 },
  { member: 'is_antisymmetric', rows: 2, columns: 3, values: [0, 0, 0, 0, 0, 0], expected: 0 },
  { member: 'is_stochastic', rows: 2, columns: 2, values: [0.25, 0.75, 0.75, 0.25], expected: 1 },
  { member: 'is_stochastic', rows: 2, columns: 2, values: [-1, 2, 2, -1], expected: 0 },
  { member: 'is_stochastic', rows: 2, columns: 2, values: [0.25, 0.25, 0.25, 0.25], expected: 0 },
  { member: 'is_binary', rows: 2, columns: 3, values: [0, 1, 1, 0, 1, 0], expected: 1 },
  { member: 'is_binary', rows: 2, columns: 3, values: [0, 1, 1, 0, 2, 0], expected: 0 },
  { member: 'is_binary', rows: 2, columns: 3, values: [0, 1, 1, 0, -1, 0], expected: 0 },
  { member: 'is_binary', rows: 2, columns: 3, values: [0, 1, 1, 0, 0.5, 0], expected: 0 },
  { member: 'is_diagonal', rows: 2, columns: 2, values: [3, 0, 0, -2], expected: 1 },
  { member: 'is_diagonal', rows: 2, columns: 2, values: [3, 0, 5, -2], expected: 0 },
  { member: 'is_zero', rows: 2, columns: 3, values: [0, 0, 0, 0, 0, 0], expected: 1 },
  { member: 'is_zero', rows: 2, columns: 3, values: [0, 0, 0, 0, 0, 1], expected: 0 },
  { member: 'is_zero', rows: 2, columns: 3, values: [0, 0, 0, 0, 0, -1], expected: 0 },
] as const;

function matrixSource(rows: number, columns: number, values: readonly number[], kind: 'int' | 'float'): string {
  return `m = matrix.new<${kind}>(${rows}, ${columns}, ${kind === 'int' ? '0' : '0.0'})\n${values
    .map((value, index) => `matrix.set(m, ${Math.floor(index / columns)}, ${index % columns}, ${value})`)
    .join('\n')}`;
}

describe('collection batch30 exact matrix predicates', () => {
  for (const sample of predicates) {
    for (const kind of sample.values.some((value) => !Number.isInteger(value))
      ? (['float'] as const)
      : (['int', 'float'] as const)) {
      for (const form of ['namespace', 'receiver'] as const) {
        it(`${kind} ${form} ${sample.member} on ${sample.values} gives ${sample.expected}`, () => {
          const call = form === 'namespace' ? `matrix.${sample.member}(id=m)` : `m.${sample.member}()`;
          const result = runCompatScript(`//@version=6
indicator("Matrix predicate")
${matrixSource(sample.rows, sample.columns, sample.values, kind)}
plot(${call} ? 1 : 0, title="result")`);
          expect(result.errors).toEqual([]);
          expect(getPlot(result, 'result').values).toEqual(Array(12).fill(sample.expected));
        });
      }
    }
  }
});

describe('collection batch30 whole-row matrix sorting', () => {
  for (const kind of ['int', 'float'] as const) {
    for (const form of ['namespace', 'receiver'] as const) {
      for (const order of ['ascending', 'descending'] as const) {
        it(`${kind} ${form} sorts column one ${order} and preserves row payloads`, () => {
          const call =
            form === 'namespace'
              ? `matrix.sort(order=order.${order}, id=m, column=1)`
              : `m.sort(order=order.${order}, column=1)`;
          const result = runCompatScript(`//@version=6
indicator("Matrix sorting")
${matrixSource(3, 2, [30, 3, 10, 1, 20, 2], kind)}
alias = m
${call}
plot(alias.get(0, 0), title="first payload")
plot(alias.get(1, 0), title="middle payload")
plot(alias.get(2, 0), title="last payload")
plot(m.get(0, 1), title="first key")
plot(m.rows(), title="rows")
plot(m.columns(), title="columns")`);
          expect(result.errors).toEqual([]);
          const expected = order === 'ascending' ? [10, 20, 30, 1, 3, 2] : [30, 20, 10, 3, 3, 2];
          for (const [index, title] of [
            'first payload',
            'middle payload',
            'last payload',
            'first key',
            'rows',
            'columns',
          ].entries()) {
            expect(getPlot(result, title).values).toEqual(Array(12).fill(expected[index]));
          }
        });
      }
    }
  }
});
