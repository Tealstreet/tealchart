import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import { HMA } from './ta-classes';

const detail = "Invalid value of the 'length' argument (0) in the 'wma' function. It must be > 0.";
const bars = [4, 6, 8].map((close, i) => ({ time: i * 60000, open: close, high: close + 1, low: close - 1, close, volume: 1 }));

// The error contract comes from TradingView's HMA length-one runtime capture;
// these inputs are hand-built, and no capture CSV data is imported.
describe('TradingView HMA internal WMA argument error', () => {
  it.each([
    'plot(ta.hma(close, 1))',
    'length = input.int(1)\nplot(ta.hma(close, length))',
    'smooth(x) => ta.hma(x, 1)\nplot(smooth(close))',
    'float missing = na\nplot(ta.hma(missing, 1))',
  ])('reports RE10001 at execution for %s', body => {
    const ast = parse(`//@version=6\nindicator("HMA error oracle")\n${body}`);
    expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      code: 'RE10001',
      barIndex: 0,
      message: `Error on bar 0: ${detail}`,
      runtimeError: { code: 'RE10001', barIndex: 0, message: `Error on bar 0: ${detail}` },
    });
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
  });

  it('fails on the first executed call, without failing an unexecuted call site', () => {
    const result = executeScript(parse(`//@version=6
indicator("delayed HMA error")
float value = 0
if bar_index == 1
    value := ta.hma(close, 1)
plot(value)`), bars);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ code: 'RE10001', barIndex: 1, message: `Error on bar 1: ${detail}` });
    expect(result.plots[0].values[0]).toBe(0);

    const skipped = executeScript(parse(`//@version=6
indicator("skipped HMA error")
float value = 0
if bar_index < 0
    value := ta.hma(close, 1)
plot(value)`), bars);
    expect(skipped.errors).toEqual([]);
    expect(skipped.plots[0].values).toEqual([0, 0, 0]);
  });

  it('leaves legal HMA and length-one WMA calls executable', () => {
    const result = executeScript(parse(`//@version=6
indicator("legal WMA/HMA controls")
plot(ta.wma(close, 1), "WMA")
plot(ta.hma(close, 2), "HMA")`), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([4, 6, 8]);
    expect(result.plots[1].values[0]).toBeNull();
    expect(result.plots[1].values[1]).toBeCloseTo(20 / 3, 12);
    expect(result.plots[1].values[2]).toBeCloseTo(26 / 3, 12);
  });

  it('defers the internal zero-length rejection until HMA computation', () => {
    const instance = new HMA(1);
    expect(() => instance.compute(4)).toThrow(detail);
    expect(() => instance.recompute(NaN)).toThrow(detail);
  });
});
