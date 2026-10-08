import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const bars = compatibilityBars.slice(0, 4).map((bar, index) => ({ ...bar, close: [5, -2, 4, 0][index] }));

// https://www.tradingview.com/pine-script-docs/language/type-system/#bool
describe('nested polymorphic boolean history', () => {
  for (const boolFirst of [true, false]) {
    it(`normalizes nested polymorphic call history with boolFirst=${boolFirst}`, () => {
      const calls = boolFirst ? 'b = lag(close > 0)\nn = lag(close)' : 'n = lag(close)\nb = lag(close > 0)';
      const result = runCompatScript(
        `//@version=6
indicator("Nested history")
identity(x) => x
lag(x) => identity(x)[1]
${calls}
plot(b == false ? 1 : 0, title="Bool")
plot(na(n) ? 1 : 0, title="Numeric Missing")
plot(n, title="Numeric")
`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Bool').values).toEqual([1, 0, 1, 0]);
      expect(getPlot(result, 'Numeric Missing').values).toEqual([1, 0, 0, 0]);
      expect(getPlot(result, 'Numeric').values).toEqual([null, 5, -2, 4]);
    });
  }

  it('evaluates each indexed nested call once while normalizing its bool result', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Nested history evaluation count")
var calls = array.new_int()
identity(x) =>
    array.push(calls, 1)
    x
lag(x) => identity(x)[1]
b = lag(close > 0)
n = lag(close)
plot(b == false ? 1 : 0, title="Bool")
plot(na(n) ? 1 : 0, title="Numeric Missing")
plot(array.size(calls), title="Calls")
`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Bool').values).toEqual([1, 0, 1, 0]);
    expect(getPlot(result, 'Numeric Missing').values).toEqual([1, 0, 0, 0]);
    expect(getPlot(result, 'Calls').values).toEqual([2, 4, 6, 8]);
  });

  it('preserves unavailable nested bool and numeric history in v5', () => {
    const result = runCompatScript(
      `//@version=5
indicator("Legacy nested history")
identity(x) => x
lag(x) => identity(x)[1]
b = lag(close > 0)
n = lag(close)
plot(na(b) ? 1 : 0, title="Bool Missing")
plot(na(n) ? 1 : 0, title="Numeric Missing")
plot(b == false ? 1 : 0, title="Bool")
`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Bool Missing').values).toEqual([1, 0, 0, 0]);
    expect(getPlot(result, 'Numeric Missing').values).toEqual([1, 0, 0, 0]);
    expect(getPlot(result, 'Bool').values).toEqual([0, 0, 1, 0]);
  });
});
