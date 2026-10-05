import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Ledger rank589/type-qualifier-system-v3#400; pinned v6 functions[209].
// ta.stoch length permits const/input/simple/series int, while its price inputs
// also permit floats. Expected diagnostics come from that type contract.
// Baseline: five refusal cases RED. Isolated integer/float-kind mutant: all
// eight RED; documented fix and restored copy: eight GREEN (proof-v2 log).
const authority = 'https://www.tradingview.com/pine-script-reference/v6/#fun_ta.stoch';

function diagnostics(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Stoch length ledger")\n${body}`)).diagnostics;
}

describe(`ledger rank589 stochastic integer length [${authority}]`, () => {
  for (const [name, body] of [
    ['positional integral float literal', 'plot(ta.stoch(close, high, low, 3.0))'],
    ['named integral float literal', 'plot(ta.stoch(source=close, high=high, low=low, length=3.0))'],
    ['const float variable', 'const float length = 3.0\nplot(ta.stoch(close, high, low, length))'],
    ['input float variable', 'length = input.float(3.0)\nplot(ta.stoch(close, high, low, length=length))'],
    ['series float variable', 'length = close\nplot(ta.stoch(close, high, low, length))'],
  ]) {
    it(`rejects ${name}`, () => {
      expect(diagnostics(body)).toEqual([
        expect.objectContaining({ code: 'type-mismatch', message: expect.stringMatching(/ta\.stoch length must be an integer/) }),
      ]);
    });
  }

  for (const [name, body] of [
    ['const int with float prices', 'const int length = 3\nplot(ta.stoch(1.25, 2.5, 0.75, length))'],
    ['input int with float prices', 'length = input.int(3)\nplot(ta.stoch(close, high, low, length=length))'],
    ['series int length', 'length = bar_index + 1\nplot(ta.stoch(close, high, low, length))'],
  ]) {
    it(`accepts ${name}`, () => {
      expect(diagnostics(body)).toEqual([]);
    });
  }
});
