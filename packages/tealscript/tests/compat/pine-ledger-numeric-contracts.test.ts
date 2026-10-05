import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript, type Bar, type TealscriptExecutionOptions } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';

// Ledger ranks 41–42, 49, 70, 72–80; documented operators, types and float overloads.
const bars: Bar[] = [10, 12, 11].map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000, open: close - 1, high: close + 1, low: close - 2, close, volume: 100,
}));

function values(body: string, version = 6, inputs?: Map<string, unknown>, options?: TealscriptExecutionOptions) {
  const program = parse(`//@version=${version}\nindicator("Ledger numeric contracts")\n${body}`);
  expect(checkProgram(program).diagnostics).toEqual([]);
  const result = executeScript(program, bars, inputs, options);
  expect(result.errors).toEqual([]);
  return result.plots.map((plot) => plot.values);
}

describe('unavailable numeric operators', () => {
  for (const operator of ['+', '-']) {
    it(`unary ${operator} preserves unavailable values and defined signs`, () => {
      expect(values(`float missing = na\nplot(na(${operator}missing) ? 1 : 0)\nplot(${operator}2)`)).toEqual([
        [1, 1, 1], operator === '+' ? [2, 2, 2] : [-2, -2, -2],
      ]);
    });
  }
  it('float history is unavailable until its requested bar exists', () => {
    expect(values('plot(close[1])\nplot(na(close[1]) ? 1 : 0)')).toEqual([[null, 10, 12], [1, 0, 0]]);
  });
  it('ta.max ignores unavailable source bars without losing the previous maximum', () => {
    expect(values('source = bar_index == 1 ? float(na) : close\nplot(ta.max(source))')).toEqual([[10, 10, 11]]);
  });
});

describe('float overload numeric contracts', () => {
  for (const [qualifier, expression, kind] of [
    ['const', '2', 'int'], ['const', '2.5', 'float'],
    ['input', 'input.int(2)', 'int'], ['input', 'input.float(2.5)', 'float'],
    ['simple', 'syminfo.minmove', 'int'], ['simple', 'syminfo.mintick', 'float'],
  ] as const) {
    it(`accepts ${qualifier} ${kind} and returns ${qualifier} float`, () => {
      const result = checkProgram(parse(`//@version=6\nindicator("Float overload")\nsource = ${expression}\nvalue = float(source)`));
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'source')?.type).toEqual({ kind, qualifier });
      expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({ kind: 'float', qualifier });
    });
  }
  it('preserves unavailable input float while retaining defined overrides', () => {
    const body = 'source = input.float(1, "Source")\nplot(float(source))';
    expect(values(body, 6, new Map([['input_Source', NaN]]))).toEqual([[null, null, null]]);
    expect(values(body, 6, new Map([['input_Source', 2.5]]))).toEqual([[2.5, 2.5, 2.5]]);
  });
  it('preserves unavailable simple float while retaining defined symbol metadata', () => {
    expect(values('plot(float(syminfo.mintick))', 6, undefined, { runtime: { syminfo: { mintick: NaN } } })).toEqual([[null, null, null]]);
    expect(values('plot(float(syminfo.mintick))', 6, undefined, { runtime: { syminfo: { mintick: 0.25 } } })).toEqual([[0.25, 0.25, 0.25]]);
  });
  it('preserves unavailable series float and subsequent historical values', () => {
    expect(values('plot(float(close[1]))')).toEqual([[null, 10, 12]]);
  });
  it('retains arithmetic precision beyond comparison rounding and tiny float literals', () => {
    expect(values('plot(1.000000000000001)\nplot(1.6e-19)')).toEqual([[1.000000000000001, 1.000000000000001, 1.000000000000001], [1.6e-19, 1.6e-19, 1.6e-19]]);
  });
});
