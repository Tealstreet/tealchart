import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('selected collection method return types follow the declared body', () => {
  for (const method of ['mult', 'is_binary', 'is_zero']) {
    it(`${method} selects the custom array result while preserving the builtin overload`, () => {
      const source = `//@version=6
indicator("Custom collection return types")
method ${method}(matrix<int> self, string selector) =>
    array.from(7, 9)
left = matrix.new<int>(2, 2, 1)
inferred = left.${method}(selector="custom")
array<int> selected = inferred
plot(selected.get(0), title="first")
plot(selected.get(1), title="second")
plot(${method === 'mult' ? 'left.mult(2).get(0, 0)' : `left.${method}() ? 1 : 0`}, title="builtin")`;
      const checked = checkProgram(parse(source));
      expect(checked.diagnostics).toEqual([]);
      expect(checked.symbols.find((symbol) => symbol.name === 'inferred')?.type).toEqual({
        kind: 'array',
        qualifier: 'series',
        elementType: { kind: 'int' },
      });
      const result = runCompatScript(source);
      expect(result.errors).toEqual([]);
      for (const [title, expected] of [
        ['first', 7],
        ['second', 9],
        ['builtin', method === 'mult' ? 2 : method === 'is_binary' ? 1 : 0],
      ] as const) {
        expect(getPlot(result, title).values).toEqual(compatibilityBars.map(() => expected));
      }
    });
  }
});
