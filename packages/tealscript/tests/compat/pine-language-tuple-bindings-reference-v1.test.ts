import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { getPlot, runCompatScript } from './fixtures';

// Tuple declarations create one new identifier per returned value, in order.
describe('Tuple declarations bind new identifiers', () => {
  const bars = [-3, 5, 0, -2].map((close, index) => ({
    time: 1_700_000_000_000 + index * 60_000,
    open: 0,
    high: 6,
    low: -4,
    close,
    volume: 10,
  }));

  for (const version of [5, 6]) {
    const source = (body: string) => `//@version=${version}\nindicator("Tuple bindings")\n${body}`;

    it(`v${version} binds distinct signed UDF results in declaration order`, () => {
      const result = runCompatScript(source(`pair(int value) => [value * 2, value - 3]
[twice, reduced] = pair(int(close))
plot(twice, "Twice")
plot(reduced, "Reduced")`), { bars });

      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'Twice').values).toEqual([-6, 10, 0, -4]);
      expect(getPlot(result, 'Reduced').values).toEqual([-6, 2, -3, -5]);
    });

    it(`v${version} binds each element returned by a conditional structure`, () => {
      const result = runCompatScript(source(`[level, caption, enabled] = if close > 0
    [7, "up", true]
else
    [-5, "down", false]
plot(level, "Level")
plot(caption == "up" ? 1 : 0, "Caption")
plot(enabled ? 1 : 0, "Enabled")`), { bars });

      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'Level').values).toEqual([-5, 7, -5, -5]);
      expect(getPlot(result, 'Caption').values).toEqual([0, 1, 0, 0]);
      expect(getPlot(result, 'Enabled').values).toEqual([0, 1, 0, 0]);
    });

    it(`v${version} refuses a repeated identifier in one tuple declaration`, () => {
      const result = checkProgram(parse(source(`pair() => [3, -5]
[repeated, repeated] = pair()`)));

      expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([
        expect.objectContaining({ code: 'duplicate-symbol' }),
      ]);
    });

    it(`v${version} refuses to redeclare an existing identifier with a tuple`, () => {
      const result = checkProgram(parse(source(`pair() => [3, -5]
existing = 99
[existing, fresh] = pair()`)));

      expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([
        expect.objectContaining({ code: 'duplicate-symbol' }),
      ]);
    });
  }
});
