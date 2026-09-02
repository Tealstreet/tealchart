import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

describe('Pine compatibility unsupported diagnostics', () => {
  it('runs unseeded footprint requests as na instead of planned unsupported diagnostics', () => {
    const result = runCompatScript(`
indicator("Unseeded footprint request")
fp = request.footprint(10, 70)
plot(na(fp) ? 1 : 0)
`, { bars: [compatibilityBars[0]!] });

    expect(result.errors).toEqual([]);
    expect(result.plots[0]?.values).toEqual([1]);
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

  it('keeps undocumented ticker namespace calls on the unknown-function path', () => {
    const result = runCompatScript(`
indicator("Unknown ticker")
ticker.rangebar(syminfo.tickerid, 10)
plot(close)
`, { bars: [compatibilityBars[0]!] });

    expect(result.errors.map((error) => error.message)).toEqual([
      'Unknown function: ticker.rangebar',
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
