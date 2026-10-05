import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

// Authority: Pine v6 drawing constructor parameters and style/position constants.
const points = 'a = chart.point.new(1700000000000, 4, 13)\nb = chart.point.new(1700000060000, 1, -7)';
const run = (body: string) =>
  runCompatScript(`//@version=6\nindicator("Constructor options")\n${points}\n${body}`, {
    bars: compatibilityBars.slice(0, 1),
  });
describe('Documented drawing constructor options', () => {
  for (const [call, expected] of [
    [
      'line.new(4,13,1,-7,xloc=xloc.bar_time,extend=extend.both,color=#123456,style=line.style_dashed,width=7,force_overlay=true)',
      {
        type: 'line',
        x1: 4,
        y1: 13,
        x2: 1,
        y2: -7,
        xloc: 'bar_time',
        extend: 'both',
        color: '#123456',
        style: 'dashed',
        width: 7,
        forceOverlay: true,
      },
    ],
    [
      'line.new(a,b,xloc=xloc.bar_time,extend=extend.both,color=#123456,style=line.style_dashed,width=7,force_overlay=true)',
      {
        type: 'line',
        x1: 1700000000000,
        y1: 13,
        x2: 1700000060000,
        y2: -7,
        xloc: 'bar_time',
        extend: 'both',
        color: '#123456',
        style: 'dashed',
        width: 7,
        forceOverlay: true,
      },
    ],
    ...['label.new(4,13', 'label.new(a'].map(
      (call) =>
        [
          call +
            ',text="label",xloc=xloc.bar_time,yloc=yloc.belowbar,color=#123456,style=label.style_square,textcolor=#654321,size=17,textalign=text.align_right,tooltip="tip",text_font_family=font.family_monospace,force_overlay=true,text_formatting=text.format_bold + text.format_italic)',
          {
            type: 'label',
            y: 13,
            text: 'label',
            xloc: 'bar_time',
            yloc: 'belowbar',
            color: '#123456',
            style: 'square',
            textColor: '#654321',
            size: '17',
            textAlign: 'right',
            tooltip: 'tip',
            textFontFamily: 'monospace',
            forceOverlay: true,
            textFormatting: 'bolditalic',
          },
        ] as const,
    ),
    ...['box.new(4,13,1,-7', 'box.new(a,b'].map(
      (call) =>
        [
          call +
            ',border_color=#123456,border_width=7,border_style=line.style_dashed,extend=extend.both,xloc=xloc.bar_time,bgcolor=#654321,text="box",text_size=17,text_color=#123456,text_halign=text.align_right,text_valign=text.align_bottom,text_wrap=text.wrap_auto,text_font_family=font.family_monospace,force_overlay=true,text_formatting=text.format_bold + text.format_italic)',
          {
            type: 'box',
            top: 13,
            bottom: -7,
            borderColor: '#123456',
            borderWidth: 7,
            borderStyle: 'dashed',
            extend: 'both',
            xloc: 'bar_time',
            bgcolor: '#654321',
            text: 'box',
            textSize: '17',
            textColor: '#123456',
            textHalign: 'right',
            textValign: 'bottom',
            textWrap: 'auto',
            textFontFamily: 'monospace',
            forceOverlay: true,
            textFormatting: 'bolditalic',
          },
        ] as const,
    ),
    [
      'table.new(position.bottom_right,2,3,bgcolor=#123456,frame_color=#654321,frame_width=7,border_color=#123456,border_width=3,force_overlay=true)',
      {
        type: 'table',
        position: 'bottom_right',
        columns: 2,
        rows: 3,
        bgcolor: '#123456',
        frameColor: '#654321',
        frameWidth: 7,
        borderColor: '#123456',
        borderWidth: 3,
        forceOverlay: true,
      },
    ],
    [
      'polyline.new(array.from(a,b),curved=true,closed=true,xloc=xloc.bar_time,line_color=#123456,fill_color=#654321,line_style=line.style_dotted,line_width=7,force_overlay=true)',
      {
        type: 'polyline',
        curved: true,
        closed: true,
        xloc: 'bar_time',
        lineColor: '#123456',
        fillColor: '#654321',
        lineStyle: 'dotted',
        lineWidth: 7,
        forceOverlay: true,
        points: [
          { time: 1700000000000, index: 4, price: 13 },
          { time: 1700000060000, index: 1, price: -7 },
        ],
      },
    ],
  ] as const) {
    it(`${call} binds stated options`, () => {
      const result = run(call);
      expect(result.errors).toEqual([]);
      expect(result.drawings).toHaveLength(1);
      expect(result.drawings![0]).toMatchObject(expected);
    });
  }
  for (const style of [
    'none',
    'xcross',
    'cross',
    'triangleup',
    'triangledown',
    'flag',
    'circle',
    'arrowup',
    'arrowdown',
    'label_up',
    'label_down',
    'label_left',
    'label_right',
    'label_lower_left',
    'label_lower_right',
    'label_upper_left',
    'label_upper_right',
    'label_center',
    'square',
    'diamond',
    'text_outline',
  ]) {
    it(`label.style_${style} selects the same named style in constructor and setter`, () => {
      const result = run(
        `id=label.new(4,13,style=label.style_${style})\nother=label.new(1,-7,style=label.style_none)\nother.set_style(label.style_${style})`,
      );
      expect(result.errors).toEqual([]);
      expect(result.drawings).toHaveLength(2);
      expect(result.drawings?.map((d) => (d.type === 'label' ? d.style : null))).toEqual([style, style]);
    });
  }
  for (const style of ['solid', 'dotted', 'dashed', 'arrow_left', 'arrow_right', 'arrow_both']) {
    it(`line.style_${style} selects the same named style in constructor and setter`, () => {
      const result = run(
        `id=line.new(4,13,1,-7,style=line.style_${style})\nother=line.new(1,-7,4,13)\nother.set_style(line.style_${style})`,
      );
      expect(result.errors).toEqual([]);
      expect(result.drawings).toHaveLength(2);
      expect(result.drawings?.map((d) => (d.type === 'line' ? d.style : null))).toEqual([style, style]);
    });
  }
  for (const position of [
    'top_left',
    'top_center',
    'top_right',
    'middle_left',
    'middle_center',
    'middle_right',
    'bottom_left',
    'bottom_center',
    'bottom_right',
  ]) {
    it(`position.${position} selects the same named table position in constructor and setter`, () => {
      const result = run(
        `id=table.new(position.${position},2,3)\nother=table.new(position.${position === 'top_left' ? 'bottom_left' : 'top_left'},1,1)\nother.set_position(position.${position})`,
      );
      expect(result.errors).toEqual([]);
      expect(result.drawings).toHaveLength(2);
      expect(result.drawings?.map((d) => (d.type === 'table' ? d.position : null))).toEqual([position, position]);
    });
  }
});
