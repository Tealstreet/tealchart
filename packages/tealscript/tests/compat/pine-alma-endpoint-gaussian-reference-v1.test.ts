import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Authority: Pine v6 ta.alma example, functions276: Gaussian weights in oldest-first window order.
// Finite length-3 windows only; expected decimal values were derived independently at 60-digit precision.
const prices = [-6, 2, -3, 12, -8, 7];
const bars = prices.map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 1,
}));

describe('ALMA finite Gaussian endpoint weights', () => {
  it('uses offset 0 and sigma 3 in the documented Gaussian weights', () => {
    const result = runCompatScript(
      `//@version=6
indicator("ALMA endpoint 0 sigma 3")
plot(ta.alma(sigma=3, offset=0, length=3, series=close, floor=false), "ALMA")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const expected = [-2.981253839484409, 1.035918652067032, 1.83463352251317, 4.64737354658245];
    const values = getPlot(result, 'ALMA').values.slice(2);
    expect(values).toHaveLength(expected.length);
    expected.forEach((value, index) => expect(values[index], `bar${index + 2}`).toBeCloseTo(value, 12));
  });
  it('uses offset 1 and sigma 3 in the documented Gaussian weights', () => {
    const result = runCompatScript(
      `//@version=6
indicator("ALMA endpoint 1 sigma 3")
plot(ta.alma(sigma=3, offset=1, length=3, series=close, floor=false), "ALMA")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const expected = [-1.492049598027038, 5.999932790258271, -0.64737354658245, 2.16536647748683];
    const values = getPlot(result, 'ALMA').values.slice(2);
    expect(values).toHaveLength(expected.length);
    expected.forEach((value, index) => expect(values[index], `bar${index + 2}`).toBeCloseTo(value, 12));
  });
  it('uses offset 0 and sigma 6 in the documented Gaussian weights', () => {
    const result = runCompatScript(
      `//@version=6
indicator("ALMA endpoint 0 sigma 6")
plot(ta.alma(sigma=6, offset=0, length=3, series=close, floor=false), "ALMA")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const expected = [-5.045772150314866, 1.407115317220326, -1.213961271085115, 9.61516884384475];
    const values = getPlot(result, 'ALMA').values.slice(2);
    expect(values).toHaveLength(expected.length);
    expected.forEach((value, index) => expect(values[index], `bar${index + 2}`).toBeCloseTo(value, 12));
  });
  it('uses offset 1 and sigma 6 in the documented Gaussian weights', () => {
    const result = runCompatScript(
      `//@version=6
indicator("ALMA endpoint 1 sigma 6")
plot(ta.alma(sigma=6, offset=1, length=3, series=close, floor=false), "ALMA")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const expected = [-2.405047606659085, 10.209530462739597, -5.61516884384475, 5.213961271085115];
    const values = getPlot(result, 'ALMA').values.slice(2);
    expect(values).toHaveLength(expected.length);
    expected.forEach((value, index) => expect(values[index], `bar${index + 2}`).toBeCloseTo(value, 12));
  });
});
