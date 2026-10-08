import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

function errors(body: string, version = 6) {
  return checkProgram(parse(`//@version=${version}\nindicator("TA-D admission")\n${body}`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );
}

// Authority: https://www.tradingview.com/pine-script-reference/v6/#fun_ta.valuewhen
describe('v6 TA-D valuewhen documented argument contracts', () => {
  it.each([
    'ta.valuewhen(true, "text", 0)',
    'ta.valuewhen(condition=true, source="text", occurrence=0)',
    'ta.valuewhen(true, input.string("text"), 0)',
  ])('refuses ValueWhen string source: %s', (call) => {
    expect(errors(`x = ${call}`)).toContainEqual(expect.objectContaining({ code: 'type-mismatch' }));
  });
  it.each(['close', 'bar_index', 'bar_index % 2 == 0', 'color.red'])(
    'admits ValueWhen documented source %s',
    (source) => {
      expect(errors(`x = ta.valuewhen(condition=true, source=${source}, occurrence=0)`)).toEqual([]);
    },
  );
  it('preserves v5 admission pending native adjudication', () => {
    expect(errors('x = ta.valuewhen(true, "text", 0)', 5)).toEqual([]);
  });
  it('retains an ordinary receiver method with the same name', () => {
    expect(
      errors(
        'type Local\n    float value\nmethod valuewhen(Local this, string source) => source\nlocal = Local.new(1)\nx = local.valuewhen("text")',
      ),
    ).toEqual([]);
  });
  it('refuses a UDF string return source', () => {
    expect(errors('text() => "text"\nx = ta.valuewhen(true, text(), 0)')).toContainEqual(
      expect.objectContaining({ code: 'type-mismatch' }),
    );
  });
});
