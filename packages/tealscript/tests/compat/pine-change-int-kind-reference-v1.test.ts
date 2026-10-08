import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Integer change remains admissible to integer storage', () => {
  for (const version of [5, 6]) {
    it(`v${version} keeps default and explicit lag results as int`, () => {
      const script = `//@version=${version}
indicator("Integer change kind")
int source = bar_index == 0 ? -2 : bar_index == 1 ? 3 : bar_index == 2 ? 3 : bar_index == 3 ? -4 : bar_index == 4 ? 6 : bar_index == 5 ? 0 : -5
int defaultResult = ta.change(source)
int explicitResult = ta.change(source = source, length = 1)
array<int> stored = array.new_int()
array.push(stored, defaultResult)
array.push(stored, explicitResult)
plot(array.get(stored, 0), "Default")
plot(array.get(stored, 1), "Explicit")`;
      const checked = checkProgram(parse(script));
      expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      const result = runCompatScript(script, { bars: compatibilityBars.slice(0, 7) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      for (const title of ['Default', 'Explicit']) {
        expect(getPlot(result, title).values.slice(1)).toEqual([5, 0, -7, 10, -6, -5]);
      }
    });
  }
});
