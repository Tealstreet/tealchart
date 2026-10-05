import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeScript } from '../../src/runtime/compiledOnly';

const bars = [4, 6, 8].map((close, i) => ({ time: i * 60000, open: close, high: close + 1, low: close - 1, close, volume: 1 }));
describe('shared legacy nz bool default (rank118 dependency)', () => {
  it.each([4, 5])('v%d omitted replacement returns bool false, not numeric zero', (version) => {
    const ast = parse(`//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("nz bool")\nbool source = bar_index == 0 ? na : bar_index == 1\nvalue = nz(source)\nlog.info(str.tostring(value))\nplot(value ? 1 : 0)`);
    expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.logs.map((entry) => entry.message)).toEqual(['false', 'true', 'false']);
    expect(result.plots[0].values).toEqual([0, 1, 0]);
  });

  it('uses false inside a typed bool UDF, preserving explicit missing replacement', () => {
    const ast = parse('//@version=5\nindicator("nz bool functions")\nfill(bool source) => nz(source)\nbool source = na\nbool replacement = na\nlog.info(str.tostring(fill(source)))\nplot(na(nz(source, replacement)) ? 1 : 0)');
    expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.logs.map((entry) => entry.message)).toEqual(['false', 'false', 'false']);
    expect(result.plots[0].values).toEqual([1, 1, 1]);
  });
});
