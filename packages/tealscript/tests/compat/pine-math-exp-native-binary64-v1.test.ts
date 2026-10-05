// Native v2 coverage-math-1-v1-attempt2.csv, exp headers42-44, source9a62267f.
import { describe, expect, it } from 'vitest';
import { getPlot, runCompatScript } from './fixtures';
const cases = [{"x": -0.5, "expected": 0.6065306597126334}, {"x": -0.4375, "expected": 0.645648526427892}, {"x": -0.375, "expected": 0.6872892787909722}, {"x": -0.3125, "expected": 0.7316156289466418}, {"x": -0.25, "expected": 0.7788007830714049}, {"x": -0.1875, "expected": 0.8290291181804004}, {"x": -0.125, "expected": 0.8824969025845955}, {"x": -0.0625, "expected": 0.9394130628134758}, {"x": 0, "expected": 1}, {"x": 0.0625, "expected": 1.0644944589178593}, {"x": 0.125, "expected": 1.1331484530668263}, {"x": 0.1875, "expected": 1.2062302494209807}, {"x": 0.25, "expected": 1.2840254166877414}, {"x": 0.3125, "expected": 1.3668379411737963}, {"x": 0.375, "expected": 1.4549914146182013}, {"x": 0.4375, "expected": 1.5488302986341331}, {"x": 0.5, "expected": 1.6487212707001282}];
describe('attempt2 captured math.exp binary64 scalars', () => {
  it.each(cases)('native exp($x)', ({ x, expected }) => {
    const result = runCompatScript(`//@version=6\nindicator("Captured exp")\nplot(math.exp(${x}), title="Value")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Value').values.every(value => Object.is(value, expected))).toBe(true);
  });
});

describe('scalar exp binding and missing-value controls', () => {
  it('preserves named arguments and NaN publication', () => {
    const result = runCompatScript(`//@version=6
indicator("Exp controls")
value = bar_index == 1 ? na : 0.0625
plot(math.exp(number=value), title="Value")`);
    expect(result.errors).toEqual([]);
    const values = getPlot(result, 'Value').values;
    expect(values[0]).toBe(1.0644944589178593);
    expect(values[1]).toBeNull();
    expect(values[2]).toBe(1.0644944589178593);
  });
  it('preserves local functions and receiver methods named exp', () => {
    const result = runCompatScript(`//@version=6
indicator("Exp shadows")
exp(float value) => value + 9
type Holder
    float value
method exp(Holder self, float value) => self.value + value
holder = Holder.new(2)
plot(exp(0.0625), title="Function")
plot(holder.exp(0.0625), title="Method")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Function').values.every(value => value === 9.0625)).toBe(true);
    expect(getPlot(result, 'Method').values.every(value => value === 2.0625)).toBe(true);
  });
});
