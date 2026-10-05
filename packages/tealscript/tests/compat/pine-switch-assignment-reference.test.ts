import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('selected switch arm executes its assignment', () => {
  // Only the selected local block executes; its assignment updates the outer value.
  // https://www.tradingview.com/pine-script-docs/language/conditional-structures/#switch-structure
  it.each([5, 6])('executes selector, condition and default assignments in v%i', (version) => {
    const result = runCompatScript(`//@version=${version}
indicator("Switch assignments")
x = 0
switch "selected"
    "skipped" => x += 100
    "selected" => x += 1
    => x += 1000
switch
    false => x += 100
    true => x += 2
switch "default"
    "skipped" => x += 100
    => x += 4
plot(x, "Selected")
`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Selected').values).toEqual(compatibilityBars.map(() => 7));
  });
});
