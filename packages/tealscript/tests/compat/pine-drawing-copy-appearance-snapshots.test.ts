import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const cases = [
  {
    family: 'line',
    constructor:
      'line.new(4,13,1,-7,color=#123456,width=3,style=line.style_solid,extend=extend.left,force_overlay=true)',
    setters: [
      ['set_color', '#654321'],
      ['set_width', '5'],
      ['set_style', 'line.style_dotted'],
      ['set_extend', 'extend.both'],
    ],
    move: 'set_x1',
    coordinate: 'x1',
    sourceEdit: ['set_color', '#abcdef'],
    copyEdit: ['set_width', '9'],
    snapshot: { color: '#654321', width: 5, style: 'dotted', extend: 'both', x2: 1, y1: 13, y2: -7 },
    sourceChange: { color: '#abcdef' },
    copyChange: { width: 9 },
  },
  {
    family: 'label',
    constructor:
      'label.new(4,13,"seed",color=#123456,style=label.style_label_right,size=size.small,tooltip="seed tip",force_overlay=true)',
    setters: [
      ['set_text', '"snapshot"'],
      ['set_color', '#654321'],
      ['set_style', 'label.style_flag'],
      ['set_size', 'size.large'],
      ['set_textcolor', '#234567'],
      ['set_textalign', 'text.align_right'],
      ['set_tooltip', '"snapshot tip"'],
      ['set_text_font_family', 'font.family_monospace'],
      ['set_text_formatting', 'text.format_bold'],
    ],
    move: 'set_x',
    coordinate: 'x',
    sourceEdit: ['set_text', '"source edit"'],
    copyEdit: ['set_tooltip', '"copy tip"'],
    snapshot: {
      text: 'snapshot',
      color: '#654321',
      style: 'flag',
      size: 'large',
      textColor: '#234567',
      textAlign: 'right',
      tooltip: 'snapshot tip',
      textFontFamily: 'monospace',
      textFormatting: 'bold',
      y: 13,
    },
    sourceChange: { text: 'source edit' },
    copyChange: { tooltip: 'copy tip' },
  },
  {
    family: 'box',
    constructor: 'box.new(4,13,1,-7,text="seed",border_width=3,border_color=#123456,force_overlay=true)',
    setters: [
      ['set_text', '"snapshot"'],
      ['set_border_color', '#654321'],
      ['set_border_width', '5'],
      ['set_border_style', 'line.style_dotted'],
      ['set_extend', 'extend.both'],
      ['set_bgcolor', '#234567'],
      ['set_text_color', '#345678'],
      ['set_text_size', 'size.small'],
      ['set_text_halign', 'text.align_right'],
      ['set_text_valign', 'text.align_bottom'],
      ['set_text_font_family', 'font.family_monospace'],
      ['set_text_formatting', 'text.format_bold'],
      ['set_text_wrap', 'text.wrap_auto'],
    ],
    move: 'set_left',
    coordinate: 'left',
    sourceEdit: ['set_text', '"source edit"'],
    copyEdit: ['set_border_width', '9'],
    snapshot: {
      text: 'snapshot',
      borderColor: '#654321',
      borderWidth: 5,
      borderStyle: 'dotted',
      extend: 'both',
      bgcolor: '#234567',
      textColor: '#345678',
      textSize: 'small',
      textHalign: 'right',
      textValign: 'bottom',
      textFontFamily: 'monospace',
      textFormatting: 'bold',
      textWrap: 'auto',
      top: 13,
      right: 1,
      bottom: -7,
    },
    sourceChange: { text: 'source edit' },
    copyChange: { borderWidth: 9 },
  },
] as const;

// Authority: v6 box.copy [856], line.copy [883], label.copy [904].
describe('Drawing copies snapshot appearance after setters', () => {
  for (const item of cases) {
    for (const method of [false, true]) {
      it(`${item.family} snapshots current appearance and isolates later edits, method=${method}`, () => {
        const call = (id: string, name: string, args: string) =>
          method ? `${id}.${name}(${args})` : `${item.family}.${name}(${id},${args})`;
        const copy = method ? 'original.copy()' : `${item.family}.copy(original)`;
        const source = `//@version=6
indicator("Copy appearance snapshots")
var original=${item.constructor}
var ${item.family} copied=na
if bar_index==1
    ${item.setters.map(([name, args]) => call('original', name, args)).join('\n    ')}
    copied:=${copy}
    ${call('copied', item.move, '7')}
if bar_index==2
    ${call('original', item.sourceEdit[0], item.sourceEdit[1])}
    ${call('copied', item.copyEdit[0], item.copyEdit[1])}
plot(array.size(${item.family}.all),title="count")`;
        for (const count of [2, 3]) {
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, count) });
          expect(result.errors).toEqual([]);
          expect(getPlot(result, 'count').values).toEqual(count === 2 ? [1, 2] : [1, 2, 2]);
          const drawings = result.drawings?.filter((drawing) => drawing.type === item.family);
          expect(drawings).toHaveLength(2);
          const original = drawings?.find((drawing) => Reflect.get(drawing, item.coordinate) === 4);
          const copied = drawings?.find((drawing) => Reflect.get(drawing, item.coordinate) === 7);
          expect(original).toMatchObject({
            ...item.snapshot,
            ...(count === 3 ? item.sourceChange : {}),
            forceOverlay: true,
            xloc: 'bar_index',
          });
          expect(copied).toMatchObject({
            ...item.snapshot,
            ...(count === 3 ? item.copyChange : {}),
            forceOverlay: true,
            xloc: 'bar_index',
          });
          expect(original?.id).not.toBe(copied?.id);
        }
      });
    }
  }
});
