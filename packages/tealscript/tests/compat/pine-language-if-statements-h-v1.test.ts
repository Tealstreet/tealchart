import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/conditional-structures/#if-used-for-its-side-effects
const bars = compatibilityBars.slice(0, 6);

for (const version of [5, 6]) {
  describe(`v${version} row 150 if statements`, () => {
    it('applies only the selected branch side effects to an outer variable', () => {
      const source = `//@version=${version}
indicator("If statement side effects")
value = 5
selected = 0
if bar_index % 3 == 0
    value += 11
    selected := 1
else if bar_index % 3 == 1
    value -= 7
    selected := 2
else
    value *= 3
    selected := 3
plot(value, "Value")
plot(selected, "Selected")`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, { bars });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'Value').values).toEqual([16, -2, 15, 16, -2, 15]);
      expect(getPlot(result, 'Selected').values).toEqual([1, 2, 3, 1, 2, 3]);
    });

    it('skips reassignment and function-call effects when a no-else condition is false', () => {
      const source = `//@version=${version}
indicator("If statement without else")
value = 5
calls = array.new_int()
if bar_index % 2 == 0
    value := value * 4 - 1
    array.push(calls, 17)
plot(value, "Value")
plot(array.size(calls), "Calls")`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, { bars });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'Value').values).toEqual([19, 5, 19, 5, 19, 5]);
      expect(getPlot(result, 'Calls').values).toEqual([1, 0, 1, 0, 1, 0]);
    });
  });
}
