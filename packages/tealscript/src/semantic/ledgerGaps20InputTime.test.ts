import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (argument: string) =>
  checkProgram(
    parse(`//@version=6\nindicator("time metadata")\nx = input.time(1, ${argument})\nplot(x)`),
  ).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

// Official v6 functions[53] slot-specific caps. Shared guard is owned by g6qooy.
describe('ledger765–770: input.time metadata qualifier boundaries', () => {
  it.each(['title', 'tooltip', 'inline', 'group'])(
    '%s accepts const and rejects every stronger string qualifier',
    (slot) => {
      expect(errors(`${slot}="fixed"`)).toEqual([]);
      for (const value of ['input.string("user")', 'syminfo.ticker', 'close > 0 ? "up" : "down"']) {
        expect(errors(`${slot}=${value}`)).toEqual([
          expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining(slot) }),
        ]);
      }
    },
  );
  it('confirm accepts const and rejects input/simple/series bool', () => {
    expect(errors('confirm=true')).toEqual([]);
    for (const value of ['input.bool(true)', 'syminfo.mintick > 0', 'close > 0']) {
      expect(errors(`confirm=${value}`)).toEqual([
        expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('confirm') }),
      ]);
    }
  });
  it('active accepts const/input and rejects simple/series bool', () => {
    expect(errors('active=true')).toEqual([]);
    expect(errors('active=input.bool(true)')).toEqual([]);
    for (const value of ['syminfo.mintick > 0', 'close > 0']) {
      expect(errors(`active=${value}`)).toEqual([
        expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('active') }),
      ]);
    }
  });
});
