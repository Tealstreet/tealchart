import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

describe('native v6 array.from minimum arity', () => {
  it('refuses the captured inferred empty call during compilation', () => {
    const program = parse(`//@version=6
indicator("Empty from outcome")
values = array.from()
plot(array.size(values), "EMPTY_SIZE")
plot(bar_index, "INDEX")`);
    const errors = checkProgram(program).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'argument-count', message: expect.stringContaining('array.from') }),
      ]),
    );
  });

  it.each(['17', 'close', '17, 18', 'arg0 = 17'])('preserves nonempty builtin calls: %s', (argumentsText) => {
    const program = parse(`//@version=6
indicator("Nonempty from control")
values = array.from(${argumentsText})
plot(array.size(values))`);
    expect(checkProgram(program).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });
});
