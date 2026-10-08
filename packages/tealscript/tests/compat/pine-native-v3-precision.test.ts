import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

// Authority: https://www.tradingview.com/pine-script-reference/v6/, fun_str.tostring ten-place default.
describe('native v3 default numeric strings', () => {
  it.each([
    ['price', '78477.59079999999', '78477.5908'],
    ['third', '1.0 / 3.0', '0.3333333333'],
    ['positive', '1.12345678901', '1.123456789'],
    ['negative', '-1.12345678901', '-1.123456789'],
  ])('matches captured %s text', (_name, expression, expected) => {
    const result = runCompatScript(
      `//@version=6
indicator("Native default precision")
log.info(str.tostring(${expression}))`,
      { bars: compatibilityBars.slice(0, 1) },
    );
    expect(result.errors).toEqual([]);
    expect(result.logs.map((entry) => entry.message)).toEqual([expected]);
  });
});
