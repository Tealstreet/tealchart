import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Rank1286: https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#negative-indices-in-arrays
// The v5 refusal is a runtime boundary, not a compile-time literal ban.
describe('collection-ranked33 v5 negative-array-index boundary', () => {
  for (const method of [false, true]) {
    for (const operation of ['get', 'set', 'insert', 'remove'] as const) {
      for (const version of [5, 6]) {
        it(`v${version} ${method ? 'receiver' : 'namespace'} ${operation} negative index`, () => {
          const callee = method ? `data.${operation}` : `array.${operation}`;
          const args = `${method ? '' : 'data, '}-1${operation === 'set' || operation === 'insert' ? ', 19' : ''}`;
          const source = `//@version=${version}
indicator("Negative array index")
data = array.from(11, 23, 37)
${callee}(${args})
plot(array.size(data), "Size")
plot(array.get(data, ${operation === 'remove' ? 1 : 2}), "Last")
`;
          expect(
            checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
          ).toEqual([]);
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 1) });
          if (version === 5) {
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some((error) => /index|bounds/i.test(error.message))).toBe(true);
          } else {
            expect(result.errors).toEqual([]);
            expect(getPlot(result, 'Size').values).toEqual([
              operation === 'insert' ? 4 : operation === 'remove' ? 2 : 3,
            ]);
            expect(getPlot(result, 'Last').values).toEqual([
              operation === 'remove' ? 23 : operation === 'set' || operation === 'insert' ? 19 : 37,
            ]);
          }
        });
      }
    }
  }
});
