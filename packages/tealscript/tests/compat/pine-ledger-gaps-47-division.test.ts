import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Native v5 ledger47 captures settle dynamic ±zero, UDF and /=; literals refuse.
// Reuse 6f4d459299 after e6bdfdf1b5's native-pending revert; v6 remains held.
// Exact source/capture hashes are retained in pine-native-v5-runtime-zero.test.ts.
describe('ledger47 division by zero', () => {
  for (const version of [5, 6]) {
    for (const [name, body] of [
      ['literal', 'value = close / 0.0'],
      ['negative zero', 'value = close / -0.0'],
      ['dynamic', 'value = close / (close - close)'],
      ['UDF', 'divide(float x, float y) => x / y\nvalue = divide(close, close - close)'],
      ['compound', 'value = close\nvalue /= close - close'],
      ['source wrapper', 'zero = input.source(open)\nvalue = close / zero'],
    ]) {
      const witness = version === 5 && name !== 'source wrapper' ? it : it.skip;
      witness(`v${version} ${name} zero division`, () => {
        const source = `//@version=${version}\nindicator("Zero division")\n${body}\nplot(na(value) ? 1 : 0, title="Missing")\nplot(nz(value), title="Default")\nplot(nz(value, 42), title="Replacement")`;
        const errors = checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
        if (version === 5 && (name === 'literal' || name === 'negative zero')) {
          expect(errors.map((d) => d.message)).toContain('Division by zero');
          return;
        }
        expect(errors).toEqual([]);
        const bars = compatibilityBars.map((b) => ({ ...b, open: 0, low: 0 }));
        const result = runCompatScript(source, { bars });
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Missing').values).toEqual(bars.map(() => 1));
        expect(getPlot(result, 'Default').values).toEqual(bars.map(() => 0));
        expect(getPlot(result, 'Replacement').values).toEqual(bars.map(() => 42));
      });
    }
    it(`v${version} evaluates each nonzero operand once`, () => {
      const source = `//@version=${version}
indicator("Division evaluation count")
counter() =>
    var int calls = 0
    calls += 1
    calls
plot(counter() / counter(), title="Once")`;
      expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const result = runCompatScript(source);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Once').values).toEqual(compatibilityBars.map(() => 1));
    });
    it(`v${version} retains finite division and missing numerators`, () => {
      const source = `//@version=${version}
indicator("Division controls")
plot(close / 2.0, title="Finite")
plot(nz(close[1] / 2.0, 42), title="Missing numerator")`;
      const result = runCompatScript(source);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Finite').values).toEqual(compatibilityBars.map((b) => b.close / 2));
      expect(getPlot(result, 'Missing numerator').values).toEqual([
        42,
        ...compatibilityBars.slice(0, -1).map((b) => b.close / 2),
      ]);
    });
  }
});
