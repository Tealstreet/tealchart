import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const bars = [{ time: 1700000000000, open: 1, high: 2, low: 0, close: 1, volume: 10 }];
// Official v6 reference for the named methods. Assertions inspect runtime fields,
// not rendered pixels. Pixel/cutoff parity requires native visual observations.
describe('ledger1084-1087/1107-1110/1116-1120 drawing methods', () => {
  it('changes label x-location and coordinate while preserving its y/text', () => {
    const result = runCompatScript(
      `//@version=6
indicator("label xloc")
a = label.new(0, 7, "keep")
a.set_xloc(time, xloc.bar_time)
plot(a.get_y(), "y")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'y').values).toEqual([7]);
    const label = result.drawings.find((d) => d.type === 'label');
    expect(label).toMatchObject({ x: bars[0]!.time, xloc: 'bar_time', y: 7, text: 'keep' });
  });
  it('copies a box independently through method notation', () => {
    const result = runCompatScript(
      `//@version=6
indicator("box copy")
a = box.new(0, 7, 1, 3, text="original")
b = a.copy()
b.set_top(12)
b.set_text("copy")
plot(a.get_top(), "original")
plot(b.get_top(), "copy")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'original').values).toEqual([7]);
    expect(getPlot(result, 'copy').values).toEqual([12]);
    expect(result.drawings.filter((d) => d.type === 'box').map((d) => (d.type === 'box' ? d.text : ''))).toEqual([
      'original',
      'copy',
    ]);
  });
  it('sets numeric text size and table frame/border fields independently', () => {
    const result = runCompatScript(
      `//@version=6
indicator("table setters")
t = table.new(position.top_right, 1, 1, border_width=2)
t.cell(0, 0, "keep")
t.cell_set_text_size(0, 0, 23)
t.set_frame_color(#123456)
t.set_border_color(#ABCDEF)
t.set_frame_width(4)
plot(1, "out")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const table = result.drawings.find((d) => d.type === 'table');
    expect(table).toMatchObject({ frameColor: '#123456', borderColor: '#ABCDEF', frameWidth: 4, borderWidth: 2 });
    if (table?.type === 'table') expect(table.cells[0]).toMatchObject({ text: 'keep', textSize: '23' });
  });
  it('honors omitted optional setter defaults', () => {
    const result = runCompatScript(
      `//@version=6
indicator("table defaults")
t = table.new(position.top_right, 1, 1, frame_color=#123456, frame_width=4, border_color=#ABCDEF)
t.cell(0, 0, "keep", text_size=23)
t.cell_set_text_size(0, 0)
t.set_frame_color()
t.set_border_color()
t.set_frame_width()
plot(1, "out")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const table = result.drawings.find((d) => d.type === 'table');
    expect(table).toMatchObject({ frameColor: null, borderColor: null, frameWidth: 0 });
    if (table?.type === 'table') expect(table.cells[0]?.textSize).toBe('normal');
  });
  it.each([
    'set_xloc(0, xloc.bar_index)',
    'get_y()',
    'copy()',
    'cell_set_text_size(0, 0, 23)',
    'set_frame_color(#123456)',
    'set_border_color(#123456)',
    'set_frame_width(4)',
  ])('refuses a scalar implicit receiver: %s', (call) => {
    const checked = checkProgram(parse(`//@version=6\nindicator("receiver")\nx = 1\nx.${call}`));
    expect(checked.diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });
});
