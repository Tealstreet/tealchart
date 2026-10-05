import { describe, expect, it } from 'vitest';
import { parse } from './parser';
import { checkProgram } from '../semantic/checker';
import { executeScript } from '../runtime/compiledOnly';

const prefix = `//@version=5
indicator("AstroReduction")
`;
const bars = [{ time: 60000, open: 1, high: 1, low: 1, close: 1, volume: 1 }];

describe('inline switch declarations', () => {
  it.each(['result = value * 2', 'float result = value * 2'])('returns singleton declaration %s', (body) => {
    const ast = parse(`${prefix}f(float value,int selector)=>\n    switch selector\n        1 => ${body}\n        => fallback = value * 3\nplot(f(5,1))\nplot(f(5,2))\n`);
    expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.plots.map((plot) => Array.from(plot.values))).toEqual([[10], [15]]);
  });

  it('keeps expression and comma-chain switch returns', () => {
    const ast = parse(`${prefix}f(int selector)=>\n    switch selector\n        1 => 10\n        => result = 15, result\nplot(f(1))\nplot(f(2))\n`);
    expect(executeScript(ast, bars).plots.map((plot) => Array.from(plot.values))).toEqual([[10], [15]]);
  });

  it('still refuses a missing initializer', () => {
    expect(() => parse(`${prefix}f()=>\n    switch\n        true => result =\n`)).toThrow();
  });

  it('still refuses parameter reassignment in a switch arm', () => {
    const ast = parse(`${prefix}f(int value)=>\n    switch\n        true => value := 2\n        => 0\nplot(f(1))\n`);
    expect(checkProgram(ast).diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });

  it('still refuses float initialization of an int', () => {
    const ast = parse(`${prefix}f()=>\n    switch\n        true =>\n            int result = 1.5\nplot(f())\n`);
    expect(checkProgram(ast).diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });
});
