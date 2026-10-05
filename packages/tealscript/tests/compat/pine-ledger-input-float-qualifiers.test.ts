import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { executeScript } from '../../src/runtime/compiledOnly';

const levels = [
  ['const', '"Static"', 'true'],
  ['input', 'input.string("Dynamic")', 'input.bool(true)'],
  ['simple', 'syminfo.ticker', 'syminfo.type == "stock"'],
  ['series', 'str.tostring(close)', 'close > open'],
] as const;
const options = ['title', 'tooltip', 'inline', 'group', 'confirm', 'active'] as const;

describe('ledger gaps148–160: input.float range/options qualifiers', () => {
  for (const overload of ['range', 'options'] as const) {
    for (const option of options) {
      for (const [qualifier, text, boolean] of levels) {
        const accepted = qualifier === 'const' || (option === 'active' && qualifier === 'input');
        it(`${overload} ${option} ${accepted ? 'accepts' : 'rejects'} ${qualifier}`, () => {
          const expression = option === 'confirm' || option === 'active' ? boolean : text;
          const selector = overload === 'range' ? 'minval=0.5, maxval=3.0, step=0.5' : 'options=[1.0, 2.0, 3.0]';
          const result = checkProgram(parse(`//@version=6\nindicator("Float input metadata")\nmetadata = ${expression}\nvalue = input.float(2.0, ${selector}, ${option}=metadata)\nplot(value)`));
          const errors = result.diagnostics.filter((d) => d.severity === 'error');
          if (accepted) expect(errors).toEqual([]);
          else expect(errors).toEqual([
            expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining(`Cannot pass ${qualifier} value to ${option === 'active' ? 'input' : 'const'} parameter '${option}'`) }),
          ]);
          expect(result.symbols.find((s) => s.name === 'value')?.type).toMatchObject({ kind: 'float', qualifier: 'input' });
        });
      }
    }
  }

  it('rank148 binds options/range overloads and preserves selected values and metadata', () => {
    const ast = parse('//@version=6\nindicator("Float input overloads")\nranged = input.float(2.0, "Range", 0.5, 3.0, 0.5, "Range help")\nselected = input.float(2.0, "Options", [1.0, 2.0, 3.0], "Options help")\nplot(ranged)\nplot(selected)');
    expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const bars = [{ time: 0, open: 4, high: 5, low: 3, close: 4, volume: 1 }];
    const defaults = executeScript(ast, bars);
    expect(defaults.plots.map((p) => p.values)).toEqual([[2], [2]]);
    const overrides = new Map(defaults.inputs.map((input) => [input.id, input.title === 'Range' ? 1.5 : 3]));
    const result = executeScript(ast, bars, overrides);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((p) => p.values)).toEqual([[1.5], [3]]);
    expect(result.inputs).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Range', minval: 0.5, maxval: 3, step: 0.5, tooltip: 'Range help' }),
      expect.objectContaining({ title: 'Options', options: [1, 2, 3], tooltip: 'Options help' }),
    ]));
  });

  it('rank148 rejects options combined with a range parameter', () => {
    const result = checkProgram(parse('//@version=6\nindicator("Mixed float overloads")\nvalue = input.float(2.0, options=[1.0, 2.0], minval=0.5)'));
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-overload' }),
    ]));
  });
});
