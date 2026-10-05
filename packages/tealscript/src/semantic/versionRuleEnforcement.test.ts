import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { executeScript } from '../runtime/compiledOnly';
import { checkProgram } from './checker';

// Authority: v6 migration guide, Boolean values cannot be na; v5 UDF syntax
// and methods examples permit typed defaults. These assert checker contracts.
describe('boolean na version enforcement', () => {
  it.each([3, 4, 5])('accepts nullable bool defaults and arguments in v%i', (version) => {
    const ast = parse(`//@version=${version}
${version < 5 ? 'study' : 'indicator'}("Nullable defaults")
enabled(bool flag=na) => flag ? 1 : 0
bool state = na
state := na
plot(enabled() + enabled(na) + enabled(flag=na))
`);
    expect(checkProgram(ast).diagnostics).toEqual([]);
    expect(executeScript(ast, [{ time: 1700000000000, open: 10, high: 12, low: 9, close: 11, volume: 100 }]).errors).toEqual([]);
  });

  it('accepts nullable bool method defaults and arguments in v5', () => {
    const ast = parse(`//@version=5
indicator("Nullable methods")
method score(float this, bool flag=na) => flag ? this : 0
plot(close.score() + close.score(na) + close.score(flag=na))
`);
    expect(checkProgram(ast).diagnostics).toEqual([]);
  });

  it('rejects v6 bool na initializers, defaults and arguments with honest guidance', () => {
    const ast = parse(`//@version=6
indicator("Two bool states")
bool state = na
enabled(bool flag=na) => flag ? 1 : 0
plot(enabled(na))
`);
    const diagnostics = checkProgram(ast).diagnostics;
    expect(diagnostics).toHaveLength(3);
    for (const diagnostic of diagnostics) {
      expect(diagnostic.code).toBe('type-mismatch');
      expect(diagnostic.message).toContain('Pine v6 does not allow boolean na values');
      expect(diagnostic.message).not.toContain('explicitly nullable');
      expect(diagnostic.message).toContain('false');
    }
  });

  it('preserves explicit casts and numeric na helpers in v6', () => {
    const ast = parse(`//@version=6
indicator("Explicit casts")
bool state = bool(na)
plot((state ? 1 : 0) + nz(close) + fixnan(close) + (na(close) ? 1 : 0))
`);
    expect(checkProgram(ast).diagnostics).toEqual([]);
  });
});

// Authority: v6 migration guide, Minimum linewidth is 1 (including input.int(0)).
describe('visual linewidth version enforcement', () => {
  it.each([
    'input.int(0)',
    'input.int(defval=0)',
    'input(0)',
    'width',
    'alias',
    '-width',
  ])('rejects a known zero input width in v6: %s', (value) => {
    const result = checkProgram(parse(`//@version=6
indicator("Input width")
int width = input.int(0)
alias = width
plot(close, linewidth=${value})
hline(10, linewidth=${value})
`));
    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      expect.stringContaining('plot linewidth must be at least 1 in Pine v6'),
      expect.stringContaining('hline linewidth must be at least 1 in Pine v6'),
    ]);
  });

  it.each([5, 6])('accepts positive aliased input widths in v%i', (version) => {
    expect(checkProgram(parse(`//@version=${version}
indicator("Valid width")
width = input.int(2, minval=1)
plot(close, linewidth=width)
hline(10, linewidth=width)
`)).diagnostics).toEqual([]);
  });

  it('keeps zero input width valid in v5', () => {
    expect(checkProgram(parse(`//@version=5
indicator("Legacy width")
width = input.int(0)
plot(close, linewidth=width)
hline(10, linewidth=width)
`)).diagnostics).toEqual([]);
  });

  it('does not extend the existing v5 refusal to negative input defaults', () => {
    expect(checkProgram(parse(`//@version=5
indicator("Legacy negative input width")
width = input.int(-5)
plot(close, linewidth=width)
hline(10, linewidth=width)
`)).diagnostics).toEqual([]);
  });

  it('checks the reassigned width qualifier without reusing its initial zero value', () => {
    // The verified v6 visual contract requires input linewidth. Reassignment
    // makes width series; its initializer must not add a literal-width error.
    const diagnostics = checkProgram(parse(`//@version=6
indicator("Reassigned width")
width = input.int(0)
width := 2
plot(close, linewidth=width)
`)).diagnostics;
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining("input parameter 'linewidth'") }),
    ]);
  });
});

// Authority: v5 migration guide, parameters requiring built-in arguments.
describe('visual unique parameter version enforcement', () => {
  it.each([5, 6])('rejects non-string raw plot/hline constants in v%i', (version) => {
    const diagnostics = checkProgram(parse(`//@version=${version}
indicator("Named styles")
raw = input.int(1)
plot(close, style=1)
plot(close, style=true)
plot(close, style=raw)
plot(close, "Positional", color.red, 1, 1)
hline(10, linestyle=1)
hline(20, "Positional", color.red, 1)
`)).diagnostics;
    expect(diagnostics).toHaveLength(12);
    expect(diagnostics.every((diagnostic) => diagnostic.code === 'type-mismatch')).toBe(true);
    expect(diagnostics.filter((diagnostic) => diagnostic.message.includes('must use a named')).map((diagnostic) => diagnostic.message)).toEqual([
      ...Array(4).fill(expect.stringContaining('plot style must use a named plot.style_')),
      ...Array(2).fill(expect.stringContaining('hline linestyle must use a named hline.style_')),
    ]);
  });

  it('retains raw integer styles in v4', () => {
    expect(checkProgram(parse(`//@version=4
study("Legacy styles")
plot(close, style=1)
hline(10, linestyle=1)
`)).diagnostics).toEqual([]);
  });

  it.each([5, 6])('accepts named constants and input-selected style aliases in v%i', (version) => {
    expect(checkProgram(parse(`//@version=${version}
indicator("Chosen styles")
choice = input.bool(true)
style = choice ? plot.style_line : plot.style_histogram
plot(close, style=style)
plot(close, linestyle=plot.linestyle_dashed)
hline(10, linestyle=hline.style_dotted)
`)).diagnostics).toEqual([]);
  });
});
