import { expect, it } from 'vitest';
import { parse } from '../parser';
import { executeScript } from '../runtime/compiledOnly';
import { checkProgram } from './checker';

const bars = [2, 3, 4].map((close, i) => ({ time: (i + 1) * 60000, open: close, high: close, low: close, close, volume: 1 }));

it('resolves a function call and value independently when both share a name', () => {
  const ast = parse(`//@version=6
indicator("independent function and value")
scale(float x) => x * 2.0
scale = scale(close)
plot(scale)
plot(scale(3.0))`);
  expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const result = executeScript(ast, bars);
  expect(result.errors).toEqual([]);
  expect(result.plots.map(p => p.values)).toEqual([[4, 6, 8], [6, 6, 6]]);
});

it('keeps same-name tuple values and function argument checks independent', () => {
  const ast = parse(`//@version=6
indicator("tuple function names")
first(float x) => x + 1.0
second(float x) => x + 2.0
pair() => [first(close), second(close)]
[first, second] = pair()
plot(first + second)
plot(first(second))`);
  expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const result = executeScript(ast, bars);
  expect(result.errors).toEqual([]);
  expect(result.plots.map(p => p.values)).toEqual([[7, 9, 11], [5, 6, 7]]);
  const invalid = parse(`//@version=6
indicator("typed call after value")
scale(float x) => x * 2.0
scale = 1.0
int rejected = scale(2.0)
plot(rejected)`);
  expect(checkProgram(invalid).diagnostics.some(d => d.severity === 'error' && /float/.test(d.message))).toBe(true);
});

it('still refuses two values declared with the same name', () => {
  const ast = parse(`//@version=6
indicator("duplicate values")
scale(float x) => x
scale = 1.0
scale = 2.0
plot(scale)`);
  expect(checkProgram(ast).diagnostics.filter(d => d.code === 'duplicate-symbol')).toHaveLength(1);
});
