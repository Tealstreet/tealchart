import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeScript } from '../../src/runtime/compiledOnly';

const bars = [1, 2, 3].map((close, index) => ({ time: index * 60000, open: close, high: close, low: close, close, volume: 1 }));
// Authority: v6 migration guide, boolean-values-cannot-be-na; rank 118.
describe('worklist v5 nz boolean domain', () => {
  it('fills missing bool with false by default and preserves explicit replacement and finite values', () => {
    const ast = parse(`//@version=5
indicator("Boolean nz")
bool value = bar_index == 0 ? na : bar_index == 1
bool replacement = na
log.info(str.tostring(nz(value)))
plot(nz(value, true) ? 1 : 0)
plot(na(nz(value, replacement)) ? 1 : 0)`);
    expect(checkProgram(ast).diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.logs.map((entry) => entry.message)).toEqual(['false', 'true', 'false']);
    expect(result.plots.map((plot) => plot.values)).toEqual([[1, 1, 0], [1, 0, 0]]);
  });
  it('rejects boolean nz operands in v6 while retaining numeric operands', () => {
    const check = (body: string) => checkProgram(parse('//@version=6\nindicator("nz domains")\n' + body)).diagnostics.filter((entry) => entry.severity === 'error');
    expect(check('plot(nz(true) ? 1 : 0)').length).toBeGreaterThan(0);
    expect(check('plot(nz(float(na), 3.0))')).toEqual([]);
  });
});
