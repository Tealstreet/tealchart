import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function check(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Scope contracts")\n${body}\n`));
}

describe('ledger gaps 45: builtin shadow warnings', () => {
  it.each(['close', 'bar_index', 'volume'])('1800 warns when a local variable shadows builtin %s', (name) => {
    const result = check(`int observed = 0\nif true\n    int ${name} = 17\n    observed := ${name}\nplot(observed)`);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'warning', message: expect.stringContaining(name) }),
      ]),
    );
  });

  it('1800 keeps unrelated local names warning-free', () => {
    expect(
      check('int observed = 0\nif true\n    int localValue = 17\n    observed := localValue\nplot(observed)')
        .diagnostics,
    ).toEqual([]);
  });
});
