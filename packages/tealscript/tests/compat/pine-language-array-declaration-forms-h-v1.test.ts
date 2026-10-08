import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Arrays manual, Declaring arrays: array<int> and int[] describe the same type.
// The element template constrains the array ID stored in the declared variable.
describe('Array declaration forms preserve element types', () => {
  for (const version of [5, 6]) {
    for (const form of ['array<int>', 'int[]']) {
      const source = (body: string) => `//@version=${version}\nindicator("Array forms")\n${body}`;

      it(`v${version} executes ${form} through its shared array reference`, () => {
        const script = source(`${form} numbers = array.from(7, -3, 11)
alias = numbers
array.set(alias, 1, 5)
plot(array.get(numbers, 0), "First")
plot(array.get(numbers, 1), "Middle")
plot(array.get(numbers, 2), "Last")
plot(array.size(numbers), "Size")`);

        expect(checkProgram(parse(script)).diagnostics).toEqual([]);
        const result = runCompatScript(script, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        expect(getPlot(result, 'First').values).toEqual([7, 7, 7]);
        expect(getPlot(result, 'Middle').values).toEqual([5, 5, 5]);
        expect(getPlot(result, 'Last').values).toEqual([11, 11, 11]);
        expect(getPlot(result, 'Size').values).toEqual([3, 3, 3]);
      });

      it(`v${version} refuses a string array assigned to ${form}`, () => {
        const result = checkProgram(parse(source(`${form} numbers = array.from("wrong")`)));
        expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([
          expect.objectContaining({ code: 'type-mismatch' }),
        ]);
      });
    }
  }
});
