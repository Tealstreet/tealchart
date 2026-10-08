import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Authority: Pine v6 functions[1..8], [56..59], typed display parameters.
const contracts = [
  { name: 'plot', entry: 1, defaults: { series: '2' } },
  { name: 'plotshape', entry: 2, defaults: { series: 'true' } },
  { name: 'plotchar', entry: 3, defaults: { series: 'true' } },
  { name: 'plotarrow', entry: 4, defaults: { series: '-2' } },
  { name: 'plotbar', entry: 5, defaults: { open: '2', high: '4', low: '-3', close: '1' } },
  { name: 'plotcandle', entry: 6, defaults: { open: '2', high: '4', low: '-3', close: '1' } },
  { name: 'barcolor', entry: 7, defaults: { color: '#123456' } },
  { name: 'bgcolor', entry: 8, defaults: { color: '#123456' } },
  { name: 'hline', entry: 56, defaults: { price: '-3' } },
  { name: 'fill', entry: 57, defaults: { plot1: 'p', plot2: 'q', top_value: '2', bottom_value: '-3', top_color: '#123456', bottom_color: '#654321' } },
  { name: 'fill', entry: 58, defaults: { hline1: 'h', hline2: 'i', color: '#123456' } },
  { name: 'fill', entry: 59, defaults: { plot1: 'p', plot2: 'q', color: '#123456' } },
] as const;

function errors(name: string, defaults: Record<string, string>, value: string, declaration = '') {
  const args = [`display=${value}`, ...Object.entries(defaults).map(([key, expression]) => `${key}=${expression}`)];
  return checkProgram(parse(`//@version=6
indicator("Display visual kinds")
p = plot(2)
q = plot(-3)
h = hline(2)
i = hline(-3)
${declaration}
${name}(${args.join(', ')})`)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

const typeMismatch = expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]);

describe('documented visual display argument kinds', () => {
  for (const contract of contracts) {
    it(`${contract.name}:display accepts all/none constants, rejects quoted names [functions[${contract.entry}]]`, () => {
      for (const value of ['display.all', 'display.none']) {
        expect(errors(contract.name, contract.defaults, value), value).toEqual([]);
      }
      for (const value of ['"none"', '"display.all"']) {
        expect(errors(contract.name, contract.defaults, value), value).toEqual(typeMismatch);
      }
    });

    // Unrelated kinds are invalid independently of display numeric encodings.
    it(`visual-display-argument-kind: ${contract.name}:display rejects unrelated kinds [functions[${contract.entry}]]`, () => {
      for (const value of ['false', '#123456', 'array.from(1)', 'p', 'h']) {
        expect(errors(contract.name, contract.defaults, value), value).toEqual(typeMismatch);
      }
    });
  }

  it('checks inferred display kinds and keeps named-mask arithmetic accepted', () => {
    for (const contract of contracts) {
      for (const declaration of ['bool value = false', 'color value = #123456', 'string value = "none"', 'value = array.from(1)']) {
        expect(errors(contract.name, contract.defaults, 'value', declaration)).toEqual(typeMismatch);
      }
      expect(errors(contract.name, contract.defaults, 'value', 'value = display.none')).toEqual([]);
    }
    expect(errors('plot', { series: '2' }, 'value', 'value = display.all - display.status_line')).toEqual([]);
  });

  it('does not impose builtin display kinds on a user callable', () => {
    const source = `//@version=6
indicator("Custom display")
fill(display) => display
result = fill(display=false)`;
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });
});
