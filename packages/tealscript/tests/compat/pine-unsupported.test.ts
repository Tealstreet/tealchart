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

  it('reports planned member assignment explicitly', () => {
    const result = runCompatScript(`
indicator("Unsupported member assignment")
obj.field := close
plot(close)
`, { bars: [compatibilityBars[0]!] });

    expect(result.errors.map((error) => error.message)).toEqual([
      'Member assignment is not supported yet; UDT and reference field assignment are planned for Pine parity Epic 12',
    ]);
  });
});
