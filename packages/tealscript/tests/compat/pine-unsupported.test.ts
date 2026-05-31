import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

describe('Pine compatibility unsupported diagnostics', () => {
  it('reports planned economic data namespace calls explicitly', () => {
    const result = runCompatScript(`
indicator("Unsupported economic request")
request.economic("US", "GDP")
plot(close)
`, { bars: [compatibilityBars[0]!] });

    expect(result.errors.map((error) => error.message)).toEqual([
      'request.* functions are not supported yet: request.economic',
    ]);
  });

  it('does not treat local variables named like planned namespaces as namespaces', () => {
    const result = runCompatScript(`
indicator("Namespace shadow")
map = array.new_float()
map.push(close)
plot(map.get(0))
`, { bars: [compatibilityBars[0]!] });

    expect(result.errors).toEqual([]);
    expect(result.plots[0]?.values).toEqual([102]);
  });

  it('reports planned ticker namespace calls explicitly', () => {
    const result = runCompatScript(`
indicator("Unsupported ticker")
ticker.rangebar(syminfo.tickerid, 10)
plot(close)
`, { bars: [compatibilityBars[0]!] });

    expect(result.errors.map((error) => error.message)).toEqual([
      'ticker.* functions are not supported yet: ticker.rangebar',
    ]);
  });

  it('reports planned published library imports explicitly', () => {
    const result = runCompatScript(`
indicator("Unsupported import")
import TradingView/PivotLabels/1 as dpl
plot(close)
`);

    expect(result.errors.map((error) => error.message)).toEqual([
      'import declarations are not supported yet: TradingView/PivotLabels/1 as dpl',
    ]);
  });

});
