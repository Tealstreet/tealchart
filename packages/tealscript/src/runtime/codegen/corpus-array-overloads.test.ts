import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import type { Bar } from '../context';

const bars: Bar[] = [{ time: 60_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }];
const ast = (body: string) => parse(`//@version=6\nindicator("array overloads")\n${body}`);
const operations = [
  { name: 'sum', argument: '', expected: 11 },
  { name: 'range', argument: '', expected: 6 },
  { name: 'percentile_nearest_rank', argument: '50', expected: 3 },
];

// The manual has int and float overloads for these scalar operations.
// Hand calculations on [1,7,3] establish these integer-preserving values.
// Median is outside this repair because its runtime lacks element-type metadata.
describe('integer array scalar overload inference', () => {
  it.each(operations)('retains int return type for $name in namespace and method calls', ({ name, argument, expected }) => {
    const script = ast(`values = array.from(1, 7, 3)
int direct = array.${name}(values${argument ? `, ${argument}` : ''})
int method = values.${name}(${argument})
plot(direct)
plot(method)`);
    expect(checkProgram(script).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const result = executeScript(script, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[expected], [expected]]);
  });

  it.each(operations)('retains float return type for $name on float arrays', ({ name, argument }) => {
    const script = ast(`values = array.from(1.5, 7.5, 3.5)
int wrong = values.${name}(${argument})
plot(wrong)`);
    expect(checkProgram(script).diagnostics.some((item) => /Cannot assign float value to int variable wrong/.test(item.message))).toBe(true);
  });

  it('uses the declared float element type even when every runtime element is an integer', () => {
    const script = ast(`values = array.new<float>()
values.push(1)
values.push(7)
values.push(3)
int wrong = values.sum()
plot(wrong)`);
    expect(checkProgram(script).diagnostics.some((item) => /Cannot assign float value to int variable wrong/.test(item.message))).toBe(true);
  });

  it.each(operations)('retains the series qualifier for integer $name results', ({ name, argument }) => {
    const script = ast(`values = array.from(1, 7, 3)
const int wrong = values.${name}(${argument})
plot(wrong)`);
    expect(checkProgram(script).diagnostics).toContainEqual(expect.objectContaining({
      code: 'qualifier-mismatch', message: expect.stringContaining('Cannot assign series value to const int'),
    }));
  });

  it('infers integer sums on arrays returned by matrix rows and map keys', () => {
    const script = ast(`values = matrix.new<int>(1, 3, 0)
values.set(0, 0, 1)
values.set(0, 1, 7)
values.set(0, 2, 3)
int rowSum = values.row(0).sum()
entries = map.new<int, float>()
entries.put(2, 1.0)
entries.put(5, 2.0)
int keySum = array.sum(entries.keys())
plot(rowSum)
plot(keySum)`);
    expect(checkProgram(script).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const result = executeScript(script, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[11], [7]]);
  });

  it('resolves aggregate methods on returned arrays before bare TA aliases', () => {
    const script = ast(`values = matrix.new<int>(3, 1, 0)
values.set(0, 0, 4)
values.set(1, 0, 8)
values.set(2, 0, 6)
int columnNearest = values.col(0).percentile_nearest_rank(50)
int columnRange = values.col(0).range()
entries = map.new<int, float>()
entries.put(-2, 1.0)
entries.put(4, 2.0)
int keyNearest = entries.keys().percentile_nearest_rank(50)
int keyRange = entries.keys().range()
plot(columnNearest)
plot(columnRange)
plot(keyNearest)
plot(keyRange)`);
    expect(checkProgram(script).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const result = executeScript(script, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[6], [4], [-2], [6]]);
  });
});
