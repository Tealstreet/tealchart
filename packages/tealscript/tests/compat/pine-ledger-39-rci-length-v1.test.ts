import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Reference ta.rci:length allows const/input/simple int, not float or series.
// Ledger ranks1552-1553 require independent qualifier and kind witnesses.
describe('documented RCI length kind and qualifier', () => {
  for (const binding of ['positional', 'named']) {
    const check = (length: string) =>
      checkProgram(
        parse(`//@version=6
indicator("RCI length")
plot(${binding === 'named' ? `ta.rci(source=close, length=${length})` : `ta.rci(close, ${length})`})
`),
      );

    for (const length of ['3.0', 'input.float(3.0)', 'syminfo.mintick']) {
      it(`refuses float length ${length} via ${binding}`, () => {
        expect(check(length).diagnostics).toEqual([
          expect.objectContaining({
            code: 'type-mismatch',
            message: expect.stringContaining('ta.rci length must be an integer'),
          }),
        ]);
      });
    }

    for (const length of ['3', 'input.int(3)', 'int(syminfo.mintick * 100)']) {
      it(`accepts integer length ${length} via ${binding}`, () => {
        expect(check(length).diagnostics).toEqual([]);
      });
    }

    it(`refuses series integer length via ${binding}`, () => {
      expect(check('bar_index + 3').diagnostics).toEqual([
        expect.objectContaining({
          code: 'qualifier-mismatch',
          message: expect.stringContaining('Cannot pass series value to simple parameter'),
        }),
      ]);
    });
  }
});
