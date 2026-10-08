import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// V6 migration boolean-values-cannot-be-na documents the v5 third bool state.
// A missing v5 bool is false in conditions but remains distinguishable by na().
describe('v5 missing bool initialization and history', () => {
  for (const persistent of [false, true]) {
    it(`retains missing/false/true distinction with var=${persistent}`, () => {
      const source = `//@version=5
indicator("Legacy missing bool initializer")
${persistent ? 'var ' : ''}bool flag = na
if bar_index == 1
    flag := false
if bar_index == 2
    flag := true
if bar_index == 4
    flag := false
plot(na(flag) ? 1 : 0, "Missing")
plot(flag ? 1 : 0, "Truth")
plot(na(flag[1]) ? 1 : 0, "PreviousMissing")`;
      const checked = checkProgram(parse(source));
      expect(checked.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 5) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'Missing').values).toEqual(persistent ? [1, 0, 0, 0, 0] : [1, 0, 0, 1, 0]);
      expect(getPlot(result, 'Truth').values).toEqual(persistent ? [0, 0, 1, 1, 0] : [0, 0, 1, 0, 0]);
      expect(getPlot(result, 'PreviousMissing').values).toEqual(persistent ? [1, 1, 0, 0, 0] : [1, 1, 0, 0, 1]);
    });
  }
});
