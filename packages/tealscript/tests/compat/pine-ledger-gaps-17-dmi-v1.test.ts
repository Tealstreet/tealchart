import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Authority for each parameter: https://www.tradingview.com/pine-script-reference/v6/.
function errors(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Integer TA slots")\n${body}`)).diagnostics.filter((d) => d.severity === 'error');
}

describe('ledger gaps 641–680 dmi parameter contracts', () => {
  // Rows680/682, functions[205]: diLength/adxSmoothing are simple/input/const int; row682 delegated by gaps18.
  it.each(['diLength', 'adxSmoothing'])('DMI refuses an integer-valued float %s', (parameter) => {
    expect(errors('[p, m, a] = ta.dmi(diLength=2, adxSmoothing=2)')).toEqual([]);
    const args = { diLength: '2', adxSmoothing: '2', [parameter]: '2.0' };
    expect(errors(`[p, m, a] = ta.dmi(${Object.entries(args).map(([k, v]) => `${k}=${v}`).join(', ')})`)).toContainEqual(expect.objectContaining({
      code: 'type-mismatch', message: expect.stringContaining(parameter),
    }));
  });
});
