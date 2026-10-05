import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const check = (body: string) => checkProgram(parse(`//@version=6\nindicator("ledger types")\n${body}\n`));
const errors = (body: string) => check(body).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

// Unique constant kinds are distinct from scalar values and from each other.
// Literal-na version refusal and visual qualifier ceilings have separate owners.
describe('ledger gaps 10 unique style values', () => {
  it.each([
    ['plot.style_line', 'plot_style', 'plot(close, style=style)'],
    ['plot.linestyle_dotted', 'plot_line_style', 'plot(close, linestyle=style)'],
    ['hline.style_dashed', 'hline_style', 'hline(1, linestyle=style)'],
  ])('preserves %s unique identity and refuses scalar uses (row 387)', (constant, family, call) => {
    const result = check(`style = ${constant}\n${call}`);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'style')?.type).toEqual({
      kind: 'unique',
      name: family,
      qualifier: 'const',
    });
    for (const body of [`float value = ${constant}`, `string value = ${constant}`, `plot(${constant})`]) {
      expect(errors(body)).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]));
    }
  });
});
