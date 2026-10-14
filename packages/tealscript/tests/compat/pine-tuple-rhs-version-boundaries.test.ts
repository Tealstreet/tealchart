import type { Program } from '../../src/parser';

import { describe, expect, it } from 'vitest';

import { parse, TealscriptParseError } from '../../src/parser';
import * as generated from '../../src/parser/generated';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const program = (rhs: string) => `//@version=4\nstudy("Uncaptured version")\na=1\nb=2\n[x,y]=${rhs}\nplot(1)\n`;
const bars = [{ time: Date.UTC(2026, 0, 1), open: 1, high: 1, low: 1, close: 1, volume: 1 }];

describe('direct tuple RHS version boundaries follow v70 native v4 refusals', () => {
  for (const rhs of ['[true,false]', '["a","b"]', '[a,b]', '[1,2]']) {
    it(`${rhs} matches the v70 native parser refusal`, () => {
      expect(() => parse(program(rhs))).toThrow("Syntax error at input '['.");
      try {
        parse(program(rhs));
      } catch (error) {
        expect(error).toBeInstanceOf(TealscriptParseError);
        expect((error as TealscriptParseError).location.start).toMatchObject({ line: 5, column: 1 });
      }
    });

    it(`${rhs} matches the v70 native external-AST refusal`, () => {
      const ast = generated.parse(program(rhs), { pineVersion: 4 }) as Program;
      expect(checkProgram(ast).diagnostics).toContainEqual(
        expect.objectContaining({
          code: 'tuple-literal-initializer',
          severity: 'error',
          message: "Syntax error at input '['.",
          line: 5,
          column: 1,
        }),
      );
    });
  }

  it('preserves the unwitnessed mixed call/numeric v4 admission and values', () => {
    const ast = parse(program('[abs(1),2]'));
    expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const execution = executeCompiledScript(ast, bars);
    expect(execution.status).toBe('success');
    if (execution.status === 'success') {
      expect(execution.result.errors).toEqual([]);
      expect(execution.result.plots.map((plot) => plot.values)).toEqual([[1]]);
    }
  });

  it('preserves unwitnessed mixed call/numeric external-AST admission', () => {
    const ast = generated.parse(program('[abs(1),2]'), { pineVersion: 4 }) as Program;
    expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });

  it('retains the earlier all-call parser policy', () => {
    expect(() => parse(program('[abs(1),abs(2)]'))).toThrow("Syntax error at input '['");
  });

  it('retains the earlier all-call external-AST policy', () => {
    const ast = generated.parse(program('[abs(1),abs(2)]'), { pineVersion: 4 }) as Program;
    expect(checkProgram(ast).diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'tuple-literal-initializer',
        severity: 'error',
        message: "Syntax error at input '['",
      }),
    );
  });
});
