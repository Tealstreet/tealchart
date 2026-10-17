import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const warnings = (body: string, version = 6) => checkProgram(parse(
  `//@version=${version}\nindicator("Conditional averages")\n${body}`,
)).diagnostics.filter((d) => d.code === 'conditional-average-history');

describe('conditional average warning scope controls (v95)', () => {
  it.each([5, 6])('retains source order and independent sites in v%i', (version) => {
    const result = warnings(`if close > open
    a = ta.ema(close, 3)
    b = ta.sma(close, 3)
if close < open
    c = ta.sma(close, 3)`, version);
    expect(result.map((d) => [d.line, d.column])).toEqual([[4, 9], [5, 9], [7, 9]]);
    expect(result.map((d) => d.message.match(/ta\.(?:sma|ema)/)?.[0])).toEqual(['ta.ema', 'ta.sma', 'ta.sma']);
    expect(result.every((d) => d.severity === 'warning')).toBe(true);
  });

  it('keeps unconditional averages and other TA functions separate', () => {
    expect(warnings(`plot(ta.sma(close, 3))
plot(ta.ema(close, 3))
if close > open
    current = ta.change(close)`)).toEqual([]);
  });

  it('does not extend the captured statement-scope warning to ternary wording', () => {
    expect(warnings('plot(close > open ? ta.sma(close, 3) : ta.ema(close, 3))')).toEqual([]);
  });

  it.each(['global', 'local'])('does not warn for a %s namespace shadow with a same-named method', (location) => {
    const declaration = `type Holder
    float value
method sma(Holder self, float source, int length) => source`;
    const call = location === 'global' ? `ta = Holder.new(1)
if close > open
    value = ta.sma(close, 3)` : `if close > open
    ta = Holder.new(1)
    value = ta.sma(close, 3)`;
    expect(warnings(`${declaration}\n${call}`)).toEqual([]);
  });
});
