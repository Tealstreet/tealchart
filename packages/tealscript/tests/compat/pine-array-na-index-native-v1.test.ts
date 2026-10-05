import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Pine v6 array get missing indices', () => {
  for (const index of ['na', 'math.round(na)']) {
    for (const method of [false, true]) {
      it(`returns missing on every bar for ${index} in ${method ? 'receiver' : 'namespace'} form`, () => {
        const source = `//@version=6
indicator("V3-ARRAY-NA-INDEX-${index === 'na' ? '01' : '02'}")
plot(${method ? `array.from(1, 2, 3).get(${index})` : `array.get(array.from(1, 2, 3), ${index})`}, "OUTCOME")
`;
        expect(checkProgram(parse(source)).diagnostics).toEqual([]);
        const result = runCompatScript(source);
        expect(result.errors).toEqual([]);
        expect(result.profile?.swallowedErrors ?? []).toEqual([]);
        expect(getPlot(result, 'OUTCOME').values).toEqual(compatibilityBars.map(() => null));
      });
    }
  }

  for (const index of [3, -4]) {
    for (const method of [false, true]) {
      it(`keeps the finite out-of-bounds error for ${index} in ${method ? 'receiver' : 'namespace'} form`, () => {
        const result = runCompatScript(`//@version=6
indicator("Finite index bounds")
plot(${method ? `array.from(1, 2, 3).get(${index})` : `array.get(array.from(1, 2, 3), ${index})`}, "OUTCOME")`);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.message).toMatch(/Array index .* is out of bounds\. Array size is 3/);
        expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      });
    }
  }
});
