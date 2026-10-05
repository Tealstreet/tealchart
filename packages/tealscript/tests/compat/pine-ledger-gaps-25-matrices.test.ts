import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Independent algebra for A=[[2,1],[1,2]]: eigenvalues are {1,3}; each returned
// column must satisfy A*v=lambda*v. No native sign, scale or ordering is chosen.
// These invariants do not certify the reference's named Implicit QL algorithm.
describe('ledger gaps 25 partial matrix eigen witnesses', () => {
  for (const kind of ['int', 'float']) {
    for (const method of [false, true]) {
      it(`ranks 980–989 partial: ${kind} ${method ? 'receiver' : 'namespace'} eigen columns satisfy the defining equation`, () => {
        const source = `//@version=6
indicator("Ledger 25 eigen invariants")
a = matrix.new_${kind}(2, 2, 0)
a.set(0, 0, 2)
a.set(0, 1, 1)
a.set(1, 0, 1)
a.set(1, 1, 2)
values = ${method ? 'a.eigenvalues()' : 'matrix.eigenvalues(a)'}
vectors = ${method ? 'a.eigenvectors()' : 'matrix.eigenvectors(a)'}
plot(array.size(values), "Count")
plot(vectors.rows(), "Rows")
plot(vectors.columns(), "Columns")
plot(values.get(0), "Lambda 0")
plot(values.get(1), "Lambda 1")
plot(vectors.get(0, 0), "X 0")
plot(vectors.get(1, 0), "Y 0")
plot(vectors.get(0, 1), "X 1")
plot(vectors.get(1, 1), "Y 1")
`;
        expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
        const result = runCompatScript(source, { bars: [compatibilityBars[0]!] });
        expect(result.errors).toEqual([]);
        const value = (name: string) => {
          const values = getPlot(result, name).values;
          expect(values).toHaveLength(1);
          expect(typeof values[0]).toBe('number');
          return values[0] as number;
        };
        expect(['Count', 'Rows', 'Columns'].map(value)).toEqual([2, 2, 2]);
        const eigenvalues = [value('Lambda 0'), value('Lambda 1')];
        const sorted = [...eigenvalues].sort((a, b) => a - b);
        expect(sorted[0]).toBeCloseTo(1, 10);
        expect(sorted[1]).toBeCloseTo(3, 10);
        for (let column = 0; column < 2; column++) {
          const x = value(`X ${column}`);
          const y = value(`Y ${column}`);
          const lambda = eigenvalues[column]!;
          expect(x * x + y * y).toBeGreaterThan(0);
          expect(2 * x + y).toBeCloseTo(lambda * x, 10);
          expect(x + 2 * y).toBeCloseTo(lambda * y, 10);
        }
      });
    }
  }
});
