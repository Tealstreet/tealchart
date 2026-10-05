import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const bars = [-1, 0, 1].map((close, index) => ({
  ...compatibilityBars[0],
  time: compatibilityBars[0].time + index * 60_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
}));

function source(version: number, body: string) {
  return `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("atan slots")\n${body}`;
}

function execute(version: number, expression: string, expected: number[]) {
  const script = source(version, `plot(${expression}, "VALUE")`);
  expect(checkProgram(parse(script)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const result = runCompatScript(script, { bars });
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'VALUE').values).toEqual(expected);
}

describe('worklist atan legacy slot and namespace boundaries', () => {
  it.each([4, 5, 6])('preserves v%s positional calls', (version) => {
    execute(version, `${version === 4 ? 'atan' : 'math.atan'}(close)`, [-0.7853981633974483, 0, 0.7853981633974483]);
  });

  it('binds v4 x at the published legacy position', () => {
    execute(4, 'atan(x=close)', [-0.7853981633974483, 0, 0.7853981633974483]);
  });

  it.each([5, 6])('preserves the v%s reference angle slot', (version) => {
    execute(version, 'math.atan(angle=close)', [-0.7853981633974483, 0, 0.7853981633974483]);
  });

  it.each([5, 6])('refuses the obsolete v%s x slot', (version) => {
    const diagnostics = checkProgram(parse(source(version, 'plot(math.atan(x=close))'))).diagnostics;
    expect(diagnostics.filter((d) => d.code === 'unknown-argument')).toHaveLength(1);
  });

  it('refuses the modern number slot in v4', () => {
    const diagnostics = checkProgram(parse(source(4, 'plot(atan(number=close))'))).diagnostics;
    expect(diagnostics.filter((d) => d.code === 'unknown-argument')).toHaveLength(1);
  });

  it.each([5, 6])('refuses the bare builtin name in v%s', (version) => {
    const diagnostics = checkProgram(parse(source(version, 'plot(atan(close))'))).diagnostics;
    expect(diagnostics.some((d) => d.severity === 'error' && d.code === 'version-mismatch')).toBe(true);
  });

  it.each([4, 5, 6])('preserves a same-name user function in v%s', (version) => {
    const script = source(version, 'atan(custom) => custom + 8\nplot(atan(custom=close), "VALUE")');
    expect(checkProgram(parse(script)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(script, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'VALUE').values).toEqual([7, 8, 9]);
  });
});
