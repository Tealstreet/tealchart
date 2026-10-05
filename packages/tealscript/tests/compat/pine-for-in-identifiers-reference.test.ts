import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('for-in counters do not collide with generated loop identifiers', () => {
  // Pine identifiers belong to the loop scope; generated iteration state is separate.
  // https://www.tradingview.com/pine-script-docs/language/loops/#forin-loops
  it.each([
    { header: '[_i, value]', expression: '_i + value', expected: 7 },
    { header: '[index, _i]', expression: 'index + _i', expected: 7 },
    { header: '_i', expression: '_i', expected: 6 },
  ])('preserves $header', ({ header, expression, expected }) => {
    const result = runCompatScript(`//@version=6
indicator("For-in identifiers")
a = array.from(2, 4)
total = 0
for ${header} in a
    total += ${expression}
plot(total, "Total")
`);
    expect(result.errors).toEqual([]);
    expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
    expect(getPlot(result, 'Total').values).toEqual(compatibilityBars.map(() => expected));
  });
});
