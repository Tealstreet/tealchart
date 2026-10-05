import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';

const bars = [{ time: 60000, open: 1, high: 2, low: 0, close: 1, volume: 1 }];
const declarations = `//@version=6
indicator("method function overload")
type Data
    float value
method at(Data data, int timestamp) =>
    [data.value, timestamp]
at(float source, int timestamp, int limit = 1) =>
    [source, timestamp, limit]
`;

describe('function syntax for method overloads', () => {
  it.each(['at(data, 7)', 'at(timestamp = 7, data = data)'])('selects the Data tuple overload for %s', call => {
    const ast = parse(`${declarations}
data = Data.new(11)
[a, b] = ${call}
[c, d, e] = at(22.0, 8)
plot(a + b)
plot(c + d + e)
`);
    expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map(p => p.values)).toEqual([[18], [31]]);
  });

  it('evaluates the first argument only once for both dispatch paths', () => {
    const ast = parse(`${declarations}
var calls = array.new_int()
makeData() =>
    array.push(calls, 1)
    Data.new(11)
makeFloat() =>
    array.push(calls, 1)
    22.0
[a, b] = at(makeData(), 7)
[c, d, e] = at(makeFloat(), 8)
plot(a + b)
plot(c + d + e)
plot(array.size(calls))
`);
    expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map(p => p.values)).toEqual([[18], [31], [2]]);
  });

  it('retains per-call persistent method state under function syntax', () => {
    const ast = parse(`//@version=6
indicator("stateful method overload")
type Data
    float value
method at(Data data, int timestamp) =>
    var int count = 0
    count += 1
    [data.value + count, timestamp]
at(float source, int timestamp, int limit = 1) =>
    [source, timestamp, limit]
var data = Data.new(11)
[a, b] = at(data, 7)
plot(a)
`);
    expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const result = executeScript(ast, [bars[0], {...bars[0], time: 120000}, {...bars[0], time: 180000}]);
    expect(result.errors).toEqual([]);
    expect(result.plots[0]?.values).toEqual([12, 13, 14]);
  });

  it('checks arguments and tuple shape when only a method exists', () => {
    const ast = parse(`//@version=6
indicator("standalone method")
type Data
    float value
method at(Data data, int timestamp) =>
    [data.value, timestamp]
data = Data.new(11)
[a, b, c] = at(data, 7)
`);
    expect(checkProgram(ast).diagnostics.some(d => d.code === 'tuple-shape-mismatch')).toBe(true);
  });
});
