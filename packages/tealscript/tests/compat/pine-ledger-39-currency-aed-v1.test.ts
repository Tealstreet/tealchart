import { expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Reference currency.AED is the const string currency identifier for UAE dirham.
it('carries currency.AED as the exact AED string into a const input default', () => {
  const result = runCompatScript(`//@version=6
indicator("AED identifier")
code = input.string(currency.AED, "Currency")
plot(code == "AED" ? 1 : 0, "AED")
`);
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'AED').values).toEqual(Array(compatibilityBars.length).fill(1));
});
