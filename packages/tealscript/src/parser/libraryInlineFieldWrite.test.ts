import { describe, expect, it } from 'vitest';
import { parse } from './parser';
import { executeScript } from '../runtime/compiledOnly';
import { checkProgram } from '../semantic/checker';

const header = `//@version=5
library("MotionReduction")
export type Frame
    bool execution = false
`;

describe('inline library field writes', () => {
  it('keeps a plain expression as the function return value', () => {
    const ast = parse(`//@version=5\nindicator("I")\nf(float x)=>x*2+1\nplot(f(close))\n`);
    const result = executeScript(ast, [2, 4].map((close, i) => ({ time: i * 60000, open: close, high: close, low: close, close, volume: 1 })));
    expect(Array.from(result.plots[0].values)).toEqual([5, 9]);
  });

  it('parses the Motion8 field-write reduction as assignment', () => {
    const ast = parse(`${header}export start(Frame frame) => frame.execution := true
`);
    const fn = ast.body.find((node) => node.type === 'FunctionDeclaration');
    expect(fn?.type).toBe('FunctionDeclaration');
    if (fn?.type !== 'FunctionDeclaration') throw new Error('Function missing');
    expect(Array.isArray(fn.body) && fn.body[0].type).toBe('AssignmentStatement');
    expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('preserves the following return expression and block-body control', () => {
    for (const body of ['frame.execution := true, frame.execution', '\n    frame.execution := true\n    frame.execution']) {
      const ast = parse(`${header}export start(Frame frame) => ${body}
`);
      expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    }
  });

  it('still refuses a missing assignment value', () => {
    expect(() => parse(`${header}export start(Frame frame) => frame.execution :=
`)).toThrow();
  });

  it('still refuses a string assigned to a bool field', () => {
    const ast = parse(`${header}export start(Frame frame) =>\n    frame.execution := "wrong"
`);
    expect(checkProgram(ast).diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });

  it('still refuses scalar parameter reassignment', () => {
    const ast = parse(`//@version=5
library("L")
export f(int value)=>\n    value := 2
`);
    expect(checkProgram(ast).diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });
});
