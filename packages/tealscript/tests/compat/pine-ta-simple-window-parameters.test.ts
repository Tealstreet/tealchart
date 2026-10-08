import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Authority: Pine v6 ta.alma offset/sigma/floor and ta.bb/ta.bbw mult types.
const slots = [
  ['alma', 'offset', 'close', '0.65'],
  ['alma', 'sigma', 'close', '3.0'],
  ['alma', 'floor', 'close > open', 'false'],
  ['bb', 'mult', 'close', '2.0'],
  ['bbw', 'mult', 'close', '2.0'],
] as const;

function source(name: string, param: string, declaration: string, named: boolean): string {
  const args = name === 'alma' ? { series: 'close', length: 'bar_index % 2 + 2', offset: '0.65', sigma: '3', floor: 'false' }
    : { series: 'close', length: 'bar_index % 2 + 2', mult: '2' };
  const entries = Object.entries(args).map(([key, value]) => [key, key === param ? 'argument' : value]);
  const expression = `ta.${name}(${entries.map(([key, value]) => named ? `${key}=${value}` : value).join(', ')})`;
  const binding = name === 'bb' ? `[m, u, l] = ${expression}` : `value = ${expression}`;
  return `//@version=6\nindicator("Simple parameters")\n${declaration}\n${binding}`;
}

describe('Window tuning parameters require simple or weaker values', () => {
  for (const [name, param, series, literal] of slots) {
    for (const named of [false, true]) {
      it(`refuses series ${name}.${param} in ${named ? 'named' : 'positional'} calls`, () => {
        const checked = checkProgram(parse(source(name, param, `argument = ${series}`, named)));
        expect(checked.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining(`parameter '${param}'`) })]));
      });
      for (const qualifier of ['const', 'input', 'simple'] as const) {
        it(`admits ${qualifier} ${name}.${param} with series source/length`, () => {
          const type = param === 'floor' ? 'bool' : 'float';
          const declaration = qualifier === 'input' ? `argument = input.${type}(${literal})` : `${qualifier} ${type} argument = ${literal}`;
          expect(checkProgram(parse(source(name, param, declaration, named))).diagnostics).toEqual([]);
        });
      }
    }
  }
});
