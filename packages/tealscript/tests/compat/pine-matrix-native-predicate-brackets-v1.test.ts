import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const source = `//@version=6
indicator("Matrix predicate boundaries", max_bars_back=256)
epsilon = input.float(0.000000000001, "Epsilon")
rowOnly = matrix.new<float>(2, 2, 0.0)
matrix.set(rowOnly, 0, 0, 0.2)
matrix.set(rowOnly, 0, 1, 0.8)
matrix.set(rowOnly, 1, 0, 0.3)
matrix.set(rowOnly, 1, 1, 0.7)
columnOnly = matrix.transpose(rowOnly)
zero = matrix.new<float>(1, 1, epsilon)
binary = matrix.new<float>(1, 1, 1.0 + epsilon)
identity = matrix.new<float>(2, 2, 0.0)
matrix.set(identity, 0, 0, 1.0)
matrix.set(identity, 1, 1, 1.0)
matrix.set(identity, 0, 1, epsilon)
plot(matrix.is_stochastic(rowOnly) ? 1 : 0, "ROW_STOCHASTIC")
plot(matrix.is_stochastic(columnOnly) ? 1 : 0, "COLUMN_STOCHASTIC")
plot(matrix.is_zero(zero) ? 1 : 0, "ZERO")
plot(matrix.is_binary(binary) ? 1 : 0, "BINARY")
plot(matrix.is_identity(identity) ? 1 : 0, "IDENTITY")
plot(matrix.is_symmetric(identity) ? 1 : 0, "SYMMETRIC")
plot(epsilon, "EPSILON")
`;
const cases = [
  { epsilon: 1e-12, predicate: 1 },
  { epsilon: 0.0, predicate: 1 },
  { epsilon: 1e-16, predicate: 1 },
  { epsilon: 1e-8, predicate: 0 },
  { epsilon: 0.0001, predicate: 0 },
];
describe('matrix row orientation and epsilon boundaries', () => {
  for (const sample of cases) {
    it(`epsilon ${sample.epsilon}`, () => {
      const result = runCompatScript(source, {
        bars: compatibilityBars.slice(0, 2),
        inputs: new Map([['input_Epsilon', sample.epsilon]]),
      });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({
        ROW_STOCHASTIC: 1,
        COLUMN_STOCHASTIC: 0,
        ZERO: sample.predicate,
        BINARY: sample.predicate,
        IDENTITY: sample.predicate,
        SYMMETRIC: sample.predicate,
        EPSILON: sample.epsilon,
      })) {
        expect(getPlot(result, title).values, title).toEqual([value, value]);
      }
    });
  }
});
