import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

describe('ledger18 drawing receiver contract witnesses', () => {
  for (const receiver of [false, true]) {
    it(`${receiver ? 'receiver' : 'namespace'} box and label setters mutate their original handles`, () => {
      const call = (id: string, family: string, method: string, args: string) => receiver ? `${id}.${method}(${args})` : `${family}.${method}(${id}, ${args})`;
      const source = `//@version=6
indicator("drawing setter slots")
var box zone = box.new(0, 10, 1, 0, bgcolor=#112233)
var label mark = label.new(0, 5, "seed", color=#112233)
${call('zone', 'box', 'set_bgcolor', 'color=#445566')}
${call('zone', 'box', 'set_top', 'top=bar_index + 20')}
${call('mark', 'label', 'set_x', 'x=bar_index')}
${call('mark', 'label', 'set_y', 'y=close + 2')}
${call('mark', 'label', 'set_color', 'color=#778899')}
plot(zone.get_top(), title="top")
plot(mark.get_x(), title="x")
plot(mark.get_y(), title="y")`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'top').values).toEqual(Array.from({ length: 12 }, (_, index) => index + 20));
      expect(getPlot(result, 'x').values).toEqual(Array.from({ length: 12 }, (_, index) => index));
      expect(getPlot(result, 'y').values).toEqual([104, 107, 109, 105, 101, 102, 106, 111, 110, 113, 112, 114]);
      expect(result.drawings).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'box', bgcolor: '#445566' }),
        expect.objectContaining({ type: 'label', color: '#778899' }),
      ]));
    });
    it(`${receiver ? 'receiver' : 'namespace'} table.clear removes only its inclusive range`, () => {
      const clear = receiver ? 'panel.clear(start_column=0, start_row=0, end_column=0, end_row=0)' : 'table.clear(table_id=panel, start_column=0, start_row=0, end_column=0, end_row=0)';
      const source = `//@version=6\nindicator("clear range")\nvar table panel = table.new(position.top_right, 2, 1)\npanel.cell(0, 0, "drop")\npanel.cell(1, 0, "keep")\n${clear}\nplot(1)`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source);
      expect(result.errors).toEqual([]);
      expect(result.drawings).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'table', cells: [expect.objectContaining({ column: 1, row: 0, text: 'keep' })] })]));
    });
  }
  for (const call of ['x.set_bgcolor(color=#445566)', 'x.set_top(top=3)', 'x.set_x(x=2)', 'x.set_y(y=2)', 'x.set_color(color=#445566)', 'x.clear(0,0)']) {
    it(`does not dispatch ${call} on a scalar receiver`, () => {
      expect(checkProgram(parse(`//@version=6\nindicator("bad receiver")\nx = 1\n${call}\nplot(close)`)).diagnostics.length).toBeGreaterThan(0);
    });
  }
  it('preserves a local scalar method with the same drawing name', () => {
    const source = '//@version=6\nindicator("custom method")\nmethod set_x(int self, int x) => self+x\nvalue = 3\nplot(value.set_x(4), title="custom")';
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    expect(getPlot(runCompatScript(source), 'custom').values).toEqual(Array(12).fill(7));
  });
  it('preserves imported UDT methods and collection clear', () => {
    const library = parse('//@version=6\nlibrary("Tools", true)\nexport type Handle\n    int value\nexport method set_x(Handle self, int x) => self.value+x');
    const libraries = new Map([['Test/Tools/1', library]]);
    const source = '//@version=6\nindicator("imported method")\nimport Test/Tools/1 as tools\nvalue = tools.Handle.new(3)\na = array.from(1, 2)\na.clear()\nplot(value.set_x(4), title="custom")\nplot(a.size(), title="empty")';
    expect(checkProgram(parse(source), { libraries }).diagnostics).toEqual([]);
    const result = runCompatScript(source, { engineOptions: { libraries } });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'custom').values).toEqual(Array(12).fill(7));
    expect(getPlot(result, 'empty').values).toEqual(Array(12).fill(0));
  });
});
