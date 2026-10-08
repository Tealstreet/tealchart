import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, runCompatScript } from './fixtures';

interface OperandContract {
  call: string;
  parameter: string;
  kind: string;
  field: string;
  first: string;
  second: string;
  expectedFirst: string | number;
  expectedSecond: string | number;
  entry: number;
  extra?: Record<string, string>;
  overload?: string;
}

const contracts: readonly OperandContract[] = [
  {
    call: 'box.set_left',
    parameter: 'left',
    kind: 'int',
    field: 'left',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 864,
    extra: {
      top: '40',
      bottom: '10',
      left: '0',
      right: '5',
      xloc: 'xloc.bar_index',
    },
  },
  {
    call: 'box.set_right',
    parameter: 'right',
    kind: 'int',
    field: 'right',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 866,
    extra: {
      top: '40',
      bottom: '10',
      left: '0',
      right: '5',
      xloc: 'xloc.bar_index',
    },
  },
  {
    call: 'box.set_lefttop',
    parameter: 'left',
    kind: 'int',
    field: 'left',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 865,
    extra: {
      top: '40',
      bottom: '10',
      left: '0',
      right: '5',
      xloc: 'xloc.bar_index',
    },
  },
  {
    call: 'box.set_rightbottom',
    parameter: 'right',
    kind: 'int',
    field: 'right',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 867,
    extra: {
      top: '40',
      bottom: '10',
      left: '0',
      right: '5',
      xloc: 'xloc.bar_index',
    },
  },
  {
    call: 'box.set_xloc',
    parameter: 'left',
    kind: 'int',
    field: 'left',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 875,
    extra: {
      top: '40',
      bottom: '10',
      left: '0',
      right: '5',
      xloc: 'xloc.bar_index',
    },
  },
  {
    call: 'box.set_xloc',
    parameter: 'right',
    kind: 'int',
    field: 'right',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 875,
    extra: {
      top: '40',
      bottom: '10',
      left: '0',
      right: '5',
      xloc: 'xloc.bar_index',
    },
  },
  {
    call: 'box.set_top',
    parameter: 'top',
    kind: 'int',
    field: 'top',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 868,
    extra: {
      left: '0',
      right: '5',
    },
  },
  {
    call: 'box.set_top',
    parameter: 'top',
    kind: 'float',
    field: 'top',
    first: '12.25',
    second: '34.75',
    expectedFirst: 12.25,
    expectedSecond: 34.75,
    entry: 868,
    extra: {
      left: '0',
      right: '5',
    },
  },
  {
    call: 'box.set_bottom',
    parameter: 'bottom',
    kind: 'int',
    field: 'bottom',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 869,
    extra: {
      left: '0',
      right: '5',
    },
  },
  {
    call: 'box.set_bottom',
    parameter: 'bottom',
    kind: 'float',
    field: 'bottom',
    first: '12.25',
    second: '34.75',
    expectedFirst: 12.25,
    expectedSecond: 34.75,
    entry: 869,
    extra: {
      left: '0',
      right: '5',
    },
  },
  {
    call: 'box.set_lefttop',
    parameter: 'top',
    kind: 'int',
    field: 'top',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 865,
    extra: {
      left: '0',
      right: '5',
    },
  },
  {
    call: 'box.set_lefttop',
    parameter: 'top',
    kind: 'float',
    field: 'top',
    first: '12.25',
    second: '34.75',
    expectedFirst: 12.25,
    expectedSecond: 34.75,
    entry: 865,
    extra: {
      left: '0',
      right: '5',
    },
  },
  {
    call: 'box.set_rightbottom',
    parameter: 'bottom',
    kind: 'int',
    field: 'bottom',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 867,
    extra: {
      left: '0',
      right: '5',
    },
  },
  {
    call: 'box.set_rightbottom',
    parameter: 'bottom',
    kind: 'float',
    field: 'bottom',
    first: '12.25',
    second: '34.75',
    expectedFirst: 12.25,
    expectedSecond: 34.75,
    entry: 867,
    extra: {
      left: '0',
      right: '5',
    },
  },
  {
    call: 'box.set_border_color',
    parameter: 'color',
    kind: 'color',
    field: 'borderColor',
    first: '#123456',
    second: '#ABCDEF',
    expectedFirst: '#123456',
    expectedSecond: '#ABCDEF',
    entry: 870,
  },
  {
    call: 'box.set_bgcolor',
    parameter: 'color',
    kind: 'color',
    field: 'bgcolor',
    first: '#123456',
    second: '#ABCDEF',
    expectedFirst: '#123456',
    expectedSecond: '#ABCDEF',
    entry: 871,
  },
  {
    call: 'box.set_border_width',
    parameter: 'width',
    kind: 'int',
    field: 'borderWidth',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 872,
  },
  {
    call: 'box.set_border_style',
    parameter: 'style',
    kind: 'string',
    field: 'borderStyle',
    first: 'line.style_solid',
    second: 'line.style_dashed',
    expectedFirst: 'solid',
    expectedSecond: 'dashed',
    entry: 873,
  },
  {
    call: 'box.set_extend',
    parameter: 'extend',
    kind: 'string',
    field: 'extend',
    first: 'extend.none',
    second: 'extend.right',
    expectedFirst: 'none',
    expectedSecond: 'right',
    entry: 874,
  },
  {
    call: 'box.set_xloc',
    parameter: 'xloc',
    kind: 'string',
    field: 'xloc',
    first: 'xloc.bar_index',
    second: 'xloc.bar_time',
    expectedFirst: 'bar_index',
    expectedSecond: 'bar_time',
    entry: 875,
    extra: {
      left: '0',
      right: '5',
    },
  },
  {
    call: 'box.set_text_font_family',
    parameter: 'text_font_family',
    kind: 'string',
    field: 'textFontFamily',
    first: 'font.family_default',
    second: 'font.family_monospace',
    expectedFirst: 'default',
    expectedSecond: 'monospace',
    entry: 876,
  },
  {
    call: 'box.set_text_halign',
    parameter: 'text_halign',
    kind: 'string',
    field: 'textHalign',
    first: 'text.align_left',
    second: 'text.align_right',
    expectedFirst: 'left',
    expectedSecond: 'right',
    entry: 877,
  },
  {
    call: 'box.set_text_valign',
    parameter: 'text_valign',
    kind: 'string',
    field: 'textValign',
    first: 'text.align_top',
    second: 'text.align_bottom',
    expectedFirst: 'top',
    expectedSecond: 'bottom',
    entry: 878,
  },
  {
    call: 'box.set_text_size',
    parameter: 'text_size',
    kind: 'int',
    field: 'textSize',
    first: '1',
    second: '2',
    expectedFirst: '1',
    expectedSecond: '2',
    entry: 879,
  },
  {
    call: 'box.set_text_size',
    parameter: 'text_size',
    kind: 'string',
    field: 'textSize',
    first: 'size.small',
    second: 'size.large',
    expectedFirst: 'small',
    expectedSecond: 'large',
    entry: 879,
  },
  {
    call: 'box.set_text',
    parameter: 'text',
    kind: 'string',
    field: 'text',
    first: '"first"',
    second: '"second"',
    expectedFirst: 'first',
    expectedSecond: 'second',
    entry: 880,
  },
  {
    call: 'box.set_text_formatting',
    parameter: 'text_formatting',
    kind: 'text_format',
    field: 'textFormatting',
    first: 'text.format_bold',
    second: 'text.format_italic',
    expectedFirst: 'bold',
    expectedSecond: 'italic',
    entry: 881,
  },
  {
    call: 'box.set_text_color',
    parameter: 'text_color',
    kind: 'color',
    field: 'textColor',
    first: '#123456',
    second: '#ABCDEF',
    expectedFirst: '#123456',
    expectedSecond: '#ABCDEF',
    entry: 882,
  },
  {
    call: 'box.set_text_wrap',
    parameter: 'text_wrap',
    kind: 'string',
    field: 'textWrap',
    first: 'text.wrap_none',
    second: 'text.wrap_auto',
    expectedFirst: 'none',
    expectedSecond: 'auto',
    entry: 884,
  },
  {
    call: 'box.new',
    parameter: 'border_color',
    kind: 'color',
    field: 'borderColor',
    first: '#123456',
    second: '#ABCDEF',
    expectedFirst: '#123456',
    expectedSecond: '#ABCDEF',
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'border_width',
    kind: 'int',
    field: 'borderWidth',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'border_style',
    kind: 'string',
    field: 'borderStyle',
    first: 'line.style_solid',
    second: 'line.style_dashed',
    expectedFirst: 'solid',
    expectedSecond: 'dashed',
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'extend',
    kind: 'string',
    field: 'extend',
    first: 'extend.none',
    second: 'extend.right',
    expectedFirst: 'none',
    expectedSecond: 'right',
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'xloc',
    kind: 'string',
    field: 'xloc',
    first: 'xloc.bar_index',
    second: 'xloc.bar_time',
    expectedFirst: 'bar_index',
    expectedSecond: 'bar_time',
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'bgcolor',
    kind: 'color',
    field: 'bgcolor',
    first: '#123456',
    second: '#ABCDEF',
    expectedFirst: '#123456',
    expectedSecond: '#ABCDEF',
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'text',
    kind: 'string',
    field: 'text',
    first: '"first"',
    second: '"second"',
    expectedFirst: 'first',
    expectedSecond: 'second',
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'text_size',
    kind: 'int',
    field: 'textSize',
    first: '1',
    second: '2',
    expectedFirst: '1',
    expectedSecond: '2',
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'text_size',
    kind: 'string',
    field: 'textSize',
    first: 'size.small',
    second: 'size.large',
    expectedFirst: 'small',
    expectedSecond: 'large',
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'text_color',
    kind: 'color',
    field: 'textColor',
    first: '#123456',
    second: '#ABCDEF',
    expectedFirst: '#123456',
    expectedSecond: '#ABCDEF',
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'text_halign',
    kind: 'string',
    field: 'textHalign',
    first: 'text.align_left',
    second: 'text.align_right',
    expectedFirst: 'left',
    expectedSecond: 'right',
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'text_valign',
    kind: 'string',
    field: 'textValign',
    first: 'text.align_top',
    second: 'text.align_bottom',
    expectedFirst: 'top',
    expectedSecond: 'bottom',
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'text_wrap',
    kind: 'string',
    field: 'textWrap',
    first: 'text.wrap_none',
    second: 'text.wrap_auto',
    expectedFirst: 'none',
    expectedSecond: 'auto',
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'text_font_family',
    kind: 'string',
    field: 'textFontFamily',
    first: 'font.family_default',
    second: 'font.family_monospace',
    expectedFirst: 'default',
    expectedSecond: 'monospace',
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'text_formatting',
    kind: 'text_format',
    field: 'textFormatting',
    first: 'text.format_bold',
    second: 'text.format_italic',
    expectedFirst: 'bold',
    expectedSecond: 'italic',
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'left',
    kind: 'int',
    field: 'left',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'right',
    kind: 'int',
    field: 'right',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'top',
    kind: 'int',
    field: 'top',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'top',
    kind: 'float',
    field: 'top',
    first: '12.25',
    second: '34.75',
    expectedFirst: 12.25,
    expectedSecond: 34.75,
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'bottom',
    kind: 'int',
    field: 'bottom',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'bottom',
    kind: 'float',
    field: 'bottom',
    first: '12.25',
    second: '34.75',
    expectedFirst: 12.25,
    expectedSecond: 34.75,
    entry: 858,
    overload: 'coordinate',
  },
  {
    call: 'box.new',
    parameter: 'border_color',
    kind: 'color',
    field: 'borderColor',
    first: '#123456',
    second: '#ABCDEF',
    expectedFirst: '#123456',
    expectedSecond: '#ABCDEF',
    entry: 857,
    overload: 'point',
  },
  {
    call: 'box.new',
    parameter: 'border_width',
    kind: 'int',
    field: 'borderWidth',
    first: '1',
    second: '2',
    expectedFirst: 1,
    expectedSecond: 2,
    entry: 857,
    overload: 'point',
  },
  {
    call: 'box.new',
    parameter: 'border_style',
    kind: 'string',
    field: 'borderStyle',
    first: 'line.style_solid',
    second: 'line.style_dashed',
    expectedFirst: 'solid',
    expectedSecond: 'dashed',
    entry: 857,
    overload: 'point',
  },
  {
    call: 'box.new',
    parameter: 'extend',
    kind: 'string',
    field: 'extend',
    first: 'extend.none',
    second: 'extend.right',
    expectedFirst: 'none',
    expectedSecond: 'right',
    entry: 857,
    overload: 'point',
  },
  {
    call: 'box.new',
    parameter: 'xloc',
    kind: 'string',
    field: 'xloc',
    first: 'xloc.bar_index',
    second: 'xloc.bar_time',
    expectedFirst: 'bar_index',
    expectedSecond: 'bar_time',
    entry: 857,
    overload: 'point',
  },
  {
    call: 'box.new',
    parameter: 'bgcolor',
    kind: 'color',
    field: 'bgcolor',
    first: '#123456',
    second: '#ABCDEF',
    expectedFirst: '#123456',
    expectedSecond: '#ABCDEF',
    entry: 857,
    overload: 'point',
  },
  {
    call: 'box.new',
    parameter: 'text',
    kind: 'string',
    field: 'text',
    first: '"first"',
    second: '"second"',
    expectedFirst: 'first',
    expectedSecond: 'second',
    entry: 857,
    overload: 'point',
  },
  {
    call: 'box.new',
    parameter: 'text_size',
    kind: 'int',
    field: 'textSize',
    first: '1',
    second: '2',
    expectedFirst: '1',
    expectedSecond: '2',
    entry: 857,
    overload: 'point',
  },
  {
    call: 'box.new',
    parameter: 'text_size',
    kind: 'string',
    field: 'textSize',
    first: 'size.small',
    second: 'size.large',
    expectedFirst: 'small',
    expectedSecond: 'large',
    entry: 857,
    overload: 'point',
  },
  {
    call: 'box.new',
    parameter: 'text_color',
    kind: 'color',
    field: 'textColor',
    first: '#123456',
    second: '#ABCDEF',
    expectedFirst: '#123456',
    expectedSecond: '#ABCDEF',
    entry: 857,
    overload: 'point',
  },
  {
    call: 'box.new',
    parameter: 'text_halign',
    kind: 'string',
    field: 'textHalign',
    first: 'text.align_left',
    second: 'text.align_right',
    expectedFirst: 'left',
    expectedSecond: 'right',
    entry: 857,
    overload: 'point',
  },
  {
    call: 'box.new',
    parameter: 'text_valign',
    kind: 'string',
    field: 'textValign',
    first: 'text.align_top',
    second: 'text.align_bottom',
    expectedFirst: 'top',
    expectedSecond: 'bottom',
    entry: 857,
    overload: 'point',
  },
  {
    call: 'box.new',
    parameter: 'text_wrap',
    kind: 'string',
    field: 'textWrap',
    first: 'text.wrap_none',
    second: 'text.wrap_auto',
    expectedFirst: 'none',
    expectedSecond: 'auto',
    entry: 857,
    overload: 'point',
  },
  {
    call: 'box.new',
    parameter: 'text_font_family',
    kind: 'string',
    field: 'textFontFamily',
    first: 'font.family_default',
    second: 'font.family_monospace',
    expectedFirst: 'default',
    expectedSecond: 'monospace',
    entry: 857,
    overload: 'point',
  },
  {
    call: 'box.new',
    parameter: 'text_formatting',
    kind: 'text_format',
    field: 'textFormatting',
    first: 'text.format_bold',
    second: 'text.format_italic',
    expectedFirst: 'bold',
    expectedSecond: 'italic',
    entry: 857,
    overload: 'point',
  },
];

