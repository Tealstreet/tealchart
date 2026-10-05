import type { CompiledBarContext } from './compile';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { nativeMathLog } from '../mathPrecision';
import { InMemoryRequestDatafeed } from '../requestDatafeed';
import { executeCompiled, tryCompile } from './execute';

const bars = [0, -0, -1, 0.75, 1, 2, 3, 1e-300, 1e300].map((close, index) => ({
  time: 1788134400000 + index * 120000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

describe('compiled stateless log evaluation', () => {
  it('avoids evaluator lookup and scoped call IDs in positional log loops', () => {
    const compiled = tryCompile(
      parse(`//@version=6
indicator("Scalar log evaluation v1")
f(float value) =>
    math.log(value)
plot(f(close))`),
    );
    expect(compiled.success).toBe(true);
    expect(compiled.generatedCode).toContain('ctx.mathLog(');
    expect(compiled.generatedCode).not.toContain('ctx.mathCall("math.log"');
  });

  it.each([4, 5, 6])('retains raw positional, named and UDF log results in v%s', (version) => {
    const declaration = version === 4 ? 'study' : 'indicator';
    const log = version === 4 ? 'log' : 'math.log';
    const compiled = tryCompile(
      parse(`//@version=${version}
${declaration}("Log conversion controls v1")
f(value) =>
    ${log}(value)
plot(${log}(close), "positional")
plot(${log}(number=close), "named")
plot(f(close), "udf")
plot(${log}(na), "missing")`),
    );
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars);
    expect(result?.errors).toEqual([]);
    for (const plot of result!.plots.slice(0, 3)) {
      expect(plot.values).toEqual(
        bars.map(({ close }) => {
          const value = nativeMathLog(close);
          return Number.isFinite(value) ? value : null;
        }),
      );
      expect(Object.is(plot.values[4], 0)).toBe(true);
    }
    expect(result!.plots[3].values).toEqual(bars.map(() => null));
  });

  it('matches the original evaluator bit for bit, including wrapped and nonfinite values', () => {
    const compiled = tryCompile(
      parse(`//@version=6
indicator("Log raw evaluator controls v1")
plot(math.log(close))`),
    );
    expect(compiled.success).toBe(true);
    const onBar = compiled.ScriptClass!.prototype.onBar;
    const values: unknown[] = [0, -0, NaN, Infinity, -Infinity, undefined, null, '3', 'bad', true, false];
    for (let exponent = -1074; exponent <= 1023; exponent += 7) values.push(2 ** exponent);
    let comparisons = 0;
    compiled.ScriptClass!.prototype.onBar = function (ctx: CompiledBarContext) {
      for (const value of values) {
        expect(Object.is(ctx.mathLog(value), ctx.mathCall('math.log', [value], {}, 'control'))).toBe(true);
        comparisons++;
      }
      return onBar.call(this, ctx);
    };
    const result = executeCompiled(compiled, bars.slice(0, 1));
    expect(result?.errors).toEqual([]);
    expect(comparisons).toBeGreaterThanOrEqual(values.length);
  });

  it('uses the same scalar helper in a requested context and preserves callable shadows', () => {
    const compiled = tryCompile(
      parse(`//@version=6
indicator("Log requested controls v1")
log(value) =>
    value + 1
plot(request.security("TEST", "2", math.log(close)), "requested")
plot(math.log(close), "chart")
plot(log(close), "shadow")`),
    );
    expect(compiled.success).toBe(true);
    const requestBars = bars.slice(3, 7);
    const result = executeCompiled(compiled, requestBars, undefined, {
      requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'TEST', timeframe: '2', bars: requestBars }]),
      runtime: { syminfo: { tickerid: 'TEST' }, timeframe: { period: '2' } },
    });
    expect(result?.errors).toEqual([]);
    expect(result!.plots[0].values).toEqual(result!.plots[1].values);
    expect(result!.plots[2].values).toEqual(bars.slice(3, 7).map(({ close }) => close + 1));
  });
});
