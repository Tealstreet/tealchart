import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const start = compatibilityBars[0]!.time;
const cases = [
  {
    family: 'line',
    constructor: (a: number, b: number, mode: string) => `line.new(${a},13,${b},-7,xloc=${mode},color=#123456,width=3)`,
    setters: ['set_first_point', 'set_second_point'],
    getters: ['get_x1', 'get_y1', 'get_x2', 'get_y2'],
    fields: ['x1', 'y1', 'x2', 'y2'],
    appearance: { color: '#123456', width: 3 },
  },
  {
    family: 'label',
    constructor: (a: number, _b: number, mode: string) =>
      `label.new(${a},13,"keep",xloc=${mode},color=#123456,style=label.style_label_left)`,
    setters: ['set_point'],
    getters: ['get_x', 'get_y'],
    fields: ['x', 'y'],
    appearance: { text: 'keep', color: '#123456', style: 'label_left' },
  },
  {
    family: 'box',
    constructor: (a: number, b: number, mode: string) =>
      `box.new(${a},13,${b},-7,xloc=${mode},bgcolor=#123456,text="keep")`,
    setters: ['set_top_left_point', 'set_bottom_right_point'],
    getters: ['get_left', 'get_top', 'get_right', 'get_bottom'],
    fields: ['left', 'top', 'right', 'bottom'],
    appearance: { bgcolor: '#123456', text: 'keep' },
  },
] as const;
// v6 reference: copy [856/883/904], point setters [1151–1155].
// Supplied point coordinates and cloned drawings remain independent values.
describe('Drawing copies isolate point setter transitions', () => {
  for (const item of cases)
    for (const timed of [false, true])
      for (const method of [false, true]) {
        it(`${item.family}, timed=${timed}, method=${method}: isolates sources, points and descendants`, () => {
          const x = (index: number, minutes: number) => (timed ? start + minutes * 60000 : index);
          const call = (id: string, name: string, args = '') =>
            method ? `${id}.${name}(${args})` : `${item.family}.${name}(${id}${args ? `,${args}` : ''})`;
          const apply = (id: string, points: string[]) =>
            item.setters.map((name, i) => call(id, name, `point=${points[i]}`)).join('\n    ');
          const plots = ['source', 'copied', 'descendant'].flatMap((id) =>
            item.getters.map((getter, i) => `plot(${call(id, getter)},"${id} ${i}")`),
          );
          const script = `//@version=6
indicator("Copy point transitions")
var source=${item.constructor(x(2, 0), x(5, 1), timed ? 'xloc.bar_time' : 'xloc.bar_index')}
var copied=${call('source', 'copy')}
var ${item.family} descendant=na
var first=chart.point.new(${start + 120000},7,19)
var second=chart.point.new(${start + 180000},9,-23)
if bar_index==0
    ${apply('copied', ['first', 'second'])}
    first.index:=11
    first.time:=${start + 300000}
    first.price:=91
    second.index:=13
    second.time:=${start + 330000}
    second.price:=-97
if bar_index==1
    ${apply('source', ['first', 'second'])}
    first.index:=15
    first.time:=${start + 360000}
    first.price:=101
    second.index:=16
    second.time:=${start + 390000}
    second.price:=-103
if bar_index==2
    descendant:=${call('copied', 'copy')}
    ${apply('copied', [`chart.point.new(${start + 420000},17,37)`, `chart.point.new(${start + 480000},19,-41)`])}
${plots.join('\n')}
plot(array.size(${item.family}.all),"count")`;
          const result = runCompatScript(script, { bars: compatibilityBars.slice(0, 3) });
          expect(result.errors).toEqual([]);
          expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
          const original = [x(2, 0), 13, x(5, 1), -7];
          const snapshot = [x(7, 2), 19, x(9, 3), -23];
          const sourceEdit = [x(11, 5), 91, x(13, 5.5), -97];
          const copyEdit = [x(17, 7), 37, x(19, 8), -41];
          item.fields.forEach((_, i) => {
            expect(getPlot(result, `source ${i}`).values).toEqual([original[i], sourceEdit[i], sourceEdit[i]]);
            expect(getPlot(result, `copied ${i}`).values).toEqual([snapshot[i], snapshot[i], copyEdit[i]]);
            expect(getPlot(result, `descendant ${i}`).values).toEqual([null, null, snapshot[i]]);
          });
          expect(getPlot(result, 'count').values).toEqual([2, 2, 3]);
          const drawings = result.drawings.filter((d) => d.type === item.family);
          expect(drawings).toHaveLength(3);
          expect(new Set(drawings.map((d) => d.id)).size).toBe(3);
          [sourceEdit, copyEdit, snapshot].forEach((values, i) =>
            expect(drawings[i]).toMatchObject({
              ...item.appearance,
              xloc: timed ? 'bar_time' : 'bar_index',
              ...Object.fromEntries(item.fields.map((field, j) => [field, values[j]])),
            }),
          );
        });
      }
});