const defaults: Record<string, string> = { left: '0', top: '40', right: '5', bottom: '10' };
const pointDefaults = { top_left: 'chart.point.new(time, 0, 40)', bottom_right: 'chart.point.new(time, 5, 10)' };

function declaration(contract: OperandContract, qualifier: string): string {
  if (qualifier === 'input') {
    const input =
      contract.kind === 'text_format'
        ? `input.bool(true) ? ${contract.first} : ${contract.second}`
        : `input.${contract.kind}(${contract.first})`;
    return `${contract.kind === 'text_format' ? 'input text_format ' : ''}operand = ${input}`;
  }
  return `${qualifier} ${contract.kind} operand = ${qualifier === 'series' ? `bar_index == 1 ? ${contract.second} : ${contract.first}` : contract.first}`;
}

function call(contract: OperandContract, method: boolean): string {
  if (contract.overload) {
    const coordinates = contract.overload === 'point' ? pointDefaults : defaults;
    const args = Object.entries({ ...coordinates, [contract.parameter]: 'operand' })
      .reverse()
      .map(([name, value]) => `${name}=${value}`);
    return `id = box.new(${args.join(', ')})`;
  }
  const extras = contract.extra ?? {};
  const parameters: Record<string, string> =
    contract.call === 'box.set_lefttop'
      ? { left: extras.left ?? '0', top: extras.top ?? '40' }
      : contract.call === 'box.set_rightbottom'
        ? { right: extras.right ?? '5', bottom: extras.bottom ?? '10' }
        : contract.call === 'box.set_xloc'
          ? { left: '0', right: '5', xloc: 'xloc.bar_index' }
          : {};
  const args = Object.entries({ ...parameters, [contract.parameter]: 'operand', ...(!method ? { id: 'id' } : {}) })
    .reverse()
    .map(([name, value]) => `${name}=${value}`);
  return `id = box.new(0, 40, 5, 10)
${method ? `id.${contract.call.split('.')[1]}` : contract.call}(${args.join(', ')})`;
}

