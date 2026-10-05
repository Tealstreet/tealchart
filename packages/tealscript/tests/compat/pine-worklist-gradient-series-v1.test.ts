import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Reference509: gradient always returns series color, even with constant operands.
for (const value of ['0', 'input.int(0)', 'bar_index']) {
  it(`gradient result is series color with ${value}`, () => {
    const checked = checkProgram(parse(`//@version=6
indicator("Gradient qualifier")
x = color.from_gradient(${value}, 0, 10, #000000, #FFFFFF)
plot(close, color=x)`));
    expect(checked.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(checked.symbols.find((s) => s.name === 'x')?.type).toMatchObject({ kind: 'color', qualifier: 'series' });
  });
}

it('rejects gradient as a const color input default while retaining literal defaults', () => {
  for (const [value, valid] of [['color.from_gradient(0, 0, 10, #000000, #FFFFFF)', false], ['#000000', true]] as const) {
    const checked = checkProgram(parse(`//@version=6
indicator("Gradient input boundary")
x = input.color(${value})
plot(close, color=x)`));
    expect(checked.diagnostics.some((d) => d.severity === 'error')).toBe(!valid);
  }
});
