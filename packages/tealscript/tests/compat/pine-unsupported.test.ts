import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

describe('Pine compatibility unsupported diagnostics', () => {
  it('reports planned data namespace calls explicitly', () => {
    const result = runCompatScript(`
indicator("Unsupported request")
request.security(syminfo.tickerid, "1D", close)
plot(close)
`, { bars: [compatibilityBars[0]!] });

    expect(result.errors.map((error) => error.message)).toEqual([
      'request.* functions are not supported yet: request.security',
    ]);
  });

  it('reports planned collection namespace calls explicitly', () => {
    const result = runCompatScript(`
indicator("Unsupported collections")
map.new()
matrix.new(2, 2)
plot(close)
`, { bars: [compatibilityBars[0]!] });

    expect(result.errors.map((error) => error.message)).toEqual([
      'map.* functions are not supported yet: map.new',
      'matrix.* functions are not supported yet: matrix.new',
    ]);
  });

  it('reports planned visual and ticker namespace calls explicitly', () => {
    const result = runCompatScript(`
indicator("Unsupported visuals")
polyline.new(array.from(chart.point.now(close)))
ticker.heikinashi(syminfo.tickerid)
plot(close)
`, { bars: [compatibilityBars[0]!] });

    expect(result.errors.map((error) => error.message)).toEqual([
      'polyline.* functions are not supported yet: polyline.new',
      'ticker.* functions are not supported yet: ticker.heikinashi',
    ]);
  });
});
