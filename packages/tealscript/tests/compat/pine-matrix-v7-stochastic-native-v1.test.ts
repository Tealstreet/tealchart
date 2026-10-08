import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const source = `//@version=6
indicator("Matrix row orientation")
a = matrix.new<float>(2,2,0)
matrix.set(a,0,0,0.2)
matrix.set(a,0,1,0.8)
matrix.set(a,1,0,0.4)
matrix.set(a,1,1,0.6)
b = matrix.transpose(a)
plot(matrix.is_stochastic(a) ? 1 : 0,"ROW_ONLY")
plot(matrix.is_stochastic(b) ? 1 : 0,"COLUMN_ONLY")
`;
describe('matrix stochastic orientation', () => {
  it('accepts row-only stochastic matrix and rejects its transpose', () => {
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'ROW_ONLY').values).toEqual([1, 1, 1]);
    expect(getPlot(result, 'COLUMN_ONLY').values).toEqual([0, 0, 0]);
  });
});
