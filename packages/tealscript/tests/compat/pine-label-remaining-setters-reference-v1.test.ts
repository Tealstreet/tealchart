import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const contracts = [
  { member: 'set_x', parameter: 'x', field: 'x', kind: 'int', first: '7', second: '13', expected: [7, 13] },
  { member: 'set_y', parameter: 'y', field: 'y', kind: 'int', first: '-12', second: '34', expected: [-12, 34] },
  {
    member: 'set_y',
    parameter: 'y',
    field: 'y',
    kind: 'float',
    first: '-12.25',
    second: '34.75',
    expected: [-12.25, 34.75],
  },
  { member: 'set_xy', parameter: 'x', field: 'x', kind: 'int', first: '7', second: '13', expected: [7, 13] },
  { member: 'set_xy', parameter: 'y', field: 'y', kind: 'int', first: '-12', second: '34', expected: [-12, 34] },
  {
    member: 'set_xy',
    parameter: 'y',
    field: 'y',
    kind: 'float',
    first: '-12.25',
    second: '34.75',
    expected: [-12.25, 34.75],
  },
  { member: 'set_xloc', parameter: 'x', field: 'x', kind: 'int', first: '7', second: '13', expected: [7, 13] },
  {
    member: 'set_xloc',
    parameter: 'xloc',
    field: 'xloc',
    kind: 'string',
    first: 'xloc.bar_time',
    second: 'xloc.bar_index',
    expected: ['bar_time', 'bar_index'],
  },
  {
    member: 'set_yloc',
    parameter: 'yloc',
    field: 'yloc',
    kind: 'string',
    first: 'yloc.abovebar',
    second: 'yloc.belowbar',
    expected: ['abovebar', 'belowbar'],
  },
  {
    member: 'set_style',
    parameter: 'style',
    field: 'style',
    kind: 'string',
    first: 'label.style_label_up',
    second: 'label.style_label_left',
    expected: ['label_up', 'label_left'],
  },
  {
    member: 'set_size',
    parameter: 'size',
    field: 'size',
    kind: 'int',
    first: '12',
    second: '18',
    expected: ['12', '18'],
  },
  {
    member: 'set_size',
    parameter: 'size',
    field: 'size',
    kind: 'string',
    first: 'size.small',
    second: 'size.large',
    expected: ['small', 'large'],
  },
  {
    member: 'set_textalign',
    parameter: 'textalign',
    field: 'textAlign',
    kind: 'string',
    first: 'text.align_left',
    second: 'text.align_right',
    expected: ['left', 'right'],
  },
  {
    member: 'set_text_font_family',
    parameter: 'text_font_family',
    field: 'textFontFamily',
    kind: 'string',
    first: 'font.family_monospace',
    second: 'font.family_default',
    expected: ['monospace', 'default'],
  },
  {
    member: 'set_text_formatting',
    parameter: 'text_formatting',
    field: 'textFormatting',
    kind: 'text_format',
    first: 'text.format_bold',
    second: 'text.format_italic',
    expected: ['bold', 'italic'],
  },
] as const;
const bindings = ['namespace-positional', 'namespace-named', 'method-positional', 'method-named'] as const;
type Binding = (typeof bindings)[number];

function call(member: string, parameter: string, argument: string, binding: Binding): string {
  const values: Record<string, string> =
    member === 'set_xy'
      ? { x: '41', y: '43' }
      : member === 'set_xloc'
        ? { x: '41', xloc: 'xloc.bar_index' }
        : { [parameter]: argument };
  values[parameter] = argument;
  if (binding === 'namespace-positional') return `label.${member}(id, ${Object.values(values).join(', ')})`;
  if (binding === 'namespace-named')
    return `label.${member}(${Object.entries(values)
      .reverse()
      .map(([key, value]) => `${key}=${value}`)
      .join(', ')}, id=id)`;
  if (binding === 'method-positional') return `id.${member}(${Object.values(values).join(', ')})`;
  return `id.${member}(${Object.entries(values)
    .reverse()
    .map(([key, value]) => `${key}=${value}`)
    .join(', ')})`;
}

