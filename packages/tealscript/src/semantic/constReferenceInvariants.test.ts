import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';
import { checkSemanticTypeInvariants } from './semanticTypeInvariants';

// The independent type audit must accept the same native-settled declarations.
describe('const reference invariant audit', () => {
  it.each([
    ['array<float>', 'array.new<float>(1, close)'],
    ['matrix<float>', 'matrix.new<float>(1, 1, close)'],
    ['map<string, float>', 'map.new<string, float>()'],
    ['line', 'line.new(0, close, 1, close)'],
  ])('retains the series qualifier of const %s', (type, constructor) => {
    const ast = parse(`//@version=6\nindicator("const reference audit")\nconst ${type} value = ${constructor}\n`);
    const checked = checkProgram(ast);
    expect(checked.diagnostics).toEqual([]);
    expect(checkSemanticTypeInvariants(ast, checked)).toEqual([]);
  });
});