// Each slot joins the documented qualifier to its published field; copy/defaults are separate.
for (const contract of contracts) {
  for (const method of contract.overload ? [false] : [false, true]) {
    describe(`${contract.call} ${contract.overload ?? (method ? 'method' : 'namespace')} ${contract.parameter} ${contract.kind} [${contract.entry}]`, () => {
      for (const qualifier of ['const', 'input', 'simple', 'series']) {
        it(`accepts and uses ${qualifier} operand`, () => {
          const source = `//@version=6
indicator("Box operand qualifiers")
${declaration(contract, qualifier)}
${call(contract, method)}`;
          const checked = checkProgram(parse(source));
          const citation = `https://www.tradingview.com/pine-script-reference/v6/#fun_${contract.call}`;
          expect(checked.diagnostics, citation).toEqual([]);
          expect(checked.symbols.find((symbol) => symbol.name === 'operand')?.type, citation).toMatchObject({
            kind: contract.kind === 'text_format' ? 'udt' : contract.kind,
            qualifier,
          });
          for (const count of [1, 2, 3]) {
            const result = runCompatScript(source, { bars: compatibilityBars.slice(0, count) });
            expect(result.errors, citation).toEqual([]);
            expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
            const box = result.drawings.filter((drawing) => drawing.type === 'box').at(-1);
            expect(box?.[contract.field as keyof typeof box], citation).toEqual(
              qualifier === 'series' && count === 2 ? contract.expectedSecond : contract.expectedFirst,
            );
          }
        });
      }
    });
  }
}

