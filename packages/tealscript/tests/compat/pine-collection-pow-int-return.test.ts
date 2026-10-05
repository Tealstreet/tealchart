import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot } from './fixtures';

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
// functions[624], methods[205] signatures explicitly return matrix<int>.
describe('collection integer power overload', () => {
  it.each([
    ['namespace', false],
    ['method', true],
  ] as const)('matrix-pow-int-overload-return %s returns the integer matrix overload', (_name, receiver) => {
    const ast = parse(`//@version=6
indicator("Integer matrix power")
source = matrix.new<int>(2, 2, 2)
answer = ${receiver ? 'source.pow(3)' : 'matrix.pow(source, 3)'}
plot(matrix.get(answer, 0, 0), title="Power")`);
    const checked = checkProgram(ast);
    expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'answer')?.type).toMatchObject({
      kind: 'matrix',
      qualifier: 'series',
      elementType: { kind: 'int' },
    });
    const result = executeScript(ast, compatibilityBars.slice(0, 1));
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Power').values).toEqual([32]);
  });
});
