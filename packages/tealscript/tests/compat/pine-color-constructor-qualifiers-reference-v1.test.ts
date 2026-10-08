import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

type Qualifier = 'const' | 'input' | 'simple' | 'series';
interface ConstructorCase {
  member: string;
  name: string;
  qualifier: Qualifier;
  entry: number;
  declaration: string;
  call: string;
  channels: number[][];
}

const constructors = [
  {
    member: 'color.new',
    slots: ['color', 'transp'],
    values: ['#0A141E', '20'],
    entries: { const: 9, input: 11, simple: 12, series: 10 },
  },
  {
    member: 'color.rgb',
    slots: ['red', 'green', 'blue', 'transp'],
    values: ['10', '20', '30', '20'],
    entries: { const: 14, input: 15, simple: 16, series: 13 },
  },
];
const cases: ConstructorCase[] = [];
for (const constructor of constructors) {
  cases.push({
    member: constructor.member,
    name: 'all arguments const',
    qualifier: 'const',
    entry: constructor.entries.const,
    declaration: '',
    call: `${constructor.member}(${constructor.values.join(', ')})`,
    channels: [
      [10, 10, 10],
      [20, 20, 20],
      [30, 30, 30],
    ],
  });
  for (const qualifier of ['input', 'simple', 'series'] as const) {
    for (const [index, slot] of constructor.slots.entries()) {
      const value = constructor.values[index];
      const kind = slot === 'color' ? 'color' : 'int';
      const expression =
        qualifier === 'input'
          ? `input.${kind}(${value})`
          : qualifier === 'simple'
            ? value
            : slot === 'color'
              ? 'bar_index == 1 ? #28323C : #0A141E'
              : `${value} + bar_index`;
      const values = constructor.values.map((argument, argumentIndex) =>
        argumentIndex === index ? 'promoted' : argument,
      );
      const call = `${constructor.member}(${values
        .map((argument, argumentIndex) => `${constructor.slots[argumentIndex]}=${argument}`)
        .reverse()
        .join(', ')})`;
      const channels = [
        [10, 10, 10],
        [20, 20, 20],
        [30, 30, 30],
      ];
      if (qualifier === 'series' && slot === 'color') {
        channels[0] = [10, 40, 10];
        channels[1] = [20, 50, 20];
        channels[2] = [30, 60, 30];
      } else if (qualifier === 'series' && index < 3 && constructor.member === 'color.rgb') {
        const initial = Number(value);
        channels[index] = [initial, initial + 1, initial + 2];
      }
      cases.push({
        member: constructor.member,
        name: `${slot} alone is ${qualifier}`,
        qualifier,
        entry: constructor.entries[qualifier],
        declaration: `${qualifier} ${kind} promoted = ${expression}`,
        call,
        channels,
      });
    }
  }
}

for (const testCase of cases) {
  describe(`${testCase.member}: ${testCase.name} [functions:${testCase.entry}]`, () => {
    const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_${testCase.member}`;
    let checked: ReturnType<typeof checkProgram>;
    let channels: Array<Array<number | null>>;
    beforeAll(() => {
      const source = `//@version=6
indicator("Color constructor qualifiers")
${testCase.declaration}
constructed = ${testCase.call}
alias = constructed
plot(color.r(alias), "red")
plot(color.g(alias), "green")
plot(color.b(alias), "blue")`;
      checked = checkProgram(parse(source));
      expect(checked.diagnostics, citation).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors, citation).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
      channels = ['red', 'green', 'blue'].map((name) => {
        const values = getPlot(result, name).values;
        expect(values, citation).toHaveLength(3);
        return values;
      });
    });
    it('returns the documented color qualifier, preserves its alias and usable channels', () => {
      for (const name of ['constructed', 'alias']) {
        expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
          kind: 'color',
          qualifier: testCase.qualifier,
        });
      }
      expect(channels, citation).toEqual(testCase.channels);
    });
  });
}
