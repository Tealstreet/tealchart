import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';

const bars: Bar[] = [0, 1, -1].map((close, i) => ({
  time: 1700000000000 + i * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));
const source = (version: number, body: string) =>
  `//@version=${version}\n${version < 5 ? 'study' : 'indicator'}("Exp slots")\n${body}`;
const errors = (version: number, body: string) =>
  checkProgram(parse(source(version, body))).diagnostics.filter((d) => d.severity === 'error');
const values = (version: number, body: string) => {
  const ast = parse(source(version, body));
  expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const result = executeScript(ast, bars);
  expect(result.errors).toEqual([]);
  return result.plots[0].values;
};
describe('ledger516–517 exp versioned slot contract', () => {
  for (const version of [4]) {
    it(`v${version} legacy x binds the series argument`, () =>
      expect(values(version, 'plot(exp(x=close))')).toEqual([1, Math.E, 1 / Math.E]));
    it(`v${version} legacy x binds const`, () => expect(values(version, 'plot(exp(x=0))')).toEqual([1, 1, 1]));
    it(`v${version} legacy positional keeps position`, () =>
      expect(values(version, 'plot(exp(close))')).toEqual([1, Math.E, 1 / Math.E]));
    it(`v${version} refuses modern number slot`, () =>
      expect(errors(version, 'plot(exp(number=0))')).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'unknown-argument' })]),
      ));
    it(`v${version} refuses legacy x string kind`, () =>
      expect(errors(version, 'plot(exp(x="bad"))')).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
      ));
  }
  for (const version of [5, 6]) {
    it(`v${version} modern number binds the series argument`, () =>
      expect(values(version, 'plot(math.exp(number=close))')).toEqual([1, Math.E, 1 / Math.E]));
    it(`v${version} modern positional keeps position`, () =>
      expect(values(version, 'plot(math.exp(close))')).toEqual([1, Math.E, 1 / Math.E]));
    it(`v${version} modern refuses old x slot`, () =>
      expect(errors(version, 'plot(math.exp(x=0))')).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'unknown-argument' })]),
      ));
    it(`v${version} refuses bare legacy exp`, () =>
      expect(errors(version, 'plot(exp(0))')).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'version-mismatch' })]),
      ));
    it(`v${version} modern refuses number string kind`, () =>
      expect(errors(version, 'plot(math.exp(number="bad"))')).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
      ));
  }
});
