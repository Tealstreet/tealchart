import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const sourceFor = (kind: string, qualifier: string) => {
  if (kind === 'color') return { const: '#224466', input: 'input.color(#224466)', simple: 'chart.fg_color', series: 'close > open ? #224466 : color(na)' }[qualifier];
  if (kind === 'int') return { const: '4', input: 'input.int(4)', simple: 'syminfo.minmove', series: 'bar_index' }[qualifier];
  return { const: '4.5', input: 'input.float(4.5)', simple: 'syminfo.mintick', series: 'close' }[qualifier];
};

// Ranks126–143 correspond to source/replacement/result for all six nz overloads.
describe('ledger nz documented source/replacement/result overloads', () => {
  for (const kind of ['int', 'float', 'color']) {
    for (const source of ['const', 'input', 'simple', 'series']) {
      for (const replacement of ['const', 'input', 'simple', 'series']) {
        it(`${kind} source=${source} replacement=${replacement} selects simple/series overload`, () => {
          const result = checkProgram(parse(`//@version=6\nindicator("nz overload")\nsrc = ${sourceFor(kind, source)}\nrepl = ${sourceFor(kind, replacement)}\nvalue = nz(source=src, replacement=repl)`));
          expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
          const types = new Map(result.symbols.map((s) => [s.name, s.type]));
          expect(types.get('src')).toMatchObject({ kind, qualifier: source });
          expect(types.get('repl')).toMatchObject({ kind, qualifier: replacement });
          expect(types.get('value')).toMatchObject({ kind, qualifier: source === 'series' || replacement === 'series' ? 'series' : 'simple' });
        });
      }
    }
  }

  it('promotes mixed int/float arguments to the float overload', () => {
    const result = checkProgram(parse('//@version=6\nindicator("nz promotion")\na = nz(1, 2.5)\nb = nz(close, bar_index)'));
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.symbols.find((s) => s.name === 'a')?.type).toMatchObject({ kind: 'float', qualifier: 'simple' });
    expect(result.symbols.find((s) => s.name === 'b')?.type).toMatchObject({ kind: 'float', qualifier: 'series' });
  });

  it.each(['nz("ready", "fallback")', 'nz(array.new<float>(1), 1.0)', 'nz(#224466, 1)', 'nz(1, #224466)'])('rejects missing overload for %s', (expression) => {
    const result = checkProgram(parse(`//@version=6\nindicator("nz invalid overload")\nvalue = ${expression}`));
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('nz') }),
    ]));
  });
});
