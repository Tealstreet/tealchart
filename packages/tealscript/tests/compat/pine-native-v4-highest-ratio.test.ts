import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

const ratio = 'timeframe.in_seconds("15") / timeframe.in_seconds(timeframe.period)';
const bars = Array.from({ length: 20 }, (_, i) => ({
  time: 1788134400000 + i * 120000, open: i, high: i === 0 ? 100 : i + 1,
  low: i - 1, close: i, volume: 1,
}));
const runtime = { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } };

// Native v4 corpus5-v5-float-highest-length-v1 accepts the integer-derived ratio.
// Its historical OUTCOME matches seven bars; literal7.5 is separately refused.
describe('native v4 highest ratio', () => {
  it.each(['ta.highest(length)', 'ta.highest(length=length)', 'ta.highest(high, length)', 'ta.highest(length=length, source=high)'])('accepts and truncates captured v5 ratio: %s', (call) => {
    const ast = parse(`//@version=5\nindicator("ratio")\nlength = ${ratio}\nplot(${call}, "OUTCOME")\nplot(ta.highest(7), "CONTROL")`);
    expect(checkProgram(ast).diagnostics).toEqual([]);
    const result = executeScript(ast, bars, undefined, { runtime });
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(2);
    expect(result.plots[0].values).toEqual(result.plots[1].values);
    expect(result.plots[0].values[6]).toBe(100);
    expect(result.plots[0].values[7]).toBe(8);
  });

  it.each(['7.5', 'float(7)', 'timeframe.in_seconds("15") / 120.0'])('keeps actual float refusal: %s', (value) => {
    const result = checkProgram(parse(`//@version=5\nindicator("float")\nlength = ${value}\nplot(ta.highest(length=length))`));
    expect(result.diagnostics).toEqual([expect.objectContaining({ code: 'type-mismatch', severity: 'error' })]);
  });
  it.each(['highest', 'ema', 'sma'])('retains native original float refusal: %s', (name) => {
    const source = readFileSync(new URL(`../../oracle-probes/v4/v5-float-length-${name}-v1.pine`, import.meta.url), 'utf8');
    expect(checkProgram(parse(source)).diagnostics.some((item) => item.severity === 'error')).toBe(true);
  });

  it.each([
    `length = ${ratio}\nf(float length) =>\n    ta.highest(length=length)\nplot(f(7.5))`,
    `length = ${ratio}\nlength := 7.5\nplot(ta.highest(length=length))`,
    `length = ${ratio}\nf() =>\n    length = 7.5\n    ta.highest(length=length)\nplot(f())`,
  ])('retains float refusal after shadowing or reassignment: %s', (body) => {
    const diagnostics = checkProgram(parse(`//@version=5\nindicator("scope")\n${body}`)).diagnostics;
    expect(diagnostics.some((item) => item.severity === 'error' && item.message.includes('ta.highest length'))).toBe(true);
  });
});
