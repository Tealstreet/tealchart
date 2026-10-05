import { describe, expect, it, vi } from 'vitest';
import { parse } from '../../parser';
import { analyze } from './analyzer';
import { compile } from './compile';
import { emit } from './emitter';

const source = `//@version=6
indicator("AST membership work")
first(float src) => ta.ema(src, 2) + ta.ema(src, 3) + ta.ema(src, 4) + ta.ema(src, 5) + ta.ema(src, 6) + ta.ema(src, 7)
last(float src) => ta.ema(src, 8)
plot(first(close) + last(close))`;

describe('compilation AST membership work', () => {
  it('rebuilds membership after a caller edits a previously compiled AST', () => {
    const ast = parse(source);
    const first = ast.body.find((statement) => statement.type === 'FunctionDeclaration');
    expect(first?.type).toBe('FunctionDeclaration');
    const before = compile(ast);
    expect(before.success).toBe(true);
    const changed = parse(source.replace('ta.ema(src, 2)', 'ta.ema(src, 12)'));
    const replacement = changed.body.find((statement) => statement.type === 'FunctionDeclaration');
    if (first?.type !== 'FunctionDeclaration' || replacement?.type !== 'FunctionDeclaration') throw new Error('Missing function');
    first.body = replacement.body;
    const after = compile(ast);
    expect(after.success).toBe(true);
    expect(after.generatedCode).not.toBe(before.generatedCode);
    expect(after.generatedCode).toBe(compile(changed).generatedCode);
  });

  it('serializes each function body at most once for structural membership', () => {
    const ast = parse(source);
    const functions = ast.body.filter((statement) => statement.type === 'FunctionDeclaration');
    const stringify = vi.spyOn(JSON, 'stringify');
    try {
      const analysis = analyze(ast);
      expect(analysis.unsupported).toEqual([]);
      expect([...analysis.funcInfos.values()].every((info) => info.hasTACalls)).toBe(true);
      for (const fn of functions) {
        expect(stringify.mock.calls.filter(([value]) => value === fn.body).length).toBeLessThanOrEqual(1);
      }
    } finally {
      stringify.mockRestore();
    }
  });

  it('does not walk function bodies once per TA target during emission', () => {
    const ast = parse(source);
    const analysis = analyze(ast);
    const functions = ast.body.filter((statement) => statement.type === 'FunctionDeclaration');
    const values = vi.spyOn(Object, 'values');
    try {
      expect(emit(ast, analysis)).toContain('class');
      for (const fn of functions) {
        // Fixed history, membership, local-evaluation and call-presence passes.
        expect(values.mock.calls.filter(([value]) => value === fn.body).length).toBeLessThanOrEqual(6);
      }
    } finally {
      values.mockRestore();
    }
  });
});
