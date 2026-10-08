import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Break ends the loop; continue would visit and encode the later elements.
// https://www.tradingview.com/pine-script-docs/language/loops/#break-and-continue
describe('non-terminal break in numeric loops', () => {
  for (const version of [5, 6]) {
    it(`v${version} stops before later iterations and leaves their effects absent`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Non-terminal break")
values = array.from(8, -5, 3, -2)
encoded = 0
visits = 0
for index = 0 to 3
    visits += 1
    if index == 1
        break
    encoded := encoded * 10 + array.get(values, index)
plot(encoded, "Encoded")
plot(visits, "Visits")`, { bars: compatibilityBars.slice(0, 4) });

      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'Encoded').values).toEqual([8, 8, 8, 8]);
      expect(getPlot(result, 'Visits').values).toEqual([2, 2, 2, 2]);
    });
  }
});
