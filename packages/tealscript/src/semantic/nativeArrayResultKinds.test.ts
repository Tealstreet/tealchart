import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { executeScript } from '../runtime/compiledOnly';
import { checkProgram } from './checker';

const medianSource = `//@version=6
indicator("corpus-array-median-integer-v1")
a0 = array.new<int>()
array.push(a0, 2)
array.push(a0, 4)
array.push(a0, 6)
int m0 = array.median(a0)
plot(m0, "median_0")
a1 = array.new<int>()
array.push(a1, 1)
array.push(a1, 2)
int m1 = array.median(a1)
plot(m1, "median_1")
a2 = array.new<int>()
array.push(a2, -2)
array.push(a2, -1)
int m2 = array.median(a2)
plot(m2, "median_2")
`;

const standardizeSource = `//@version=6
indicator("corpus-array-standardize-int-typed-v1")
sorted = array.from(10.0, 20.0, 30.0, 40.0, 50.0)
a = array.from(1, 2, 3)
array<int> b = a.standardize()
plot(array.get(b, 0), "first")
plot(array.get(b, 1), "middle")
plot(array.get(b, 2), "last")
`;

const bars = [{ time: 60000, open: 7, high: 8, low: 6, close: 7, volume: 10 }];

describe('captured array result metadata', () => {
  it('admits integer median destinations and preserves captured fractional values', () => {
    expect(createHash('sha256').update(medianSource).digest('hex')).toBe('d51a120fcbd99c95bb12e3eca309cbfa137974aa4799e972ee3817e8ce097bd4');
    const program = parse(medianSource);
    expect(checkProgram(program).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = executeScript(program, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values[0])).toEqual([4, 1.5, -1.5]);
  });

  it('admits the captured integer standardize destination without rounding its values', () => {
    expect(createHash('sha256').update(standardizeSource).digest('hex')).toBe('70b808427a5139ecbbaeba70bcdfa056f878a7f257370101f0fb3631bd7824df');
    const program = parse(standardizeSource);
    expect(checkProgram(program).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = executeScript(program, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values[0]).toBeCloseTo(-1.2247448713915887, 13);
    expect(result.plots[1].values[0]).toBe(0);
    expect(result.plots[2].values[0]).toBeCloseTo(1.2247448713915887, 13);
  });
  it('preserves float standardize metadata through chained receivers', () => {
    const program = parse(`//@version=6
indicator("float standardize metadata")
values = array.from(1.0, 2.0, 3.0)
array<int> invalid = values.copy().standardize()
`);
    expect(checkProgram(program).diagnostics.some((diagnostic) => diagnostic.severity === 'error')).toBe(true);
  });

  it('admits namespace and chained integer standardize destinations', () => {
    const program = parse(`//@version=6
indicator("integer standardize metadata")
values = array.from(1, 2, 3)
array<int> direct = array.standardize(values)
array<int> chained = values.copy().standardize()
array<float> floats = array.standardize(array.from(1.0, 2.0, 3.0))
`);
    expect(checkProgram(program).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });

});
