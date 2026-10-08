import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Authority for each parameter: https://www.tradingview.com/pine-script-reference/v6/.
function errors(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Integer TA slots")\n${body}`)).diagnostics.filter((d) => d.severity === 'error');
}

describe('ledger gaps 641–680 macd parameter contracts', () => {
  // Rows643/645/647, ta.macd params fastlen/slowlen/siglen: simple/input/const int only.
  it.each(['fastlen', 'slowlen', 'siglen'])('MACD refuses integer-valued float %s', (parameter) => {
    expect(errors('[m, s, h] = ta.macd(source=close, fastlen=2, slowlen=3, siglen=2)')).toEqual([]);
    const argumentsByName = { source: 'close', fastlen: '2', slowlen: '3', siglen: '2', [parameter]: '2.0' };
    const args = Object.entries(argumentsByName).map(([key, value]) => `${key}=${value}`).join(', ');
    expect(errors(`[m, s, h] = ta.macd(${args})`)).toContainEqual(expect.objectContaining({
      code: 'type-mismatch', message: expect.stringContaining(parameter),
    }));
  });
});
