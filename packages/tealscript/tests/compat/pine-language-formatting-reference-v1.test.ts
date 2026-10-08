import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

// Formatting changes statement boundaries, not their values.
// https://www.tradingview.com/pine-script-docs/language/script-structure/
const cases = [
  ['comma statements', 'positiveValue = 8, negativeValue = -3\nplot(positiveValue * 10 + negativeValue, "Value")'],
  ['line comments', '// ignored = 999\npositiveValue = 8\n// negativeValue = 999\nnegativeValue = -3\nplot(positiveValue * 10 + negativeValue, "Value")'],
  ['inline comments', 'positiveValue = 8 // positiveValue = 999\nnegativeValue = -3 // negativeValue = 999\nplot(positiveValue * 10 + negativeValue, "Value") // plot(999)'],
  ['blank lines', 'positiveValue = 8\n\nnegativeValue = -3\n\nplot(positiveValue * 10 + negativeValue, "Value")'],
  ['continuation comments', 'positiveValue = 8\nnegativeValue = -3\nvalue = positiveValue * 10 + // ignored operand\n   negativeValue\nplot(value, "Value")'],
] as const;

describe('Pine script formatting preserves statement values', () => {
  for (const version of [5, 6]) {
    it.each(cases)(`v${version} evaluates %s`, (_name, body) => {
      const source = `//@version=${version}\nindicator("Formatting values")\n${body}`;
      expect(() => parse(source)).not.toThrow();
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 4) });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      expect(result.plots.map((plot) => plot.values)).toEqual([[77, 77, 77, 77]]);
    });
  }
});
