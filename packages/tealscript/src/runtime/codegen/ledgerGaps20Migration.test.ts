import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';

const bars = [1, 2, 3].map((close, i) => ({
  time: (i + 1) * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));
const ast = (body: string, version: number) =>
  parse(`//@version=${version}\n${version < 5 ? 'study' : 'indicator'}("migration")\n${body}`);
const errors = (body: string, version: number) =>
  checkProgram(ast(body, version)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
const values = (body: string, version: number) => {
  const result = executeScript(ast(body, version), bars);
  expect(result.errors).toEqual([]);
  return result.plots.map((plot) => plot.values);
};

describe('ledger761/798: published v4 to v5 namespace and argument migrations', () => {
  it('761: v4 named x is admitted', () => {
    expect(errors('plot(sign(x=-3))', 4)).toEqual([]);
  });
  it('761: v4 named x binds the argument in execution', () => {
    expect(values('plot(sign(x=-3))\nplot(sign(x=2))\nplot(sign(x=0))', 4)).toEqual([
      [-1, -1, -1],
      [1, 1, 1],
      [0, 0, 0],
    ]);
  });
  it('761: modern named number and legacy positional controls agree', () => {
    expect(errors('plot(math.sign(number=-3))', 5)).toEqual([]);
    expect(values('plot(math.sign(number=-3))', 5)).toEqual(values('plot(sign(-3))', 4));
    expect(errors('plot(math.sign(x=-3))', 5).some((diagnostic) => diagnostic.code === 'unknown-argument')).toBe(true);
    expect(errors('plot(sign(number=-3))', 4).some((diagnostic) => diagnostic.code === 'unknown-argument')).toBe(true);
  });
  it('798: legacy linreg and modern ta.linreg retain matching numeric controls', () => {
    expect(errors('plot(linreg(close, 2, 0))', 4)).toEqual([]);
    expect(errors('plot(ta.linreg(close, 2, 0))', 5)).toEqual([]);
    expect(values('plot(linreg(close, 2, 0))', 4)).toEqual([[null, 2, 3]]);
    expect(values('plot(ta.linreg(close, 2, 0))', 5)).toEqual([[null, 2, 3]]);
    expect(errors('plot(linreg(close, 2, 0))', 5).length).toBeGreaterThan(0);
  });
});
