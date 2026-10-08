import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: v6 table.clear [1042], table.cell [1030], table.new [1022].
describe('Table references remain usable after clearing cells', () => {
  for (const entireTable of [false, true]) {
    for (const method of [false, true]) {
      it(`repopulates a ${entireTable ? 'fully' : 'partially'} cleared table, method=${method}`, () => {
        const start = entireTable ? 0 : 1;
        const clear = method ? `alias.clear(${start},${start},2,2)` : `table.clear(alias,${start},${start},2,2)`;
        const repopulate = method
          ? 'alias.cell(2,2,"fresh",text_color=#654321)'
          : 'table.cell(alias,2,2,"fresh",text_color=#654321)';
        const update = method ? 'alias.cell_set_text(2,2,"updated")' : 'table.cell_set_text(alias,2,2,"updated")';
        const source = `//@version=6
indicator("Table clear and repopulate")
var id=table.new(position.top_left,3,3,bgcolor=#112233,frame_color=#223344,frame_width=2,border_color=#334455,border_width=3)
var saved=array.from(id)
var independent=table.new(position.bottom_right,1,1)
alias=array.get(saved,0)
if bar_index==0
    for column=0 to 2
        for row=0 to 2
            table.cell(id,column,row,str.tostring(column)+":"+str.tostring(row),width=12,height=9,text_color=#123456,text_halign=text.align_left,text_valign=text.align_top,text_size=17,bgcolor=#234567,tooltip="old tip",text_font_family=font.family_monospace,text_formatting=text.format_bold)
    table.cell(independent,0,0,"keep",bgcolor=#456789)
if bar_index==1
    ${clear}
if bar_index==2
    ${repopulate}
if bar_index==3
    ${update}
plot(na(alias)?1:0,title="missing")
plot(array.size(table.all),title="tables")
plot(array.indexof(table.all,alias),title="identity")`;
        for (const count of [1, 2, 3, 4]) {
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, count) });
          expect(result.errors).toEqual([]);
          expect(getPlot(result, 'missing').values).toEqual(Array(count).fill(0));
          expect(getPlot(result, 'tables').values).toEqual(Array(count).fill(2));
          expect(getPlot(result, 'identity').values).toEqual(Array(count).fill(0));
          const table = result.drawings?.find((drawing) => drawing.type === 'table' && drawing.position === 'top_left');
          if (table?.type !== 'table') throw new Error('Expected the original table');
          expect(table).toMatchObject({
            columns: 3,
            rows: 3,
            bgcolor: '#112233',
            frameColor: '#223344',
            frameWidth: 2,
            borderColor: '#334455',
            borderWidth: 3,
          });
          const expected = [];
          for (let column = 0; column < 3; column++) {
            for (let row = 0; row < 3; row++) {
              if (count > 1 && column >= start && row >= start) continue;
              expected.push({
                column,
                row,
                text: `${column}:${row}`,
                width: 12,
                height: 9,
                textColor: '#123456',
                textHalign: 'left',
                textValign: 'top',
                textSize: '17',
                bgcolor: '#234567',
                tooltip: 'old tip',
                textFontFamily: 'monospace',
                textFormatting: 'bold',
              });
            }
          }
          if (count >= 3) {
            expect(table.cells.find((cell) => cell.column === 2 && cell.row === 2)).toEqual({
              column: 2,
              row: 2,
              text: count === 3 ? 'fresh' : 'updated',
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
          }
          expect(table.cells.filter((cell) => count < 3 || cell.column !== 2 || cell.row !== 2)).toEqual(expected);
          const other = result.drawings?.find(
            (drawing) => drawing.type === 'table' && drawing.position === 'bottom_right',
          );
          if (other?.type !== 'table') throw new Error('Expected the independent table');
          expect(other.cells).toHaveLength(1);
          expect(other.cells[0]).toMatchObject({ column: 0, row: 0, text: 'keep', bgcolor: '#456789' });
        }
      });
    }
  }
});