function run(source: string, kind: string, qualifier: string, citation: string) {
  const checked = checkProgram(parse(source));
  expect(checked.diagnostics, citation).toEqual([]);
  expect(checked.symbols.find((symbol) => symbol.name === 'operand')?.type, citation).toMatchObject({
    kind,
    qualifier,
  });
  const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
  expect(result.errors, citation).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
  const labels = result.drawings.filter((drawing) => drawing.type === 'label');
  expect(labels, citation).toHaveLength(3);
  return labels;
}

function refuse(source: string, member: string, citation: string): void {
  expect(
    checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    citation,
  ).toEqual(expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining(`label.${member}`) })]));
}

for (const contract of contracts)
  for (const binding of bindings) {
    const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_label.${contract.member}`;
    describe(`label.${contract.member} ${contract.parameter} ${contract.kind} ${binding}`, () => {
      for (const qualifier of ['const', 'input', 'simple', 'series']) {
        it(`uses ${qualifier} operand at its documented field`, () => {
          const declaration =
            qualifier === 'input'
              ? contract.kind === 'text_format'
                ? `input text_format operand = input.bool(true) ? ${contract.first} : ${contract.second}`
                : `operand = input.${contract.kind}(${contract.first})`
              : `${qualifier} ${contract.kind} operand = ${qualifier === 'series' ? `bar_index == 1 ? ${contract.second} : ${contract.first}` : contract.first}`;
          const labels = run(
            `//@version=6
indicator("Label setter operands")
${declaration}
id = label.new(0,100)
${call(contract.member, contract.parameter, 'operand', binding)}`,
            contract.kind === 'text_format' ? 'udt' : contract.kind,
            qualifier,
            citation,
          );
          for (const [index, label] of labels.entries()) {
            const expected: Record<string, unknown> = {};
            if (['set_x', 'set_y', 'set_xy', 'set_xloc'].includes(contract.member)) {
              expected.x = contract.member === 'set_xy' || contract.member === 'set_xloc' ? 41 : 0;
              expected.y = contract.member === 'set_xy' ? 43 : 100;
              expected.xloc = 'bar_index';
            }
            expected[contract.field] = contract.expected[qualifier === 'series' && index === 1 ? 1 : 0];
            expect(label, citation).toMatchObject(expected);
          }
        });
      }
      const invalid =
        contract.kind === 'int' && contract.parameter !== 'y'
          ? ['true', '1.5']
          : contract.kind === 'text_format'
            ? ['"bold"']
            : ['true'];
      for (const argument of invalid) {
        it(`refuses ${argument} outside the documented kind`, () => {
          refuse(
            `//@version=6
indicator("Label setter kind")
id = label.new(0,100)
${call(contract.member, contract.parameter, argument, binding)}`,
            contract.member,
            citation,
          );
        });
      }
    });
  }

for (const binding of bindings) {
  const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_label.set_point';
  describe(`label.set_point ${binding} series point`, () => {
    for (const mode of ['bar_index', 'bar_time']) {
      it(`uses changing point ${mode} coordinates and price`, () => {
        const labels = run(
          `//@version=6
indicator("Label point setter")
operand = chart.point.new(1000 + bar_index, 7 + bar_index, 12.25 + bar_index)
id = label.new(0,100,xloc=xloc.${mode})
${call('set_point', 'point', 'operand', binding)}`,
          'chart.point',
          'series',
          citation,
        );
        expect(
          labels.map((label) => ({ x: label.x, y: label.y, xloc: label.xloc })),
          citation,
        ).toEqual(
          [0, 1, 2].map((index) => ({ x: (mode === 'bar_index' ? 7 : 1000) + index, y: 12.25 + index, xloc: mode })),
        );
      });
    }
    for (const invalid of ['true', '1', '1.5', '"point"', 'id']) {
      it(`refuses ${invalid} outside chart.point`, () => {
        refuse(
          `//@version=6
indicator("Label point kind")
id = label.new(0,100)
${call('set_point', 'point', invalid, binding)}`,
          'set_point',
          citation,
        );
      });
    }
  });
}
