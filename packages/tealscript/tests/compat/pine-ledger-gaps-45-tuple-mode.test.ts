import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

describe('ledger gaps 45: regular tuple declarations', () => {
  it.each(['var', 'varip'])('1795 refuses %s tuple declarations', (mode) => {
    expect(() => parse(
      `//@version=6\nindicator("Tuple mode")\npair() => [1, 2]\n${mode} [left, right] = pair()\nplot(left)`,
    )).toThrow(`""${mode}"" cannot be used as a variable or function name.`);
  });

  it('1795 accepts a regular tuple and scalar persistent declarations', () => {
    const program = parse(`//@version=6
indicator("Regular tuple")
pair() => [1, 2]
[left, right] = pair()
var int persistent = 1
varip int intrabar = 2
plot(left + right + persistent + intrabar)`);
    expect(checkProgram(program).diagnostics).toEqual([]);
  });
});
