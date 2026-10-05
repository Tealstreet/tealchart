import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

// Authority: Pine v6 entries 857-858, 885-886, 911-912, 1022, 1040, 1175.
const points = 'a = chart.point.new(1700000000000, 4, 13)\nb = chart.point.new(1700000060000, 1, -7)';
const cases: [string, Record<string, unknown>][] = [
  ['line.new(4, 13, 1, -7)', { xloc: 'bar_index', extend: 'none', forceOverlay: false }],
  ['line.new(a, b)', { xloc: 'bar_index', extend: 'none', forceOverlay: false }],
  ...['label.new(4, 13)', 'label.new(a)'].map((source): [string, Record<string, unknown>] => [
    source,
    {
      text: '',
      xloc: 'bar_index',
      yloc: 'price',
      style: 'label_down',
      size: 'normal',
      textAlign: 'center',
      textFontFamily: 'default',
      forceOverlay: false,
      textFormatting: 'none',
    },
  ]),
  ...['box.new(4, 13, 1, -7)', 'box.new(a, b)'].map((source): [string, Record<string, unknown>] => [
    source,
    {
      borderColor: '#2962FF',
      borderWidth: 1,
      borderStyle: 'solid',
      extend: 'none',
      xloc: 'bar_index',
      bgcolor: '#2962FF',
      text: '',
      textSize: 'auto',
      textColor: '#363A45',
      textHalign: 'center',
      textValign: 'center',
      textWrap: 'none',
      textFontFamily: 'default',
      forceOverlay: false,
      textFormatting: 'none',
    },
  ]),
  [
    'table.new(position.top_left, 2, 3)',
    { bgcolor: null, frameColor: null, frameWidth: 0, borderColor: null, borderWidth: 0, forceOverlay: false },
  ],
  [
    'polyline.new(array.from(a, b))',
    {
      curved: false,
      closed: false,
      xloc: 'bar_index',
      lineColor: '#2962FF',
      fillColor: null,
      lineStyle: 'solid',
      lineWidth: 1,
      forceOverlay: false,
    },
  ],
];
describe('Documented drawing omitted defaults', () => {
  for (const [call, expected] of cases) {
    it(`${call} uses stated defaults`, () => {
      const result = runCompatScript(`//@version=6\nindicator("Defaults")\n${points}\n${call}`, {
        bars: compatibilityBars.slice(0, 1),
      });
      expect(result.errors).toEqual([]);
      expect(result.drawings).toHaveLength(1);
      const drawing = result.drawings![0]!;
      const forceOverlay = 'forceOverlay' in drawing ? Boolean(drawing.forceOverlay) : false;
      expect({ ...drawing, forceOverlay }).toMatchObject(expected);
    });
  }
  for (const method of [false, true]) {
    it(`table.cell_set_text_size ${method ? 'method' : 'function'} omission restores normal`, () => {
      const result = runCompatScript(
        `//@version=6\nindicator("Cell size default")\nid = table.new(position.top_left, 2, 1)\ntable.cell(id, 0, 0, "target", text_size=17)\ntable.cell(id, 1, 0, "control", text_size=23)\n${method ? 'id.cell_set_text_size(0, 0)' : 'table.cell_set_text_size(id, 0, 0)'}`,
        { bars: compatibilityBars.slice(0, 1) },
      );
      expect(result.errors).toEqual([]);
      const table = result.drawings![0];
      if (table?.type !== 'table') throw new Error('Expected table');
      expect(table.cells).toMatchObject([
        { column: 0, row: 0, text: 'target', textSize: 'normal' },
        { column: 1, row: 0, text: 'control', textSize: '23' },
      ]);
    });
  }
});

describe('Documented omitted table setters', () => {
  for (const [setter, field, initial, expected] of [
    ['set_bgcolor', 'bgcolor', 'color.red', null],
    ['set_frame_color', 'frameColor', 'color.red', null],
    ['set_border_color', 'borderColor', 'color.red', null],
    ['set_frame_width', 'frameWidth', '7', 0],
    ['set_border_width', 'borderWidth', '7', 0],
  ] as const) {
    for (const method of [false, true]) {
      it(`table.${setter} ${method ? 'method' : 'function'} omission restores its default`, () => {
        const result = runCompatScript(
          `//@version=6\nindicator("Table setter defaults")\nid = table.new(position.top_left, 2, 1)\ntable.${setter}(id, ${initial})\n${method ? `id.${setter}()` : `table.${setter}(id)`}`,
          { bars: compatibilityBars.slice(0, 1) },
        );
        expect(result.errors).toEqual([]);
        expect(result.drawings).toHaveLength(1);
        expect(result.drawings![0]).toMatchObject({
          type: 'table',
          position: 'top_left',
          columns: 2,
          rows: 1,
          [field]: expected,
        });
      });
    }
  }
});
