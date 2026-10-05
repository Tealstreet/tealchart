import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import type { Bar } from '../context';

const bars: Bar[] = [0, 1].map((index) => ({ time: 60_000 * (index + 1), open: 1, high: 1, low: 1, close: 1, volume: 1 }));
const ast = (body: string) => parse(`//@version=6\nindicator("array percentile qualifiers")\n${body}`);
const operations = [
  { name: 'percentile_nearest_rank', expected: [2, 4] },
  { name: 'percentile_linear_interpolation', expected: [2.5, 4] },
];

// Archived v6 array percentage slots accept series numeric values; TA slots
// require simple percentages. For sorted [2,4,8], ranks 25/50 select 2/4,
// while linear interpolation selects 3/4. No corpus source is used here.
describe('array percentile percentage qualifiers', () => {
  it.each(operations)('accepts series percentage on returned-array $name receivers', ({ name, expected }) => {
    const script = ast(`plot(array.from(2.0, 4.0, 8.0).${name}(25 + bar_index * 25))`);
    expect(checkProgram(script).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const result = executeScript(script, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual(expected);
  });

  it.each(operations)('accepts series percentage on named-array and namespace $name calls', ({ name, expected }) => {
    const script = ast(`values = array.from(2.0, 4.0, 8.0)
plot(values.${name}(percentage = 25 + bar_index * 25))
plot(array.${name}(values, 25 + bar_index * 25))`);
    expect(checkProgram(script).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const result = executeScript(script, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([expected, expected]);
  });

  it.each(operations)('retains simple percentage restriction for ta.$name', ({ name }) => {
    const diagnostics = checkProgram(ast(`plot(ta.${name}(close, 3, 25 + bar_index * 25))`)).diagnostics;
    expect(diagnostics).toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining("simple parameter 'percentage'") }));
  });

  it.each(operations)('retains numeric percentage restriction for array $name receivers', ({ name }) => {
    const diagnostics = checkProgram(ast(`plot(array.from(2.0, 4.0, 8.0).${name}("50"))`)).diagnostics;
    expect(diagnostics).toContainEqual(expect.objectContaining({ message: expect.stringContaining('percentage') }));
    expect(diagnostics.some((item) => item.severity === 'error')).toBe(true);
  });
});
