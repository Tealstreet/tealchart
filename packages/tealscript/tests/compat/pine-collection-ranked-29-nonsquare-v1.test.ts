import { describe, expect, it } from 'vitest';
import { getPlot, runCompatScript } from './fixtures';

// Reference: https://www.tradingview.com/pine-script-reference/v6/.
describe('matrix.is_antisymmetric non-square contract functions[629] remarks[0]', () => {
  for (const type of ['int', 'float']) {
    for (const receiver of [false, true]) {
      it(`${type} ${receiver ? 'method[210]' : 'functions[629]'} non-square returns false`, () => {
        const call = receiver ? 'm.is_antisymmetric()' : 'matrix.is_antisymmetric(m)';
        const result = runCompatScript(`//@version=6\nindicator("non-square")\nm = matrix.new<${type}>(2, 3, 0)\nplot(${call} ? 1 : 0, "result")\n`);
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'result').values).toEqual(Array(12).fill(0));
      });
    }
  }
});
