import { expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

// Authority: Script structure declaration statement, rank 1650.
it('accepts one indicator and preserves its declaration metadata', () => {
  const ast = parse(`//@version=6
indicator("Worklist indicator", overlay=true)
plot(close)`);
  expect(checkProgram(ast, { requireDeclaration: true }).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(ast.body[0]).toMatchObject({ type: 'IndicatorDeclaration' });
  const result = executeScript(ast, [{ time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 }]);
  expect(result.errors).toEqual([]);
  expect(result.plots.map((plot) => plot.values)).toEqual([[1]]);
});
for (const declarations of ['', 'indicator("One")\nindicator("Two")']) {
  it(`requires exactly one declaration: ${declarations}`, () => {
    const checked = checkProgram(parse(`//@version=6
${declarations}
plot(close)`), { requireDeclaration: true });
    expect(checked.diagnostics.some((d) => d.code === 'declaration-count' && d.severity === 'error')).toBe(true);
  });
}
