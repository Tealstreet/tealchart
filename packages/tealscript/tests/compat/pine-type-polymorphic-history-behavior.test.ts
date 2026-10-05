import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = '~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json';
const typeSystem = 'https://www.tradingview.com/pine-script-docs/language/type-system/#bool';

describe(`TYPE-BOOL-MISSING-HISTORY: ${reference} type/bool, operator/[]; ${typeSystem}`, () => {
  for (const boolFirst of [true, false]) {
    it(`uses false for missing bool history in a bool/float UDF with boolFirst=${boolFirst}`, () => {
      const calls = boolFirst
        ? 'b = lag(bar_index % 2 == 0)\nn = lag(close)'
        : 'n = lag(close)\nb = lag(bar_index % 2 == 0)';
      const result = runCompatScript(`//@version=6
indicator("Polymorphic history")
lag(x) => x[1]
${calls}
plot(b == false ? 1 : 0, title="Bool")
plot(na(n) ? 1 : 0, title="Numeric Missing")
plot(n, title="Numeric")
`, { bars: compatibilityBars.slice(0, 4) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Bool').values).toEqual([1, 0, 1, 0]);
      expect(getPlot(result, 'Numeric Missing').values).toEqual([1, 0, 0, 0]);
      expect(getPlot(result, 'Numeric').values).toEqual([null, 102, 105, 107]);
    });
  }

  it('preserves unavailable v5 bool and numeric history through the same polymorphic UDF', () => {
    const result = runCompatScript(`//@version=5
indicator("Legacy polymorphic history")
lag(x) => x[1]
b = lag(bar_index % 2 == 0)
n = lag(close)
plot(na(b) ? 1 : 0, title="Bool Missing")
plot(na(n) ? 1 : 0, title="Numeric Missing")
plot(b == false ? 1 : 0, title="Bool")
`, { bars: compatibilityBars.slice(0, 4) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Bool Missing').values).toEqual([1, 0, 0, 0]);
    expect(getPlot(result, 'Numeric Missing').values).toEqual([1, 0, 0, 0]);
    expect(getPlot(result, 'Bool').values).toEqual([0, 0, 1, 0]);
  });
});
