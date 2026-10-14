import { withVersionAdvisory } from '../../../tests/helpers/expectedVersionAdvisory';
import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeCompiled, tryCompile } from './execute';

const start = Date.UTC(2026, 0, 1);
const bars = [3, 4, 5].map((close, index) => ({
  time: start + index * 60_000, open: close, high: close, low: close, close, volume: 1,
}));
const daily = [41, 42].map((close, index) => ({ ...bars[0]!, time: start + index * 86_400_000, close }));

function values(version: number, body: string): unknown[][] {
  const ast = parse(`//@version=${version}\nindicator("Numeric method selection")\n${body}`);
  expect(checkProgram(ast).diagnostics).toEqual(withVersionAdvisory([], version));
  const compiled = tryCompile(ast);
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars, undefined, {
    runtime: { timeframe: { period: '1' }, syminfo: { tickerid: 'CHART', timezone: 'Etc/UTC' } },
    requestDatafeed: {
      getBars(query) {
        return { ok: true, context: { symbol: query.symbol, timeframe: query.timeframe, bars: daily } };
      },
    },
  });
  expect(result).toBeDefined();
  expect(result!.errors).toEqual([]);
  expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
  return result!.plots.map((plot) => plot.values);
}

describe('static numeric method selection', () => {
  for (const version of [5, 6]) {
    for (const reverse of [false, true]) {
      const declarations = ['method sample(int self) => self + 100', 'method sample(float self) => self'];
      if (reverse) declarations.reverse();
      const methods = declarations.join('\n');

      it(`preserves the Pine type of integral float receivers in v${version}, reverse=${reverse}`, () => {
        expect(values(version, `${methods}
float whole = 3.0
plot(close.sample())
plot(int(close).sample())
plot(whole.sample())
plot(int(3).sample())`)).toEqual([[3, 4, 5], [103, 104, 105], [3, 3, 3], [103, 103, 103]]);
      });

      it(`selects each wrapper invocation independently in v${version}, reverse=${reverse}`, () => {
        expect(values(version, `${methods}
read(value) => value.sample()
plot(read(close))
plot(read(int(close)))`)).toEqual([[3, 4, 5], [103, 104, 105]]);
      });

      it(`keeps mixed receiver types in a nested requested expression in v${version}, reverse=${reverse}`, () => {
        expect(values(version, `${methods}
outer(value) => request.security("REMOTE", "1D", request.security("REMOTE", "1D", value.sample() + int(7).sample(), lookahead=barmerge.lookahead_on), lookahead=barmerge.lookahead_on)
plot(outer(close))`)).toEqual([[148, 148, 148]]);
      });
    }

    for (const receiverType of ['int', 'float']) {
      const other = receiverType === 'int' ? 'float' : 'int';
      const receiver = receiverType === 'int' ? 'int(close)' : 'close';
      it(`keeps the requested sibling separate from a chart ${receiverType} receiver in v${version}`, () => {
        expect(values(version, `method sample(${other} self) => request.security("REMOTE", "1D", close, lookahead=barmerge.lookahead_on)
method sample(${receiverType} self) => self
selected = ${receiver}.sample()
plot(selected)
plot(request.security("REMOTE", "1D", selected, lookahead=barmerge.lookahead_on))`)).toEqual([[3, 4, 5], [41, 41, 41]]);
      });
    }

    it(`retains genuine scalar overload ambiguity refusal in v${version}`, () => {
      const ast = parse(`//@version=${version}
indicator("Ambiguous overload")
choose(int a, float b) => a + b
choose(float a, int b) => a + b
plot(choose(1, 1))`);
      expect(checkProgram(ast).diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'ambiguous-call', severity: 'error' }),
      ]));
      expect(tryCompile(ast).success).toBe(false);
    });
  }
});
