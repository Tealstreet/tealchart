import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: pine-v6-reference-v1.json keyword import, alias argument.
// Omitted alias defaults to libraryName; explicit aliases select their own namespace.
// In-memory libraries certify binding and values, not published-library discovery.
describe('import namespace defaults preserve library names', () => {
  for (const libraryName of ['Numbers', 'Math_Pack2']) {
    for (const explicit of [false, true]) {
      it(`returns exported values from ${libraryName} with ${explicit ? 'explicit' : 'omitted'} alias`, () => {
        const alias = explicit ? 'renamed' : libraryName;
        const library = parse(`//@version=6
library("${libraryName}")
export shifted(float value, float delta = 3) => value * 10 + delta`);
        const libraries = new Map([[`First/${libraryName}/1`, library]]);
        const source = `//@version=6
indicator("Import namespace binding")
import First/${libraryName}/1${explicit ? ' as renamed' : ''}
samples = array.from(-7.0, 4.0, 1.0, 0.0)
value = array.get(samples, bar_index)
plot(${alias}.shifted(value), "Default")
plot(${alias}.shifted(delta=0, value=value), "Named")
plot(bar_index - 7, "After")`;
        expect(checkProgram(parse(source), { libraries }).diagnostics).toEqual([]);
        const result = runCompatScript(source, {
          bars: compatibilityBars.slice(0, 4),
          engineOptions: { libraries },
        });
        expect(result.errors).toEqual([]);
        expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile?.swallowedErrors ?? []).toEqual([]);
        expect(getPlot(result, 'Default').values).toEqual([-67, 43, 13, 3]);
        expect(getPlot(result, 'Named').values).toEqual([-70, 40, 10, 0]);
        expect(getPlot(result, 'After').values).toEqual([-7, -6, -5, -4]);
      });
    }
  }
});
