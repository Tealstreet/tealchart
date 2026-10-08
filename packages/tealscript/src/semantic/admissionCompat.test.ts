import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const lengthCalls = [
  'ta.rsi(close, LENGTH)', 'ta.sma(close, LENGTH)', 'ta.ema(close, LENGTH)',
  'ta.wma(close, LENGTH)', 'ta.highest(close, LENGTH)', 'ta.lowest(close, LENGTH)',
  'ta.rma(close, LENGTH)', 'ta.hma(close, LENGTH)', 'ta.atr(LENGTH)',
  'ta.stdev(close, LENGTH)', 'ta.mfi(hlc3, LENGTH)', 'ta.cci(close, LENGTH)',
  'ta.mom(close, LENGTH)', 'ta.cmo(close, LENGTH)', 'ta.linreg(close, LENGTH, 0)',
  'ta.percentrank(close, LENGTH)', 'ta.correlation(close, open, LENGTH)',
];

function errors(call: string, length: string, version = 5) {
  return checkProgram(parse(`//@version=${version}
indicator("Derived TA lengths")
lo = input.int(2)
hi = input.int(22)
plot(${call.replace('LENGTH', length)})
`)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('TA integer-derived length admission', () => {
  it.each(lengthCalls)('accepts input-int division in %s', (call) => {
    expect(errors(call, 'lo + (hi - lo) / 10')).toEqual([]);
  });

  it.each(lengthCalls)('retains explicit float refusal in %s', (call) => {
    expect(errors(call, 'lo + (hi - lo) / 10.0', 6).some((error) => error.code === 'type-mismatch')).toBe(true);
  });

  it.each(lengthCalls)('refuses a fractional v6 integer quotient in %s', (call) => {
    const member = call.match(/ta\.(\w+)/)![1];
    expect(errors(call, '9 / 2', 6)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'type-mismatch',
        message: `ta.${member} length must be an integer, got float`,
      }),
    ]));
  });

  it.each(lengthCalls)('keeps truncating v5 odd quotients admitted in %s', (call) => {
    expect(errors(call, '9 / 2', 5)).toEqual([]);
  });

  it.each(lengthCalls)('accepts an integral v6 constant quotient in %s', (call) => {
    expect(errors(call, '8 / 2', 6)).toEqual([]);
  });

  it.each(lengthCalls)('folds negative-operand modulo with runtime semantics in %s', (call) => {
    for (const length of ['(-1 % 3) / 2', '(1 % -3) / -2', '((-1 % -3) + 3) / 2']) {
      expect(errors(call, length, 6), length).toEqual([]);
    }
  });

  it.each(lengthCalls)('still refuses a fractional negative-modulo quotient in %s', (call) => {
    expect(errors(call, '(-1 % 4) / 2', 6)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'type-mismatch' }),
    ]));
  });

  it.each(lengthCalls)('keeps dynamic v6 integer quotients admitted in %s', (call) => {
    expect(errors(call, 'hi / lo', 6)).toEqual([]);
  });

  it.each(['(9 / 2) + 1', 'length'])('refuses a folded fractional v6 length %s', (length) => {
    const source = `//@version=6
indicator("Folded length")
numerator = 9
length = numerator / 2
plot(ta.rsi(close, ${length}))`;
    expect(checkProgram(parse(source)).diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: 'ta.rsi length must be an integer, got float' }),
    ]));
  });

  it.each(lengthCalls)('refuses folded fractional math/ternary v6 lengths in %s', (call) => {
    for (const length of [
      'math.max(9, 8) / 2',
      'math.min(9, 10) / 2',
      'math.abs(-9) / 2',
      'math.round(9) / 2',
      'math.floor(9) / 2',
      'math.ceil(9) / 2',
      '(true ? 9 : 8) / 2',
      '(false ? 8 : 9) / 2',
      '(2 < 3 ? 9 : 8) / 2',
      'math.max(8, math.abs(-9)) / 2',
      'math.round(-9 / 2) / -2',
      'math.ceil(9 / 2) / 2',
      'math.round(precision=0, number=9) / 2',
    ]) {
      expect(errors(call, length, 6), length).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: `ta.${call.match(/ta\.(\w+)/)![1]} length must be an integer, got float`,
          }),
        ]),
      );
      if (!length.includes('precision=')) expect(errors(call, length, 5), length).toEqual([]);
    }
  });

  it.each(lengthCalls)('accepts integral or dynamic folded v6 lengths in %s', (call) => {
    for (const length of [
      'math.max(8, 6) / 2',
      'math.min(8, 10) / 2',
      'math.abs(-8) / 2',
      'math.round(8) / 2',
      'math.floor(8) / 2',
      'math.ceil(8) / 2',
      '(true ? 8 : 9) / 2',
      'math.floor(9 / 2) / 2',
      '(1 == 1.00000000001 ? 8 : 9) / 2',
      '(1 < 1.00000000001 ? 9 : 8) / 2',
      '(false ? 9 : 8) / 2',
      'math.max(hi, 8) / lo',
      '(true ? hi : 8) / lo',
      '(lo > 1 ? 9 : 8) / lo',
    ])
      expect(errors(call, length, 6), length).toEqual([]);
  });

  it('folds constant aliases and nested boolean conditions', () => {
    const source = `//@version=6
indicator("Folded aliases")
condition = not (2 >= 3) and true
length = (condition ? math.max(9, 8) : 8) / 2
plot(ta.rsi(close, length))`;
    expect(checkProgram(parse(source)).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'ta.rsi length must be an integer, got float' })]),
    );
  });

  it('does not fold through reassigned numeric or boolean aliases', () => {
    const source = `//@version=6
indicator("Reassigned constants")
numerator = 9
condition = true
numerator := input.int(9)
condition := close > open
plot(ta.sma(close, numerator / 2))
plot(ta.sma(close, (condition ? 9 : 8) / 2))`;
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });

  it('retains the simple RSI length qualifier requirement', () => {
    expect(errors('ta.rsi(close, LENGTH)', 'lo + bar_index / 10').some((error) => error.code === 'qualifier-mismatch')).toBe(true);
  });
});
