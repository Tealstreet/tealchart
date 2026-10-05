import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';

const bars = [10, 11, 12].map((close, index) => ({
  time: index * 60_000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

for (const kind of ['int', 'float']) {
  for (const entry of ['namespace', 'method']) {
    it(`routes ${kind} ${entry} eigenvalues through the documented symmetric QL path`, () => {
      const source = `//@version=6
indicator("Eigenvalue QL overload facets")
var matrix<${kind}> values = matrix.new<${kind}>(3, 3, ${kind === 'int' ? '0' : '0.0'})
if barstate.isfirst
    for index = 0 to 2
        matrix.set(values, index, index, 2)
        if index < 2
            matrix.set(values, index, index + 1, 1)
            matrix.set(values, index + 1, index, 1)
array<float> eigen = ${entry === 'namespace' ? 'matrix.eigenvalues(values)' : 'values.eigenvalues()'}
plot(array.size(eigen), "COUNT")
plot(array.get(eigen, 0), "ROOT_0")
plot(array.get(eigen, 1), "ROOT_1")
plot(array.get(eigen, 2), "ROOT_2")`;
      const execution = executeCompiledScript(parse(source), bars, new Map());
      expect(execution.status).toBe('success');
      if (execution.status !== 'success') throw new Error(execution.reason);
      expect(execution.result.errors).toEqual([]);
      expect(execution.result.plots.find((plot) => plot.title === 'COUNT')?.values).toEqual([3, 3, 3]);
      for (let index = 0; index < bars.length; index++) {
        const roots = ['ROOT_0', 'ROOT_1', 'ROOT_2']
          .map((title) => execution.result.plots.find((plot) => plot.title === title)?.values[index])
          .map(Number)
          .sort((left, right) => left - right);
        for (const [offset, expected] of [2 - Math.SQRT2, 2, 2 + Math.SQRT2].entries()) {
          expect(roots[offset]).toBeCloseTo(expected, 12);
        }
        expect(roots.reduce((sum, value) => sum + value, 0)).toBeCloseTo(6, 12);
        expect(roots.reduce((product, value) => product * value, 1)).toBeCloseTo(4, 12);
      }
    });
  }
}
