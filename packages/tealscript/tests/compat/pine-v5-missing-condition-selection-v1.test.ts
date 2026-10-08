import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// V5 missing numeric/bool predicates evaluate false when used as conditions.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#boolean-values-cannot-be-na
describe('v5 missing predicate selection', () => {
  for (const declaration of [
    'bool predicate = bar_index == 0 ? na : bar_index == 2',
    'float predicate = bar_index == 0 ? na : bar_index == 2 ? -2.5 : 0.0',
  ]) {
    it(declaration, () => {
      const result = runCompatScript(`//@version=5
indicator("Missing condition selection")
${declaration}
assigned = if predicate
    9
else
    -7
int effect = 0
if predicate
    effect := 10
else
    effect := 1
int iterations = 0
while predicate and iterations < 1
    iterations += 1
plot(predicate ? 9 : -7, "Ternary")
plot(assigned, "Assigned")
plot(effect, "Effect")
plot(iterations, "Iterations")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      for (const title of ['Ternary', 'Assigned']) expect(getPlot(result, title).values).toEqual([-7, -7, 9]);
      expect(getPlot(result, 'Effect').values).toEqual([1, 1, 10]);
      expect(getPlot(result, 'Iterations').values).toEqual([0, 0, 1]);
    });
  }
});
