import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Current reference names math.asin's slot angle, not the ledger's historical number.
describe('ledger1093-1094 asin migration', () => {
  it.each([
    [4, 'study', 'asin(x=0.5)'],
    [6, 'indicator', 'math.asin(angle=0.5)'],
  ] as const)('binds v%s canonical argument', (version, declaration, call) => {
    const source = `//@version=${version}\n${declaration}("asin")\nplot(${call}, "out")`;
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'out').values[0]).toBeCloseTo(Math.PI / 6, 12);
  });
  it.each(['asin(0.5)', 'math.asin(x=0.5)'])('refuses noncanonical v6 call %s', (call) => {
    expect(
      checkProgram(parse(`//@version=6\nindicator("asin")\nplot(${call})`)).diagnostics.some(
        (d) => d.severity === 'error',
      ),
    ).toBe(true);
  });
});
