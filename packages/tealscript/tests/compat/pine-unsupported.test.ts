import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

describe('Pine compatibility unsupported diagnostics', () => {
  it('reports planned request namespaces that remain outside the deterministic datafeed contract', () => {
    const result = runCompatScript(`
indicator("Unsupported footprint request")
request.footprint(syminfo.tickerid)
plot(close)
`, { bars: [compatibilityBars[0]!] });

    expect(result.errors.map((error) => error.message)).toEqual([
      'request.footprint is not supported yet: footprint data requires a host-provided footprint/intrabar volume model',
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

  it('reports missing deterministic library registry entries explicitly', () => {
    const result = runCompatScript(`
indicator("Missing import")
import TradingView/PivotLabels/1 as dpl
plot(close)
`);

    expect(result.errors.map((error) => error.message)).toEqual([
      'import not found in deterministic library registry: TradingView/PivotLabels/1 as dpl',
    ]);
  });

});
