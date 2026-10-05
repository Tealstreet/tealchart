import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const run = (body: string) =>
  runCompatScript(`//@version=6\nindicator("Repeated methods")\n${body}`, { bars: compatibilityBars.slice(0, 1) });
const fills = `parent=line.new(0,13,1,-7)
first=linefill.new(parent,line.new(0,19,1,-23),#123456)
keep=linefill.new(line.new(0,31,1,-37),line.new(0,41,1,-43),#654321)`;
// Authority: v6 linefill.delete idempotence and table.cell overwrite remarks.
describe('Documented drawing method repeated calls', () => {
  for (const [name, deletion, lineCount] of [
    ['explicit delete', 'first.delete()\nfirst.delete()', 4],
    ['parent cascade', 'line.delete(parent)\nfirst.delete()\nfirst.delete()', 3],
    ['typed missing receiver', 'linefill missing=na\nmissing.delete()\nfirst.delete()', 4],
  ] as const) {
    it(`linefill.delete method tolerates ${name} and preserves independent objects`, () => {
      const result = run(
        `${fills}\n${deletion}\nplot(array.size(linefill.all),"fills")\nplot(array.indexof(linefill.all,keep),"survivor")\nplot(array.size(line.all),"parents")`,
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'fills').values).toEqual([1]);
      expect(getPlot(result, 'survivor').values).toEqual([0]);
      expect(getPlot(result, 'parents').values).toEqual([lineCount]);
      expect(result.drawings?.find((d) => d.type === 'linefill')).toMatchObject({ color: '#654321' });
    });
  }
  it('table.cell method replaces every omitted attribute with its default and preserves another cell', () => {
    const result = run(`t=table.new(position.top_left,2,2)
t.cell(0,0,"outside",bgcolor=#123456)
t.cell(1,1,"old",width=12,height=9,text_color=#123456,text_halign=text.align_left,text_valign=text.align_top,text_size=17,bgcolor=#123456,tooltip="old tip",text_font_family=font.family_monospace,text_formatting=text.format_bold)
t.cell(1,1,text_color=#654321)`);
    expect(result.errors).toEqual([]);
    const table = result.drawings?.find((d) => d.type === 'table');
    if (table?.type !== 'table') throw new Error('Expected table');
    expect(table.cells).toHaveLength(2);
    expect(table.cells[0]).toMatchObject({ column: 0, row: 0, text: 'outside', bgcolor: '#123456' });
    expect(table.cells[1]).toEqual({
      column: 1,
      row: 1,
      text: '',
      width: undefined,
      height: undefined,
      textColor: '#654321',
      textHalign: 'center',
      textValign: 'center',
      textSize: 'normal',
      bgcolor: null,
      textFontFamily: 'default',
      textFormatting: 'none',
    });
  });
});
