import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot } from './fixtures';

// Reference functions[215..217], [368..371]. Expected values independently
// follow subtraction and strict, unique pivot windows. No window-hole policy
// is asserted for TRACE-REQUIRED rows452/456.
describe('TA missing-value ledger witnesses', () => {
  it.each(['high', 'low'])('returns na when no %s pivot exists for both overloads (rows450/451/454/455)', (kind) => {
    const member = kind === 'high' ? 'pivothigh' : 'pivotlow';
    const bars = [1, 2, 3, 2, 1, 2].map((v, i) => ({ ...compatibilityBars[i], high: v, low: v }));
    const result = executeScript(parse(`//@version=6
indicator("Pivot missing result")
plot(ta.${member}(1, 1), "Implicit")
plot(ta.${member}(source=${kind}, leftbars=1, rightbars=1), "Explicit")`), bars);
    expect(result.errors).toEqual([]);
    const expected = kind === 'high' ? [null, null, null, 3, null, null] : [null, null, null, null, null, 1];
    expect(getPlot(result, 'Implicit').values).toEqual(expected);
    expect(getPlot(result, 'Explicit').values).toEqual(expected);
  });

  it.each(['float', 'int'])('includes missing current and historical %s operands in change (rows458/460)', (kind) => {
    const source = `//@version=6
indicator("Change holes")
${kind} src = bar_index == 2 ? na : ${kind}(bar_index * 2)
plot(ta.change(src), "Default")
plot(ta.change(source=src, length=2), "Two")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = executeScript(parse(source), compatibilityBars.slice(0, 6));
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Default').values).toEqual([null, 2, null, null, 2, 2]);
    expect(getPlot(result, 'Two').values).toEqual([null, null, null, 4, null, 4]);
  });

  it('preserves missing bool change in v5 and both transition directions (row459)', () => {
    const source = `//@version=5
indicator("Boolean change holes")
bool src = bar_index == 2 ? na : bar_index == 1 or bar_index == 4
bool changed = ta.change(src)
plot(na(changed) ? -1 : changed ? 1 : 0, "Change")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = executeScript(parse(source), compatibilityBars.slice(0, 6));
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Change').values).toEqual([-1, 1, -1, -1, 1, 1]);
  });
});
