import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

// Implementation safety checks for the exact-half algorithm; only positive
// 1.25 / 0.0 is native-certified here (v95 item15, separate raw-witness test).
describe('str.format decimal-mask rounding remains separate from tostring/math.round', () => {
  it.each([
    [1.25, '0.0', '1.2'], [1.75, '0.0', '1.8'],
    [-1.25, '0.0', '-1.2'], [-1.75, '0.0', '-1.8'],
    [0.125, '0.00', '0.12'], [0.375, '0.00', '0.38'],
    [1.0625, '0.000', '1.062'], [1.1875, '0.000', '1.188'],
    [1.2499999999999998, '0.0', '1.2'], [1.2500000000000002, '0.0', '1.3'],
    // These are not binary-exact half-ties: do not create ties via x*10.
    [1.15, '0.0', '1.1'], [1.35, '0.0', '1.4'],
    [1234.25, '#,000.0', '1,234.2'], [0.0125, '0.0%', '1.2%'],
    [1.25, '0.00', '1.25'], [1e21, '0.0', '1e+21'],
  ] as const)('formats %s using %s as %s', (value, mask, expected) => {
    const result = runCompatScript(`//@version=6
indicator("Decimal mask rounding")
plot(str.format("{0,number,${mask}}", ${value}) == "${expected}" ? 1 : 0)`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual(compatibilityBars.map(() => 1));
  });

  it('keeps existing tostring half rounding and math.round ties-away', () => {
    const result = runCompatScript(`//@version=6
indicator("Separate rounding modes")
plot(str.tostring(1.25, "0.0") == "1.3" ? 1 : 0)
plot(math.round(1.25, 1) == 1.3 ? 1 : 0)
plot(math.round(-1.25, 1) == -1.3 ? 1 : 0)`);
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(3);
    for (const plot of result.plots) expect(plot.values).toEqual(compatibilityBars.map(() => 1));
  });
});
