import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Reference float overloads preserve argument qualifiers and cast na to float.
describe('missing float cast qualifier and value', () => {
  for (const qualifier of ['const', 'input', 'simple', 'series']) {
    it(`${qualifier} float cast preserves missingness and signed fractions`, () => {
      const declarations = qualifier === 'input'
        ? 'missing = input.float(float(na))\npositive = input.float(3.75)\nnegative = input.float(-3.75)'
        : `${qualifier} float missing = na\n${qualifier} float positive = 3.75\n${qualifier} float negative = -3.75`;
      const source = `//@version=6
indicator("Missing float cast")
${declarations}
converted = float(missing)
up = float(x=positive)
down = float(negative)
alias = converted
plot(na(alias) ? 1 : 0, "Missing")
plot(up, "Positive")
plot(down, "Negative")`;
      const checked = checkProgram(parse(source));
      expect(checked.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
      for (const name of ['converted', 'up', 'down', 'alias']) {
        expect(checked.symbols.find((entry) => entry.name === name)?.type).toMatchObject({ kind: 'float', qualifier });
      }
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'Missing').values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Positive').values).toEqual([3.75, 3.75, 3.75]);
      expect(getPlot(result, 'Negative').values).toEqual([-3.75, -3.75, -3.75]);
    });
  }
});
