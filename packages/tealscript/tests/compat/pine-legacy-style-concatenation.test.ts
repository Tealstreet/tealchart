import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { compile } from '../../src/runtime/codegen/compile';
import { checkProgram } from '../../src/semantic/checker';

const cases = [
  ['plot styles', 'plot.style_line', 'plot.style_line + "," + plot.style_histogram + "," + plot.style_area'],
  [
    'plot line styles',
    'plot.linestyle_solid',
    'plot.linestyle_solid + "," + plot.linestyle_dotted + "," + plot.linestyle_dashed',
  ],
  ['additional plot styles', 'plot.style_stepline_diamond', 'plot.style_stepline_diamond + "," + plot.style_areabr'],
] as const;

describe('legacy plot style string concatenation', () => {
  it.each(cases)('admits and compiles v5 %s concatenation', (_name, constant, expression) => {
    const source = `//@version=5
indicator("Legacy style strings")
style = ${constant}
styleText = ${expression}
log.info(styleText)
log.info("alias:" + style)
`;
    const ast = parse(source);
    const checked = checkProgram(ast);
    expect(checked.diagnostics).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'styleText')?.type).toEqual({
      kind: 'string',
      qualifier: 'const',
    });
    expect(compile(ast).success).toBe(true);
  });

  it.each(cases)('refuses v6 %s concatenation', (_name, _constant, expression) => {
    const checked = checkProgram(parse(`//@version=6\nindicator("Unique style strings")\nlog.info(${expression})\n`));
    expect(checked.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'invalid-operator-operands', severity: 'error' })]),
    );
  });
});