for (const corner of ['top_left', 'bottom_right'] as const) {
  for (const form of ['constructor', 'namespace', 'method']) {
    it(`box ${form} ${corner} uses a series chart.point operand`, () => {
      const args = {
        top_left: 'chart.point.new(time, 0, 40)',
        bottom_right: 'chart.point.new(time, 5, 10)',
        [corner]: 'operand',
      };
      const call =
        form === 'constructor'
          ? `id = box.new(${Object.entries(args)
              .reverse()
              .map(([name, value]) => `${name}=${value}`)
              .join(', ')})`
          : `id = box.new(0, 40, 5, 10)\n${form === 'method' ? 'id' : 'box'}.set_${corner}_point(point=operand${form === 'method' ? '' : ', id=id'})`;
      const source = `//@version=6
indicator("Box point operands")
operand = bar_index == 1 ? chart.point.new(time, 2, 34.75) : chart.point.new(time, 1, 12.25)
${call}`;
      const checked = checkProgram(parse(source));
      expect(checked.diagnostics).toEqual([]);
      expect(checked.symbols.find((symbol) => symbol.name === 'operand')?.type).toEqual({
        kind: 'chart.point',
        qualifier: 'series',
      });
      for (const count of [1, 2, 3]) {
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, count) });
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        const box = result.drawings.filter((drawing) => drawing.type === 'box').at(-1);
        expect(corner === 'top_left' ? [box?.left, box?.top] : [box?.right, box?.bottom]).toEqual(
          count === 2 ? [2, 34.75] : [1, 12.25],
        );
      }
    });
  }
}
