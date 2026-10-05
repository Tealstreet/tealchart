import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const contracts = [
  {
    rank: 1485,
    name: 'title',
    qualifier: 'const',
    boundary: '"Bars"',
    next: 'input.string("Bars")',
    series: 'str.tostring(bar_index)',
  },
  {
    rank: 1486,
    name: 'editable',
    qualifier: 'input',
    boundary: 'input.bool(true)',
    next: 'simple bool strong = true',
    series: 'close > open',
  },
  {
    rank: 1487,
    name: 'show_last',
    qualifier: 'input',
    boundary: 'input.int(2)',
    next: 'simple int strong = 2',
    series: 'bar_index',
  },
  {
    rank: 1488,
    name: 'precision',
    qualifier: 'input',
    boundary: 'input.int(2)',
    next: 'simple int strong = 2',
    series: 'bar_index',
  },
  {
    rank: 1489,
    name: 'force_overlay',
    qualifier: 'const',
    boundary: 'true',
    next: 'input.bool(true)',
    series: 'close > open',
  },
] as const;

function errors(setup: string, name: string, value: string) {
  return checkProgram(
    parse(`//@version=6\nindicator("Plotbar metadata")\n${setup}\nplotbar(open, high, low, close, ${name}=${value})`),
  ).diagnostics.filter((d) => d.severity === 'error');
}

for (const contract of contracts) {
  describe(`ledger ${contract.rank}: plotbar ${contract.name}`, () => {
    it('refuses the next stronger same-kind qualifier', () => {
      const setup = contract.next.startsWith('simple') ? contract.next : `strong = ${contract.next}`;
      const actual = errors(setup, contract.name, 'strong');
      expect(actual).toHaveLength(1);
      expect(actual[0].message).toContain(contract.name);
      expect(actual[0].message).toContain(contract.qualifier);
    });

    it('refuses series metadata independently', () => {
      const actual = errors(`strong = ${contract.series}`, contract.name, 'strong');
      expect(actual).toHaveLength(1);
      expect(actual[0].message).toContain(contract.name);
      expect(actual[0].message).toContain(contract.qualifier);
    });

    it('admits the declared boundary', () => {
      expect(errors(`boundary = ${contract.boundary}`, contract.name, 'boundary')).toEqual([]);
    });
  });
}

describe('ledger 305: hline level and color cannot vary per bar', () => {
  for (const [name, value, boundary] of [
    ['price', 'close', 'input.float(2)'],
    ['color', 'close > open ? color.red : color.blue', 'color.red'],
  ]) {
    it(`refuses series ${name}`, () => {
      const actual = checkProgram(
        parse(`//@version=6\nindicator("Levels")\nhline(${name === 'price' ? value : `2, color=${value}`})`),
      ).diagnostics.filter((d) => d.severity === 'error');
      expect(actual).toHaveLength(1);
      expect(actual[0].message).toContain(name);
      expect(actual[0].message).toContain('input');
    });

    it(`admits a fixed ${name}`, () => {
      const actual = checkProgram(
        parse(`//@version=6\nindicator("Levels")\nhline(${name === 'price' ? boundary : `2, color=${boundary}`})`),
      ).diagnostics.filter((d) => d.severity === 'error');
      expect(actual).toEqual([]);
    });
  }
});
