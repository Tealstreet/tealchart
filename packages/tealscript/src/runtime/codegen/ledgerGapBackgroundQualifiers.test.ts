import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';

const errors = (body: string) =>
  checkProgram(parse(`//@version=6\nindicator("background")\n${body}`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );
describe('ledger gaps 193–196: bgcolor qualifier contracts', () => {
  it.each([
    ['editable', 'close > 0', 'input.bool(true)'],
    ['show_last', 'bar_index + 1', 'input.int(2)'],
    ['title', 'syminfo.ticker', '"title"'],
    ['force_overlay', 'input.bool(true)', 'true'],
  ])('193–196: enforces the reference qualifier for %s', (parameter, invalid, valid) => {
    expect(errors(`bgcolor(color.blue, ${parameter}=${invalid})`).some((d) => d.code === 'qualifier-mismatch')).toBe(
      true,
    );
    expect(errors(`bgcolor(color.blue, ${parameter}=${valid})`)).toEqual([]);
  });
});
