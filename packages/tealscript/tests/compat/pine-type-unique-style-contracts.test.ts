import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Authority: pine-v6-reference-v1.json plot/style, plot/linestyle, hline/linestyle
// allowedTypeIDs and constant/plot.style_line, plot.linestyle_solid, hline.style_solid.
// Each slot is checked directly; no rule for another unique type is inferred.
const styles = [
  { expression: 'plot.style_line', family: 'plot_style' },
  { expression: 'plot.linestyle_solid', family: 'plot_line_style' },
  { expression: 'hline.style_solid', family: 'hline_style' },
];
const slots = [
  { name: 'plot.style', call: 'plot(close, style=value)', family: 'plot_style' },
  { name: 'plot.linestyle', call: 'plot(close, linestyle=value)', family: 'plot_line_style' },
  { name: 'hline.linestyle', call: 'hline(1, linestyle=value)', family: 'hline_style' },
];

describe('documented unique visual parameter families', () => {
  // Aliases test type propagation; the two solid constants share a runtime spelling
  // and must still remain distinct types. Both wrong-family directions are covered.
  for (const slot of slots) {
    for (const style of styles) {
      const accepted = slot.family === style.family;
      it(`${slot.name} ${accepted ? 'accepts' : 'refuses'} ${style.family}`, () => {
        const result = checkProgram(parse(`//@version=6
indicator("Unique style parameter families")
value = ${style.expression}
${slot.call}`));
        expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({
          kind: 'unique', name: style.family, qualifier: 'const',
        });
        if (accepted) expect(result.diagnostics).toEqual([]);
        else expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'type-mismatch'
          && diagnostic.line === 4 && diagnostic.column === slot.call.indexOf('value') + 1)).toBe(true);
      });
    }
  }
});
