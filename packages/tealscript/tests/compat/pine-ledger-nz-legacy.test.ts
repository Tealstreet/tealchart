import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeScript } from '../../src/runtime/compiledOnly';

const bars = [4, 6].map((close, i) => ({ time: i * 60000, open: close, high: close + 1, low: close - 1, close, volume: 1 }));
const program = (version: number, body: string) => parse(`//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("nz migration")\n${body}`);
const errors = (version: number, body: string) => checkProgram(program(version, body)).diagnostics.filter((d) => d.severity === 'error');

describe('ledger gaps 144–147: nz migration boundary', () => {
  it.each([
    ['both named', 'nz(x=close[1], y=7)', [7, 4]],
    ['named source', 'nz(x=close[1], 7)', [7, 4]],
    ['named replacement', 'nz(close[1], y=7)', [7, 4]],
    ['reordered names', 'nz(y=7, x=close[1])', [7, 4]],
    ['omitted replacement', 'nz(x=close[1])', [0, 4]],
  ])('v4 accepts and executes %s', (_label, expression, values) => {
    const ast = program(4, `plot(${expression})`);
    expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual(values);
  });

  it.each([5, 6])('v%d rejects both old names and accepts renamed names', (version) => {
    expect(errors(version, 'plot(nz(x=close[1], y=7))').filter((d) => d.code === 'unknown-argument')).toHaveLength(2);
    const ast = program(version, 'plot(nz(replacement=7, source=close[1]))');
    expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(executeScript(ast, bars).plots[0].values).toEqual([7, 4]);
  });

  it('keeps positional calls equivalent across v4, v5, v6', () => {
    for (const version of [4, 5, 6]) {
      const ast = program(version, 'plot(nz(close[1], 7))');
      expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(executeScript(ast, bars).plots[0].values).toEqual([7, 4]);
    }
  });

  it('v5 accepts nullable bool replacement while v6 rejects both bool slots', () => {
    const body = 'bool source = na\nfilled = nz(source, true)\nplot(filled ? 1 : 0)';
    expect(errors(5, body)).toEqual([]);
    expect(executeScript(program(5, body), bars).plots[0].values).toEqual([1, 1]);
    expect(errors(6, 'filled = nz(true, false)').filter((d) => d.message.includes('nz') && d.message.includes('boolean'))).toHaveLength(2);
  });
});
