import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

function errors(body: string, version = 6) {
  return checkProgram(parse(`//@version=${version}\nindicator("TA-D admission")\n${body}`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );
}

// Authority: https://www.tradingview.com/pine-script-reference/v6/#fun_ta.tr
describe('v6 TA-D tr documented argument contracts', () => {
  it('requires TR handle_na while retaining its variable form', () => {
    expect(errors('x = ta.tr()')).not.toEqual([]);
    expect(errors('x = ta.tr')).toEqual([]);
  });
  it.each(['ta.tr(bar_index % 2 == 0)', 'ta.tr(handle_na=bar_index % 2 == 0)'])(
    'refuses series handle_na: %s',
    (call) => {
      expect(errors(`x = ${call}`)).toContainEqual(expect.objectContaining({ code: 'qualifier-mismatch' }));
    },
  );
  it.each(['true', 'false', 'input.bool(true)', 'flag'])('admits TR simple-or-weaker bool %s', (flag) => {
    expect(errors(`simple bool flag = true\nx = ta.tr(handle_na=${flag})`)).toEqual([]);
  });
  it('preserves v5 admission pending native adjudication', () => {
    expect(errors('x = ta.tr()\ny = ta.tr(bar_index % 2 == 0)', 5)).toEqual([]);
  });
  it('retains an ordinary receiver method with the same name', () => {
    expect(
      errors('type Local\n    float value\nmethod tr(Local this) => this.value\nlocal = Local.new(1)\nx = local.tr()'),
    ).toEqual([]);
  });
});
