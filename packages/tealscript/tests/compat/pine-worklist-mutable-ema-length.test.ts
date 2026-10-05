import { expect, it } from 'vitest';
import { compile } from '../../src/runtime/codegen/compile';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

const bars = [10, 30, 20, 50].map((close, i) => ({
  time: i * 120000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));
const mutable = 'var seriesLen = 0\nseriesLen += 1\nplot(ta.ema(close, seriesLen))';
// Authority: https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#mutable-variables-are-always-series
it('v5 retains the first recorded mutable EMA length of one', () => {
  const ast = parse(`//@version=5\nindicator("mutable length")\n${mutable}`);
  expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const result = executeScript(ast, bars);
  expect(result.errors).toEqual([]);
  expect(result.plots.map((plot) => plot.values)).toEqual([[10, 30, 20, 50]]);
});
it('v6 refuses the mutable series length for EMA', () => {
  const result = checkProgram(parse(`//@version=6\nindicator("mutable length")\n${mutable}`));
  expect(result.diagnostics.some((d) => d.severity === 'error' && /simple|series/.test(d.message))).toBe(true);
});
for (const version of [5, 6]) {
  it(`v${version} preserves the plain constant length-one control`, () => {
    const ast = parse(
      `//@version=${version}\nindicator("const length")\nconst int fixedLength = 1\nplot(ta.ema(close, fixedLength))`,
    );
    expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[10, 30, 20, 50]]);
  });
}
it('v5 mutable series-capable SMA lengths remain dynamic', () => {
  const ast = parse('//@version=5\nindicator("dynamic SMA")\nvar n = 0\nn += 1\nplot(ta.sma(close, n))');
  expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const result = executeScript(ast, bars);
  expect(result.errors).toEqual([]);
  expect(result.plots[0].values).toEqual([10, 20, 20, 27.5]);
});
it('v5 mutable EMA lengths keep distinct written-call constructors', () => {
  const ast = parse(
    '//@version=5\nindicator("separate EMA")\nvar a = 0\nvar b = 1\na += 1\nb += 1\nplot(ta.ema(close, a))\nplot(ta.ema(close, b))',
  );
  expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const result = executeScript(ast, bars);
  expect(result.errors).toEqual([]);
  expect(result.plots[0].values).toEqual([10, 30, 20, 50]);
  expect(result.plots[1].values).toEqual([null, 20, 20, 40]);
});

it('leaves shared helper signatures and unaffected call sites unchanged', () => {
  for (const source of [
    '//@version=5\nindicator("constant function")\nf() => 1\nplot(ta.ema(close, f()))',
    '//@version=5\nindicator("unmutated variable")\nvar n = 1\nplot(ta.ema(close, n))',
    '//@version=6\nindicator("v6 control")\nplot(ta.ema(close, 1))',
  ]) {
    const result = compile(parse(source));
    expect(result.success).toBe(true);
    expect(result.generatedCode).toContain('_dynamicTA(memberName, className, args) {');
    expect(result.generatedCode).toContain('_scopedTA(state, memberName, className, args) {');
    expect(result.generatedCode).not.toContain('_last?.instance');
  }
});
