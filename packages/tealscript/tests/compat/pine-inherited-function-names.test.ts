import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const bars = compatibilityBars.slice(0, 3);

describe('Pine user function names inherited by JavaScript objects', () => {
  it.each([
    'toString', 'toLocaleString', 'valueOf', 'constructor',
    'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', '__proto__',
  ])('executes %s as a user function', (name) => {
    const result = runCompatScript(`//@version=6
indicator("Inherited function name")
${name}(source) => source + 1
plot(${name}(close), title="Result")
plot(ta.sma(close, 2), title="SMA")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(getPlot(result, 'Result').values).toEqual([103, 106, 108]);
    expect(getPlot(result, 'SMA').values).toEqual([null, 103.5, 106]);
  });

  // The official for...in example uses a map formatter named toString.
  // https://www.tradingview.com/pine-script-reference/v6/#for...in
  it('executes a toString map formatter with insertion-order iteration', () => {
    const result = runCompatScript(`//@version=6
indicator("Map formatter")
toString(map<string, float> id) =>
    result = ""
    for [key, value] in id
        result += key + "=" + str.tostring(value) + ";"
    result
if barstate.islastconfirmedhistory
    prices = map.new<string, float>()
    prices.put("Open", open)
    prices.put("Close", close)
    log.info(toString(prices))
`, { bars });

    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(result.logs.map((log) => log.message)).toEqual(['Open=105;Close=107;']);
  });
});
