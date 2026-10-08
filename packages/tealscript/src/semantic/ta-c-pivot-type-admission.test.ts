import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

function diagnostics(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("TA-C pivot type")\n${body}`)).diagnostics;
}

// Pine v6 reference entry219 requires series string type.
describe('TA-C pivot_point_levels type admission', () => {
  it.each(['3', '3.0', 'input.int(3)', 'bar_index'])(
    'refuses numeric type %s in positional and named calls',
    (value) => {
      for (const call of [
        `ta.pivot_point_levels(${value}, true)`,
        `ta.pivot_point_levels(anchor=true, type=${value})`,
      ]) {
        expect(diagnostics(`levels=${call}\nplot(array.size(levels))`)).toEqual([
          expect.objectContaining({
            code: 'type-mismatch',
            message: expect.stringMatching(/^ta\.pivot_point_levels type must be a string, got (int|float)$/),
          }),
        ]);
      }
    },
  );

  it.each(['"Traditional"', 'input.string("Traditional")', 'bar_index % 2 == 0 ? "Traditional" : "DM"', '"INVALID"'])(
    'admits string kind %s without moving domain checks into compilation',
    (value) => {
      expect(diagnostics(`levels=ta.pivot_point_levels(type=${value}, anchor=true)\nplot(array.size(levels))`)).toEqual(
        [],
      );
    },
  );

  it('keeps same-name receiver methods independent of builtin type rules', () => {
    expect(
      diagnostics(`type Holder
    int seed
method pivot_point_levels(Holder self, int type, bool anchor) => type
holder = Holder.new(1)
plot(holder.pivot_point_levels(3, true))`),
    ).toEqual([]);
  });
});
