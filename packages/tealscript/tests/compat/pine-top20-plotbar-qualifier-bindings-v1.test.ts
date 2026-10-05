import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const qualifiers = ['const', 'input', 'simple', 'series'] as const;
const parameters = [
  'open',
  'high',
  'low',
  'close',
  'title',
  'color',
  'editable',
  'show_last',
  'display',
  'format',
  'precision',
  'force_overlay',
] as const;
const defaults = [
  'open',
  'high',
  'low',
  'close',
  '"Bars"',
  'color.red',
  'true',
  '2',
  'display.all',
  'format.price',
  '2',
  'false',
] as const;
const contracts = [
  { rank: 1485, name: 'title', kind: 'string', ceiling: 'const', literal: '"Bars"', series: 'str.tostring(bar_index)' },
  { rank: 1486, name: 'editable', kind: 'bool', ceiling: 'input', literal: 'true', series: 'close > open' },
  { rank: 1487, name: 'show_last', kind: 'int', ceiling: 'input', literal: '2', series: 'bar_index' },
  { rank: 1488, name: 'precision', kind: 'int', ceiling: 'input', literal: '2', series: 'bar_index' },
  { rank: 1489, name: 'force_overlay', kind: 'bool', ceiling: 'const', literal: 'true', series: 'close > open' },
] as const;

function setup(contract: (typeof contracts)[number], qualifier: (typeof qualifiers)[number]) {
  if (qualifier === 'input') return `meta = input.${contract.kind}(${contract.literal})`;
  if (qualifier === 'series') return `${contract.kind} meta = ${contract.series}`;
  return `${qualifier} ${contract.kind} meta = ${contract.literal}`;
}

function errors(declaration: string, args: string) {
  const source = `//@version=6\nindicator("Plotbar qualifier slots")\n${declaration}\nplotbar(${args})`;
  return checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
}

for (const contract of contracts) {
  describe(`reference plotbar metadata bindings: ledger ${contract.rank} ${contract.name}`, () => {
    const index = parameters.indexOf(contract.name);
    for (const qualifier of qualifiers) {
      it(`positional ${qualifier}`, () => {
        const args = [...defaults.slice(0, index), 'meta'].join(', ');
        const actual = errors(setup(contract, qualifier), args);
        const accepted = qualifier === 'const' || (contract.ceiling === 'input' && qualifier === 'input');
        if (accepted) {
          expect(actual).toEqual([]);
        } else {
          expect(actual).toHaveLength(1);
          expect(actual[0].code).toBe('qualifier-mismatch');
          expect(actual[0].message).toContain('plotbar');
          expect(actual[0].message).toContain(contract.name);
          expect(actual[0].message).toContain(contract.ceiling);
        }
      });
    }
    if (contract.ceiling === 'const') {
      it('named simple refusal', () => {
        const actual = errors(setup(contract, 'simple'), `open, high, low, close, ${contract.name}=meta`);
        expect(actual).toHaveLength(1);
        expect(actual[0].code).toBe('qualifier-mismatch');
        expect(actual[0].message).toContain('plotbar');
        expect(actual[0].message).toContain(contract.name);
        expect(actual[0].message).toContain('const');
      });
    } else {
      it('named weaker const acceptance', () => {
        expect(errors(setup(contract, 'const'), `open, high, low, close, ${contract.name}=meta`)).toEqual([]);
      });
    }
  });
}
