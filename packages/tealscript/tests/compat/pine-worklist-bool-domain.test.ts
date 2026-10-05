import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeScript } from '../../src/runtime/compiledOnly';

const bars = [0, 2, -3].map((close, index) => ({ time: index * 60000, open: close, high: close, low: close, close, volume: 1 }));
// Authority: v6 bool reference and migration boolean-values-cannot-be-na.
describe('worklist bool admitted unavailable-value domain', () => {
  it('casts missing and zero numeric values to false and finite nonzero values to true', () => {
    const ast = parse(`//@version=6
indicator("bool domain")
plot(bool(float(na)) ? 1 : 0)
plot(bool(int(na)) ? 1 : 0)
plot(bool(bar_index == 0 ? float(na) : close) ? 1 : 0)
plot(bool(close) ? 1 : 0)
plot(bool(false) ? 1 : 0)
plot(bool(true) ? 1 : 0)`);
    expect(checkProgram(ast).diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[0, 0, 0], [0, 0, 0], [0, 1, 1], [0, 1, 1], [0, 0, 0], [1, 1, 1]]);
  });
  it('retains finite input bool values; unavailable input/simple bool facets cannot exist in v6', () => {
    const ast = parse(`//@version=6
indicator("finite bool")
value = input.bool(false)
plot(bool(value) ? 1 : 0)`);
    expect(checkProgram(ast).diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
    expect(executeScript(ast, bars).plots[0].values).toEqual([0, 0, 0]);
    const invalid = parse('//@version=6\nindicator("missing bool")\nbool unavailable = na\nplot(1)');
    expect(checkProgram(invalid).diagnostics.some((entry) => entry.severity === 'error')).toBe(true);
  });
});
