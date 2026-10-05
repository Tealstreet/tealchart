import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const errors = (body: string, version = 6) =>
  checkProgram(parse(`//@version=${version}\nindicator("linreg contracts")\n${body}`)).diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );

// Local official v6 functions[208]: length=series int, offset=simple int.
describe.each([5, 6])('ledger795–797: linreg argument kinds and offset qualifier v%i', (version) => {
  it.each(['3.0', 'input.float(3.0)', 'close'])('rejects float length %s', (length) => {
    expect(errors(`plot(ta.linreg(source=close, length=${length}, offset=0))`, version)).toEqual([
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('length must be an integer') }),
    ]);
  });
  it.each(['0.0', 'input.float(0.0)', 'syminfo.mintick'])('rejects float offset %s', (offset) => {
    expect(errors(`plot(ta.linreg(close, 3, ${offset}))`, version)).toEqual([
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('offset must be an integer') }),
    ]);
  });
  it.each(['3', 'input.int(3)', 'int(bar_index % 3) + 1'])('accepts int length %s, including series', (length) => {
    expect(errors(`plot(ta.linreg(close, ${length}, 0))`, version)).toEqual([]);
  });
  it.each(['0', 'input.int(0)', 'timeframe.multiplier'])('accepts int simple-or-weaker offset %s', (offset) => {
    expect(errors(`plot(ta.linreg(offset=${offset}, length=3, source=close))`, version)).toEqual([]);
  });
  it('rejects series-int offset while accepting the same expression as length', () => {
    expect(errors('plot(ta.linreg(close, 3, bar_index))', version)).toEqual([
      expect.objectContaining({
        code: 'qualifier-mismatch',
        message: expect.stringContaining("simple parameter 'offset'"),
      }),
    ]);
  });
});
