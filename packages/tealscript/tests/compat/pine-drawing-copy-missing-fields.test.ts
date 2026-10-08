import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const cases = [
  {
    family: 'line',
    constructor: 'line.new(na,na,5,-7,color=na,width=3)',
    setter: 'set_xy1',
    getters: ['get_x1', 'get_y1'],
    fields: ['x1', 'y1'],
    colorSetter: 'set_color',
    colorField: 'color',
    other: { x2: 5, y2: -7, width: 3 },
  },
  {
    family: 'label',
    constructor: 'label.new(na,na,"keep",color=na,style=label.style_label_left)',
    setter: 'set_xy',
    getters: ['get_x', 'get_y'],
    fields: ['x', 'y'],
    colorSetter: 'set_color',
    colorField: 'color',
    other: { text: 'keep', style: 'label_left' },
  },
  {
    family: 'box',
    constructor: 'box.new(na,na,5,-7,bgcolor=na,text="keep")',
    setter: 'set_lefttop',
    getters: ['get_left', 'get_top'],
    fields: ['left', 'top'],
    colorSetter: 'set_bgcolor',
    colorField: 'bgcolor',
    other: { right: 5, bottom: -7, text: 'keep' },
  },
] as const;
// v6 reference: copy [856/883/904] clones each object's fields.
// Missing coordinates/colours do not replace an allocated drawing handle.
describe('Drawing copies retain missing fields before independent setter repair', () => {
  for (const item of cases)
    for (const method of [false, true]) {
      it(`${item.family}, method=${method}: preserves missing coordinates and color in its snapshot`, () => {
        const call = (id: string, name: string, args = '') =>
          method ? `${id}.${name}(${args})` : `${item.family}.${name}(${id}${args ? `,${args}` : ''})`;
        const script = `//@version=6
indicator("Copy missing fields")
var source=${item.constructor}
var copied=${call('source', 'copy')}
var ${item.family} descendant=na
if bar_index==1
    ${call('copied', item.setter, '6,21')}
    ${call('copied', item.colorSetter, '#123456')}
if bar_index==2
    descendant:=${call('copied', 'copy')}
    ${call('source', item.setter, '9,-31')}
    ${call('source', item.colorSetter, '#654321')}
    ${call('copied', item.colorSetter, '#abcdef')}
${['source', 'copied', 'descendant'].flatMap((id) => item.getters.map((getter, i) => `plot(${call(id, getter)},"${id} ${i}")`)).join('\n')}
plot(na(source)?1:0,"source missing")
plot(na(copied)?1:0,"copy missing")
plot(array.size(${item.family}.all),"count")`;
        for (const count of [1, 2, 3]) {
          const result = runCompatScript(script, { bars: compatibilityBars.slice(0, count) });
          expect(result.errors).toEqual([]);
          expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
          item.fields.forEach((_, i) => {
            expect(getPlot(result, `source ${i}`).values).toEqual([null, null, [9, -31][i]].slice(0, count));
            expect(getPlot(result, `copied ${i}`).values).toEqual([null, [6, 21][i], [6, 21][i]].slice(0, count));
            expect(getPlot(result, `descendant ${i}`).values).toEqual([null, null, [6, 21][i]].slice(0, count));
          });
          expect(getPlot(result, 'source missing').values).toEqual(Array(count).fill(0));
          expect(getPlot(result, 'copy missing').values).toEqual(Array(count).fill(0));
          expect(getPlot(result, 'count').values).toEqual([2, 2, 3].slice(0, count));
          const drawings = result.drawings.filter((d) => d.type === item.family);
          expect(drawings).toHaveLength(count === 3 ? 3 : 2);
          expect(new Set(drawings.map((d) => d.id)).size).toBe(drawings.length);
          const positions =
            count === 1
              ? [
                  [null, null],
                  [null, null],
                ]
              : count === 2
                ? [
                    [null, null],
                    [6, 21],
                  ]
                : [
                    [9, -31],
                    [6, 21],
                    [6, 21],
                  ];
          const colors =
            count === 1 ? [null, null] : count === 2 ? [null, '#123456'] : ['#654321', '#abcdef', '#123456'];
          drawings.forEach((drawing, i) =>
            expect(drawing).toMatchObject({
              ...item.other,
              xloc: 'bar_index',
              [item.colorField]: colors[i],
              ...Object.fromEntries(item.fields.map((field, j) => [field, positions[i]![j]])),
            }),
          );
        }
      });
    }
});
