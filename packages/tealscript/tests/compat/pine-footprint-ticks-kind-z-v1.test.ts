import { describe, expect, it } from 'vitest';

import { checkProgram, parse } from '../../src';

function diagnostics(call: string) {
  const parsed = parse(`//@version=6
indicator("Footprint kind")
${call}
plot(close)
`);
  return checkProgram(parsed).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('request.footprint ticks_per_row integer kind', () => {
  it.each([
    'request.footprint(syminfo.tickerid)',
    'request.footprint("10")',
    'request.footprint(ticks_per_row="10")',
    'request.footprint(true)',
    'request.footprint(input.float(10.5))',
    'request.footprint(va_percent=70.5, ticks_per_row="10", imbalance_percent=300.5)',
  ])('rejects invalid ticks: %s', (call) => {
    expect(diagnostics(call)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('ticks_per_row must be an integer') }),
    ]));
  });

  it.each([
    'request.footprint(10)',
    'request.footprint(input.int(10))',
    'request.footprint(ticks_per_row=10)',
    'request.footprint(imbalance_percent=300.5, ticks_per_row=10, va_percent=70.5)',
    'request.security(syminfo.tickerid, timeframe.period, close)',
  ])('retains valid argument binding: %s', (call) => {
    expect(diagnostics(call)).toEqual([]);
  });
});
