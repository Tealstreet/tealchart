import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

function errors(body: string, version = 6) {
  return checkProgram(parse(`//@version=${version}\nindicator("TA-D admission")\n${body}`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );
}

// Authority: https://www.tradingview.com/pine-script-reference/v6/#fun_ta.vwap
describe('v6 TA-D vwap documented argument contracts', () => {
  it.each([
    'x = ta.vwap()',
    'x = ta.vwap(anchor=bar_index == 3)',
    '[v,u,l] = ta.vwap(anchor=bar_index == 3, stdev_mult=2)',
  ])('requires VWAP source: %s', (body) => {
    expect(errors(body)).not.toEqual([]);
  });
  it.each([
    'x = ta.vwap',
    'x = ta.vwap(close)',
    'x = ta.vwap(source=close, anchor=bar_index == 3)',
    '[v,u,l] = ta.vwap(source=close, anchor=bar_index == 3, stdev_mult=2)',
  ])('admits valid VWAP: %s', (body) => {
    expect(errors(body)).toEqual([]);
  });
  it('preserves v5 admission pending native adjudication', () => {
    expect(errors('x = ta.vwap(anchor=true)', 5)).toEqual([]);
  });
  it('retains an ordinary receiver method with the same name', () => {
    expect(
      errors(
        'type Local\n    float value\nmethod vwap(Local this) => this.value\nlocal = Local.new(1)\nx = local.vwap()',
      ),
    ).toEqual([]);
  });
});
