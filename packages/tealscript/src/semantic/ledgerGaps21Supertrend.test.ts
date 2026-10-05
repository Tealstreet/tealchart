import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
// functions[179] ta.supertrend atrPeriod accepts const/input/simple int only.
// Ledger gaps 815/816; type-qualifier-system-v3#358/359.
function diagnostics(body: string, version: number) {
  return checkProgram(parse(`//@version=${version}\nindicator("Ledger gaps 21")\n${body}`)).diagnostics;
}

describe('ledger gaps 21: Supertrend atrPeriod integer kind (816)', () => {
  it.each([
    ['const', 'period = 3.0', 'period = 3'],
    ['input', 'period = input.float(3.0, "Period")', 'period = input.int(3, "Period")'],
    ['simple', 'simple float period = 3.0', 'simple int period = 3'],
  ])('rejects %s float while retaining corresponding integer length', (_qualifier, floatDeclaration, intDeclaration) => {
    for (const version of [5, 6]) {
      expect.soft(diagnostics(`${floatDeclaration}\n[line, direction] = ta.supertrend(factor=2.0, atrPeriod=period)\nplot(line)`, version)).toEqual([
        expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('ta.supertrend atrPeriod must be an integer') }),
      ]);
      expect.soft(diagnostics(`${intDeclaration}\n[line, direction] = ta.supertrend(2.0, period)\nplot(line)`, version)).toEqual([]);
    }
  });

  it('rejects series integer atrPeriod while retaining simple integer (815)', () => {
    for (const version of [5, 6]) {
      expect.soft(diagnostics('[line, direction] = ta.supertrend(2.0, bar_index + 3)\nplot(line)', version)).toEqual([
        expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('atrPeriod') }),
      ]);
      expect.soft(diagnostics('simple int period = 3\n[line, direction] = ta.supertrend(2.0, period)\nplot(line)', version)).toEqual([]);
    }
  });
});
