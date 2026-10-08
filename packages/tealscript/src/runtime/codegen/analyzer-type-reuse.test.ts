import { expect, it, vi } from 'vitest';

import { parse } from '../../parser';
import * as semantic from '../../semantic/checker';
import { analyze, type SemanticTypeAnalysis } from './analyzer';
import { emit } from './emitter';
import { executeCompiledScript } from './execute';

it('reuses analyzed expression and loop-result types when emitting a TA program', () => {
  const ast = parse('//@version=6\nindicator("Typed preparation")\nlength=input.int(2)\nx = for i=0 to 1\n    close\nplot(ta.sma(x,length))');
  const analysis = analyze(ast);
  const check = vi.spyOn(semantic, 'checkProgram');
  const code = emit(ast, analysis);
  expect(code).toContain('onBar(ctx)');
  expect(check).not.toHaveBeenCalled();
});

it('preserves input-length TA values and loop result kinds', () => {
  const ast = parse('//@version=6\nindicator("Typed preparation")\nlength=input.int(2)\nx = for i=0 to 1\n    close\nplot(ta.sma(x,length))');
  const bars = [1, 3, 5].map((close, index) => ({ time: index * 60_000, open: close, high: close, low: close, close, volume: 1 }));
  const execution = executeCompiledScript(ast, bars);
  expect(execution.status).toBe('success');
  if (execution.status !== 'success') throw new Error(execution.reason);
  expect(execution.result.errors).toEqual([]);
  expect(execution.result.plots[0]?.values).toEqual([null, 2, 4]);
});

it('reuses the worker validation types for the identical AST and libraries', () => {
  const ast = parse('//@version=6\nindicator("Validation types")\nlength=input.int(2)\nplot(ta.sma(close,length))');
  const recordedExpressionTypes: SemanticTypeAnalysis['recordedExpressionTypes'] = new WeakMap();
  const loopResultTypes: SemanticTypeAnalysis['loopResultTypes'] = new WeakMap();
  const result = semantic.checkProgram(ast, { expressionTypes: recordedExpressionTypes, loopResultTypes, requireDeclaration: true });
  const check = vi.spyOn(semantic, 'checkProgram');
  const analysis = analyze(ast, { semanticTypes: { ast, result, recordedExpressionTypes, loopResultTypes } });
  emit(ast, analysis);
  expect(check).not.toHaveBeenCalled();
});

it.each(['ast', 'libraries'])('rechecks types when the validation %s identity changes', (changed) => {
  const source = '//@version=6\nindicator("Validation types")\nplot(ta.sma(close,2))';
  const ast = parse(source);
  const recordedExpressionTypes: SemanticTypeAnalysis['recordedExpressionTypes'] = new WeakMap();
  const loopResultTypes: SemanticTypeAnalysis['loopResultTypes'] = new WeakMap();
  const result = semantic.checkProgram(ast, { expressionTypes: recordedExpressionTypes, loopResultTypes });
  const check = vi.spyOn(semantic, 'checkProgram');
  analyze(changed === 'ast' ? parse(source) : ast, {
    libraries: changed === 'libraries' ? new Map() : undefined,
    semanticTypes: { ast, result, recordedExpressionTypes, loopResultTypes },
  });
  expect(check).toHaveBeenCalledTimes(1);
});
