import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

describe('table IDs retain series through value flow', () => {
  for (const initializer of ['table(na)', 'table.new(position.top_left, 1, 1)']) {
    it(`retains series for ${initializer} through a function, tuple and conditional`, () => {
      const checked = checkProgram(
        parse(`//@version=6
indicator("Table value flow")
identity(table value) => value
pair(table value) => [value, value]
original = ${initializer}
returned = identity(original)
[leftHandle, rightHandle] = pair(returned)
selected = close > open ? leftHandle : rightHandle
plot(na(selected) ? 1 : 0)`),
      );
      expect(checked.diagnostics).toEqual([]);
      for (const name of ['original', 'returned', 'leftHandle', 'rightHandle', 'selected']) {
        expect(checked.symbols.find((symbol) => symbol.name === name)?.type, name).toEqual({
          kind: 'table',
          qualifier: 'series',
        });
      }
    });
  }

  it('keeps a weaker explicit missing-ID annotation series without widening scalars', () => {
    const checked = checkProgram(
      parse(`//@version=6
indicator("Table and scalar qualifiers")
simple table missing = na
simple int number = 4
alias = missing
plot(number)`),
    );
    expect(checked.diagnostics).toEqual([]);
    for (const name of ['missing', 'alias']) {
      expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toEqual({
        kind: 'table',
        qualifier: 'series',
      });
    }
    expect(checked.symbols.find((symbol) => symbol.name === 'number')?.type).toEqual({
      kind: 'int',
      qualifier: 'simple',
    });
  });
});
