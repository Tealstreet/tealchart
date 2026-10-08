import { expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

for (const version of [5, 6]) for (const receiver of [false, true]) {
  it(`v${version} ${receiver ? 'receiver' : 'namespace'} fractional Kronecker block cells`, () => {
    const expected = [-1, 1.5, 2.5, -3.75, -2, -0.25, 5, 0.625];
    const result = runCompatScript(`//@version=${version}
indicator("Fractional Kronecker blocks")
a = matrix.new<float>(1, 2, 0)
a.set(0, 0, -0.5)
a.set(0, 1, 1.25)
b = matrix.new<float>(2, 2, 0)
b.set(0, 0, 2)
b.set(0, 1, -3)
b.set(1, 0, 4)
b.set(1, 1, 0.5)
c = ${receiver ? 'a.kron(b)' : 'matrix.kron(id2=b, id1=a)'}
${expected.map((_, index) => `plot(c.get(${Math.floor(index / 4)}, ${index % 4}), "Cell${index}")`).join('\n')}
c.set(0, 0, 99)
plot(a.get(0, 0), "SourceA")
plot(b.get(0, 0), "SourceB")
a.set(0, 1, 77)
b.set(1, 1, 88)
plot(c.get(1, 3), "Retained")
plot(c.rows(), "Rows")
plot(c.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 2) });
    expect(result.errors).toEqual([]);
    expected.forEach((value, index) => expect(getPlot(result, `Cell${index}`).values).toEqual([value, value]));
    expect(getPlot(result, 'SourceA').values).toEqual([-0.5, -0.5]);
    expect(getPlot(result, 'SourceB').values).toEqual([2, 2]);
    expect(getPlot(result, 'Retained').values).toEqual([0.625, 0.625]);
    expect(getPlot(result, 'Rows').values).toEqual([2, 2]);
    expect(getPlot(result, 'Columns').values).toEqual([4, 4]);
  });
}
